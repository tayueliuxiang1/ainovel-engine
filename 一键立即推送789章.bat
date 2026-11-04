@echo off
chcp 65001 >nul
title 789章立即推送 - 踏月难留香
echo ====================================================
echo 🚀 开始立即将第 7、8、9 章推送到番茄小说作家后台...
echo ====================================================
cd /d "%~dp0"
node scripts\batch_publish_789.js
echo.
echo 按任意键退出...
pause >nul
