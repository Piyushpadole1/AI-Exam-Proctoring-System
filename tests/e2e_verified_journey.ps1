# =====================================================================
# AI Exam Proctoring System - End-to-End Verified Journey Test Suite
# Tests full user journey across 2 teachers and 2 students on fresh DB.
# Reads credentials from project root .env file.
# =====================================================================

param(
    [string]$EnvFile = "D:\Mega Project 4th Year\AI-Exam-Proctoring-System\.env"
)

$ErrorActionPreference = "Continue"

# 1. Parse .env file
$envVars = @{}
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | Where-Object { $_ -match '^\s*([^#=]+)\s*=\s*(.*)\s*$' } | ForEach-Object {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$BaseUrl = if ($envVars["SERVER_PORT"]) { "http://localhost:" + $envVars["SERVER_PORT"] } else { "http://localhost:5000" }
$DbUser = if ($envVars["DB_USER"]) { $envVars["DB_USER"] } else { "root" }
$DbPassword = if ($envVars["DB_PASSWORD"]) { $envVars["DB_PASSWORD"] } else { "root" }
$DbName = if ($envVars["DB_NAME"]) { $envVars["DB_NAME"] } else { "ai_eval8_db" }
$DbHost = if ($envVars["DB_HOST"]) { $envVars["DB_HOST"] } else { "localhost" }

$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysqlExe)) { $mysqlExe = "mysql" }

# Results tracking
$global:testResults = [System.Collections.Generic.List[PSCustomObject]]::new()

function Record-TestResult {
    param(
        [int]$StepNumber,
        [string]$StepName,
        [string]$Expected,
        [string]$Actual,
        [bool]$Passed,
        [string]$Evidence = ""
    )
    $status = if ($Passed) { "PASS" } else { "FAIL" }
    $obj = [PSCustomObject]@{
        StepNumber = $StepNumber
        StepName   = $StepName
        Expected   = $Expected
        Actual     = $Actual
        Status     = $status
        Evidence   = $Evidence
    }
    $global:testResults.Add($obj)

    $color = if ($Passed) { "Green" } else { "Red" }
    Write-Host "[$status] Step $StepNumber : $StepName" -ForegroundColor $color
    if (-not $Passed) {
        Write-Host "       Expected: $Expected" -ForegroundColor Yellow
        Write-Host "       Actual:   $Actual" -ForegroundColor Yellow
        Write-Host "       Evidence: $Evidence" -ForegroundColor Yellow
    }
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Body = $null,
        [string]$Token = $null
    )

    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $uri = "$BaseUrl$Path"
    $bodyJson = if ($Body) { $Body | ConvertTo-Json -Depth 10 } else { $null }

    try {
        if ($bodyJson) {
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -Body $bodyJson -UseBasicParsing
        } else {
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -UseBasicParsing
        }
        $data = $null
        if ($resp.Content) {
            try { $data = $resp.Content | ConvertFrom-Json } catch { $data = $resp.Content }
        }
        return [PSCustomObject]@{
            StatusCode = [int]$resp.StatusCode
            Data = $data
            Success = $true
        }
    } catch [System.Net.WebException] {
        $ex = $_.Exception
        $code = 500
        $data = $null
        if ($ex.Response) {
            $code = [int]$ex.Response.StatusCode
            try {
                $stream = $ex.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $content = $reader.ReadToEnd()
                try { $data = $content | ConvertFrom-Json } catch { $data = $content }
            } catch {}
        }
        return [PSCustomObject]@{
            StatusCode = $code
            Data = $data
            Success = $false
        }
    } catch {
        return [PSCustomObject]@{
            StatusCode = 500
            Data = $_.Exception.Message
            Success = $false
        }
    }
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  AI EXAM PROCTORING SYSTEM - VERIFIED END-TO-END JOURNEY TEST   " -ForegroundColor Cyan
Write-Host "=================================================================`n" -ForegroundColor Cyan

# ---------------------------------------------------------------------
# STEP 1: Registration and Login for all roles (Admin blocked)
# ---------------------------------------------------------------------
Write-Host "--- Step 1: Authentication & Role Verification ---" -ForegroundColor Magenta

# 1.1 Admin registration must be rejected with 400
$adminReg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Malicious Admin"
    email = "journey_admin@test.com"
    password = "AdminPassword123!"
    role = "admin"
}
Record-TestResult -StepNumber 1 -StepName "Admin Registration Rejection" `
    -Expected "HTTP 400 Bad Request" `
    -Actual "HTTP $($adminReg.StatusCode)" `
    -Passed ($adminReg.StatusCode -eq 400) `
    -Evidence ($adminReg.Data | ConvertTo-Json -Compress)

# 1.2 Teacher 1 Registration & Login
$t1Reg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Teacher Alpha"
    email = "journey_teacher1@test.com"
    password = "TeacherPassword123!"
    role = "teacher"
    clientCode = "DEFAULT"
}
$t1Token = $t1Reg.Data.token
$t1Id = $t1Reg.Data._id
Record-TestResult -StepNumber 2 -StepName "Teacher 1 Registration & Token Generation" `
    -Expected "HTTP 200 with JWT token and teacher role" `
    -Actual "HTTP $($t1Reg.StatusCode), Token Present: $([bool]$t1Token)" `
    -Passed ($t1Reg.StatusCode -eq 200 -and $t1Token) `
    -Evidence "Teacher ID: $t1Id, Role: $($t1Reg.Data.role)"

# 1.3 Teacher 2 Registration & Login (for multi-tenant isolation)
$t2Reg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Teacher Beta"
    email = "journey_teacher2@test.com"
    password = "TeacherPassword123!"
    role = "teacher"
    clientCode = "DEFAULT"
}
$t2Token = $t2Reg.Data.token
$t2Id = $t2Reg.Data._id
Record-TestResult -StepNumber 3 -StepName "Teacher 2 Registration & Token Generation" `
    -Expected "HTTP 200 with JWT token" `
    -Actual "HTTP $($t2Reg.StatusCode), Token Present: $([bool]$t2Token)" `
    -Passed ($t2Reg.StatusCode -eq 200 -and $t2Token) `
    -Evidence "Teacher 2 ID: $t2Id"

# 1.4 Student 1 Registration & Login
$s1Reg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Student Alice"
    email = "journey_student1@test.com"
    password = "StudentPassword123!"
    role = "student"
    studentId = "ALICE-01"
    clientCode = "DEFAULT"
}
$s1Token = $s1Reg.Data.token
$s1Id = $s1Reg.Data._id
Record-TestResult -StepNumber 4 -StepName "Student 1 Registration & Token Generation" `
    -Expected "HTTP 200 with JWT token and student role" `
    -Actual "HTTP $($s1Reg.StatusCode), Token Present: $([bool]$s1Token)" `
    -Passed ($s1Reg.StatusCode -eq 200 -and $s1Token) `
    -Evidence "Student 1 ID: $s1Id, StudentIdNumber: ALICE-01"

# 1.5 Student 2 Registration & Login (for retake and violation threshold tests)
$s2Reg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Student Bob"
    email = "journey_student2@test.com"
    password = "StudentPassword123!"
    role = "student"
    studentId = "BOB-02"
    clientCode = "DEFAULT"
}
$s2Token = $s2Reg.Data.token
$s2Id = $s2Reg.Data._id
Record-TestResult -StepNumber 5 -StepName "Student 2 Registration & Token Generation" `
    -Expected "HTTP 200 with JWT token" `
    -Actual "HTTP $($s2Reg.StatusCode), Token Present: $([bool]$s2Token)" `
    -Passed ($s2Reg.StatusCode -eq 200 -and $s2Token) `
    -Evidence "Student 2 ID: $s2Id"

# ---------------------------------------------------------------------
# STEP 2: Exam Creation, Question Capacity Limit, and Coding Question
# ---------------------------------------------------------------------
Write-Host "`n--- Step 2: Exam Creation & Question Capacity Enforcement ---" -ForegroundColor Magenta

$examCode = "JOURNEY_EXAM_" + (Get-Random -Minimum 10000 -Maximum 99999)
$examName = "Algorithms and Proctoring Examination"

$createExam = Invoke-Api -Method "POST" -Path "/api/users/exam" -Token $t1Token -Body @{
    examName = $examName
    examId = $examCode
    examPassword = "EXAM123"
    subject = "Computer Science"
    description = "End-to-End Verification Test Exam"
    duration = 30
    totalQuestions = 2
    totalMarks = 20
    passingMarks = 10
    hasCodingRound = $true
    codingMarks = 10
}
$examDbId = $createExam.Data.id
Record-TestResult -StepNumber 6 -StepName "Teacher 1 Creates Exam with Capacity 2" `
    -Expected "HTTP 200 with generated examCode" `
    -Actual "HTTP $($createExam.StatusCode), ExamCode: $examCode" `
    -Passed ($createExam.StatusCode -eq 200 -and $createExam.Data.examId -eq $examCode) `
    -Evidence "Database ID: $examDbId, TotalQuestions Capacity: 2"

# 2.2 Add Question 1 (1/2)
$q1 = Invoke-Api -Method "POST" -Path "/api/users/exam/questions" -Token $t1Token -Body @{
    examId = $examCode
    question = "What is the worst-case time complexity of QuickSort?"
    marks = 5
    correctOptionIndex = 2
    options = @(
        @{ text = "O(n)"; isCorrect = $false },
        @{ text = "O(n log n)"; isCorrect = $false },
        @{ text = "O(n^2)"; isCorrect = $true },
        @{ text = "O(1)"; isCorrect = $false }
    )
}
$q1Id = $q1.Data.id
Record-TestResult -StepNumber 7 -StepName "Teacher 1 Adds MCQ Question 1 (1/2 Capacity)" `
    -Expected "HTTP 200 with question ID" `
    -Actual "HTTP $($q1.StatusCode), Q1 ID: $q1Id" `
    -Passed ($q1.StatusCode -eq 200 -and $q1Id) `
    -Evidence "Question Text: $($q1.Data.questionText)"

# 2.3 Add Question 2 (2/2)
$q2 = Invoke-Api -Method "POST" -Path "/api/users/exam/questions" -Token $t1Token -Body @{
    examId = $examCode
    question = "Which data structure operates on a First-In-First-Out (FIFO) basis?"
    marks = 5
    correctOptionIndex = 1
    options = @(
        @{ text = "Stack"; isCorrect = $false },
        @{ text = "Queue"; isCorrect = $true },
        @{ text = "Heap"; isCorrect = $false },
        @{ text = "Binary Tree"; isCorrect = $false }
    )
}
$q2Id = $q2.Data.id
Record-TestResult -StepNumber 8 -StepName "Teacher 1 Adds MCQ Question 2 (2/2 Capacity)" `
    -Expected "HTTP 200 with question ID" `
    -Actual "HTTP $($q2.StatusCode), Q2 ID: $q2Id" `
    -Passed ($q2.StatusCode -eq 200 -and $q2Id) `
    -Evidence "Question Text: $($q2.Data.questionText)"

# 2.4 Add 3rd Question (Must be REJECTED by capacity limit)
$q3 = Invoke-Api -Method "POST" -Path "/api/users/exam/questions" -Token $t1Token -Body @{
    examId = $examCode
    question = "Third question exceeding capacity limit"
    marks = 5
    correctOptionIndex = 0
    options = @(
        @{ text = "Option A"; isCorrect = $true },
        @{ text = "Option B"; isCorrect = $false }
    )
}
Record-TestResult -StepNumber 9 -StepName "Enforce MCQ Limit (Reject 3rd Question for Capacity 2)" `
    -Expected "HTTP 400 Bad Request" `
    -Actual "HTTP $($q3.StatusCode)" `
    -Passed ($q3.StatusCode -eq 400) `
    -Evidence ($q3.Data | ConvertTo-Json -Compress)

# 2.5 Teacher 1 adds Coding Question with test cases
$codingQ = Invoke-Api -Method "POST" -Path "/api/coding/question" -Token $t1Token -Body @{
    examId = $examCode
    title = "Find Array Maximum Element"
    description = "Given space-separated integers, output the maximum value."
    difficulty = "Easy"
    marks = 10
    allowedLanguages = "javascript,python,java,cpp"
    sampleTestCases = @(
        @{ input = "3 1 4 1 5 9"; output = "9" }
    )
    hiddenTestCases = @(
        @{ input = "-10 -20 -5 -30"; output = "-5" },
        @{ input = "42"; output = "42" }
    )
}
Record-TestResult -StepNumber 10 -StepName "Teacher 1 Adds Coding Problem with Test Cases" `
    -Expected "HTTP 201 Created with problem data" `
    -Actual "HTTP $($codingQ.StatusCode)" `
    -Passed ($codingQ.StatusCode -eq 201) `
    -Evidence "Coding Problem: $($codingQ.Data.data.title)"

# ---------------------------------------------------------------------
# STEP 3: Student Enrollment & Teacher Approval Workflow
# ---------------------------------------------------------------------
Write-Host "`n--- Step 3: Enrollment Request & Approval Workflow ---" -ForegroundColor Magenta

# 3.1 Student 1 requests enrollment
$reqS1 = Invoke-Api -Method "POST" -Path "/api/users/exam/$examCode/request-enrollment" -Token $s1Token
Record-TestResult -StepNumber 11 -StepName "Student 1 Requests Exam Enrollment" `
    -Expected "HTTP 200 with status PENDING" `
    -Actual "HTTP $($reqS1.StatusCode), Status: $($reqS1.Data.status)" `
    -Passed ($reqS1.StatusCode -eq 200 -and $reqS1.Data.status -eq "PENDING") `
    -Evidence ($reqS1.Data | ConvertTo-Json -Compress)

# 3.2 Unapproved Student 1 cannot start exam (HTTP 403)
$unapprovedStart = Invoke-Api -Method "POST" -Path "/api/sessions/start" -Token $s1Token -Body @{
    examId = $examCode
    examPassword = "EXAM123"
}
Record-TestResult -StepNumber 12 -StepName "Unapproved Student Starting Exam Rejected" `
    -Expected "HTTP 403 Forbidden" `
    -Actual "HTTP $($unapprovedStart.StatusCode)" `
    -Passed ($unapprovedStart.StatusCode -eq 403) `
    -Evidence ($unapprovedStart.Data | ConvertTo-Json -Compress)

# 3.3 Teacher 1 checks pending requests and sees Student 1
$pendingList = Invoke-Api -Method "GET" -Path "/api/users/exam/$examCode/enrollment-requests" -Token $t1Token
$s1InList = $false
if ($pendingList.Data) {
    foreach ($item in $pendingList.Data) {
        if ($item.studentId -eq $s1Id -or $item.email -eq "journey_student1@test.com") {
            $s1InList = $true
        }
    }
}
Record-TestResult -StepNumber 13 -StepName "Teacher 1 Views Pending Requests and Sees Student 1" `
    -Expected "Student 1 present in pending requests list" `
    -Actual "Found in list: $s1InList (Total Pending: $($pendingList.Data.Count))" `
    -Passed ($s1InList) `
    -Evidence "Pending Requests Count: $($pendingList.Data.Count)"

# 3.4 Teacher 1 Approves Student 1
$approveS1 = Invoke-Api -Method "POST" -Path "/api/users/exam/$examCode/approve-student/$s1Id" -Token $t1Token
Record-TestResult -StepNumber 14 -StepName "Teacher 1 Approves Student 1 Enrollment" `
    -Expected "HTTP 200 with success message" `
    -Actual "HTTP $($approveS1.StatusCode)" `
    -Passed ($approveS1.StatusCode -eq 200) `
    -Evidence ($approveS1.Data | ConvertTo-Json -Compress)

# ---------------------------------------------------------------------
# STEP 4: Student Exam Execution & Question Answering
# ---------------------------------------------------------------------
Write-Host "`n--- Step 4: Exam Execution & Answer Saving ---" -ForegroundColor Magenta

# 4.1 Approved Student 1 starts exam session
$startSession = Invoke-Api -Method "POST" -Path "/api/sessions/start" -Token $s1Token -Body @{
    examId = $examCode
    examPassword = "EXAM123"
    deviceInfo = "Chrome 125, Windows 11, Verified Webcam"
}
$attemptId = $startSession.Data.attemptId
Record-TestResult -StepNumber 15 -StepName "Approved Student 1 Starts Exam Session" `
    -Expected "HTTP 200 with active attemptId and secondsLeft" `
    -Actual "HTTP $($startSession.StatusCode), Attempt ID: $attemptId" `
    -Passed ($startSession.StatusCode -eq 200 -and $attemptId) `
    -Evidence "Seconds Left: $($startSession.Data.secondsLeft)"

# 4.2 Student fetches questions -> options visible, correct answers concealed
$getQuestions = Invoke-Api -Method "GET" -Path "/api/users/exam/questions/$examCode" -Token $s1Token
$concealed = $true
if ($getQuestions.Data) {
    foreach ($q in $getQuestions.Data) {
        if ($null -ne $q.correctOptionIndex) { $concealed = $false }
        if ($q.options) {
            foreach ($o in $q.options) {
                if ($o.isCorrect -eq $true) { $concealed = $false }
            }
        }
    }
}
Record-TestResult -StepNumber 16 -StepName "Student Receives Questions with Correct Answers Concealed" `
    -Expected "All options visible, correct answers completely stripped" `
    -Actual "Concealed: $concealed, Questions Count: $($getQuestions.Data.Count)" `
    -Passed ($concealed -and $getQuestions.Data.Count -eq 2) `
    -Evidence "Question 1 Options: $($getQuestions.Data[0].options.Count), Question 2 Options: $($getQuestions.Data[1].options.Count)"

# 4.3 Student saves answers (Previous/Next navigation persistence)
$answersPayload = @{
    "$q1Id" = "2" # O(n^2) - Correct option index 2
    "$q2Id" = "1" # Queue - Correct option index 1
}
$autosave = Invoke-Api -Method "POST" -Path "/api/sessions/$attemptId/autosave" -Token $s1Token -Body @{
    answers = $answersPayload
}
Record-TestResult -StepNumber 17 -StepName "Student Autosaves Answers (Navigation Persistence)" `
    -Expected "HTTP 200 with saved answers" `
    -Actual "HTTP $($autosave.StatusCode)" `
    -Passed ($autosave.StatusCode -eq 200) `
    -Evidence ($autosave.Data | ConvertTo-Json -Compress)

# ---------------------------------------------------------------------
# STEP 5: Proctoring Violations & Multi-Channel Detection
# ---------------------------------------------------------------------
Write-Host "`n--- Step 5: Proctoring Violations & Logging ---" -ForegroundColor Magenta

# 5.1 Trigger Violations: Phone, No Face, Multiple Faces, Looking Away, Voice Detected
$vList = @("CELL_PHONE", "NO_FACE", "MULTIPLE_FACES", "LOOKING_AWAY", "VOICE_DETECTED")
$allViolationsLogged = $true
foreach ($vt in $vList) {
    $vResp = Invoke-Api -Method "POST" -Path "/api/proctoring/events" -Token $s1Token -Body @{
        sessionId = $attemptId
        eventType = $vt
        severity = "MEDIUM"
        confidence = 0.98
        description = "Proctoring test detection: $vt"
        evidenceUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/test_evidence_$vt"
    }
    if ($vResp.StatusCode -ne 200) { $allViolationsLogged = $false }
}
Record-TestResult -StepNumber 18 -StepName "Trigger 5 Discrete Violation Events (MCQ & Coding Channels)" `
    -Expected "All 5 violation types accepted with HTTP 200" `
    -Actual "All Logged: $allViolationsLogged" `
    -Passed ($allViolationsLogged) `
    -Evidence "Events: $($vList -join ', ')"

# 5.2 Verify Violations in Teacher Exam Logs
$examLogs = Invoke-Api -Method "GET" -Path "/api/admin/logs?examId=$examCode" -Token $t1Token
$logsContainViolations = ($examLogs.Data -and $examLogs.Data.Count -ge 5)
Record-TestResult -StepNumber 19 -StepName "Teacher Exam Logs Display Logged Violations" `
    -Expected "HTTP 200 with at least 5 logged proctoring events" `
    -Actual "HTTP $($examLogs.StatusCode), Logged Events Count: $($examLogs.Data.Count)" `
    -Passed ($examLogs.StatusCode -eq 200 -and $logsContainViolations) `
    -Evidence "First Log Event Type: $($examLogs.Data[0].eventType)"

# ---------------------------------------------------------------------
# STEP 6: Submission, Scoring, Un-Enrollment, & Retake Prevention
# ---------------------------------------------------------------------
Write-Host "`n--- Step 6: Submission, Scoring, Un-Enrollment & Retake Prevention ---" -ForegroundColor Magenta

# 6.1 Submit Exam
$submitExam = Invoke-Api -Method "POST" -Path "/api/sessions/$attemptId/submit" -Token $s1Token -Body @{
    answers = $answersPayload
}
Record-TestResult -StepNumber 20 -StepName "Student 1 Submits Exam" `
    -Expected "HTTP 200 with submission summary" `
    -Actual "HTTP $($submitExam.StatusCode)" `
    -Passed ($submitExam.StatusCode -eq 200) `
    -Evidence ($submitExam.Data | ConvertTo-Json -Compress)

# 6.2 Check Score Calculation (MCQ marks = 10, passingMarks = 10, Passed = true)
$stuResults = Invoke-Api -Method "GET" -Path "/api/users/results/user" -Token $s1Token
$foundResult = $null
if ($stuResults.Data) {
    $arr = if ($stuResults.Data.data) { $stuResults.Data.data } else { $stuResults.Data }
    foreach ($item in $arr) {
        if ($item.examId -eq $examCode -or $item.examCode -eq $examCode) {
            $foundResult = $item
        }
    }
}
$scoreAccurate = ($foundResult -and $foundResult.obtainedMarks -eq 10 -and $foundResult.totalMarks -ge 10)
Record-TestResult -StepNumber 21 -StepName "Verify Accurate Score & Pass/Fail Calculation" `
    -Expected "Obtained Marks: 10/10 MCQ, Status: Pass" `
    -Actual "Obtained: $($foundResult.obtainedMarks), Total: $($foundResult.totalMarks), Passed: $($foundResult.passed)" `
    -Passed ($scoreAccurate) `
    -Evidence "Percentage: $($foundResult.percentage)%"

# 6.3 Verify Student is Un-Enrolled (Status COMPLETED) and Cannot Retake
$retakeAttempt = Invoke-Api -Method "POST" -Path "/api/sessions/start" -Token $s1Token -Body @{
    examId = $examCode
    examPassword = "EXAM123"
}
Record-TestResult -StepNumber 22 -StepName "Submitted Student Blocked from Retaking Exam" `
    -Expected "HTTP 403 Forbidden" `
    -Actual "HTTP $($retakeAttempt.StatusCode)" `
    -Passed ($retakeAttempt.StatusCode -eq 403) `
    -Evidence ($retakeAttempt.Data | ConvertTo-Json -Compress)

# 6.4 Student cannot self-re-enroll after completion
$reReq = Invoke-Api -Method "POST" -Path "/api/users/exam/$examCode/request-enrollment" -Token $s1Token
Record-TestResult -StepNumber 23 -StepName "Completed Student Cannot Self Re-Enroll" `
    -Expected "HTTP 400 Bad Request" `
    -Actual "HTTP $($reReq.StatusCode)" `
    -Passed ($reReq.StatusCode -eq 400) `
    -Evidence ($reReq.Data | ConvertTo-Json -Compress)

# 6.5 Teacher Re-Enrolls Student 1 -> Retake Becomes Authorized
$teacherReEnroll = Invoke-Api -Method "POST" -Path "/api/users/exam/$examCode/approve-student/$s1Id" -Token $t1Token
Record-TestResult -StepNumber 24 -StepName "Teacher Explicitly Re-Enrolls Student 1" `
    -Expected "HTTP 200 with approval confirmation" `
    -Actual "HTTP $($teacherReEnroll.StatusCode)" `
    -Passed ($teacherReEnroll.StatusCode -eq 200) `
    -Evidence ($teacherReEnroll.Data | ConvertTo-Json -Compress)

$retakeAfterReEnroll = Invoke-Api -Method "POST" -Path "/api/sessions/start" -Token $s1Token -Body @{
    examId = $examCode
    examPassword = "EXAM123"
}
Record-TestResult -StepNumber 25 -StepName "Student 1 Can Start New Attempt After Teacher Re-Enrollment" `
    -Expected "HTTP 200 with new active attempt" `
    -Actual "HTTP $($retakeAfterReEnroll.StatusCode), New Attempt ID: $($retakeAfterReEnroll.Data.attemptId)" `
    -Passed ($retakeAfterReEnroll.StatusCode -eq 200 -and $retakeAfterReEnroll.Data.attemptId) `
    -Evidence "New Attempt ID: $($retakeAfterReEnroll.Data.attemptId)"

# ---------------------------------------------------------------------
# STEP 7: 6-Violation Auto-Termination Threshold Test (with Student 2)
# ---------------------------------------------------------------------
Write-Host "`n--- Step 7: 6-Violation Auto-Termination Threshold ---" -ForegroundColor Magenta

# 7.1 Teacher 1 approves Student 2
$s2Enroll = Invoke-Api -Method "POST" -Path "/api/users/exam/$examCode/approve-student/$s2Id" -Token $t1Token
$s2Start = Invoke-Api -Method "POST" -Path "/api/sessions/start" -Token $s2Token -Body @{
    examId = $examCode
    examPassword = "EXAM123"
}
$s2AttemptId = $s2Start.Data.attemptId

# Log 6 violations for Student 2
for ($i = 1; $i -le 6; $i++) {
    $vTerm = Invoke-Api -Method "POST" -Path "/api/proctoring/events" -Token $s2Token -Body @{
        sessionId = $s2AttemptId
        eventType = "CELL_PHONE"
        severity = "HIGH"
        confidence = 0.99
        description = "Threshold termination test violation #$i"
    }
}

# Verify Student 2 attempt is auto-terminated
$s2ActiveAttempt = Invoke-Api -Method "GET" -Path "/api/students/active-attempt" -Token $s2Token
$isTerminated = ($s2ActiveAttempt.StatusCode -eq 404 -or $null -eq $s2ActiveAttempt.Data.attemptId)
Record-TestResult -StepNumber 26 -StepName "Reaching 6 Violations Auto-Terminates Student Exam" `
    -Expected "Active attempt ended (HTTP 404 / no active attempt)" `
    -Actual "Status: $($s2ActiveAttempt.StatusCode), Active Attempt: $($s2ActiveAttempt.Data.attemptId)" `
    -Passed ($isTerminated) `
    -Evidence "Student 2 Session Auto-Disqualified"

# ---------------------------------------------------------------------
# STEP 8: Results Visibility & Multi-Tenant Teacher/Student Isolation
# ---------------------------------------------------------------------
Write-Host "`n--- Step 8: Multi-Tenant Data Isolation ---" -ForegroundColor Magenta

# 8.1 Student 1 Detailed Proctoring Report
$s1Report = Invoke-Api -Method "GET" -Path "/api/proctoring/report/$attemptId" -Token $s1Token
$reportHasDetails = ($s1Report.StatusCode -eq 200 -and ($s1Report.Data.report -or $s1Report.Data.data))
Record-TestResult -StepNumber 27 -StepName "Student 1 Views Detailed Exam & Proctoring Report" `
    -Expected "HTTP 200 with full question breakdown and violation summary" `
    -Actual "HTTP $($s1Report.StatusCode), Report Present: $reportHasDetails" `
    -Passed ($reportHasDetails) `
    -Evidence "Report Attempt ID: $attemptId"

# 8.2 Student 2 cannot access Student 1's report (HTTP 403)
$s2AccessS1 = Invoke-Api -Method "GET" -Path "/api/proctoring/report/$attemptId" -Token $s2Token
Record-TestResult -StepNumber 28 -StepName "Student 2 Rejected from Viewing Student 1's Report" `
    -Expected "HTTP 403 Forbidden" `
    -Actual "HTTP $($s2AccessS1.StatusCode)" `
    -Passed ($s2AccessS1.StatusCode -eq 403) `
    -Evidence ($s2AccessS1.Data | ConvertTo-Json -Compress)

# 8.3 Teacher 2 cannot view or edit Teacher 1's exam questions (HTTP 403)
$t2AccessT1Q = Invoke-Api -Method "GET" -Path "/api/users/exam/questions/$examCode" -Token $t2Token
Record-TestResult -StepNumber 29 -StepName "Teacher 2 Rejected from Viewing Teacher 1's Exam Questions" `
    -Expected "HTTP 403 Forbidden" `
    -Actual "HTTP $($t2AccessT1Q.StatusCode)" `
    -Passed ($t2AccessT1Q.StatusCode -eq 403) `
    -Evidence ($t2AccessT1Q.Data | ConvertTo-Json -Compress)

# 8.4 Teacher 2 cannot access Student 1's report for Teacher 1's exam (HTTP 403)
$t2AccessS1Report = Invoke-Api -Method "GET" -Path "/api/proctoring/report/$attemptId" -Token $t2Token
Record-TestResult -StepNumber 30 -StepName "Teacher 2 Rejected from Viewing Report for Teacher 1's Exam" `
    -Expected "HTTP 403 Forbidden" `
    -Actual "HTTP $($t2AccessS1Report.StatusCode)" `
    -Passed ($t2AccessS1Report.StatusCode -eq 403) `
    -Evidence ($t2AccessS1Report.Data | ConvertTo-Json -Compress)

# 8.5 Teacher 1 views Dashboard Stats (real dynamic MySQL metrics)
$t1Dash = Invoke-Api -Method "GET" -Path "/api/admin/dashboard" -Token $t1Token
$totalExamsCount = if ($t1Dash.Data -and $t1Dash.Data.totalExams) { $t1Dash.Data.totalExams } elseif ($t1Dash.Data -and $t1Dash.Data.stats) { $t1Dash.Data.stats.totalExams } else { 0 }
Record-TestResult -StepNumber 31 -StepName "Teacher 1 Dashboard Displays Dynamic MySQL Statistics" `
    -Expected "HTTP 200 with totalExams >= 1" `
    -Actual "HTTP $($t1Dash.StatusCode), Total Exams: $totalExamsCount" `
    -Passed ($t1Dash.StatusCode -eq 200 -and $totalExamsCount -ge 1) `
    -Evidence "Submissions: $($t1Dash.Data.stats.submissions), Violations: $($t1Dash.Data.stats.totalViolations)"

# ---------------------------------------------------------------------
# SUMMARY & PASS/FAIL TABLE
# ---------------------------------------------------------------------
Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "                    E2E TEST RUN SUMMARY                         " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$passCount = ($global:testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($global:testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $global:testResults.Count

$global:testResults | Format-Table -Property StepNumber, StepName, Expected, Status -AutoSize

Write-Host "TOTAL TESTS: $totalCount | PASSED: $passCount | FAILED: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "=================================================================`n" -ForegroundColor Cyan

if ($failCount -gt 0) {
    exit 1
} else {
    exit 0
}
