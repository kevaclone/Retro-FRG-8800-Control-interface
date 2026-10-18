@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Yaesu FRG-8800 CAT Controller - Opera Launcher

REM =========================================================================
REM  YAESU FRG-8800 CAT CONTROLLER - ONE-CLICK INSTALLER & OPERA LAUNCHER
REM  Windows 10 / 11 Compatible (Supports Paths with Spaces & Node.js 18-24)
REM =========================================================================

REM Always ensure we run from the project directory containing package.json
cd /d "%~dp0"
if exist "package.json" goto dir_found
if exist "%~dp0package.json" goto dir_found
if exist "%~dp0..\package.json" cd /d "%~dp0.."
if exist "package.json" goto dir_found

echo =========================================================================
echo    YAESU FRG-8800 CAT CONTROLLER - INSTALLER ERROR
echo =========================================================================
echo.
echo  [ERROR] package.json was not found in:
echo         %CD%
echo.
echo  Did you run this file directly from inside the ZIP without extracting?
echo.
echo  HOW TO FIX:
echo  1. Right-click the downloaded ZIP file and select "Extract All...".
echo  2. Choose a destination folder and click "Extract".
echo  3. Open the extracted folder and double-click Run_In_Opera.bat.
echo.
echo =========================================================================
echo.
pause
exit /b 1

:dir_found

echo =========================================================================
echo    YAESU FRG-8800 COMMUNICATIONS RECEIVER - CAT CONTROLLER
echo    Automated One-Click Installer and Opera Browser Launcher
echo =========================================================================
echo.

REM 1. Verify Node.js is installed and accessible
echo [*] Checking for Node.js runtime...
where node >nul 2>nul
if not errorlevel 1 goto node_found

REM Scan standard 64-bit and 32-bit Program Files without parenthesized blocks
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\nodejs\node.exe" goto node_found

if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" goto node_found

if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs\node.exe" goto node_found

if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" goto node_found

if exist "%APPDATA%\nvm\current\node.exe" set "PATH=%APPDATA%\nvm\current;%PATH%"
if exist "%APPDATA%\nvm\current\node.exe" goto node_found

echo.
echo =========================================================================
echo  [ERROR] Node.js was not found on your system!
echo =========================================================================
echo.
echo  Node.js is required to run the local Web Serial CAT server.
echo.
echo  Please download and install Node.js (version 20 or 22 LTS) from:
echo         https://nodejs.org/
echo.
echo  Opening https://nodejs.org/ in your browser now...
start "" "https://nodejs.org/"
echo.
echo  If you just installed Node.js:
echo  - Please close and re-open this batch file so Windows refreshes PATH.
echo.
echo =========================================================================
echo.
pause
exit /b 1

:node_found
echo     [OK] Node.js runtime is found and ready.

REM 2. Verify NPM is installed and accessible
echo [*] Checking for NPM package manager...
where npm >nul 2>nul
if not errorlevel 1 goto npm_found

if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\nodejs\npm.cmd" goto npm_found

if exist "C:\Program Files\nodejs\npm.cmd" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files\nodejs\npm.cmd" goto npm_found

if exist "C:\Program Files (x86)\nodejs\npm.cmd" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs\npm.cmd" goto npm_found

if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"
where npm >nul 2>nul
if not errorlevel 1 goto npm_found

echo.
echo =========================================================================
echo  [ERROR] NPM was not found in your PATH!
echo =========================================================================
echo  Please reinstall Node.js from https://nodejs.org/ and ensure
echo  "npm package manager" is checked during setup.
echo.
echo =========================================================================
echo.
pause
exit /b 1

:npm_found
echo     [OK] NPM package manager is ready.
echo.

REM 3. Install dependencies if node_modules is missing
if exist "node_modules\vite\bin\vite.js" goto deps_ready

echo [*] First-time setup: Installing required dependencies...
echo     (This only happens once and typically takes 20 to 45 seconds)
echo.
echo [*] Running: npm install --legacy-peer-deps --no-audit --no-fund
call npm install --legacy-peer-deps --no-audit --no-fund
if not errorlevel 1 goto deps_ready

echo.
echo [!] Standard install had a warning, retrying with --force...
call npm install --force --no-audit --no-fund
if not errorlevel 1 goto deps_ready

echo.
echo =========================================================================
echo  [ERROR] Failed to install npm packages.
echo  Please check your internet connection and try running:
echo      npm install --legacy-peer-deps
echo =========================================================================
echo.
pause
exit /b 1

:deps_ready
echo     [OK] Dependencies ready.
echo.

REM 4. Locate Opera Browser executable
echo [*] Locating Opera Browser...
set "OPERA_BIN="
if exist "%LOCALAPPDATA%\Programs\Opera\launcher.exe" set "OPERA_BIN=%LOCALAPPDATA%\Programs\Opera\launcher.exe"
if exist "%LOCALAPPDATA%\Programs\Opera GX\launcher.exe" set "OPERA_BIN=%LOCALAPPDATA%\Programs\Opera GX\launcher.exe"
if exist "C:\Program Files\Opera\launcher.exe" set "OPERA_BIN=C:\Program Files\Opera\launcher.exe"
if exist "C:\Program Files (x86)\Opera\launcher.exe" set "OPERA_BIN=C:\Program Files (x86)\Opera\launcher.exe"

REM 5. Open Browser directly without escaping or shell wrappers
if defined OPERA_BIN (
    echo     [OK] Found Opera: "%OPERA_BIN%"
    echo [*] Opening Yaesu FRG-8800 Controller in Opera...
    start "" "%OPERA_BIN%" "http://127.0.0.1:3000"
) else (
    echo     [!] Opera not detected at standard location.
    echo [*] Opening default web browser...
    start "" "http://127.0.0.1:3000"
)

echo.
echo =========================================================================
echo    YAESU FRG-8800 CAT CONTROLLER SERVER
echo =========================================================================
echo.
echo    Local Controller URL: http://127.0.0.1:3000
echo.
echo    - If Opera shows "refused to connect" on initial opening, wait 2
echo      seconds for the server below to finish starting and press F5 (refresh).
echo.
echo  *************************************************************************
echo  * CRITICAL: KEEP THIS COMMAND PROMPT WINDOW OPEN!                       *
echo  * The web controller runs inside this window. If you close this window, *
echo  * the controller server stops immediately.                              *
echo  * To stop the server, press Ctrl + C.                                   *
echo  *************************************************************************
echo.

REM 6. Start Vite Server Directly via Node (Guaranteed support for paths with spaces)
if exist "node_modules\vite\bin\vite.js" (
    node "node_modules\vite\bin\vite.js" --port=3000 --host=0.0.0.0
) else (
    call npm run dev
)

echo.
echo =========================================================================
echo    Server has stopped.
echo =========================================================================
echo.
pause
