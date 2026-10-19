# =====================================================================
# AI Exam Proctoring System - Comprehensive Test Data Cleanup Script
# Cleans up all test accounts, sessions, attempts, and logs from MySQL.
# Keeps the database schema and actual user accounts intact.
# Reads credentials from project root .env file.
# =====================================================================

param(
    [string]$EnvFile = "D:\Mega Project 4th Year\AI-Exam-Proctoring-System\.env"
)

$envVars = @{}
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | Where-Object { $_ -match '^\s*([^#=]+)\s*=\s*(.*)\s*$' } | ForEach-Object {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$dbUser = if ($envVars["DB_USER"]) { $envVars["DB_USER"] } else { "root" }
$dbPass = if ($envVars["DB_PASSWORD"]) { $envVars["DB_PASSWORD"] } else { "root" }
$dbName = if ($envVars["DB_NAME"]) { $envVars["DB_NAME"] } else { "ai_eval8_db" }
$dbHost = if ($envVars["DB_HOST"]) { $envVars["DB_HOST"] } else { "localhost" }

$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysql)) { $mysql = "mysql" }

$cleanupSql = @"
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Delete Proctoring Events associated with test sessions or test users
DELETE pe FROM proctoring_events pe
JOIN proctoring_sessions ps ON pe.session_id = ps.id
JOIN exam_attempts ea ON ps.attempt_id = ea.id
JOIN users u ON ea.student_id = u.id
WHERE u.email LIKE 'journey_%' 
   OR u.email LIKE 'audit_%' 
   OR u.email LIKE '%_feat_%' 
   OR u.email LIKE '%_aud%' 
   OR u.email LIKE 'concurrency_%' 
   OR u.email LIKE 'test_audio_%'
   OR u.email LIKE 'diag_%'
   OR u.email LIKE '%@test.com'
   OR u.email LIKE 'test_student_%';

-- 2. Delete Proctoring Sessions
DELETE ps FROM proctoring_sessions ps
JOIN exam_attempts ea ON ps.attempt_id = ea.id
JOIN users u ON ea.student_id = u.id
WHERE u.email LIKE 'journey_%' 
   OR u.email LIKE 'audit_%' 
   OR u.email LIKE '%_feat_%' 
   OR u.email LIKE '%_aud%' 
   OR u.email LIKE 'concurrency_%' 
   OR u.email LIKE 'test_audio_%'
   OR u.email LIKE 'diag_%'
   OR u.email LIKE '%@test.com'
   OR u.email LIKE 'test_student_%';

-- 3. Delete Orphaned Proctoring Events / Sessions
DELETE pe FROM proctoring_events pe LEFT JOIN proctoring_sessions ps ON pe.session_id = ps.id LEFT JOIN exam_attempts ea ON ps.attempt_id = ea.id WHERE ea.id IS NULL;
DELETE ps FROM proctoring_sessions ps LEFT JOIN exam_attempts ea ON ps.attempt_id = ea.id WHERE ea.id IS NULL;

-- 4. Delete Exam Attempts
DELETE ea FROM exam_attempts ea
JOIN users u ON ea.student_id = u.id
WHERE u.email LIKE 'journey_%' 
   OR u.email LIKE 'audit_%' 
   OR u.email LIKE '%_feat_%' 
   OR u.email LIKE '%_aud%' 
   OR u.email LIKE 'concurrency_%' 
   OR u.email LIKE 'test_audio_%'
   OR u.email LIKE 'diag_%'
   OR u.email LIKE '%@test.com'
   OR u.email LIKE 'test_student_%';

-- 5. Delete Exam Enrollments
DELETE ee FROM exam_enrollments ee
JOIN users u ON ee.student_id = u.id
WHERE u.email LIKE 'journey_%' 
   OR u.email LIKE 'audit_%' 
   OR u.email LIKE '%_feat_%' 
   OR u.email LIKE '%_aud%' 
   OR u.email LIKE 'concurrency_%' 
   OR u.email LIKE 'test_audio_%'
   OR u.email LIKE 'diag_%'
   OR u.email LIKE '%@test.com'
   OR u.email LIKE 'test_student_%';

-- 6. Delete Cheating Logs
DELETE cl FROM cheating_logs cl
WHERE cl.email LIKE 'journey_%' 
   OR cl.email LIKE 'audit_%' 
   OR cl.email LIKE '%_feat_%' 
   OR cl.email LIKE '%_aud%' 
   OR cl.email LIKE 'concurrency_%' 
   OR cl.email LIKE 'test_audio_%'
   OR cl.exam_id LIKE 'JOURNEY_%' 
   OR cl.exam_id LIKE 'AUDIT_%'
   OR cl.exam_id LIKE 'EXAM_%'
   OR cl.exam_id LIKE 'FEAT_%'
   OR cl.exam_id LIKE 'BAD_%'
   OR cl.exam_id LIKE 'LOAD_%';

-- 7. Delete Coding Questions
DELETE cq FROM coding_questions cq
WHERE cq.exam_id LIKE 'JOURNEY_%' 
   OR cq.exam_id LIKE 'AUDIT_%'
   OR cq.exam_id LIKE 'EXAM_%'
   OR cq.exam_id LIKE 'FEAT_%'
   OR cq.exam_id LIKE 'BAD_%'
   OR cq.exam_id LIKE 'LOAD_%';

-- 8. Delete Multiple Choice Questions
DELETE q FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE e.exam_code LIKE 'JOURNEY_%' 
   OR e.exam_code LIKE 'AUDIT_%'
   OR e.exam_code LIKE 'EXAM_%'
   OR e.exam_code LIKE 'FEAT_%'
   OR e.exam_code LIKE 'BAD_%'
   OR e.exam_code LIKE 'LOAD_%';

-- 9. Delete Exams created by test teachers or with test codes
DELETE e FROM exams e
WHERE e.exam_code LIKE 'JOURNEY_%' 
   OR e.exam_code LIKE 'AUDIT_%'
   OR e.exam_code LIKE 'EXAM_%'
   OR e.exam_code LIKE 'FEAT_%'
   OR e.exam_code LIKE 'BAD_%'
   OR e.exam_code LIKE 'LOAD_%'
   OR e.teacher_id IN (
       SELECT id FROM users 
       WHERE email LIKE 'journey_%' 
          OR email LIKE 'audit_%' 
          OR email LIKE '%_feat_%' 
          OR email LIKE '%_aud%' 
          OR email LIKE 'concurrency_%' 
          OR email LIKE 'test_audio_%'
          OR email LIKE 'diag_%'
          OR email LIKE '%@test.com'
          OR email LIKE 'test_student_%'
   );

-- 10. Delete Test Users
DELETE FROM users 
WHERE email LIKE 'journey_%' 
   OR email LIKE 'audit_%' 
   OR email LIKE '%_feat_%' 
   OR email LIKE '%_aud%' 
   OR email LIKE 'concurrency_%' 
   OR email LIKE 'test_audio_%'
   OR email LIKE 'diag_%'
   OR email LIKE '%@test.com'
   OR email LIKE 'test_student_%';

SET FOREIGN_KEY_CHECKS = 1;
"@

Write-Host "Cleaning up all test accounts and related test records from $dbName..."
$tempSql = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempSql -Value $cleanupSql -Encoding utf8
cmd /c "type `"$tempSql`" | `"$mysql`" -u $dbUser -p$dbPass -h $dbHost $dbName"
Remove-Item $tempSql -Force -ErrorAction SilentlyContinue

Write-Host "Verifying zero residual test users..."
$verifySql = "SELECT COUNT(*) as test_user_count FROM users WHERE email LIKE 'journey_%' OR email LIKE 'audit_%' OR email LIKE '%_feat_%' OR email LIKE '%_aud%' OR email LIKE 'concurrency_%' OR email LIKE 'test_audio_%' OR email LIKE 'diag_%' OR email LIKE '%@test.com' OR email LIKE 'test_student_%';"
cmd /c "`"$mysql`" -u $dbUser -p$dbPass -h $dbHost $dbName -e `"$verifySql`""
Write-Host "Cleanup completed successfully!"
