# ==============================================================================
# Verification Script for Universal Pass/Fail Rule & Fail Reason in Reports
# Rule: PASS only if BOTH:
#   1. The exam was NOT terminated because of violations
#   2. The student's obtained marks are at or above passing marks
# Otherwise result is FAIL (including terminated exams with marks >= passing marks).
# ==============================================================================
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000"
$ts = Get-Date -Format "yyyyMMddHHmmss"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Testing Universal Pass/Fail Rule & Fail Reason in Reports" -ForegroundColor Cyan
Write-Host " Timestamp: $ts" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Register Teacher & Students
$teacherEmail = "teacher_pf_$ts@example.com"
$s1Email = "s1_pass_$ts@example.com"
$s2Email = "s2_term_$ts@example.com"
$s3Email = "s3_low_$ts@example.com"
$password = "Password@123"

$tReg = Invoke-RestMethod -Uri "$baseUrl/api/auth/register/teacher" -Method Post -ContentType "application/json" -Body (@{
    name = "Teacher PassFail"
    email = $teacherEmail
    password = $password
} | ConvertTo-Json)
$tToken = $tReg.token
$tHeaders = @{
    "Authorization" = "Bearer $tToken"
    "Content-Type" = "application/json"
}

$s1Reg = Invoke-RestMethod -Uri "$baseUrl/api/auth/register/student" -Method Post -ContentType "application/json" -Body (@{
    name = "Student 1 Normal Pass"
    email = $s1Email
    password = $password
} | ConvertTo-Json)
$s1Token = $s1Reg.token
$s1Id = $s1Reg.user.id
$s1Headers = @{
    "Authorization" = "Bearer $s1Token"
    "Content-Type" = "application/json"
}

$s2Reg = Invoke-RestMethod -Uri "$baseUrl/api/auth/register/student" -Method Post -ContentType "application/json" -Body (@{
    name = "Student 2 Terminated High Marks"
    email = $s2Email
    password = $password
} | ConvertTo-Json)
$s2Token = $s2Reg.token
$s2Id = $s2Reg.user.id
$s2Headers = @{
    "Authorization" = "Bearer $s2Token"
    "Content-Type" = "application/json"
}

$s3Reg = Invoke-RestMethod -Uri "$baseUrl/api/auth/register/student" -Method Post -ContentType "application/json" -Body (@{
    name = "Student 3 Low Marks"
    email = $s3Email
    password = $password
} | ConvertTo-Json)
$s3Token = $s3Reg.token
$s3Id = $s3Reg.user.id
$s3Headers = @{
    "Authorization" = "Bearer $s3Token"
    "Content-Type" = "application/json"
}

Write-Host "Teacher ($teacherEmail) and 3 Students registered." -ForegroundColor Green

# 2. Create Exam with Passing Marks = 20, Total Marks = 50
$examCode = "PF$($ts % 100000)"
$exam = Invoke-RestMethod -Uri "$baseUrl/api/users/exam" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
    examName = "Pass Fail Verification Exam $ts"
    examId = $examCode
    examPassword = "pass"
    totalMarks = 50
    passingMarks = 20
    totalQuestions = 2
    duration = 30
    hasCodingRound = $false
    liveDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    deadDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
} | ConvertTo-Json)
$examId = $exam.id

# Add Question 1 (25 marks)
$q1 = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/questions" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
    examId = $examCode
    question = "What is 10 + 10?"
    marks = 25
    options = @(
        @{ option = "20"; isCorrect = $true },
        @{ option = "30"; isCorrect = $false }
    )
} | ConvertTo-Json)

# Add Question 2 (25 marks)
$q2 = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/questions" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
    examId = $examCode
    question = "What is 5 x 5?"
    marks = 25
    options = @(
        @{ option = "25"; isCorrect = $true },
        @{ option = "35"; isCorrect = $false }
    )
} | ConvertTo-Json)

Write-Host "Exam $examCode created with passingMarks = 20 and 2 questions (25 marks each)." -ForegroundColor Green

# Enroll students
$enrollBody = @{ studentIds = @([int64]$s1Id, [int64]$s2Id, [int64]$s3Id) } | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/api/teacher/exams/$examId/students" -Method Post -Body $enrollBody -Headers $tHeaders
Write-Host "All 3 students enrolled by teacher." -ForegroundColor Green

# ------------------------------------------------------------------------------
# TEST CASE 1: Student 1 has marks >= passingMarks AND no termination -> PASS
# ------------------------------------------------------------------------------
Write-Host "`n--- Running Test Case 1: High Marks + No Violations ---" -ForegroundColor Yellow
$startBody1 = @{ examId = $examCode; examPassword = "pass" } | ConvertTo-Json
$s1Start = Invoke-RestMethod -Uri "$baseUrl/api/sessions/start" -Method Post -Body $startBody1 -Headers $s1Headers
$att1Id = [int64]$s1Start.attemptId
$sess1Id = $s1Start.sessionId

# Answer both questions correctly (Score = 50 / 50 >= 20)
$answers1 = @{
    "0" = "20"
    "1" = "25"
}
$s1Submit = Invoke-RestMethod -Uri "$baseUrl/api/sessions/$att1Id/submit" -Method Post -Headers $s1Headers -ContentType "application/json" -Body (@{
    answers = $answers1
} | ConvertTo-Json)

Write-Host "Student 1 Result: Score = $($s1Submit.score), Passed = $($s1Submit.passed), FailReason = $($s1Submit.failReason)" -ForegroundColor Cyan
if ($s1Submit.passed -ne $true) { throw "FAIL: Student 1 expected passed=true but got $($s1Submit.passed)" }
if ($s1Submit.failReason) { throw "FAIL: Student 1 expected failReason=null but got $($s1Submit.failReason)" }
Write-Host "PASS: Student 1 correctly evaluated as PASSED with no failReason." -ForegroundColor Green

# Check Student 1 Detailed Report
$s1Report = Invoke-RestMethod -Uri "$baseUrl/api/users/results/$att1Id/detailed-report" -Headers $s1Headers
if ($s1Report.passed -ne $true) { throw "FAIL: Student 1 detailed report expected passed=true" }
if ($s1Report.failReason) { throw "FAIL: Student 1 detailed report expected failReason=null" }
Write-Host "PASS: Student 1 Detailed Report confirms PASSED." -ForegroundColor Green

# ------------------------------------------------------------------------------
# TEST CASE 2: Student 2 has marks >= passingMarks BUT terminated -> FAIL
# ------------------------------------------------------------------------------
Write-Host "`n--- Running Test Case 2: High Marks + Terminated Due to Violations ---" -ForegroundColor Yellow
$startBody2 = @{ examId = $examCode; examPassword = "pass" } | ConvertTo-Json
$s2Start = Invoke-RestMethod -Uri "$baseUrl/api/sessions/start" -Method Post -Body $startBody2 -Headers $s2Headers
$att2Id = [int64]$s2Start.attemptId
$sess2Id = $s2Start.sessionId

# Save answers first with 1 correct answer (Score = 25 >= passingMarks 20)
$answers2 = @{
    "0" = "20"
}
$s2Autosave = Invoke-RestMethod -Uri "$baseUrl/api/sessions/$att2Id/autosave" -Method Post -Headers $s2Headers -ContentType "application/json" -Body (@{
    answers = $answers2
} | ConvertTo-Json)

# Now trigger termination due to violations (Left fullscreen twice)
$termResp = Invoke-RestMethod -Uri "$baseUrl/api/sessions/$att2Id/terminate" -Method Post -Headers $s2Headers -ContentType "application/json" -Body (@{
    reason = "Left fullscreen twice"
} | ConvertTo-Json)

Write-Host "Student 2 Terminate Response: Score = $($termResp.score), Status = $($termResp.status), Passed = $($termResp.passed), FailReason = $($termResp.failReason)" -ForegroundColor Cyan

if ($termResp.passed -ne $false) { throw "FAIL: Student 2 expected passed=false on termination but got $($termResp.passed)" }
if ($termResp.score -lt 20) { throw "FAIL: Student 2 score should be >= 20, got $($termResp.score)" }
if ($termResp.failReason -ne "Failed: exam terminated due to violations.") { throw "FAIL: Expected 'Failed: exam terminated due to violations.', got '$($termResp.failReason)'" }
Write-Host "PASS: Terminated student with marks >= passing marks is strictly marked FAIL with failReason: '$($termResp.failReason)'." -ForegroundColor Green

# Check Student 2 Detailed Report
$s2Report = Invoke-RestMethod -Uri "$baseUrl/api/users/results/$att2Id/detailed-report" -Headers $s2Headers
if ($s2Report.passed -ne $false) { throw "FAIL: Student 2 detailed report expected passed=false" }
if ($s2Report.failReason -ne "Failed: exam terminated due to violations.") { throw "FAIL: Student 2 detailed report expected failReason='Failed: exam terminated due to violations.', got '$($s2Report.failReason)'" }
if ($s2Report.status -ne "DISQUALIFIED") { throw "FAIL: Student 2 detailed report expected status='DISQUALIFIED', got '$($s2Report.status)'" }
Write-Host "PASS: Student 2 Detailed Report confirms status=DISQUALIFIED, passed=false, failReason='Failed: exam terminated due to violations.'." -ForegroundColor Green

# ------------------------------------------------------------------------------
# TEST CASE 3: Student 3 has marks < passingMarks AND no termination -> FAIL (marks below pass)
# ------------------------------------------------------------------------------
Write-Host "`n--- Running Test Case 3: Low Marks + No Termination ---" -ForegroundColor Yellow
$startBody3 = @{ examId = $examCode; examPassword = "pass" } | ConvertTo-Json
$s3Start = Invoke-RestMethod -Uri "$baseUrl/api/sessions/start" -Method Post -Body $startBody3 -Headers $s3Headers
$att3Id = [int64]$s3Start.attemptId
$sess3Id = $s3Start.sessionId

# Answer both questions incorrectly (Score = 0 < passingMarks 20)
$answers3 = @{
    "0" = "wrong"
    "1" = "wrong"
}
$s3Submit = Invoke-RestMethod -Uri "$baseUrl/api/sessions/$att3Id/submit" -Method Post -Headers $s3Headers -ContentType "application/json" -Body (@{
    answers = $answers3
} | ConvertTo-Json)

Write-Host "Student 3 Result: Score = $($s3Submit.score), Passed = $($s3Submit.passed), FailReason = $($s3Submit.failReason)" -ForegroundColor Cyan
if ($s3Submit.passed -ne $false) { throw "FAIL: Student 3 expected passed=false" }
if (-not $s3Submit.failReason.Contains("Failed: marks below passing score")) { throw "FAIL: Student 3 expected failReason about marks below passing score, got $($s3Submit.failReason)" }
Write-Host "PASS: Student 3 correctly evaluated as FAILED due to marks below passing score." -ForegroundColor Green

# Check Student 3 Detailed Report
$s3Report = Invoke-RestMethod -Uri "$baseUrl/api/users/results/$att3Id/detailed-report" -Headers $s3Headers
if ($s3Report.passed -ne $false) { throw "FAIL: Student 3 detailed report expected passed=false" }
if (-not $s3Report.failReason.Contains("Failed: marks below passing score")) { throw "FAIL: Student 3 detailed report expected marks below passing score failReason" }
Write-Host "PASS: Student 3 Detailed Report confirms marks below passing score failReason." -ForegroundColor Green

# ------------------------------------------------------------------------------
# TEST CASE 4: Student Dashboard Aggregates & Recent Results
# ------------------------------------------------------------------------------
Write-Host "`n--- Running Test Case 4: Student Dashboard Stats ---" -ForegroundColor Yellow
$s2Dash = Invoke-RestMethod -Uri "$baseUrl/api/student/dashboard" -Headers $s2Headers
Write-Host "Student 2 Dashboard: passCount = $($s2Dash.passCount), failCount = $($s2Dash.failCount)" -ForegroundColor Cyan
if ($s2Dash.passCount -ne 0) { throw "FAIL: Student 2 dashboard expected passCount=0, got $($s2Dash.passCount)" }
if ($s2Dash.failCount -ne 1) { throw "FAIL: Student 2 dashboard expected failCount=1, got $($s2Dash.failCount)" }
$s2Recent = $s2Dash.recentResults | Where-Object { $_.attemptId -eq $att2Id }
if ($s2Recent.passed -ne $false) { throw "FAIL: Student 2 recent result expected passed=false" }
if ($s2Recent.failReason -ne "Failed: exam terminated due to violations.") { throw "FAIL: Student 2 recent result expected failReason='Failed: exam terminated due to violations.', got '$($s2Recent.failReason)'" }
Write-Host "PASS: Student Dashboard correctly counts terminated attempt as FAIL with proper failReason." -ForegroundColor Green

# ------------------------------------------------------------------------------
# TEST CASE 5: Teacher Proctoring Report & Exam Analytics
# ------------------------------------------------------------------------------
Write-Host "`n--- Running Test Case 5: Teacher Report & Exam Analytics ---" -ForegroundColor Yellow
$tSessReport = Invoke-RestMethod -Uri "$baseUrl/api/admin/report/$sess2Id" -Headers $tHeaders
if ($tSessReport.report.result.passed -ne $false) { throw "FAIL: Teacher session report expected passed=false for terminated attempt" }
if ($tSessReport.report.result.failReason -ne "Failed: exam terminated due to violations.") { throw "FAIL: Teacher session report expected failReason='Failed: exam terminated due to violations.', got '$($tSessReport.report.result.failReason)'" }
Write-Host "PASS: Teacher Proctoring Report shows passed=false and failReason='Failed: exam terminated due to violations.'." -ForegroundColor Green

# Verify Analytics
$examAnalytics = Invoke-RestMethod -Uri "$baseUrl/api/admin/analytics" -Headers $tHeaders
Write-Host "Analytics: Total = $($examAnalytics.totalAttempts), Passed = $($examAnalytics.passedCount), Failed = $($examAnalytics.failedCount)" -ForegroundColor Cyan
if ($examAnalytics.passedCount -ne 1) { throw "FAIL: Expected passedCount=1 across this teacher's 3 attempts, got $($examAnalytics.passedCount)" }
if ($examAnalytics.failedCount -ne 2) { throw "FAIL: Expected failedCount=2 across the 3 attempts, got $($examAnalytics.failedCount)" }
Write-Host "PASS: Teacher Exam Analytics accurately reports 1 Passed and 2 Failed." -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " ALL PASS/FAIL RULE & FAIL REASON VERIFICATION CHECKS PASSED!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
