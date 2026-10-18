# =====================================================================
# AI Exam Proctoring System - Test Data Cleanup Script
# Cleans up all test accounts and related entities from MySQL.
# Keeps the database schema intact.
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

DELETE pe FROM proctoring_events pe
JOIN proctoring_sessions ps ON pe.session_id = ps.id
JOIN exam_attempts ea ON ps.attempt_id = ea.id
JOIN users u ON ea.student_id = u.id
WHERE u.email LIKE 'journey_%@test.com' OR u.email LIKE 'audit_%@test.com';

DELETE ps FROM proctoring_sessions ps
JOIN exam_attempts ea ON ps.attempt_id = ea.id
JOIN users u ON ea.student_id = u.id
WHERE u.email LIKE 'journey_%@test.com' OR u.email LIKE 'audit_%@test.com';

DELETE pe FROM proctoring_events pe LEFT JOIN proctoring_sessions ps ON pe.session_id = ps.id LEFT JOIN exam_attempts ea ON ps.attempt_id = ea.id WHERE ea.id IS NULL;
DELETE ps FROM proctoring_sessions ps LEFT JOIN exam_attempts ea ON ps.attempt_id = ea.id WHERE ea.id IS NULL;

DELETE ea FROM exam_attempts ea
JOIN users u ON ea.student_id = u.id
WHERE u.email LIKE 'journey_%@test.com' OR u.email LIKE 'audit_%@test.com';

DELETE ee FROM exam_enrollments ee
JOIN users u ON ee.student_id = u.id
WHERE u.email LIKE 'journey_%@test.com' OR u.email LIKE 'audit_%@test.com';

DELETE cl FROM cheating_logs cl
WHERE cl.email LIKE 'journey_%@test.com' OR cl.email LIKE 'audit_%@test.com'
   OR cl.exam_id LIKE 'JOURNEY_EXAM_%' OR cl.exam_id LIKE 'AUDIT_EXAM_%';

DELETE cq FROM coding_questions cq
WHERE cq.exam_id LIKE 'JOURNEY_EXAM_%' OR cq.exam_id LIKE 'AUDIT_EXAM_%';

DELETE q FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE e.exam_code LIKE 'JOURNEY_EXAM_%' OR e.exam_code LIKE 'AUDIT_EXAM_%';

DELETE e FROM exams e
JOIN users u ON e.teacher_id = u.id
WHERE u.email LIKE 'journey_%@test.com' OR u.email LIKE 'audit_%@test.com';

DELETE FROM users WHERE email LIKE 'journey_%@test.com' OR email LIKE 'audit_%@test.com';

SET FOREIGN_KEY_CHECKS = 1;
"@

Write-Host "Cleaning up all test accounts and related test records from $dbName..."
$tempSql = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempSql -Value $cleanupSql -Encoding utf8
cmd /c "type `"$tempSql`" | `"$mysql`" -u $dbUser -p$dbPass -h $dbHost $dbName"
Remove-Item $tempSql -Force -ErrorAction SilentlyContinue

Write-Host "Verifying zero residual test users..."
$verifySql = "SELECT COUNT(*) as test_user_count FROM users WHERE email LIKE 'journey_%@test.com' OR email LIKE 'audit_%@test.com';"
cmd /c "`"$mysql`" -u $dbUser -p$dbPass -h $dbHost $dbName -e `"$verifySql`""
Write-Host "Cleanup completed successfully!"
