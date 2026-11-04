@echo off
chcp 65001 >nul
title 预约发布日历与状态
cd /d "%~dp0"
node scripts\view_schedule.js
echo.
pause
