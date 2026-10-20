@echo off
chcp 65001 >nul
cd /d "%~dp0"
set OLD=%~dp0..\warit67

echo [1/4] Moving Expo project files into frontend...
if exist "%OLD%\frontend\package.json" (
  for /d %%D in ("%OLD%\frontend\*") do (
    if /i not "%%~nxD"=="src" if /i not "%%~nxD"=="app" move "%%D" "frontend\" >nul
  )
  for %%F in ("%OLD%\frontend\*") do move "%%F" "frontend\" >nul
  rmdir /s /q "%OLD%\frontend"
) else (
  echo    warit67\frontend not found - skipping
)
if exist "frontend\app" rmdir /s /q "frontend\app"
if exist "%OLD%\Std0251344IPFinal2026" rmdir /s /q "%OLD%\Std0251344IPFinal2026"

echo [2/4] Installing backend packages...
cd backend
call npm install
cd ..

echo [3/4] Installing frontend packages...
cd frontend
if not exist "package.json" (
  echo    ERROR: frontend\package.json missing. Run: npx create-expo-app@latest frontend-tmp  then tell Claude.
  pause
  exit /b 1
)
call npm install
cd ..

echo [4/4] Done!
echo.
echo Start app:  cd frontend  then  npx expo start -c
pause
