Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting P Suman & Associates Application Stack  " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Optional health check for local MongoDB
$socket = New-Object System.Net.Sockets.TcpClient
try {
    $socket.Connect("127.0.0.1", 27017)
    Write-Host "[OK] MongoDB is running on port 27017." -ForegroundColor Green
    $socket.Close()
} catch {
    Write-Host "[INFO] Local MongoDB port 27017 not detected. (If using MongoDB Atlas cloud URI in .env, this is normal)." -ForegroundColor Yellow
}

Write-Host "[1/2] Launching Backend API on http://127.0.0.1:8001 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; uvicorn server:app --host 127.0.0.1 --port 8001 --reload"

Write-Host "[2/2] Launching Frontend on http://localhost:3000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; yarn.cmd start"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Application stack initiated!" -ForegroundColor Cyan
Write-Host "  - Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  - Backend API: http://localhost:8001/api/" -ForegroundColor White
Write-Host "  - Swagger UI:  http://localhost:8001/docs" -ForegroundColor White
Write-Host "  - Admin Login: http://localhost:3000/admin/login" -ForegroundColor White
Write-Host "                 (admin / admin123)" -ForegroundColor DarkGray
Write-Host "===================================================" -ForegroundColor Cyan
