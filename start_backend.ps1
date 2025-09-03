#!/usr/bin/env pwsh

Write-Host "Starting AI-Title Backend Server..." -ForegroundColor Green
Write-Host ""

# Change to backend directory
$backendPath = Join-Path $PSScriptRoot "backend"
Set-Location $backendPath

Write-Host "Checking if Python is installed..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>$null
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python and try again" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Installing/updating dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

Write-Host ""
Write-Host "Starting the backend server..." -ForegroundColor Green
Write-Host "The server will run on http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server when you're done" -ForegroundColor Yellow
Write-Host ""

python wsgi.py
