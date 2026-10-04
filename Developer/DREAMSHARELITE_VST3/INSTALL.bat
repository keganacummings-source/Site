@echo off
setlocal
cd /d "%~dp0"
"%~dp0Install DREAMSHARELITE.exe"
exit /b %errorlevel%
