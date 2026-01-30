# 项目缓存清理脚本
# 运行此脚本清理临时文件和缓存

param(
    [switch]$Deep
)

Write-Host "=== 项目缓存清理工具 ===" -ForegroundColor Cyan
$totalCleaned = 0

# 1. 清理 Python __pycache__
Write-Host "`n1. 清理 Python __pycache__..." -ForegroundColor Yellow
$pycacheCount = 0
Get-ChildItem -Path $PSScriptRoot -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $totalCleaned += $size
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    $pycacheCount++
}
Write-Host "   已清理 $pycacheCount 个 __pycache__ 目录" -ForegroundColor Green

# 2. 清理 .pytest_cache
if (Test-Path "$PSScriptRoot\.pytest_cache") {
    Write-Host "`n2. 清理 pytest cache..." -ForegroundColor Yellow
    $size = (Get-ChildItem "$PSScriptRoot\.pytest_cache" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $totalCleaned += $size
    Remove-Item "$PSScriptRoot\.pytest_cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   已清理 pytest cache" -ForegroundColor Green
}

# 3. 清理 pip cache
Write-Host "`n3. 清理 pip cache..." -ForegroundColor Yellow
pip cache purge 2>$null
Write-Host "   pip cache 已清理" -ForegroundColor Green

# 4. 清理 npm cache
if ($Deep) {
    Write-Host "`n4. 深度清理 npm cache..." -ForegroundColor Yellow
    npm cache clean --force 2>$null
    Write-Host "   npm cache 已清理" -ForegroundColor Green
}

# 5. 清理临时文件
Write-Host "`n5. 清理临时文件..." -ForegroundColor Yellow
$tempCount = 0
Get-ChildItem -Path "$env:TEMP\pytest-*" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    $tempCount++
}
Write-Host "   已清理 $tempCount 个临时文件" -ForegroundColor Green

# 6. 清理 .lingma logs
$lingmaLogs = "$env:USERPROFILE\.lingma\logs"
if (Test-Path $lingmaLogs) {
    $size = (Get-ChildItem $lingmaLogs -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    if ($size -gt 100) {
        Write-Host "`n6. 清理 .lingma logs (${size} MB)..." -ForegroundColor Yellow
        Remove-Item "$lingmaLogs\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   已清理 .lingma logs" -ForegroundColor Green
    }
}

# 7. 清理旧日志文件
Write-Host "`n7. 清理项目日志文件..." -ForegroundColor Yellow
$logCount = 0
Get-ChildItem -Path $PSScriptRoot -Recurse -File -Filter "*.log" -ErrorAction SilentlyContinue | Where-Object {
    $_.CreationTime -lt (Get-Date).AddDays(-7)
} | ForEach-Object {
    $size = $_.Length
    $totalCleaned += $size
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    $logCount++
}
Write-Host "   已清理 $logCount 个旧日志文件" -ForegroundColor Green

# 统计
$cleanedMB = [math]::Round($totalCleaned / 1MB, 2)
Write-Host "`n=== 清理完成 ===" -ForegroundColor Cyan
Write-Host "总共释放空间: $cleanedMB MB" -ForegroundColor Green

Write-Host "`n提示:" -ForegroundColor Gray
Write-Host "- 定期运行此脚本可保持磁盘空间" -ForegroundColor Gray
Write-Host "- 使用 -Deep 参数进行深度清理" -ForegroundColor Gray
