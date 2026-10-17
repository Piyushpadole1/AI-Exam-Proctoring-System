@echo off
echo ========================================================
echo Starting AI Exam Proctoring System (Full Stack)
echo ========================================================
set "JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0"

if not exist "backend-spring\target\examproctoring-1.0.0.jar" (
    echo Building Spring Boot application...
    cd /d "%~dp0backend-spring"
    call "D:\Mega Project 4th Year\tools\apache-maven-3.9.9\bin\mvn.cmd" package -DskipTests
    cd /d "%~dp0"
)

echo Starting Backend (http://localhost:5000) and Frontend (http://localhost:3000)...
npm run dev
pause
