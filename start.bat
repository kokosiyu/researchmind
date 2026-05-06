@echo off
chcp 65001 >nul

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
if not defined PORT set "PORT=5000"

echo [1/3] 构建前端...
cd /d "%ROOT%"
call npm run build
if errorlevel 1 (
    echo 构建失败！按任意键退出...
    pause >nul
    exit /b 1
)

echo [2/3] 复制文件...
xcopy /E /I /Y dist backend\public >nul

echo [3/3] 启动服务...

echo 正在启动后端服务（端口 %PORT%）...
start "后端服务" /D "%BACKEND%" cmd /k "set PORT=%PORT% && npm start"

timeout /t 3 /nobreak >nul

echo 正在启动 cpolar...
start "Cpolar" cmd /k ""C:\Program Files\cpolar\cpolar.exe" http %PORT%"

echo.
echo 启动完成！请等待两个窗口显示成功后再访问网站。
echo 按任意键关闭此窗口...
pause >nul