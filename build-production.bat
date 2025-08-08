@echo off
echo Building AI Title Generator for Production...
echo.

REM Build the application
echo Building React and Electron...
call npm run build

REM Create Windows distribution
echo Creating Windows distribution...
call npm run dist-win

echo.
echo Build completed! Check the release folder for the installer.
pause 