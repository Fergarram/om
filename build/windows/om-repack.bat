@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "OM_EXE=%SCRIPT_DIR%om.exe"

REM Build directory is the same as script directory (where om.exe lives)
set "BUILD_DIR=%SCRIPT_DIR%"

REM Default to build\default_app if no argument provided
if "%~1"=="" (
    set "SOURCE_DIR=%BUILD_DIR%default_app"
) else (
    set "SOURCE_DIR=%~1"
)

echo Om Repack Utility
echo Script location: %SCRIPT_DIR%
echo Build directory: %BUILD_DIR%
echo Source directory: !SOURCE_DIR!

REM Convert to full path
pushd . >nul 2>&1
if exist "!SOURCE_DIR!" (
    cd /d "!SOURCE_DIR!" >nul 2>&1
    set "FULL_SOURCE_PATH=!CD!"
    popd >nul 2>&1
) else (
    popd >nul 2>&1
    set "FULL_SOURCE_PATH=!SOURCE_DIR!"
)

echo Full source path: !FULL_SOURCE_PATH!

REM Check if source directory exists
if not exist "!FULL_SOURCE_PATH!" (
    echo Error: Directory not found: !FULL_SOURCE_PATH!
    exit /b 1
)

REM Run om to create the asar
echo Creating asar package...
"!OM_EXE!" --pack-asar "!FULL_SOURCE_PATH!"
if !errorlevel! neq 0 (
    echo Failed to create asar package
    exit /b 1
)

REM Determine paths
set "TEMP_ASAR=!FULL_SOURCE_PATH!.asar"
set "TARGET_ASAR=%SCRIPT_DIR%resources\default_app.asar"

echo Replacing !TARGET_ASAR! with !TEMP_ASAR!...

REM Create backup
if exist "!TARGET_ASAR!" (
    echo Creating backup...
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
    set "mytime=!mytime: =!"
    copy "!TARGET_ASAR!" "!TARGET_ASAR!.backup.!mydate!_!mytime!" >nul 2>&1
)

REM Replace the file
move "!TEMP_ASAR!" "!TARGET_ASAR!" >nul 2>&1
if !errorlevel! equ 0 (
    echo Repack completed successfully!
) else (
    copy "!TEMP_ASAR!" "!TARGET_ASAR!" /Y >nul 2>&1
    if !errorlevel! equ 0 (
        del "!TEMP_ASAR!" >nul 2>&1
        echo Repack completed successfully!
    ) else (
        echo Failed to replace asar file
        echo Temporary file created at: !TEMP_ASAR!
        echo Please manually replace: !TARGET_ASAR!
        exit /b 1
    )
)
