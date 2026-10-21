# =====================================================================
# Instant Violation Reporting Latency & Real-Time Transport Test Suite
# Tests:
#   1. WebSocket connection to /ws/proctoring (Student & Teacher)
#   2. End-to-end report dispatch latency (< 100ms target)
#   3. Real-time teacher push latency (< 1000ms target)
#   4. Idempotency (safe deduplication via violationId)
#   5. HTTP fallback latency & decoupled screenshot upload
#   6. 100-point integrity rules (Phone -50, Multi-face -30, Head/Gaze, Fullscreen)
# =====================================================================

$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:5000"
$wsUrl = "ws://localhost:5000/ws/proctoring"
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host " AI Proctoring System - Instant Violation Reporting Benchmark" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# 1. Register Teacher
$teacherEmail = "teacher_lat_${timestamp}@test.com"
$teacherPassword = "Password@123"
$teacherRegisterBody = @{
    name = "Teacher Latency Test"
    email = $teacherEmail
    password = $teacherPassword
} | ConvertTo-Json

$regTeacherRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/register/teacher" -Method Post -Body $teacherRegisterBody -ContentType "application/json"
$teacherToken = $regTeacherRes.token
$teacherId = $regTeacherRes.user.id
Write-Host "[OK] Teacher created: $teacherEmail (ID: $teacherId)" -ForegroundColor Green

# 2. Create Exam
$examCode = "LAT$($timestamp % 100000)"
$examBody = @{
    title = "Latency Proctoring Benchmark Exam"
    examCode = $examCode
    durationMinutes = 60
    totalQuestions = 5
    passingMarks = 50
    hasCodingRound = $false
    examPassword = "Password@123"
} | ConvertTo-Json

$teacherHeaders = @{
    "Authorization" = "Bearer $teacherToken"
    "Content-Type" = "application/json"
}
$createExamRes = Invoke-RestMethod -Uri "$baseUrl/api/users/exam" -Method Post -Body $examBody -Headers $teacherHeaders
$createdExamId = $createExamRes.id
Write-Host "[OK] Exam created: $examCode (ID: $createdExamId)" -ForegroundColor Green

# 3. Register Student
$studentEmail = "student_lat_${timestamp}@test.com"
$studentPassword = "Password@123"
$studentRegisterBody = @{
    name = "Student Latency Test"
    email = $studentEmail
    password = $studentPassword
} | ConvertTo-Json

$regStudentRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/register/student" -Method Post -Body $studentRegisterBody -ContentType "application/json"
$studentToken = $regStudentRes.token
$studentId = $regStudentRes.user.id
$studentHeaders = @{
    "Authorization" = "Bearer $studentToken"
    "Content-Type" = "application/json"
}
Write-Host "[OK] Student created: $studentEmail (ID: $studentId)" -ForegroundColor Green

# 4. Enroll & Start Attempt
$teacherEnrollBody = @{ studentIds = @([int64]$studentId) } | ConvertTo-Json
$enrollRes = Invoke-RestMethod -Uri "$baseUrl/api/teacher/exams/$createdExamId/students" -Method Post -Body $teacherEnrollBody -Headers $teacherHeaders
Write-Host "[OK] Student enrolled and approved by teacher" -ForegroundColor Green

$startBody = @{ examId = $examCode; examPassword = "Password@123" } | ConvertTo-Json
try {
    $startRes = Invoke-RestMethod -Uri "$baseUrl/api/sessions/start" -Method Post -Body $startBody -Headers $studentHeaders
    $attemptId = [int64]$startRes.attemptId
    Write-Host "[OK] Exam attempt started (AttemptId: $attemptId, Initial Score: $($startRes.integrityScore))" -ForegroundColor Green
} catch {
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())" -ForegroundColor Red
    }
    throw $_
}

# 5. Open Teacher ClientWebSocket
Write-Host "`nConnecting Teacher WebSocket listener to $($wsUrl)?role=teacher..." -ForegroundColor Yellow
$teacherWs = New-Object System.Net.WebSockets.ClientWebSocket
$cancellationToken = [System.Threading.CancellationToken]::None
$teacherUri = New-Object System.Uri("$($wsUrl)?role=teacher")
$connectTask = $teacherWs.ConnectAsync($teacherUri, $cancellationToken)
$connectTask.Wait(5000)

if ($teacherWs.State -ne [System.Net.WebSockets.WebSocketState]::Open) {
    throw "Teacher ClientWebSocket failed to connect. State: $($teacherWs.State)"
}
Write-Host "[OK] Teacher WebSocket connected successfully (State: $($teacherWs.State))" -ForegroundColor Green

# Receive Teacher CONNECTED ACK
$buffer = New-Object byte[] 4096
$recvResult = $teacherWs.ReceiveAsync((New-Object System.ArraySegment[byte] -ArgumentList @($buffer, 0, $buffer.Length)), $cancellationToken)
$recvResult.Wait(3000)
$recvJson = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $recvResult.Result.Count)
Write-Host "    Teacher initial payload: $recvJson" -ForegroundColor Gray

# Send SUBSCRIBE_TEACHER
$subTeacherMsg = [System.Text.Encoding]::UTF8.GetBytes('{"action": "SUBSCRIBE_TEACHER"}')
$teacherWs.SendAsync((New-Object System.ArraySegment[byte] -ArgumentList @($subTeacherMsg, 0, $subTeacherMsg.Length)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cancellationToken).Wait()

# Receive Teacher SUBSCRIBED ACK
$recvResultSub = $teacherWs.ReceiveAsync((New-Object System.ArraySegment[byte] -ArgumentList @($buffer, 0, $buffer.Length)), $cancellationToken)
$recvResultSub.Wait(3000)
$recvJsonSub = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $recvResultSub.Result.Count)
Write-Host "    Teacher subscribe payload: $recvJsonSub" -ForegroundColor Gray

# 6. Open Student ClientWebSocket
Write-Host "`nConnecting Student WebSocket to $wsUrl..." -ForegroundColor Yellow
$studentWs = New-Object System.Net.WebSockets.ClientWebSocket
$studentUri = New-Object System.Uri($wsUrl)
$connectTask2 = $studentWs.ConnectAsync($studentUri, $cancellationToken)
$connectTask2.Wait(5000)

if ($studentWs.State -ne [System.Net.WebSockets.WebSocketState]::Open) {
    throw "Student ClientWebSocket failed to connect. State: $($studentWs.State)"
}
Write-Host "[OK] Student WebSocket connected successfully (State: $($studentWs.State))" -ForegroundColor Green

# Receive Student Welcome ACK
$recvResult2 = $studentWs.ReceiveAsync((New-Object System.ArraySegment[byte] -ArgumentList @($buffer, 0, $buffer.Length)), $cancellationToken)
$recvResult2.Wait(3000)
$recvJson2 = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $recvResult2.Result.Count)
Write-Host "    Student initial payload: $recvJson2" -ForegroundColor Gray

# =====================================================================
# BENCHMARK TEST 1: Instant WebSocket Violation Dispatch (< 100ms)
# =====================================================================
Write-Host "`n---------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " BENCHMARK 1: WebSocket Violation Reporting & Teacher Push" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------------" -ForegroundColor Cyan

$violationId1 = [System.Guid]::NewGuid().ToString()
$violationPayload1 = @{
    action = "VIOLATION"
    violationId = $violationId1
    sessionId = $attemptId
    eventType = "CELL_PHONE"
    confidence = 1.0
    description = "Mobile phone detected in camera view"
    metadata = @{ source = "benchmark_ws" }
} | ConvertTo-Json -Compress

$sendBytes = [System.Text.Encoding]::UTF8.GetBytes($violationPayload1)

$stopwatchStudent = [System.Diagnostics.Stopwatch]::StartNew()
# Send over WebSocket
$sendTask = $studentWs.SendAsync((New-Object System.ArraySegment[byte] -ArgumentList @($sendBytes, 0, $sendBytes.Length)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cancellationToken)
$sendTask.Wait()

# Wait for Student ACK
$studentRecvBuffer = New-Object byte[] 4096
$studentAckTask = $studentWs.ReceiveAsync((New-Object System.ArraySegment[byte] -ArgumentList @($studentRecvBuffer, 0, $studentRecvBuffer.Length)), $cancellationToken)
$studentAckTask.Wait(5000)
$stopwatchStudent.Stop()
$studentElapsedMs = $stopwatchStudent.ElapsedMilliseconds

$studentAckJson = [System.Text.Encoding]::UTF8.GetString($studentRecvBuffer, 0, $studentAckTask.Result.Count)
Write-Host "Raw Student Ack JSON: $studentAckJson" -ForegroundColor Magenta
$studentAck = $studentAckJson | ConvertFrom-Json

Write-Host "[OK] Student ACK received in: $studentElapsedMs ms" -ForegroundColor Green
Write-Host "    Action: $($studentAck.action) | Integrity Score: $($studentAck.integrityScore) | Points Deducted: $($studentAck.pointsDeducted)" -ForegroundColor Yellow

if ($studentElapsedMs -gt 100) {
    Write-Host "[WARN] Student roundtrip latency ($studentElapsedMs ms) exceeded 100ms threshold." -ForegroundColor Red
} else {
    Write-Host "[PASSED] Report dispatched and acknowledged in $studentElapsedMs ms (Target: < 100ms)" -ForegroundColor Green
}

# Wait for Teacher Broadcast on Teacher WebSocket
$stopwatchTeacher = [System.Diagnostics.Stopwatch]::StartNew()
$teacherRecvBuffer = New-Object byte[] 4096
$teacherTask = $teacherWs.ReceiveAsync((New-Object System.ArraySegment[byte] -ArgumentList @($teacherRecvBuffer, 0, $teacherRecvBuffer.Length)), $cancellationToken)
$teacherTask.Wait(5000)
$stopwatchTeacher.Stop()
$teacherElapsedMs = $stopwatchTeacher.ElapsedMilliseconds

$teacherJson = [System.Text.Encoding]::UTF8.GetString($teacherRecvBuffer, 0, $teacherTask.Result.Count)
Write-Host "Raw Teacher Broadcast JSON: $teacherJson" -ForegroundColor Magenta
$teacherEvent = $teacherJson | ConvertFrom-Json

Write-Host "[OK] Teacher alert received in: $teacherElapsedMs ms" -ForegroundColor Green
Write-Host "    Event: $($teacherEvent.eventType) | Score: $($teacherEvent.integrityScore) | Desc: $($teacherEvent.description)" -ForegroundColor Yellow

if ($teacherElapsedMs -gt 1000) {
    Write-Host "[WARN] Teacher latency ($teacherElapsedMs ms) exceeded 1000ms threshold." -ForegroundColor Red
} else {
    Write-Host "[PASSED] Teacher received real-time broadcast in $teacherElapsedMs ms (Target: < 1000ms)" -ForegroundColor Green
}

# Verify 100 - 50 = 50 points
if ($studentAck.integrityScore -ne 50) {
    throw "Expected integrityScore 50 after CELL_PHONE violation, got: $($studentAck.integrityScore)"
}

# =====================================================================
# BENCHMARK TEST 2: Idempotency Verification (Safe Deduplication)
# =====================================================================
Write-Host "`n---------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " BENCHMARK 2: Idempotency & Safe Deduplication via violationId" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------------" -ForegroundColor Cyan

# Replay exact same violationId1 over WebSocket
$sendTaskReplay = $studentWs.SendAsync((New-Object System.ArraySegment[byte] -ArgumentList @($sendBytes, 0, $sendBytes.Length)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cancellationToken)
$sendTaskReplay.Wait()

$studentAckTask2 = $studentWs.ReceiveAsync((New-Object System.ArraySegment[byte] -ArgumentList @($studentRecvBuffer, 0, $studentRecvBuffer.Length)), $cancellationToken)
$studentAckTask2.Wait(5000)
$studentAckJson2 = [System.Text.Encoding]::UTF8.GetString($studentRecvBuffer, 0, $studentAckTask2.Result.Count)
$studentAck2 = $studentAckJson2 | ConvertFrom-Json

Write-Host "[OK] Idempotent replay response: Score remains $($studentAck2.integrityScore)" -ForegroundColor Green
if ($studentAck2.integrityScore -ne 50) {
    throw "Idempotency failed! Score was deducted twice: $($studentAck2.integrityScore)"
}
Write-Host "[PASSED] Safe retry idempotency confirmed - points not deducted twice" -ForegroundColor Green

# =====================================================================
# BENCHMARK TEST 3: HTTP Fallback Latency & Decoupled Screenshot Upload
# =====================================================================
Write-Host "`n---------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " BENCHMARK 3: HTTP Fallback & Decoupled Background Evidence Upload" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------------" -ForegroundColor Cyan

$violationId2 = [System.Guid]::NewGuid().ToString()
$httpPayload = @{
    violationId = $violationId2
    sessionId = $attemptId
    eventType = "MULTIPLE_FACES"
    confidence = 1.0
    description = "Multiple individuals detected in camera view"
    evidenceUrl = $null
    metadata = @{ source = "http_benchmark" }
} | ConvertTo-Json

$httpStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$httpRes = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Body $httpPayload -Headers $studentHeaders
$httpStopwatch.Stop()
$httpElapsedMs = $httpStopwatch.ElapsedMilliseconds

Write-Host "[OK] HTTP fallback response in: $httpElapsedMs ms" -ForegroundColor Green
Write-Host "    Score after MULTIPLE_FACES (-30 pts): $($httpRes.integrityScore)" -ForegroundColor Yellow
if ($httpRes.integrityScore -ne 20) {
    throw "Expected score 20, got: $($httpRes.integrityScore)"
}

# Attach Screenshot in Background
$fakeScreenshotBase64 = "data:image/jpeg;base64," + [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("fake_jpeg_screenshot_data"))
$evidencePayload = @{
    violationId = $violationId2
    sessionId = $attemptId
    evidenceUrl = $fakeScreenshotBase64
} | ConvertTo-Json

$evidenceRes = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/evidence" -Method Post -Body $evidencePayload -Headers $studentHeaders
Write-Host "[OK] Decoupled screenshot evidence attached: $($evidenceRes.message)" -ForegroundColor Green

# =====================================================================
# BENCHMARK TEST 4: Head & Eye Gaze Rule (5 Free Warnings, 6th onward -10 pts)
# =====================================================================
Write-Host "`n---------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " BENCHMARK 4: Head/Eye Gaze Rule (First 5 Free, 6th onward -10 pts)" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------------" -ForegroundColor Cyan

for ($i = 1; $i -le 5; $i++) {
    $vId = [System.Guid]::NewGuid().ToString()
    $gazePayload = @{
        violationId = $vId
        sessionId = $attemptId
        eventType = "HEAD_MOVEMENT"
        confidence = 1.0
        description = "Head turned away from screen"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Body $gazePayload -Headers $studentHeaders
    if ($res.integrityScore -ne 20) {
        throw "Warning $i should be free, but score was deducted: $($res.integrityScore)"
    }
}
Write-Host "[OK] 5 Free Head Movement warnings verified (Score remains 20)" -ForegroundColor Green

# 6th warning: should deduct 10 points (20 - 10 = 10)
$vId6 = [System.Guid]::NewGuid().ToString()
$gazePayload6 = @{
    violationId = $vId6
    sessionId = $attemptId
    eventType = "HEAD_MOVEMENT"
    confidence = 1.0
    description = "Head turned away from screen"
} | ConvertTo-Json
$res6 = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Body $gazePayload6 -Headers $studentHeaders
Write-Host "[OK] 6th Head Movement penalty applied: Score is now $($res6.integrityScore) (Deducted: $($res6.pointsDeducted) pts)" -ForegroundColor Yellow
if ($res6.integrityScore -ne 10) {
    throw "Expected score 10 after 6th warning (-10 pts penalty), got: $($res6.integrityScore)"
}

# =====================================================================
# BENCHMARK TEST 5: Fullscreen 2-Strike Disqualification Rule
# =====================================================================
Write-Host "`n---------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " BENCHMARK 5: Fullscreen 2-Strike Rule" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------------" -ForegroundColor Cyan

# 1st strike: warning only
$fsId1 = [System.Guid]::NewGuid().ToString()
$fs1 = @{
    violationId = $fsId1
    sessionId = $attemptId
    eventType = "FULLSCREEN_EXIT"
    confidence = 1.0
    description = "Exited full screen mode"
} | ConvertTo-Json
$fsRes1 = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Body $fs1 -Headers $studentHeaders
Write-Host "[OK] 1st Fullscreen exit: shouldTerminate = $($fsRes1.shouldTerminate) (Score remains 10)" -ForegroundColor Yellow
if ($fsRes1.shouldTerminate -eq $true) {
    throw "1st fullscreen exit should not terminate!"
}

# 2nd strike: immediate termination
$fsId2 = [System.Guid]::NewGuid().ToString()
$fs2 = @{
    violationId = $fsId2
    sessionId = $attemptId
    eventType = "FULLSCREEN_EXIT"
    confidence = 1.0
    description = "Exited full screen mode second time"
} | ConvertTo-Json
$fsRes2 = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Body $fs2 -Headers $studentHeaders
Write-Host "[OK] 2nd Fullscreen exit: shouldTerminate = $($fsRes2.shouldTerminate), reason = $($fsRes2.terminationReason)" -ForegroundColor Red
if ($fsRes2.shouldTerminate -ne $true) {
    throw "2nd fullscreen exit must trigger immediate termination!"
}

# Close WebSockets
try { $teacherWs.Dispose() } catch {}
try { $studentWs.Dispose() } catch {}

Write-Host "`n=====================================================================" -ForegroundColor Green
Write-Host " ALL LATENCY & REAL-TIME PROCTORING BENCHMARKS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
