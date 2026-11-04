@echo off
chcp 65001 >nul
title 番茄小说作家助手 - 一键持久化登录
echo =======================================================
echo 🔑 正在打开 Google Chrome 前往番茄作家助手...
echo 提示：请在弹出的浏览器中扫码登录你的作家账号。
echo 登录成功后，直接关闭该浏览器即可（凭证将永久保存）。
echo =======================================================
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C:\Users\Administrator\.playwright\fanqie-profile" "https://fanqienovel.com/main/writer/book-manage"
pause
