@echo off
echo Memulai Aplikasi SO Faktur...
echo Mohon tunggu sebentar...

:: Start the Next.js server in a new window/background
start cmd /k "npm run dev"

:: Wait for server to initialize (approx 5 seconds)
timeout /t 5 /nobreak >nul

:: Open browser
echo Membuka browser...
start http://localhost:3000

echo Aplikasi telah berjalan.
echo Tutup jendela cmd 'npm run dev' untuk mematikan server.
pause
