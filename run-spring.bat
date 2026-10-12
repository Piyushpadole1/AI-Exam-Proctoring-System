@echo off
echo ========================================================
echo Starting AI Exam Proctoring System - Java Spring Boot
echo ========================================================
set "JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0backend-spring"
if not exist "target\examproctoring-1.0.0.jar" (
    echo Building Spring Boot application...
    call "D:\Mega Project 4th Year\tools\apache-maven-3.9.9\bin\mvn.cmd" package -DskipTests
)

echo Starting on http://localhost:5000 ...
java -jar target\examproctoring-1.0.0.jar
pause
