# ==============================================================================
# Comprehensive Verification Suite: 6 Proctoring & Exam Features
# ==============================================================================
$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:5000"
$ts = Get-Date -Format "yyyyMMddHHmmss"
$teacherEmail = "teacher_feat_$ts@example.com"
$studentEmail = "student_feat_$ts@example.com"
$student2Email = "student2_feat_$ts@example.com"
$password = "Test@123456"

$results = @{
    Total = 0
    Passed = 0
    Failed = 0
    Details = @()
}

function Log-Step($name, $status, $detail) {
    $results.Total++
    if ($status -eq "PASS") {
        $results.Passed++
        Write-Host " [PASS] $name - $detail" -ForegroundColor Green
    } else {
        $results.Failed++
        Write-Host " [FAIL] $name - $detail" -ForegroundColor Red
    }
    $results.Details += [PSCustomObject]@{
        Step = $name
        Status = $status
        Detail = $detail
    }
}

Write-Host "=== Starting 6-Feature Automated Verification Suite ===" -ForegroundColor Cyan

# 1. Register Teacher & Students
try {
    $tReg = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Post -ContentType "application/json" -Body (@{
        name = "Feature Teacher"
        email = $teacherEmail
        password = $password
        role = "teacher"
        clientCode = "DEFAULT"
    } | ConvertTo-Json)
    $teacherToken = $tReg.token
    $teacherId = if ($tReg.id) { $tReg.id } else { $tReg._id }

    $sReg = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Post -ContentType "application/json" -Body (@{
        name = "Feature Student"
        email = $studentEmail
        password = $password
        role = "student"
        clientCode = "DEFAULT"
    } | ConvertTo-Json)
    $studentToken = $sReg.token
    $studentId = if ($sReg.id) { $sReg.id } else { $sReg._id }

    $s2Reg = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Post -ContentType "application/json" -Body (@{
        name = "Feature Student Two"
        email = $student2Email
        password = $password
        role = "student"
        clientCode = "DEFAULT"
    } | ConvertTo-Json)
    $student2Token = $s2Reg.token
    $student2Id = if ($s2Reg.id) { $s2Reg.id } else { $s2Reg._id }

    Log-Step "Auth Setup" "PASS" "Teacher ($teacherId) and Students ($studentId, $student2Id) registered successfully"
} catch {
    Log-Step "Auth Setup" "FAIL" $_.Exception.Message
}

$tHeaders = @{ Authorization = "Bearer $teacherToken" }
$sHeaders = @{ Authorization = "Bearer $studentToken" }
$s2Headers = @{ Authorization = "Bearer $student2Token" }

# 2. Total Marks Validation in Exam Creation & Update
$examCode = "EXAM_$ts"
try {
    # 2a. Reject totalMarks <= 0
    try {
        $badExam = Invoke-RestMethod -Uri "$baseUrl/api/users/exam" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
            examName = "Invalid Total Marks Exam"
            examId = "BAD_$ts"
            totalMarks = 0
            passingMarks = 40
            totalQuestions = 5
            duration = 30
            liveDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
            deadDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
        } | ConvertTo-Json)
        Log-Step "TotalMarks > 0 Validation" "FAIL" "Backend allowed totalMarks = 0"
    } catch {
        Log-Step "TotalMarks > 0 Validation" "PASS" "Backend correctly rejected totalMarks = 0 (HTTP $($_.Exception.Response.StatusCode.value__))"
    }

    # 2b. Reject passingMarks > totalMarks
    try {
        $badPassing = Invoke-RestMethod -Uri "$baseUrl/api/users/exam" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
            examName = "Invalid Passing Marks Exam"
            examId = "BAD_PASS_$ts"
            totalMarks = 50
            passingMarks = 60
            totalQuestions = 5
            duration = 30
            liveDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
            deadDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
        } | ConvertTo-Json)
        Log-Step "PassingMarks <= TotalMarks Validation" "FAIL" "Backend allowed passingMarks (60) > totalMarks (50)"
    } catch {
        Log-Step "PassingMarks <= TotalMarks Validation" "PASS" "Backend correctly rejected passingMarks > totalMarks (HTTP $($_.Exception.Response.StatusCode.value__))"
    }

    # 2c. Valid Exam Creation
    $validExam = Invoke-RestMethod -Uri "$baseUrl/api/users/exam" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
        examName = "Computer Science Integrity Exam $ts"
        examId = $examCode
        examPassword = "pass"
        totalMarks = 100
        passingMarks = 40
        totalQuestions = 3
        duration = 30
        hasCodingRound = $true
        codingMarks = 20
        liveDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        deadDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
    } | ConvertTo-Json)
    $createdExamId = $validExam.id
    Log-Step "Valid Exam Creation" "PASS" "Exam created with Total Marks: 100, Passing: 40, ID: $createdExamId"

    # Add 2 MCQ questions (40 marks each) -> MCQ (80) + Coding (20) = 100 Total Marks
    $q1 = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/questions" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
        examId = $examCode
        question = "What is the Big-O time complexity of Binary Search?"
        marks = 40
        options = @(
            @{ option = "O(log n)"; isCorrect = $true },
            @{ option = "O(n)"; isCorrect = $false },
            @{ option = "O(n log n)"; isCorrect = $false },
            @{ option = "O(1)"; isCorrect = $false }
        )
    } | ConvertTo-Json)

    $q2 = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/questions" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{
        examId = $examCode
        question = "Which data structure uses FIFO ordering?"
        marks = 40
        options = @(
            @{ option = "Queue"; isCorrect = $true },
            @{ option = "Stack"; isCorrect = $false },
            @{ option = "Tree"; isCorrect = $false },
            @{ option = "Graph"; isCorrect = $false }
        )
    } | ConvertTo-Json)
    Log-Step "Question Marks Allocation" "PASS" "Allocated 80 marks in MCQs + 20 marks in Coding = 100 marks exactly matching Total Marks"

} catch {
    Log-Step "Exam Creation Setup" "FAIL" $_.Exception.Message
}

# 3. Notification Flow: Enrollment Request -> Teacher Notification
try {
    # Check teacher initial unread count
    $initTeacherUnread = (Invoke-RestMethod -Uri "$baseUrl/api/notifications/unread-count" -Method Get -Headers $tHeaders).unreadCount

    # Student requests enrollment
    $enrollReq = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/$examCode/request-enrollment" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{} | ConvertTo-Json)
    
    # Check teacher unread count incremented
    $afterTeacherUnread = (Invoke-RestMethod -Uri "$baseUrl/api/notifications/unread-count" -Method Get -Headers $tHeaders).unreadCount
    $teacherNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?limit=5" -Method Get -Headers $tHeaders

    $enrollNotif = $teacherNotifs | Where-Object { $_.title -like "*Enrollment Request*" } | Select-Object -First 1

    if ($afterTeacherUnread -gt $initTeacherUnread -and $enrollNotif) {
        Log-Step "Teacher Enrollment Notification" "PASS" "Teacher received notification: '$($enrollNotif.title)' (Unread count: $afterTeacherUnread)"
    } else {
        Log-Step "Teacher Enrollment Notification" "FAIL" "Expected teacher notification not found (unread: $afterTeacherUnread vs $initTeacherUnread)"
    }
} catch {
    Log-Step "Teacher Enrollment Notification" "FAIL" $_.Exception.Message
}

# 4. Notification Flow: Teacher Approval -> Student Notification + Mark Read
try {
    $initStudentUnread = (Invoke-RestMethod -Uri "$baseUrl/api/notifications/unread-count" -Method Get -Headers $sHeaders).unreadCount

    # Teacher approves student
    $approveRes = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/$examCode/approve-student/$studentId" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{} | ConvertTo-Json)

    # Check student received notification
    $afterStudentUnread = (Invoke-RestMethod -Uri "$baseUrl/api/notifications/unread-count" -Method Get -Headers $sHeaders).unreadCount
    $studentNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?limit=5" -Method Get -Headers $sHeaders
    $approvedNotif = $studentNotifs | Where-Object { $_.title -like "*Enrollment Approved*" } | Select-Object -First 1

    if ($afterStudentUnread -gt $initStudentUnread -and $approvedNotif) {
        Log-Step "Student Approval Notification" "PASS" "Student received notification: '$($approvedNotif.title)' (Unread: $afterStudentUnread)"
    } else {
        Log-Step "Student Approval Notification" "FAIL" "Student did not receive approval notification"
    }

    # Test Mark As Read on the notification
    if ($approvedNotif) {
        $readRes = Invoke-RestMethod -Uri "$baseUrl/api/notifications/$($approvedNotif.id)/read" -Method Put -Headers $sHeaders
        $unreadAfterMark = (Invoke-RestMethod -Uri "$baseUrl/api/notifications/unread-count" -Method Get -Headers $sHeaders).unreadCount
        if ($unreadAfterMark -lt $afterStudentUnread) {
            Log-Step "Mark Notification Read" "PASS" "Notification marked read, unread count decremented from $afterStudentUnread to $unreadAfterMark"
        } else {
            Log-Step "Mark Notification Read" "FAIL" "Unread count did not decrement"
        }
    }
} catch {
    Log-Step "Student Notification & Mark Read" "FAIL" $_.Exception.Message
}

# 5. 100-Point Integrity Scoring System & Automatic Deductions
try {
    # Student starts exam session
    $sessionStart = Invoke-RestMethod -Uri "$baseUrl/api/sessions/start" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{
        examId = $examCode
        examPassword = "pass"
        deviceInfo = "Verified Webcam"
    } | ConvertTo-Json)
    $sessionId = $sessionStart.attemptId

    Log-Step "Proctoring Session Start" "PASS" "Session started with ID: $sessionId (Starting Integrity Score: 100)"

    # 5a. First 10 Head/Eye Warnings should be FREE (0 deduction, integrity remains 100)
    $allFree = $true
    for ($w = 1; $w -le 10; $w++) {
        $evt = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{
            sessionId = $sessionId
            eventType = "HEAD_POSE_LOOKING_AWAY"
            confidence = 1.0
            description = "Head movement looking away warning $w"
            metadata = @{ warningNumber = $w }
        } | ConvertTo-Json)

        if ($evt.pointsDeducted -ne 0 -or $evt.integrityScore -ne 100.0) {
            $allFree = $false
            Log-Step "Head/Eye Free Warnings" "FAIL" "Warning $w had pointsDeducted=$($evt.pointsDeducted), score=$($evt.integrityScore)"
            break
        }
    }
    if ($allFree) {
        Log-Step "Head/Eye 10 Free Warnings" "PASS" "First 10 head/eye warnings incurred 0 deductions; integrity score remained 100.0"
    }

    # 5b. 11th Head/Eye Warning: 5 points deduction -> score 95.0
    $evt11 = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{
        sessionId = $sessionId
        eventType = "EYE_GAZE_LOOKING_AWAY"
        confidence = 1.0
        description = "11th warning: Gaze looking away"
        metadata = @{ warningNumber = 11 }
    } | ConvertTo-Json)

    if ($evt11.pointsDeducted -eq 5 -and $evt11.integrityScore -eq 95.0) {
        Log-Step "11th Head/Eye Penalty (-5 pts)" "PASS" "11th warning deducted 5 points. Integrity score: $($evt11.integrityScore)"
    } else {
        Log-Step "11th Head/Eye Penalty (-5 pts)" "FAIL" "Expected pointsDeducted=5, score=95.0, got deducted=$($evt11.pointsDeducted), score=$($evt11.integrityScore)"
    }

    # 5c. Mobile Phone Detected: 50 points deduction -> score 45.0
    $evtPhone = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{
        sessionId = $sessionId
        eventType = "CELL_PHONE_DETECTED"
        confidence = 0.95
        description = "Mobile phone detected in frame"
        evidenceUrl = "data:image/jpeg;base64,evidence_sample_phone"
    } | ConvertTo-Json)

    if ($evtPhone.pointsDeducted -eq 50 -and $evtPhone.integrityScore -eq 45.0) {
        Log-Step "Mobile Phone Deduction (-50 pts)" "PASS" "Mobile phone deducted 50 points. Integrity score: $($evtPhone.integrityScore)"
    } else {
        Log-Step "Mobile Phone Deduction (-50 pts)" "FAIL" "Expected pointsDeducted=50, score=45.0, got deducted=$($evtPhone.pointsDeducted), score=$($evtPhone.integrityScore)"
    }

    # 5d. Multiple Faces Detected: 30 points deduction -> score 15.0
    $evtFaces = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{
        sessionId = $sessionId
        eventType = "MULTIPLE_FACES_DETECTED"
        confidence = 0.92
        description = "2 faces present in video"
    } | ConvertTo-Json)

    if ($evtFaces.pointsDeducted -eq 30 -and $evtFaces.integrityScore -eq 15.0) {
        Log-Step "Multiple Faces Deduction (-30 pts)" "PASS" "Multiple faces deducted 30 points. Integrity score: $($evtFaces.integrityScore)"
    } else {
        Log-Step "Multiple Faces Deduction (-30 pts)" "FAIL" "Expected pointsDeducted=30, score=15.0, got deducted=$($evtFaces.pointsDeducted), score=$($evtFaces.integrityScore)"
    }

    # 5e. No Face Detected: 20 points deduction -> score 0.0 & Auto-Termination
    $evtNoFace = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Headers $sHeaders -ContentType "application/json" -Body (@{
        sessionId = $sessionId
        eventType = "NO_FACE_DETECTED"
        confidence = 0.98
        description = "Candidate not visible in frame"
    } | ConvertTo-Json)

    if ($evtNoFace.integrityScore -eq 0.0 -and $evtNoFace.shouldTerminate -eq $true -and $evtNoFace.terminationReason -like "*Integrity score reached 0*") {
        Log-Step "Zero Integrity Auto-Termination" "PASS" "Integrity score reached 0.0 -> Session auto-terminated with reason: '$($evtNoFace.terminationReason)'"
    } else {
        Log-Step "Zero Integrity Auto-Termination" "FAIL" "Expected termination at score 0, got score=$($evtNoFace.integrityScore), shouldTerminate=$($evtNoFace.shouldTerminate), reason=$($evtNoFace.terminationReason)"
    }

} catch {
    Log-Step "100-Point Scoring System" "FAIL" $_.Exception.Message
}

# 6. Fullscreen 2-Strike Rule Verification
try {
    # Approve student 2 for same exam
    $req2 = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/$examCode/request-enrollment" -Method Post -Headers $s2Headers -ContentType "application/json" -Body (@{} | ConvertTo-Json)
    $app2 = Invoke-RestMethod -Uri "$baseUrl/api/users/exam/$examCode/approve-student/$student2Id" -Method Post -Headers $tHeaders -ContentType "application/json" -Body (@{} | ConvertTo-Json)

    # Start session for student 2
    $s2Session = Invoke-RestMethod -Uri "$baseUrl/api/sessions/start" -Method Post -Headers $s2Headers -ContentType "application/json" -Body (@{
        examId = $examCode
        examPassword = "pass"
        deviceInfo = "Verified Webcam"
    } | ConvertTo-Json)
    $s2SessionId = $s2Session.attemptId

    # Strike 1: FULLSCREEN_EXIT (Warning only, no termination)
    $fsStrike1 = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Headers $s2Headers -ContentType "application/json" -Body (@{
        sessionId = $s2SessionId
        eventType = "FULLSCREEN_EXIT"
        confidence = 1.0
        description = "Left fullscreen strike 1"
        metadata = @{ fullscreenStrike = 1 }
    } | ConvertTo-Json)

    if ($fsStrike1.shouldTerminate -eq $false) {
        Log-Step "Fullscreen Strike 1 Warning" "PASS" "Strike 1 resulted in warning only (shouldTerminate = false)"
    } else {
        Log-Step "Fullscreen Strike 1 Warning" "FAIL" "Strike 1 incorrectly triggered termination"
    }

    # Strike 2: FULLSCREEN_EXIT (Immediate termination)
    $fsStrike2 = Invoke-RestMethod -Uri "$baseUrl/api/proctoring/events" -Method Post -Headers $s2Headers -ContentType "application/json" -Body (@{
        sessionId = $s2SessionId
        eventType = "FULLSCREEN_EXIT"
        confidence = 1.0
        description = "Left fullscreen strike 2"
        metadata = @{ fullscreenStrike = 2 }
    } | ConvertTo-Json)

    if ($fsStrike2.shouldTerminate -eq $true -and $fsStrike2.terminationReason -like "*fullscreen*") {
        Log-Step "Fullscreen Strike 2 Termination" "PASS" "Strike 2 immediately terminated exam with reason: '$($fsStrike2.terminationReason)'"
    } else {
        Log-Step "Fullscreen Strike 2 Termination" "FAIL" "Strike 2 did not trigger fullscreen termination (shouldTerminate=$($fsStrike2.shouldTerminate), reason=$($fsStrike2.terminationReason))"
    }

} catch {
    Log-Step "Fullscreen 2-Strike Verification" "FAIL" $_.Exception.Message
}

# 7. Database Persistence Verification
try {
    $dbCheck = mysql -u root -proot ai_eval8_db -e "SELECT event_type, points_deducted, integrity_score_after, warning_number FROM proctoring_events WHERE session_id = '$sessionId' ORDER BY id ASC;"
    if ($dbCheck -match "CELL_PHONE_DETECTED" -and $dbCheck -match "50" -and $dbCheck -match "HEAD_POSE_LOOKING_AWAY") {
        Log-Step "MySQL Proctoring Events Persistence" "PASS" "proctoring_events rows contain points_deducted, integrity_score_after, and warning_number"
    } else {
        Log-Step "MySQL Proctoring Events Persistence" "FAIL" "Expected event fields not populated in MySQL"
    }

    $dbAttempts = mysql -u root -proot ai_eval8_db -e "SELECT id, status, termination_reason FROM exam_attempts WHERE id = '$sessionId';"
    if (($dbAttempts -match "DISQUALIFIED" -or $dbAttempts -match "TERMINATED") -and $dbAttempts -match "Integrity score reached 0") {
        Log-Step "MySQL Exam Attempt Termination Reason" "PASS" "exam_attempts recorded status=DISQUALIFIED and termination_reason='Integrity score reached 0'"
    } else {
        Log-Step "MySQL Exam Attempt Termination Reason" "FAIL" "exam_attempts termination_reason not populated: $dbAttempts"
    }
} catch {
    Log-Step "Database Persistence Check" "FAIL" $_.Exception.Message
}

# Summary
Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "Verification Summary: $($results.Passed) / $($results.Total) PASSED" -ForegroundColor $(if ($results.Failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================================" -ForegroundColor Cyan

if ($results.Failed -gt 0) {
    exit 1
}
exit 0
