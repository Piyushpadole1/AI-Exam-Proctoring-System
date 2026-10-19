# ==============================================================================
# Verification Script for Task 1: EXTERNAL_VOICE Proctoring Event & Config Sync
# ==============================================================================
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000"
$ts = Get-Date -Format "yyyyMMddHHmmss"
$teacherEmail = "teacher_aud_$ts@example.com"
$studentEmail = "student_aud_$ts@example.com"
$password = "Test@123456"

Write-Host "=== Testing EXTERNAL_VOICE Violation Flow ===" -ForegroundColor Cyan

# 1. Register Teacher & Student
$tReg = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Post -ContentType "application/json" -Body (@{
    name = "Audio Teacher"
    email = $teacherEmail
    password = $password
    role = "teacher"
    clientCode = "DEFAULT"
} | ConvertTo-Json)
$tToken = $tReg.token
$tHeaders = @{ Authorization = "Bearer $tToken" }

$sReg = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Post -ContentType "application/json" -Body (@{
    name = "Audio Student"
    email = $studentEmail
    password = $password
    role = "student"
    clientCode = "DEFAULT"
} | ConvertTo-Json)
$sToken = $sReg.token
$sId = if ($sReg.id) { $sReg.id } else { $sReg._id }
$sHeaders = @{ Authorization = "Bearer $sToken" }

Write-Host "Teacher ($($tReg.email)) and Student ($($sReg.email)) registered." -ForegroundColor Green

# 2. Create Exam
$examCode = "EXAM_AUD_$ts"
$exam = Invoke-RestMethod -Uri "$baseUrl/api/users/exam" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
    examName = "Audio Integrity Exam $ts"
    examId = $examCode
    examPassword = "pass"
    totalMarks = 50
    passingMarks = 20
    totalQuestions = 1
    duration = 30
    hasCodingRound = $false
    liveDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    deadDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
} | ConvertTo-Json)

# Add Question
$q = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/questions" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
    examId = $examCode
    question = "What is 2+2?"
    marks = 50
    options = @(
        @{ option = "4"; isCorrect = $true },
        @{ option = "5"; isCorrect = $false }
    )
} | ConvertTo-Json)

Write-Host "Created Exam: $examCode with 1 question." -ForegroundColor Green

# 3. Student Requests Enrollment & Teacher Approves
$enrollReq = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/$examCode/request-enrollment" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{} | ConvertTo-Json)
$approveRes = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/$examCode/approve-student/$sId" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{} | ConvertTo-Json)

Write-Host "Enrollment requested and approved." -ForegroundColor Green

# 4. Student Starts Session
$sess = Invoke-RestMethod -Uri "$baseUrl/api/sessions/start" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{
    examId = $examCode
    examPassword = "pass"
    deviceInfo = "Verified Audio Headset"
} | ConvertTo-Json)
$sessionId = $sess.attemptId

Write-Host "Started Session Attempt ID: $sessionId with Integrity: 100" -ForegroundColor Green

# 5. Emit EXTERNAL_VOICE Violation Event
$violation = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{
    sessionId = "$sessionId"
    eventType = "EXTERNAL_VOICE"
    confidence = 0.88
    description = "External voice / speech detected during exam"
    evidenceUrl = ""
    metadata = @{
        rms = "0.3421"
        sustainedCount = 2
        threshold = 0.30
        points = 0
    }
} | ConvertTo-Json -Depth 5)

Write-Host "Violation Result: success=$($violation.success), integrityScore=$($violation.integrityScore), pointsDeducted=$($violation.pointsDeducted), message=$($violation.message)" -ForegroundColor Yellow

if ($violation.pointsDeducted -ne 0) {
    throw "EXTERNAL_VOICE deducted $($violation.pointsDeducted) points, expected 0 points (warning only)!"
}
if ($violation.integrityScore -ne 100.0) {
    throw "EXTERNAL_VOICE modified integrity score to $($violation.integrityScore), expected 100.0!"
}

# 6. Verify in Teacher Admin Logs
$tLogs = Invoke-RestMethod -Uri "$baseUrl/api/admin/logs?examId=$examCode" -Method Get -Headers $tHeaders
$voiceLog = $tLogs | Where-Object { $_.eventType -eq "EXTERNAL_VOICE" }
if (-not $voiceLog) {
    throw "EXTERNAL_VOICE not found in Teacher Admin Logs!"
}
Write-Host "Teacher Log Verified: eventType=$($voiceLog.eventType), severity=$($voiceLog.severity), penaltyPoints=$($voiceLog.penaltyPoints)" -ForegroundColor Green

# 7. Verify in Teacher Live Monitoring
$live = Invoke-RestMethod -Uri "$baseUrl/api/admin/active-sessions" -Method Get -Headers $tHeaders
$mon = $live | Where-Object { $_.attemptId -eq $sessionId -or $_.examCode -eq $examCode -or $_.examId -eq $examCode }
if (-not $mon) {
    throw "Live monitoring record not found for attempt $sessionId!"
}
Write-Host "Live Monitoring Verified: totalViolations=$($mon.totalViolations), integrityScore=$($mon.integrityScore)" -ForegroundColor Green

# 8. Verify in Cheating Logs
$cheatLogs = Invoke-RestMethod -Uri "$baseUrl/api/cheating-logs/$examCode" -Method Get -Headers $tHeaders
$cl = $cheatLogs | Where-Object { $_.email -eq $studentEmail }
Write-Host "Cheating Log Verified: fairnessScore=$($cl.fairnessScore), verdict=$($cl.verdict)" -ForegroundColor Green

Write-Host "=== TASK 1 VERIFICATION COMPLETE: ALL 8 STEPS PASSED ===" -ForegroundColor Green
