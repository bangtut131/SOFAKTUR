@echo off
echo ========================================================
echo   EASY DEPLOY HELPER - PUSH TO GITHUB
echo ========================================================
echo.
echo 1. Go to https://github.com/new
echo 2. Create a repository name (e.g. "so-faktur-app")
echo 3. Select "Private"
echo 4. Click "Create repository"
echo 5. Copy the HTTPS URL (e.g. https://github.com/username/repo.git)
echo.
set /p repo_url="Paste the GitHub URL here: "

if "%repo_url%"=="" goto error

echo.
echo Setting up remote origin...
git remote remove origin 2>nul
git remote add origin %repo_url%

echo.
echo Pushing code to GitHub...
git branch -M main
git push -u origin main

echo.
echo ========================================================
echo   SUCCESS! CODE PUSHED.
echo ========================================================
echo.
echo NEXT STEPS (THE "INSTANT" WAY):
echo 1. Go to https://railway.app
echo 2. Click "New Project" -> "Deploy from GitHub repo"
echo 3. Select your repository.
echo 4. Click "Deploy Now".
echo 5. When it asks for variables or fails: 
echo    - Go to "Variables".
echo    - Add "ACCURATE_API_..." etc.
echo    - IMPORTANT: For Database, just right-click the empty space (or click "New") -> "Database" -> "Add PostgreSQL".
echo    - Railway will AUTOMATICALLY connect them. No setup needed!
echo.
pause
exit

:error
echo Error: URL cannot be empty.
pause
