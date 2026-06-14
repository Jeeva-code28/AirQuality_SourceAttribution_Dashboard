@echo off
echo ==========================================
echo      AQI Monitor - Startup Script
echo ==========================================

echo.
echo [1/3] Checking for conflicting processes on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do (
    echo Found blocking process PID: %%a
    taskkill /F /PID %%a
    echo Process terminated.
)

echo.
echo [2/3] Detecting Maven installation...
set MAVEN_CMD=mvn
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    echo Maven is not found on PATH. Checking for local maven-temp installation...
    if exist "%~dp0maven-temp\apache-maven-3.9.6\bin\mvn.cmd" (
        set MAVEN_CMD="%~dp0maven-temp\apache-maven-3.9.6\bin\mvn.cmd"
        echo Found local Maven: %MAVEN_CMD%
    ) else (
        echo ERROR: Maven is not installed on PATH and local maven-temp was not found.
        pause
        exit /b 1
    )
)

echo.
echo [3/3] Starting Backend ^& Frontend (Unified)...
echo This may take a minute. The dashboard will be available at http://localhost:8080
echo.

cd backend
call %MAVEN_CMD% spring-boot:run -DskipTests "-Dspring-boot.run.jvmArguments=-Xmx4g"
cd ..

pause
