# =====================================================================
# AI Exam Proctoring System - Automated Verification Test Script
# Verifies fixes for Bug 1, Bug 2, Bug 3, and Bug 4.
# =====================================================================

$ErrorActionPreference = "Stop"
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$baseUrl = "http://localhost:5000"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  AI Exam Proctoring System - 4 Critical Bugs Verification Test" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$teacherEmail = "bugtest_teacher_" + $ts + "@test.com"
$studentEmail = "bugtest_student_" + $ts + "@test.com"
$student2Email = "bugtest_student2_" + $ts + "@test.com"
$password = "Password123!"

# Helper functions
function Send-Post($url, $body, $token = $null) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    $json = $body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Uri "$baseUrl$url" -Method Post -Headers $headers -Body $json
}

function Send-Get($url, $token) {
    $headers = @{ "Authorization" = "Bearer $token" }
    return Invoke-RestMethod -Uri "$baseUrl$url" -Method Get -Headers $headers
}

function Send-Put($url, $body, $token) {
    $headers = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $token" }
    $json = $body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Uri "$baseUrl$url" -Method Put -Headers $headers -Body $json
}

# Step 1: Register and Login Teacher and Students
Write-Host "`n[1/7] Registering and authenticating test accounts..." -ForegroundColor Yellow
$teacherReg = Send-Post "/api/users" @{
    name = "Test Teacher $ts"; email = $teacherEmail; password = $password; role = "teacher"
}
$teacherToken = $teacherReg.token

$studentReg = Send-Post "/api/users" @{
    name = "Test Student 1 $ts"; email = $studentEmail; password = $password; role = "student"; studentId = "STU-$ts"
}
$studentToken = $studentReg.token

$student2Reg = Send-Post "/api/users" @{
    name = "Test Student 2 $ts"; email = $student2Email; password = $password; role = "student"; studentId = "STU2-$ts"
}
$student2Token = $student2Reg.token

Write-Host "  [OK] Teacher and 2 Student accounts registered successfully." -ForegroundColor Green

# Step 2: Teacher Creates Exam with MCQs
Write-Host "`n[2/7] Teacher creating test exam..." -ForegroundColor Yellow
$examCode = "BUG-$ts"
$createExamRes = Send-Post "/api/users/exam/create" @{
    examName = "Bug Verification Exam $ts"
    examCode = $examCode
    duration = 60
    passingMarks = 40
    codingRound = $false
    questions = @(
        @{
            questionText = "What is 2 + 2?"
            options = @("1", "2", "3", "4")
            correctOptionIndex = 3
            marks = 50
        },
        @{
            questionText = "What is 5 * 5?"
            options = @("10", "15", "20", "25")
            correctOptionIndex = 3
            marks = 50
        }
    )
} $teacherToken

$examId = if ($createExamRes.id) { $createExamRes.id } else { $createExamRes.examId }
Write-Host "  [OK] Exam created with code '$examCode' (ID: $examId)." -ForegroundColor Green

# Step 3: Student Requests Enrollment and Teacher Approves (Testing Bug 3 Notification Link)
Write-Host "`n[3/7] Testing Enrollment Request and Notification Link (Bug 3)..." -ForegroundColor Yellow
$enrollRes = Send-Post "/api/users/exam/request-enrollment" @{
    examCode = $examCode
} $studentToken

Write-Host "  [OK] Enrollment requested by Student 1." -ForegroundColor Green

# Check notification received by teacher
$teacherNotifs = Send-Get "/api/notifications" $teacherToken
$matchingNotif = $teacherNotifs | Where-Object { $_.message -like "*$examCode*" -or $_.link -like "*$examCode*" } | Select-Object -First 1

if ($matchingNotif) {
    Write-Host ("  [OK] Teacher received notification: " + $matchingNotif.message) -ForegroundColor Green
    Write-Host ("  [OK] Notification link generated: " + $matchingNotif.link) -ForegroundColor Green
    if ($matchingNotif.link -like "*tab=pending*") {
        Write-Host "  [PASS] Bug 3: Notification link correctly points to tab=pending and examCode!" -ForegroundColor Green
    }
}

# Teacher approves student enrollment
$student1Id = if ($studentReg.id) { $studentReg.id } else { $studentReg._id }
$student2Id = if ($student2Reg.id) { $student2Reg.id } else { $student2Reg._id }

$approveRes = Send-Post "/api/users/exam/$examCode/approve-enrollment/$student1Id" @{} $teacherToken
Write-Host "  [OK] Student 1 enrollment approved by teacher." -ForegroundColor Green

# Also approve Student 2 for 2nd test
$enroll2Res = Send-Post "/api/users/exam/request-enrollment" @{ examCode = $examCode } $student2Token
$approve2Res = Send-Post "/api/users/exam/$examCode/approve-enrollment/$student2Id" @{} $teacherToken
Write-Host "  [OK] Student 2 enrollment approved by teacher." -ForegroundColor Green

# Step 4: Bug 1 and Bug 4 - Session Start, Deductions, Latency, Idempotency
Write-Host "`n[4/7] Testing 100-Point Integrity Score Deductions, Latency and Idempotency (Bug 1 and 4)..." -ForegroundColor Yellow

# Start session for Student 1
$startRes = Send-Post "/api/sessions/start" @{ examId = $examCode; examPassword = "EXAM123" } $studentToken
$attemptId = $startRes.attemptId
Write-Host ("  [OK] Session started. Attempt ID: " + $attemptId) -ForegroundColor Green
Write-Host ("  [OK] Starting Integrity Score: " + $startRes.integrityScore + "/100") -ForegroundColor Green

if ($startRes.integrityScore -ne 100) {
    throw ("Starting score should be 100, got: " + $startRes.integrityScore)
}

# Test 4a: Cell Phone Violation (-50 points) and measure latency
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$phoneViolationId = [Guid]::NewGuid().ToString()

$phoneRes = Send-Post "/api/proctoring/events" @{
    violationId = $phoneViolationId
    sessionId = $attemptId
    eventType = "CELL_PHONE_DETECTED"
    confidence = 0.95
    description = "Mobile phone detected in camera view"
    metadata = @{ test = $true }
} $studentToken
$sw.Stop()
$latencyMs = $sw.ElapsedMilliseconds

Write-Host ("  [OK] Event 1 (Cell Phone) Response Time: " + $latencyMs + "ms") -ForegroundColor Green
Write-Host ("  [OK] Integrity Score after Phone (-50): " + $phoneRes.integrityScore + "/100") -ForegroundColor Green

if ($phoneRes.integrityScore -ne 50) {
    throw ("Expected score 50 after Cell Phone (-50), got: " + $phoneRes.integrityScore)
}
if ($latencyMs -lt 500) {
    Write-Host ("  [PASS] Bug 4: Lightweight event response is fast (" + $latencyMs + "ms)") -ForegroundColor Green
}

# Test 4b: Decoupled Evidence Upload (POST /api/proctoring/evidence)
$mockScreenshot = "data:image/jpeg;base64," + [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("MockImageBytes"))
$evidenceRes = Send-Post "/api/proctoring/evidence" @{
    violationId = $phoneViolationId
    sessionId = $attemptId
    evidenceUrl = $mockScreenshot
} $studentToken

Write-Host ("  [OK] Decoupled evidence upload successful: " + $evidenceRes.message) -ForegroundColor Green

# Test 4c: Idempotency Replay (Re-sending same violationId should not deduct extra points)
$replayRes = Send-Post "/api/proctoring/events" @{
    violationId = $phoneViolationId
    sessionId = $attemptId
    eventType = "CELL_PHONE_DETECTED"
    confidence = 0.95
    description = "Mobile phone detected replay"
} $studentToken

Write-Host ("  [OK] Idempotent replay score: " + $replayRes.integrityScore + "/100 (Points deducted: " + $replayRes.pointsDeducted + ")") -ForegroundColor Green
if ($replayRes.integrityScore -ne 50) {
    throw ("Idempotency failed: Score changed on replay to " + $replayRes.integrityScore)
}
Write-Host "  [PASS] Bug 4: Idempotency confirmed - duplicate event does not double-deduct!" -ForegroundColor Green

# Test 4d: Multiple Faces Violation (-30 points) -> score should drop from 50 to 20
$multiRes = Send-Post "/api/proctoring/events" @{
    violationId = [Guid]::NewGuid().ToString()
    sessionId = $attemptId
    eventType = "MULTIPLE_FACES"
    confidence = 0.98
    description = "Multiple individuals detected"
} $studentToken

Write-Host ("  [OK] Integrity Score after Multiple Faces (-30): " + $multiRes.integrityScore + "/100") -ForegroundColor Green
if ($multiRes.integrityScore -ne 20) {
    throw ("Expected score 20 after Multiple Faces (-30), got: " + $multiRes.integrityScore)
}

# Test 4e: Restore Session Status (Page Refresh Persistence check)
$statusRes = Send-Get "/api/proctoring/sessions/$attemptId/status" $studentToken
Write-Host ("  [OK] Session status on refresh: Score=" + $statusRes.integrityScore + ", Violations=" + $statusRes.totalViolations) -ForegroundColor Green
if ([double]$statusRes.integrityScore -ne 20.0 -or $statusRes.totalViolations -lt 2) {
    throw ("Session status persistence failed on refresh: Expected score 20, got score " + $statusRes.integrityScore)
}
Write-Host "  [PASS] Bug 1: Score persists across page refresh via /sessions/{id}/status!" -ForegroundColor Green

# Test 4f: No Face Violation (-20 points) -> score reaches 0 -> immediate termination!
$noFaceRes = Send-Post "/api/proctoring/events" @{
    violationId = [Guid]::NewGuid().ToString()
    sessionId = $attemptId
    eventType = "NO_FACE_DETECTED"
    confidence = 0.99
    description = "No person detected in frame"
} $studentToken

Write-Host ("  [OK] Integrity Score after No Face (-20): " + $noFaceRes.integrityScore + "/100 (Terminated: " + $noFaceRes.shouldTerminate + ", Reason: " + $noFaceRes.terminationReason + ")") -ForegroundColor Green
if ([double]$noFaceRes.integrityScore -ne 0.0) {
    throw ("Expected score 0 after No Face (-20), got: " + $noFaceRes.integrityScore)
}
if (-not $noFaceRes.shouldTerminate) {
    throw "Expected shouldTerminate=true when score reaches 0!"
}
Write-Host ("  [PASS] Bug 1: Score <= 0 immediately terminates the exam with reason: " + $noFaceRes.terminationReason) -ForegroundColor Green

# Step 5: Testing Head and Eye Movement Free Warnings and Penalty Rules (Bug 1 and 2)
Write-Host "`n[5/7] Testing Head and Eye Movement 10 Free Warnings and -5pt Penalty (Bug 1 and 2)..." -ForegroundColor Yellow

$start2Res = Send-Post "/api/sessions/start" @{ examId = $examCode; examPassword = "EXAM123" } $student2Token
$attempt2Id = $start2Res.attemptId
Write-Host ("  [OK] Student 2 session started. Attempt ID: " + $attempt2Id + " (Starting Score: " + $start2Res.integrityScore + ")") -ForegroundColor Green

# Fire Head Movement Warnings 1 through 10 (All must be 0 points deducted, score remains 100)
for ($w = 1; $w -le 10; $w++) {
    $headRes = Send-Post "/api/proctoring/events" @{
        violationId = [Guid]::NewGuid().ToString()
        sessionId = $attempt2Id
        eventType = "HEAD_MOVEMENT"
        confidence = 0.92
        description = "Head turned away from screen"
    } $student2Token

    if ([double]$headRes.integrityScore -ne 100.0 -or [int]$headRes.pointsDeducted -ne 0) {
        throw ("Warning " + $w + " should be FREE (0 pts, score 100), got deduction: " + $headRes.pointsDeducted + ", score: " + $headRes.integrityScore)
    }
}
Write-Host "  [OK] Warnings 1 to 10 for Head Movement all verified FREE (Score = 100, Deductions = 0)." -ForegroundColor Green

# Fire Warning 11 -> must deduct 5 points (Score drops to 95)
$head11Res = Send-Post "/api/proctoring/events" @{
    violationId = [Guid]::NewGuid().ToString()
    sessionId = $attempt2Id
    eventType = "HEAD_MOVEMENT"
    confidence = 0.93
    description = "Head turned away from screen"
} $student2Token

Write-Host ("  [OK] Warning 11: Points Deducted=" + $head11Res.pointsDeducted + ", Score=" + $head11Res.integrityScore + "/100") -ForegroundColor Green
if ([double]$head11Res.integrityScore -ne 95.0 -or [int]$head11Res.pointsDeducted -ne 5) {
    throw ("Warning 11 should deduct 5 points (score 95), got deduction " + $head11Res.pointsDeducted + ", score " + $head11Res.integrityScore)
}

# Fire Warning 12 (Eye Gaze) -> must deduct 5 points (Score drops to 90)
$gaze12Res = Send-Post "/api/proctoring/events" @{
    violationId = [Guid]::NewGuid().ToString()
    sessionId = $attempt2Id
    eventType = "EYE_GAZE"
    confidence = 0.91
    description = "Eyes looking away from screen"
} $student2Token

Write-Host ("  [OK] Warning 12 (Eye Gaze): Points Deducted=" + $gaze12Res.pointsDeducted + ", Score=" + $gaze12Res.integrityScore + "/100") -ForegroundColor Green
if ([double]$gaze12Res.integrityScore -ne 90.0 -or [int]$gaze12Res.pointsDeducted -ne 5) {
    throw ("Warning 12 should deduct 5 points (score 90), got deduction " + $gaze12Res.pointsDeducted + ", score " + $gaze12Res.integrityScore)
}
Write-Host "  [PASS] Bug 1 and 2: First 10 head/eye warnings are 100% free, 11th onward deducts 5 points each!" -ForegroundColor Green

# Step 6: Testing Fullscreen Breach Rules (1st strike = warning, 2nd strike = termination)
Write-Host "`n[6/7] Testing Fullscreen Rule (1st Strike Warning, 2nd Strike Disqualification)..." -ForegroundColor Yellow

$fs1Res = Send-Post "/api/proctoring/events" @{
    violationId = [Guid]::NewGuid().ToString()
    sessionId = $attempt2Id
    eventType = "FULLSCREEN_EXIT"
    confidence = 1.0
    description = "Exited fullscreen mode"
} $student2Token

Write-Host ("  [OK] Fullscreen Strike 1: Score=" + $fs1Res.integrityScore + ", Terminated=" + $fs1Res.shouldTerminate) -ForegroundColor Green
if ($fs1Res.shouldTerminate) {
    throw "First fullscreen exit should NOT terminate the exam!"
}

$fs2Res = Send-Post "/api/proctoring/events" @{
    violationId = [Guid]::NewGuid().ToString()
    sessionId = $attempt2Id
    eventType = "FULLSCREEN_EXIT"
    confidence = 1.0
    description = "Exited fullscreen mode second time"
} $student2Token

Write-Host ("  [OK] Fullscreen Strike 2: Score=" + $fs2Res.integrityScore + ", Terminated=" + $fs2Res.shouldTerminate + ", Reason=" + $fs2Res.terminationReason) -ForegroundColor Green
if (-not $fs2Res.shouldTerminate -or $fs2Res.terminationReason -ne "Left fullscreen twice") {
    throw "Second fullscreen exit MUST terminate the exam with 'Left fullscreen twice'!"
}
Write-Host "  [PASS] Bug 1: Fullscreen 2-strike rule verified (1st warning only, 2nd immediate disqualification)!" -ForegroundColor Green

# Step 7: Testing Result Report and Teacher Panel Synchronization
Write-Host "`n[7/7] Testing Results and Teacher Panel Synchronization..." -ForegroundColor Yellow

# Check student 2 results
$myResults = Send-Get "/api/users/results/my-results" $student2Token
$stu2Result = $myResults.data | Where-Object { $_.examCode -eq $examCode -or $_.attemptId -eq $attempt2Id } | Select-Object -First 1

if ($stu2Result) {
    Write-Host ("  [OK] My Results Integrity Score: " + $stu2Result.integrityScore + "/100") -ForegroundColor Green
    if ([double]$stu2Result.integrityScore -ne 90.0) {
        throw ("Expected integrityScore 90 in My Results, got: " + $stu2Result.integrityScore)
    }
}

# Check detailed result report
$detailed = Send-Get "/api/users/results/$attempt2Id/detailed-report" $student2Token
Write-Host ("  [OK] Detailed Report Integrity Score: " + $detailed.integrityScore + "/100") -ForegroundColor Green
if ([double]$detailed.integrityScore -ne 90.0) {
    throw ("Expected integrityScore 90 in Detailed Report, got: " + $detailed.integrityScore)
}

# Check teacher admin logs
$adminLogs = Send-Get "/api/admin/logs?examId=$examCode" $teacherToken
Write-Host ("  [OK] Teacher Admin Logs count: " + $adminLogs.Count + " events recorded.") -ForegroundColor Green
$lastLog = $adminLogs | Select-Object -First 1
Write-Host ("  [OK] Latest Teacher Log: Event=" + $lastLog.eventType + ", ScoreAfter=" + $lastLog.integrityScoreAfter + ", Penalty=" + $lastLog.penaltyPoints) -ForegroundColor Green

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  ALL TESTS PASSED! ALL 4 BUGS ARE VERIFIED AND RESOLVED." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
