@echo off
title Safe Git Pull - DEV Branch

echo ==========================================
echo        SAFE GIT PULL SCRIPT (DEV)
echo ==========================================

REM Check if Git is installed
git --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
echo Git is not installed or not in PATH.
pause
exit /b
)

REM Check if inside a git repository
git rev-parse --is-inside-work-tree >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
echo This folder is not a Git repository.
pause
exit /b
)

echo Checking for uncommitted changes...

git diff --quiet
IF %ERRORLEVEL% NEQ 0 (
echo.
echo ERROR: You have uncommitted changes.
echo Please commit or stash them before pulling.
git status
pause
exit /b
)

echo.
echo Switching to DEV branch...
git checkout dev

IF %ERRORLEVEL% NEQ 0 (
echo Failed to switch branch.
pause
exit /b
)

echo.
echo Pulling latest changes from origin/dev...
git pull origin dev

echo.
echo ==========================================
echo            UPDATE COMPLETE
echo ==========================================
pause
