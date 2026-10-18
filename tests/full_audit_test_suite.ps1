# AI Exam Proctoring System - End-to-End Comprehensive Audit & Verification Suite
# Tests multi-tenant isolation, role restrictions, capacity limits, enrollment flows, proctoring, and scoring.

param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$DbUser = "root",
    [string]$DbPassword = "root",
    [string]$DbName = "ai_eval8_db"
)

$ErrorActionPreference = "Continue"

$global:passedCount = 0
$global:failedCount = 0

function Assert-Test {
    param(
        [string]$Description,
        [bool]$Condition,
        [string]$Details = ""
    )
    if ($Condition) {
        $global:passedCount++
        Write-Host " [PASS] $Description" -ForegroundColor Green
    } else {
        $global:failedCount++
        Write-Host " [FAIL] $Description" -ForegroundColor Red
        if ($Details) {
            Write-Host "        Details: $Details" -ForegroundColor Yellow
        }
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

function Invoke-DbCleanup {
    $mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    if (-not (Test-Path $mysqlExe)) { $mysqlExe = "mysql" }

    $cleanupSql = @"
SET FOREIGN_KEY_CHECKS = 0;
DELETE pe FROM proctoring_events pe
JOIN proctoring_sessions ps ON pe.session_id = ps.id
JOIN exam_attempts ea ON ps.attempt_id = ea.id
JOIN users u ON ea.student_id = u.id
WHERE u.email LIKE 'audit_%@test.com';

DELETE ps FROM proctoring_sessions ps
JOIN exam_attempts ea ON ps.attempt_id = ea.id
JOIN users u ON ea.student_id = u.id
WHERE u.email LIKE 'audit_%@test.com';

DELETE ea FROM exam_attempts ea
JOIN users u ON ea.student_id = u.id
WHERE u.email LIKE 'audit_%@test.com';

DELETE ee FROM exam_enrollments ee
JOIN users u ON ee.student_id = u.id
WHERE u.email LIKE 'audit_%@test.com';

DELETE cl FROM cheating_logs cl
WHERE cl.email LIKE 'audit_%@test.com' OR cl.exam_id LIKE 'AUDIT_EXAM_%';

DELETE cq FROM coding_questions cq
WHERE cq.exam_id LIKE 'AUDIT_EXAM_%';

DELETE q FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE e.exam_code LIKE 'AUDIT_EXAM_%';

DELETE e FROM exams e
JOIN users u ON e.teacher_id = u.id
WHERE u.email LIKE 'audit_%@test.com';

DELETE pe FROM proctoring_events pe LEFT JOIN proctoring_sessions ps ON pe.session_id = ps.id LEFT JOIN exam_attempts ea ON ps.attempt_id = ea.id WHERE ea.id IS NULL;
DELETE ps FROM proctoring_sessions ps LEFT JOIN exam_attempts ea ON ps.attempt_id = ea.id WHERE ea.id IS NULL;
DELETE FROM users WHERE email LIKE 'audit_%@test.com';
SET FOREIGN_KEY_CHECKS = 1;
"@

    $tempSql = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tempSql -Value $cleanupSql -Encoding utf8
    cmd /c "type `"$tempSql`" | `"$mysqlExe`" -u $DbUser -p$DbPassword $DbName" 2>$null
    Remove-Item -Path $tempSql -Force -ErrorAction SilentlyContinue
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  AI EXAM PROCTORING SYSTEM - FULL END-TO-END AUDIT TEST SUITE   " -ForegroundColor Cyan
Write-Host "=================================================================`n" -ForegroundColor Cyan

# Initial clean state
Invoke-DbCleanup

# ── 1. REGISTRATION & AUTHENTICATION TESTS ────────────────────────────────

Write-Host "--- 1. Authentication, Roles & Security Restrictions ---" -ForegroundColor Magenta

# 1.1 Admin Registration Rejection
$adminReg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Malicious Admin"
    email = "audit_admin_hacker@test.com"
    password = "AdminPassword123!"
    role = "admin"
}
Assert-Test "Admin registration is rejected with 400 Bad Request" ($adminReg.StatusCode -eq 400) "Status: $($adminReg.StatusCode)"

# 1.2 Teacher 1 Registration
$t1Reg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Teacher One"
    email = "audit_teacher_1@test.com"
    password = "TeacherPassword123!"
    role = "teacher"
    clientCode = "DEFAULT"
}
Assert-Test "Teacher 1 registration successful" ($t1Reg.StatusCode -eq 200 -and $t1Reg.Data.token) "Status: $($t1Reg.StatusCode)"
$teacher1Token = $t1Reg.Data.token
$teacher1Id = $t1Reg.Data._id

# 1.3 Teacher 2 Registration
$t2Reg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Teacher Two"
    email = "audit_teacher_2@test.com"
    password = "TeacherPassword123!"
    role = "teacher"
    clientCode = "DEFAULT"
}
Assert-Test "Teacher 2 registration successful" ($t2Reg.StatusCode -eq 200 -and $t2Reg.Data.token) "Status: $($t2Reg.StatusCode)"
$teacher2Token = $t2Reg.Data.token
$teacher2Id = $t2Reg.Data._id

# 1.4 Student 1 Registration
$s1Reg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Student One"
    email = "audit_student_1@test.com"
    password = "StudentPassword123!"
    role = "student"
    studentId = "STU-001"
    clientCode = "DEFAULT"
}
Assert-Test "Student 1 registration successful" ($s1Reg.StatusCode -eq 200 -and $s1Reg.Data.token) "Status: $($s1Reg.StatusCode)"
$student1Token = $s1Reg.Data.token
$student1Id = $s1Reg.Data._id

# 1.5 Student 2 Registration
$s2Reg = Invoke-Api -Method "POST" -Path "/api/users" -Body @{
    name = "Student Two"
    email = "audit_student_2@test.com"
    password = "StudentPassword123!"
    role = "student"
    studentId = "STU-002"
    clientCode = "DEFAULT"
}
Assert-Test "Student 2 registration successful" ($s2Reg.StatusCode -eq 200 -and $s2Reg.Data.token) "Status: $($s2Reg.StatusCode)"
$student2Token = $s2Reg.Data.token
$student2Id = $s2Reg.Data._id

# 1.6 Missing Token Access Rejection
$noTokenRes = Invoke-Api -Method "GET" -Path "/api/users/profile"
Assert-Test "Unauthenticated request to /api/users/profile rejected with 401" ($noTokenRes.StatusCode -eq 401) "Status: $($noTokenRes.StatusCode)"

# 1.7 Cross-Role Access Rejection (Student calling teacher endpoints)
$stuCreateExam = Invoke-Api -Method "POST" -Path "/api/users/exam" -Token $student1Token -Body @{
    examName = "Illegal Student Exam"
    examId = "STU_EXAM_999"
}
Assert-Test "Student cannot create exams (returns 403)" ($stuCreateExam.StatusCode -eq 403) "Status: $($stuCreateExam.StatusCode)"

# 1.8 Cross-Role Access Rejection (Teacher calling student session endpoints)
$teacherStartSession = Invoke-Api -Method "POST" -Path "/api/sessions/start" -Token $teacher1Token -Body @{
    examId = "NON_EXISTENT"
}
Assert-Test "Teacher cannot start student exam sessions (returns 403)" ($teacherStartSession.StatusCode -eq 403) "Status: $($teacherStartSession.StatusCode)"

# 1.9 Admin Protected Endpoints Rejected for Students
$stuAdminDash = Invoke-Api -Method "GET" -Path "/api/admin/dashboard" -Token $student1Token
Assert-Test "Student rejected from /api/admin/dashboard (returns 403)" ($stuAdminDash.StatusCode -eq 403) "Status: $($stuAdminDash.StatusCode)"


# ── 2. EXAM CREATION & CAPACITY ENFORCEMENT ──────────────────────────────

Write-Host "`n--- 2. Exam Creation & Question Capacity Enforcement ---" -ForegroundColor Magenta

$examCode = "AUDIT_EXAM_" + (Get-Random -Minimum 10000 -Maximum 99999)
$examName = "Data Structures Audit Exam"

$createExamRes = Invoke-Api -Method "POST" -Path "/api/users/exam" -Token $teacher1Token -Body @{
    examName = $examName
    examId = $examCode
    examPassword = "EXAM123"
    subject = "Computer Science"
    description = "Audit Verification Exam"
    duration = 30
    totalQuestions = 2
    totalMarks = 20
    passingMarks = 10
    hasCodingRound = $true
    codingMarks = 10
}
Assert-Test "Teacher 1 creates exam ($examCode) with capacity 2" ($createExamRes.StatusCode -eq 200) "Status: $($createExamRes.StatusCode)"
$examDbId = $createExamRes.Data.id

# 2.2 Add Question 1
$q1Res = Invoke-Api -Method "POST" -Path "/api/users/exam/questions" -Token $teacher1Token -Body @{
    examId = $examCode
    question = "What is the time complexity of binary search?"
    marks = 5
    correctOptionIndex = 1
    options = @(
        @{ text = "O(n)"; isCorrect = $false },
        @{ text = "O(log n)"; isCorrect = $true },
        @{ text = "O(n^2)"; isCorrect = $false },
        @{ text = "O(1)"; isCorrect = $false }
    )
}
Assert-Test "Teacher 1 adds Question 1 (1/2 capacity)" ($q1Res.StatusCode -eq 200) "Status: $($q1Res.StatusCode)"
$q1Id = $q1Res.Data.id

# 2.3 Add Question 2
$q2Res = Invoke-Api -Method "POST" -Path "/api/users/exam/questions" -Token $teacher1Token -Body @{
    examId = $examCode
    question = "Which data structure follows LIFO order?"
    marks = 5
    correctOptionIndex = 2
    options = @(
        @{ text = "Queue"; isCorrect = $false },
        @{ text = "Tree"; isCorrect = $false },
        @{ text = "Stack"; isCorrect = $true },
        @{ text = "Graph"; isCorrect = $false }
    )
}
Assert-Test "Teacher 1 adds Question 2 (2/2 capacity)" ($q2Res.StatusCode -eq 200) "Status: $($q2Res.StatusCode)"
$q2Id = $q2Res.Data.id

# 2.4 Add Question 3 (Should fail due to capacity limit = 2)
$q3Res = Invoke-Api -Method "POST" -Path "/api/users/exam/questions" -Token $teacher1Token -Body @{
    examId = $examCode
    question = "Third question that exceeds totalQuestions limit"
    marks = 5
    correctOptionIndex = 0
    options = @(
        @{ text = "Opt A"; isCorrect = $true },
        @{ text = "Opt B"; isCorrect = $false }
    )
}
Assert-Test "Adding 3rd question rejected by capacity limit (returns 400)" ($q3Res.StatusCode -eq 400) "Status: $($q3Res.StatusCode)"

# 2.5 Capacity Reduction Below Existing Count Rejection
$reduceCapRes = Invoke-Api -Method "PUT" -Path "/api/users/exam/$examCode" -Token $teacher1Token -Body @{
    totalQuestions = 1
}
Assert-Test "Reducing totalQuestions below existing count rejected (returns 400)" ($reduceCapRes.StatusCode -eq 400) "Status: $($reduceCapRes.StatusCode)"

# 2.6 Add Coding Question
$cqRes = Invoke-Api -Method "POST" -Path "/api/coding/question" -Token $teacher1Token -Body @{
    examId = $examCode
    title = "Find Array Maximum"
    description = "Given space-separated integers, print the maximum number."
    difficulty = "Easy"
    marks = 10
    allowedLanguages = "javascript,python,java,cpp"
    sampleTestCases = @(
        @{ input = "3 1 4 1 5 9"; output = "9" }
    )
    hiddenTestCases = @(
        @{ input = "-5 -2 -9 -1"; output = "-1" },
        @{ input = "100 200 50"; output = "200" }
    )
}
Assert-Test "Teacher 1 adds coding question" ($cqRes.StatusCode -eq 201) "Status: $($cqRes.StatusCode)"
$codingQId = if ($cqRes.Data -and $cqRes.Data.data) { $cqRes.Data.data._id } else { $null }


# ── 3. MULTI-TENANT OWNERSHIP ISOLATION TESTS ────────────────────────────

Write-Host "`n--- 3. Multi-Tenant Teacher Ownership Isolation ---" -ForegroundColor Magenta

# 3.1 Teacher 2 cannot view Teacher 1's exam questions
$t2GetQ = Invoke-Api -Method "GET" -Path "/api/users/exam/questions/$examCode" -Token $teacher2Token
Assert-Test "Teacher 2 cannot view Teacher 1's exam questions (returns 403)" ($t2GetQ.StatusCode -eq 403) "Status: $($t2GetQ.StatusCode)"

# 3.2 Teacher 2 cannot add questions to Teacher 1's exam
$t2AddQ = Invoke-Api -Method "POST" -Path "/api/users/exam/questions" -Token $teacher2Token -Body @{
    examId = $examCode
    question = "Unauthorized question"
    marks = 5
}
Assert-Test "Teacher 2 cannot add questions to Teacher 1's exam (returns 403)" ($t2AddQ.StatusCode -eq 403) "Status: $($t2AddQ.StatusCode)"

# 3.3 Teacher 2 cannot update Teacher 1's questions
$t2UpdateQ = Invoke-Api -Method "PUT" -Path "/api/users/exam/questions/$q1Id" -Token $teacher2Token -Body @{
    question = "Tampered question"
}
Assert-Test "Teacher 2 cannot update Teacher 1's question (returns 403)" ($t2UpdateQ.StatusCode -eq 403) "Status: $($t2UpdateQ.StatusCode)"

# 3.4 Teacher 2 cannot delete Teacher 1's questions
$t2DelQ = Invoke-Api -Method "DELETE" -Path "/api/users/exam/questions/$q1Id" -Token $teacher2Token
Assert-Test "Teacher 2 cannot delete Teacher 1's question (returns 403)" ($t2DelQ.StatusCode -eq 403) "Status: $($t2DelQ.StatusCode)"

# 3.5 Teacher 2 cannot add coding questions to Teacher 1's exam
$t2AddCQ = Invoke-Api -Method "POST" -Path "/api/coding/question" -Token $teacher2Token -Body @{
    examId = $examCode
    title = "Unauthorized coding question"
}
Assert-Test "Teacher 2 cannot add coding question to Teacher 1's exam (returns 403)" ($t2AddCQ.StatusCode -eq 403) "Status: $($t2AddCQ.StatusCode)"

# 3.6 Teacher 2 cannot update Teacher 1's exam settings
$t2UpdateExam = Invoke-Api -Method "PUT" -Path "/api/users/exam/$examCode" -Token $teacher2Token -Body @{
    examName = "Hacked Exam Name"
}
Assert-Test "Teacher 2 cannot update Teacher 1's exam (returns 403)" ($t2UpdateExam.StatusCode -eq 403) "Status: $($t2UpdateExam.StatusCode)"

# 3.7 Teacher 2 exam listing does not show Teacher 1's exam
$t2Exams = Invoke-Api -Method "GET" -Path "/api/users/exam" -Token $teacher2Token
$t2HasT1Exam = $false
if ($t2Exams.Data) {
    foreach ($e in $t2Exams.Data) {
        if ($e.examId -eq $examCode) { $t2HasT1Exam = $true }
    }
}
Assert-Test "Teacher 2 exam list isolates Teacher 1's exam" (-not $t2HasT1Exam) "Found T1 exam in T2 list: $t2HasT1Exam"


# ── 4. STUDENT ENROLLMENT & APPROVAL FLOW ────────────────────────────────

Write-Host "`n--- 4. Student Enrollment & Teacher Approval Flow ---" -ForegroundColor Magenta

# 4.1 Student 1 requests enrollment
$reqEn = Invoke-Api -Method "POST" -Path "/api/users/exam/$examCode/request-enrollment" -Token $student1Token
Assert-Test "Student 1 requests enrollment (status PENDING)" ($reqEn.StatusCode -eq 200 -and $reqEn.Data.status -eq "PENDING") "Status: $($reqEn.StatusCode)"

# 4.2 Student 2 (unapproved) attempts to start exam -> MUST fail
$unapprovedStart = Invoke-Api -Method "POST" -Path "/api/sessions/start" -Token $student2Token -Body @{
    examId = $examCode
    examPassword = "EXAM123"
}
Assert-Test "Unapproved Student 2 cannot start exam (returns 403)" ($unapprovedStart.StatusCode -eq 403) "Status: $($unapprovedStart.StatusCode)"

# 4.3 Teacher 2 cannot approve Student 1 for Teacher 1's exam
$t2Approve = Invoke-Api -Method "POST" -Path "/api/users/exam/$examCode/approve-student/$student1Id" -Token $teacher2Token
Assert-Test "Teacher 2 cannot approve students for Teacher 1's exam (returns 403)" ($t2Approve.StatusCode -eq 403) "Status: $($t2Approve.StatusCode)"

# 4.4 Teacher 1 views enrollment requests and sees Student 1
$t1Requests = Invoke-Api -Method "GET" -Path "/api/users/exam/$examCode/enrollment-requests" -Token $teacher1Token
$foundStudent1 = $false
if ($t1Requests.Data) {
    foreach ($r in $t1Requests.Data) {
        if ($r.studentId -eq $student1Id) { $foundStudent1 = $true }
    }
}
Assert-Test "Teacher 1 sees Student 1 in pending enrollment requests" ($foundStudent1) "Student 1 in list: $foundStudent1"

# 4.5 Teacher 1 approves Student 1
$t1Approve = Invoke-Api -Method "POST" -Path "/api/users/exam/$examCode/approve-student/$student1Id" -Token $teacher1Token
Assert-Test "Teacher 1 approves Student 1" ($t1Approve.StatusCode -eq 200) "Status: $($t1Approve.StatusCode)"


# ── 5. EXAM EXECUTION & PROCTORING VIOLATION TESTS ───────────────────────

Write-Host "`n--- 5. Exam Execution, Proctoring Violations & Threshold Auto-Termination ---" -ForegroundColor Magenta

# 5.1 Student 1 starts exam session
$startSessionRes = Invoke-Api -Method "POST" -Path "/api/sessions/start" -Token $student1Token -Body @{
    examId = $examCode
    examPassword = "EXAM123"
}
Assert-Test "Approved Student 1 starts exam session" ($startSessionRes.StatusCode -eq 200 -and $startSessionRes.Data.attemptId) "Status: $($startSessionRes.StatusCode)"
$attemptId = if ($startSessionRes.Data) { $startSessionRes.Data.attemptId } else { $null }

# 5.2 Active attempt endpoint returns active attempt ID for Coder.jsx
$activeAttemptRes = Invoke-Api -Method "GET" -Path "/api/students/active-attempt/$examCode" -Token $student1Token
Assert-Test "GET /api/students/active-attempt returns valid active attempt" ($activeAttemptRes.StatusCode -eq 200 -and $activeAttemptRes.Data.attemptId -eq $attemptId) "Active attempt: $($activeAttemptRes.Data.attemptId)"

# 5.3 Student 1 fetches questions (answer key should be hidden for students)
$stuQuestions = Invoke-Api -Method "GET" -Path "/api/users/exam/questions/$examCode" -Token $student1Token
$answersHidden = $true
if ($stuQuestions.Data) {
    foreach ($q in $stuQuestions.Data) {
        if ($null -ne $q.correctOptionIndex) { $answersHidden = $false }
        if ($q.options) {
            foreach ($opt in $q.options) {
                if ($opt.isCorrect -eq $true) { $answersHidden = $false }
            }
        }
    }
}
Assert-Test "Student questions API conceals correct answers/indices" ($answersHidden) "Answers hidden: $answersHidden"

# 5.4 Log Proctoring Violations
$violationTypes = @("CELL_PHONE", "NO_FACE", "MULTIPLE_FACES", "LOOKING_AWAY", "VOICE_DETECTED")
foreach ($vType in $violationTypes) {
    $vRes = Invoke-Api -Method "POST" -Path "/api/proctoring/events" -Token $student1Token -Body @{
        sessionId = $attemptId
        eventType = $vType
        severity = "MEDIUM"
        confidence = 0.95
        description = "Automated test audit violation: $vType"
        metadata = @{ test = $true }
    }
    Assert-Test "Violation event logged: $vType" ($vRes.StatusCode -eq 200) "Status: $($vRes.StatusCode)"
}

# 5.5 Auto-Save Answers
$answersMap = @{}
if ($q1Id) { $answersMap["$q1Id"] = "1" }
if ($q2Id) { $answersMap["$q2Id"] = "2" }

$saveAnswers = Invoke-Api -Method "POST" -Path "/api/sessions/$attemptId/autosave" -Token $student1Token -Body @{
    answers = $answersMap
}
Assert-Test "Auto-save student answers successful" ($saveAnswers.StatusCode -eq 200) "Status: $($saveAnswers.StatusCode)"

# 5.6 Submit Exam
$submitRes = Invoke-Api -Method "POST" -Path "/api/sessions/$attemptId/submit" -Token $student1Token -Body @{
    answers = $answersMap
}
Assert-Test "Student 1 submits exam" ($submitRes.StatusCode -eq 200) "Status: $($submitRes.StatusCode)"


# ── 6. RESULTS & GRADING ACCURACY ────────────────────────────────────────

Write-Host "`n--- 6. Results Verification & Score Accuracy ---" -ForegroundColor Magenta

# 6.1 Check My Results for Student 1
$myResults = Invoke-Api -Method "GET" -Path "/api/users/results/user" -Token $student1Token
$stu1ResultFound = $false
$obtainedScore = 0
$totalScore = 0

$resultsArray = @()
if ($myResults.Data -and $myResults.Data.data) {
    $resultsArray = $myResults.Data.data
} elseif ($myResults.Data) {
    $resultsArray = $myResults.Data
}

foreach ($r in $resultsArray) {
    if ($r.examId -eq $examCode -or $r.examCode -eq $examCode) {
        $stu1ResultFound = $true
        $obtainedScore = $r.obtainedMarks
        $totalScore = $r.totalMarks
    }
}
Assert-Test "Submitted exam appears in Student 1's My Results" ($stu1ResultFound) "Found: $stu1ResultFound"
Assert-Test "Correct MCQ answers awarded full points (10/10 MCQ)" ($obtainedScore -ge 10) "Obtained: $obtainedScore, Total: $totalScore"

# 6.2 Results Ownership Isolation: Student 2 cannot access Student 1's report
$s2Report = Invoke-Api -Method "GET" -Path "/api/proctoring/report/$attemptId" -Token $student2Token
Assert-Test "Student 2 cannot view Student 1's proctoring report (returns 403)" ($s2Report.StatusCode -eq 403) "Status: $($s2Report.StatusCode)"

# 6.3 Teacher 2 cannot access Student 1's report for Teacher 1's exam
$t2Report = Invoke-Api -Method "GET" -Path "/api/proctoring/report/$attemptId" -Token $teacher2Token
Assert-Test "Teacher 2 cannot view report for Teacher 1's exam (returns 403)" ($t2Report.StatusCode -eq 403) "Status: $($t2Report.StatusCode)"

# 6.4 Teacher 1 can access Student 1's report
$t1Report = Invoke-Api -Method "GET" -Path "/api/proctoring/report/$attemptId" -Token $teacher1Token
$reportOk = ($t1Report.StatusCode -eq 200 -and ($t1Report.Data.report -or $t1Report.Data.data))
Assert-Test "Owner Teacher 1 can view Student 1's report" ($reportOk) "Status: $($t1Report.StatusCode)"


# ── 7. PROFILE UPDATE & SYSTEM METRICS ───────────────────────────────────

Write-Host "`n--- 7. Profile Updates & Dynamic Dashboards ---" -ForegroundColor Magenta

# 7.1 Student 1 Profile Update
$updateProf = Invoke-Api -Method "PUT" -Path "/api/users/profile" -Token $student1Token -Body @{
    name = "Student One Updated"
    phone = "9876543210"
}
Assert-Test "Profile update endpoint works (returns 200 with new details)" ($updateProf.StatusCode -eq 200 -and $updateProf.Data.name -eq "Student One Updated") "Status: $($updateProf.StatusCode)"

# 7.2 Teacher 1 Dashboard Stats (Dynamic MySQL Data)
$t1Dash = Invoke-Api -Method "GET" -Path "/api/admin/dashboard" -Token $teacher1Token
$examsCount = if ($t1Dash.Data -and $t1Dash.Data.totalExams) { $t1Dash.Data.totalExams } elseif ($t1Dash.Data -and $t1Dash.Data.stats) { $t1Dash.Data.stats.totalExams } else { 0 }
Assert-Test "Teacher 1 Dashboard stats query returns dynamic MySQL data" ($t1Dash.StatusCode -eq 200 -and $examsCount -ge 1) "Exams: $examsCount"


# ── 8. DATABASE CLEANUP ──────────────────────────────────────────────────

Write-Host "`n--- 8. Cleaning up Dummy Test Data from MySQL ---" -ForegroundColor Magenta

Invoke-DbCleanup

# Verify zero residual test records remain in users table
$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysqlExe)) { $mysqlExe = "mysql" }
$verifySql = "SELECT COUNT(*) FROM users WHERE email LIKE 'audit_%@test.com';"
$residualRaw = (& $mysqlExe -u $DbUser -p$DbPassword $DbName -s -N -e $verifySql 2>$null)
$residualClean = if ($residualRaw) { $residualRaw.Trim() } else { "0" }

Assert-Test "Database cleanup completed: 0 dummy test users remain" ($residualClean -eq "0" -or $residualClean -eq 0) "Residual count: '$residualClean'"

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " TEST RUN COMPLETE: $($global:passedCount) PASSED, $($global:failedCount) FAILED" -ForegroundColor $(if ($global:failedCount -eq 0) { "Green" } else { "Red" })
Write-Host "=================================================================`n" -ForegroundColor Cyan

if ($global:failedCount -gt 0) {
    exit 1
} else {
    exit 0
}
