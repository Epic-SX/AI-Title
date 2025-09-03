@echo off
echo Starting AI-Title Backend Server...
echo.

cd /d "%~dp0backend"

echo Checking if Python is installed...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

echo.
echo Installing/updating dependencies...
pip install -r requirements.txt

echo.
echo Starting the backend server...
echo The server will run on http://localhost:5000
echo.
echo Press Ctrl+C to stop the server when you're done
echo.

python wsgi.py
