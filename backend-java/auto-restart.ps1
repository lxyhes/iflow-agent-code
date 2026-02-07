# Java Backend 自动重启脚本
# 使用 PowerShell 监控文件变化并自动重启

$BASE_DIR = "E:\zhihui-soft\agent_project\backend-java"
$WATCH_PATH = "src\main\java"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Java Backend Auto-Restart Service" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] 监控目录: $BASE_DIR\$WATCH_PATH" -ForegroundColor Green
Write-Host "[INFO] 修改 Java 文件后将自动重启后端" -ForegroundColor Yellow
Write-Host ""

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "$BASE_DIR\$WATCH_PATH"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$changeAction = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 检测到文件变化: $changeType - $path" -ForegroundColor Yellow
    
    # 等待 2 秒，避免多次触发
    Start-Sleep -Seconds 2
    
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 正在重新编译..." -ForegroundColor Cyan
    
    Set-Location $BASE_DIR
    & mvn compile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 编译成功，后端将在下次请求时自动重启" -ForegroundColor Green
    } else {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 编译失败！" -ForegroundColor Red
    }
}

Register-ObjectEvent $watcher "Changed" -Action $changeAction
Register-ObjectEvent $watcher "Created" -Action $changeAction
Register-ObjectEvent $watcher "Deleted" -Action $changeAction
Register-ObjectEvent $watcher "Renamed" -Action $changeAction

Write-Host "[INFO] 文件监控已启动，按 Ctrl+C 停止" -ForegroundColor Green
Write-Host ""

# 启动后端
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 启动后端服务..." -ForegroundColor Cyan
Set-Location $BASE_DIR
& mvn spring-boot:run

# 清理
$watcher.EnableRaisingEvents = $false
$watcher.Dispose()