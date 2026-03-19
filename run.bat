@echo off
echo ========================================
echo  Securin Competitor Intelligence Runner
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Running Scraper + Analyst...
python scripts\agent1_scrape.py %*
if %errorlevel% neq 0 (
    echo ERROR: Scraping failed.
    pause
    exit /b 1
)

echo.
echo [2/2] Building Dashboard...
python scripts\agent2_build.py --serve --port 8080
