@echo off
echo Stopping any node processes is recommended but manual Ctrl+C is best...
echo Updating Prisma Client and Database Schema...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate Prisma Client. Please make sure the server is STOPPED.
    pause
    exit /b %errorlevel%
)

call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push DB changes. Please make sure the server is STOPPED.
    pause
    exit /b %errorlevel%
)

echo [SUCCESS] Database and Client updated successfully!
echo You can now restart your server with: npm run dev
pause
