#Requires -Version 5.1
<#
.SYNOPSIS
    MinecraftServerFrontend 一键部署脚本 (Windows)
    https://github.com/MuNET-OSS/MinecraftServerFrontend
#>

$ErrorActionPreference = "Stop"

$REPO = "MuNET-OSS/MinecraftServerFrontend"
$VERSION = "v1.0.0"
$BASE_URL = "https://github.com/$REPO/releases/download/$VERSION"

# ── Helpers ──
function Write-Info  { Write-Host "[INFO] " -ForegroundColor Cyan -NoNewline; Write-Host $args[0] }
function Write-Ok    { Write-Host "[  OK] " -ForegroundColor Green -NoNewline; Write-Host $args[0] }
function Write-Warn  { Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline; Write-Host $args[0] }
function Write-Err   { Write-Host "[ERR ] " -ForegroundColor Red -NoNewline; Write-Host $args[0] }

function Ask {
    param([string]$Prompt, [string]$Default)
    if ($Default) {
        $input = Read-Host "  ? $Prompt [$Default]"
        if ([string]::IsNullOrWhiteSpace($input)) { return $Default }
        return $input
    } else {
        return Read-Host "  ? $Prompt"
    }
}

function Ask-YN {
    param([string]$Prompt, [string]$Default = "N")
    $input = Read-Host "  ? $Prompt [$Default]"
    if ([string]::IsNullOrWhiteSpace($input)) { $input = $Default }
    return $input -match "^[Yy]"
}

function Generate-Secret {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).Substring(0, 32)
}

# ── Header ──
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║   MinecraftServerFrontend 一键部署脚本           ║" -ForegroundColor White
Write-Host "║   https://github.com/$REPO  ║" -ForegroundColor White
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor White
Write-Host ""

# ── Check deps ──
Write-Info "检查系统依赖..."

$nodeVer = $null
try { $nodeVer = (node -v 2>$null) } catch {}
if (-not $nodeVer) {
    Write-Err "未检测到 Node.js，请先安装 Node.js >= 18"
    Write-Host "  下载: https://nodejs.org/"
    exit 1
}
$major = [int]($nodeVer -replace 'v(\d+).*', '$1')
if ($major -lt 18) {
    Write-Err "Node.js 版本过低 ($nodeVer)，需要 >= 18"
    exit 1
}
Write-Ok "Node.js $nodeVer"
Write-Ok "npm $(npm.cmd -v 2>$null)"

# ─────────────────────────────────
# Step 1: Install directory
# ─────────────────────────────────
Write-Host ""
Write-Host "─── 步骤 1/5: 安装目录 ───" -ForegroundColor White
$INSTALL_DIR = Ask "安装目录" "$env:USERPROFILE\mc-admin-panel"
New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
Write-Ok "安装目录: $INSTALL_DIR"

# ─────────────────────────────────
# Step 2: Download
# ─────────────────────────────────
Write-Host ""
Write-Host "─── 步骤 2/5: 下载文件 ───" -ForegroundColor White

$backendDir = Join-Path $INSTALL_DIR "backend"
$frontendDir = Join-Path $INSTALL_DIR "frontend"
New-Item -ItemType Directory -Path $backendDir -Force | Out-Null
New-Item -ItemType Directory -Path $frontendDir -Force | Out-Null

$tmpBackend = Join-Path $env:TEMP "backend-dist.tar.gz"
$tmpFrontend = Join-Path $env:TEMP "frontend-dist.tar.gz"
$pluginPath = Join-Path $INSTALL_DIR "MuCraftBridge.jar"

Write-Info "下载后端..."
Invoke-WebRequest -Uri "$BASE_URL/backend-dist.tar.gz" -OutFile $tmpBackend -UseBasicParsing
tar xzf $tmpBackend -C $backendDir
Write-Ok "后端已下载"

Write-Info "下载前端..."
Invoke-WebRequest -Uri "$BASE_URL/frontend-dist.tar.gz" -OutFile $tmpFrontend -UseBasicParsing
tar xzf $tmpFrontend -C $frontendDir
Write-Ok "前端已下载"

Write-Info "下载插件..."
Invoke-WebRequest -Uri "$BASE_URL/MuCraftBridge.jar" -OutFile $pluginPath -UseBasicParsing
Write-Ok "插件已下载: $pluginPath"

Write-Info "安装后端依赖..."
Push-Location $backendDir
npm.cmd install --omit=dev --silent 2>&1 | Out-Null
Pop-Location
Write-Ok "依赖安装完成"

Remove-Item $tmpBackend -ErrorAction SilentlyContinue
Remove-Item $tmpFrontend -ErrorAction SilentlyContinue

# ─────────────────────────────────
# Step 3: Configuration
# ─────────────────────────────────
Write-Host ""
Write-Host "─── 步骤 3/5: 配置 ───" -ForegroundColor White
Write-Host ""

$JWT_DEFAULT = Generate-Secret
$BRIDGE_SECRET_DEFAULT = (Generate-Secret).Substring(0, 24)

Write-Host "  【必填配置】" -ForegroundColor White
$CONF_PORT = Ask "后端监听端口" "3000"
$CONF_JWT = Ask "JWT 密钥 (自动生成)" $JWT_DEFAULT
$CONF_MC_DIR = Ask "MC 服务器目录 (plugins/ 所在的目录)" "C:\minecraft-server"

Write-Host ""
Write-Host "  【Bridge 插件配置】" -ForegroundColor White
Write-Host "  (后端通过 WebSocket 连接 MC 插件，两端密钥必须一致)"
$CONF_BH = Ask "Bridge 监听地址" "127.0.0.1"
$CONF_BP = Ask "Bridge 监听端口" "25580"
$CONF_BS = Ask "Bridge 连接密钥" $BRIDGE_SECRET_DEFAULT

Write-Host ""
Write-Host "  【管理员账号】" -ForegroundColor White
$CONF_USER = Ask "管理员用户名" "admin"
$CONF_PASS = Ask "管理员密码" "admin123"

Write-Host ""
Write-Host "  【可选配置】" -ForegroundColor White

$envLines = @(
    "PORT=$CONF_PORT",
    "JWT_SECRET=$CONF_JWT",
    "BRIDGE_HOST=$CONF_BH",
    "BRIDGE_PORT=$CONF_BP",
    "BRIDGE_SECRET=$CONF_BS",
    "MC_DIR=$CONF_MC_DIR",
    "ADMIN_USERNAME=$CONF_USER",
    "ADMIN_PASSWORD=$CONF_PASS"
)

$CONF_EXT_KEY = ""

if (Ask-YN "是否配置 Uptime Kuma 延迟监控？" "N") {
    $u1 = Ask "Uptime Kuma 地址" "http://localhost:3001"
    $u2 = Ask "Uptime Kuma API Key" ""
    $u3 = Ask "监控项 ID (逗号分隔)" "3,6"
    $envLines += "UPTIME_URL=$u1"
    if ($u2) { $envLines += "UPTIME_API_KEY=$u2" }
    $envLines += "UPTIME_MONITOR_IDS=$u3"
}

if (Ask-YN "是否配置 External API (供 AI 工具/自动化调用)？" "N") {
    $extDefault = (Generate-Secret).Substring(0, 32)
    $CONF_EXT_KEY = Ask "External API Key" $extDefault
    $envLines += "EXTERNAL_API_KEY=$CONF_EXT_KEY"
}

$envFile = Join-Path $backendDir ".env"
$envLines | Set-Content -Path $envFile -Encoding UTF8
Write-Ok "配置已写入: $envFile"

# ─────────────────────────────────
# Step 4: Install plugin
# ─────────────────────────────────
Write-Host ""
Write-Host "─── 步骤 4/5: 安装插件 ───" -ForegroundColor White

$pluginsDir = Join-Path $CONF_MC_DIR "plugins"
if (Test-Path $pluginsDir) {
    Copy-Item $pluginPath -Destination $pluginsDir -Force
    Write-Ok "插件已复制到: $pluginsDir\MuCraftBridge.jar"
    Write-Warn "请重启 MC 服务器以加载插件，然后编辑 $pluginsDir\MuCraftBridge\config.yml 将 secret 设为: $CONF_BS"
} else {
    Write-Warn "未找到 $pluginsDir 目录，请手动复制:"
    Write-Host "  copy `"$pluginPath`" `"$pluginsDir\`""
    Write-Host "  然后编辑 config.yml 将 secret 设为: $CONF_BS"
}

# ─────────────────────────────────
# Step 5: Process management
# ─────────────────────────────────
Write-Host ""
Write-Host "─── 步骤 5/5: 进程管理 ───" -ForegroundColor White
Write-Host ""
Write-Host "  1) NSSM     — 注册为 Windows 服务，开机自启（推荐）"
Write-Host "  2) PM2      — 使用 PM2 管理进程"
Write-Host "  3) 跳过     — 稍后手动启动"
Write-Host ""
$PM_CHOICE = Ask "选择进程管理方式" "3"

switch ($PM_CHOICE) {
    "1" {
        $nssm = Get-Command nssm -ErrorAction SilentlyContinue
        if (-not $nssm) {
            Write-Warn "未检测到 NSSM，请先安装: https://nssm.cc/download"
            Write-Host "  安装后运行:"
            Write-Host "    nssm install mc-admin-panel `"$(Get-Command node | Select-Object -ExpandProperty Source)`" `"$backendDir\dist\index.js`""
            Write-Host "    nssm set mc-admin-panel AppDirectory `"$backendDir`""
            Write-Host "    nssm start mc-admin-panel"
        } else {
            & nssm install mc-admin-panel (Get-Command node | Select-Object -ExpandProperty Source) "$backendDir\dist\index.js"
            & nssm set mc-admin-panel AppDirectory $backendDir
            & nssm start mc-admin-panel
            Write-Ok "Windows 服务已创建并启动"
        }
    }
    "2" {
        $pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
        if (-not $pm2) {
            Write-Info "安装 PM2..."
            npm.cmd install -g pm2
        }
        Push-Location $backendDir
        pm2 start dist/index.js --name mc-admin-panel
        pm2 save
        Pop-Location
        Write-Ok "PM2 进程已启动"
        Write-Host "  管理命令: pm2 status / pm2 restart mc-admin-panel / pm2 logs mc-admin-panel"
    }
    default {
        Write-Info "已跳过进程管理配置"
        Write-Host "  手动启动: cd $backendDir && node dist/index.js"
    }
}

# ─────────────────────────────────
# Done
# ─────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║              ✅ 部署完成！                       ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor White
Write-Host ""
Write-Host "  安装目录:    $INSTALL_DIR"
Write-Host "  后端端口:    $CONF_PORT"
Write-Host "  管理员:      $CONF_USER / $CONF_PASS"
if ($CONF_EXT_KEY) { Write-Host "  External API: $CONF_EXT_KEY" }
Write-Host ""
Write-Host "  前端文件:    $INSTALL_DIR\frontend\dist\"
Write-Host "  请将前端 dist 目录配置到 Web 服务器（Nginx / IIS）"
Write-Host "  并将 /api 和 /socket.io 反向代理到 http://127.0.0.1:$CONF_PORT"
Write-Host ""
Write-Host "  ⚠️  别忘了:" -ForegroundColor Yellow
Write-Host "    1. 配置 Web 服务器反向代理"
Write-Host "    2. 重启 MC 服务器以加载 MuCraftBridge 插件"
Write-Host "    3. 编辑插件 config.yml 确保 secret 与后端一致"
Write-Host ""
