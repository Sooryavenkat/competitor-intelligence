@echo off
REM Competitor Intelligence Monthly Run
REM Schedule this with Windows Task Scheduler to run monthly
REM Task Scheduler: Create Task > Triggers > Monthly > Action: Start Program > this .bat

echo [%date% %time%] Starting competitor intelligence run...

REM Set your API key here or ensure it's in system environment variables
REM set ANTHROPIC_API_KEY=sk-ant-...

cd /d "%~dp0"

echo [%date% %time%] Running Agent 1: Scraper + Analyst...
python scripts\agent1_scrape.py
if %errorlevel% neq 0 (
    echo [%date% %time%] ERROR: Agent 1 failed with exit code %errorlevel%
    exit /b %errorlevel%
)

echo [%date% %time%] Running Agent 2: Dashboard Builder...
python scripts\agent2_build.py
if %errorlevel% neq 0 (
    echo [%date% %time%] ERROR: Agent 2 failed with exit code %errorlevel%
    exit /b %errorlevel%
)

echo [%date% %time%] Done! Dashboard updated at dashboard\index.html
