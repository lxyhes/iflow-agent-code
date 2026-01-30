# 设置缓存目录到E盘的环境变量
# 以管理员身份运行此脚本

$cacheBase = "E:\cache"

Write-Host "=== 配置缓存目录到E盘 ===" -ForegroundColor Cyan

# 1. Python / pip 缓存
[Environment]::SetEnvironmentVariable("PIP_CACHE_DIR", "$cacheBase\pip", "User")
[Environment]::SetEnvironmentVariable("PYTHONDONTWRITEBYTECODE", "1", "User")
Write-Host "1. pip cache -> $cacheBase\pip" -ForegroundColor Green

# 2. npm 缓存
[Environment]::SetEnvironmentVariable("npm_config_cache", "$cacheBase\npm", "User")
Write-Host "2. npm cache -> $cacheBase\npm" -ForegroundColor Green

# 3. Python 临时文件
[Environment]::SetEnvironmentVariable("TEMP", "$cacheBase\python\temp", "User")
[Environment]::SetEnvironmentVariable("TMP", "$cacheBase\python\temp", "User")
Write-Host "3. Python temp -> $cacheBase\python\temp" -ForegroundColor Green

# 4. VSCode 扩展（可选，需要手动迁移）
Write-Host "4. VSCode extensions 需要手动迁移:" -ForegroundColor Yellow
Write-Host "   从: C:\Users\$env:USERNAME\.vscode\extensions" -ForegroundColor Gray
Write-Host "   到: $cacheBase\vscode\extensions" -ForegroundColor Gray

# 5. 创建符号链接脚本
$linkScript = @"
# 创建符号链接将缓存重定向到E盘
# 以管理员身份运行

# .lingma 缓存
if (Test-Path "C:\Users\$env:USERNAME\.lingma") {
    Remove-Item "C:\Users\$env:USERNAME\.lingma" -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType SymbolicLink -Path "C:\Users\$env:USERNAME\.lingma" -Target "$cacheBase\lingma" -Force

# mypy 缓存
[Environment]::SetEnvironmentVariable("MYPY_CACHE_DIR", "$cacheBase\mypy", "User")

# pytest 缓存  
[Environment]::SetEnvironmentVariable("PYTEST_CACHE_DIR", "$cacheBase\pytest", "User")

Write-Host "符号链接创建完成" -ForegroundColor Green
"@

$linkScriptPath = "$cacheBase\create-links.ps1"
$linkScript | Out-File -FilePath $linkScriptPath -Encoding UTF8
Write-Host "`n5. 符号链接脚本已创建: $linkScriptPath" -ForegroundColor Green

Write-Host "`n=== 配置完成 ===" -ForegroundColor Cyan
Write-Host "请重启终端或IDE使环境变量生效" -ForegroundColor Yellow
Write-Host "`n下一步:" -ForegroundColor Gray
Write-Host "1. 重启你的终端/IDE" -ForegroundColor Gray
Write-Host "2. 运行 $linkScriptPath 创建符号链接（需要管理员权限）" -ForegroundColor Gray
