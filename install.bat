@echo off
REM Jellyfin Apple Music Lyrics 插件安装脚本 (Windows)
REM 使用方法: install.bat [jellyfin_data_path]
REM 示例: install.bat "C:\ProgramData\Jellyfin\data"

setlocal enabledelayedexpansion

REM 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 此脚本必须以管理员身份运行
    pause
    exit /b 1
)

REM 设置变量
set "JELLYFIN_DATA=%1"
if "!JELLYFIN_DATA!"=="" set "JELLYFIN_DATA=C:\ProgramData\Jellyfin\data"

REM 获取脚本目录
set "SCRIPT_DIR=%~dp0"

echo.
echo ============================================
echo   Jellyfin Apple Music Lyrics Installer
echo ============================================
echo.
echo [*] 配置信息:
echo     Jellyfin数据路径: !JELLYFIN_DATA!
echo     脚本目录: !SCRIPT_DIR!
echo.

REM 检查Jellyfin目录
if not exist "!JELLYFIN_DATA!" (
    echo [ERROR] Jellyfin数据目录不存在: !JELLYFIN_DATA!
    pause
    exit /b 1
)

REM 检查DLL文件
set "DLL_PATH=!SCRIPT_DIR!bin\Release\net8.0\JellyfinAppleLyrics.dll"
if not exist "!DLL_PATH!" (
    echo [ERROR] DLL文件不存在: !DLL_PATH!
    echo.
    echo 需要先编译项目:
    echo   cd !SCRIPT_DIR!
    echo   dotnet build --configuration Release
    pause
    exit /b 1
)

echo [OK] DLL文件找到
echo.

REM 停止Jellyfin服务
echo [*] 停止Jellyfin服务...
for /f "tokens=*" %%i in ('tasklist ^| find /i "jellyfin"') do (
    taskkill /IM jellyfin.exe /F
    echo [OK] 已停止
    timeout /t 2 /nobreak
    goto :skip_stop
)
echo [*] Jellyfin未运行

:skip_stop
REM 创建插件目录
set "PLUGIN_DIR=!JELLYFIN_DATA!\plugins\AppleMusic"
echo [*] 创建插件目录: !PLUGIN_DIR!
if not exist "!PLUGIN_DIR!" (
    mkdir "!PLUGIN_DIR!"
)
echo [OK] 目录已创建
echo.

REM 复制文件
echo [*] 复制插件文件...
copy /Y "!DLL_PATH!" "!PLUGIN_DIR!" >nul
if exist "!SCRIPT_DIR!bin\Release\net8.0\JellyfinAppleLyrics.deps.json" (
    copy /Y "!SCRIPT_DIR!bin\Release\net8.0\JellyfinAppleLyrics.deps.json" "!PLUGIN_DIR!" >nul
)
if exist "!SCRIPT_DIR!bin\Release\net8.0\JellyfinAppleLyrics.pdb" (
    copy /Y "!SCRIPT_DIR!bin\Release\net8.0\JellyfinAppleLyrics.pdb" "!PLUGIN_DIR!" >nul
)
echo [OK] 文件已复制
echo.

REM 启动Jellyfin服务
echo [*] 启动Jellyfin服务...
net start JellyfinServer >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Jellyfin已启动
) else (
    echo [WARNING] Jellyfin启动失败，请手动启动
)
echo.

REM 显示完成信息
echo ============================================
echo      安装完成！
echo ============================================
echo.
echo [*] 后续步骤:
echo     1. 打开 Jellyfin 管理面板
echo     2. 进入 设置 ^> 管理员 ^> 插件
echo     3. 在列表中查找 "Apple Music Lyrics"
echo     4. 点击插件进行配置
echo     5. 播放音乐，享受 Apple Music 风格的歌词显示
echo.
echo [*] 插件文件位置: !PLUGIN_DIR!
echo.
pause
