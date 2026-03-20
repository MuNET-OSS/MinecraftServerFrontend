#!/usr/bin/env bash
#
# MinecraftServerFrontend 一键部署脚本 (Linux)
# https://github.com/MuNET-OSS/MinecraftServerFrontend
#
set -e

REPO="MuNET-OSS/MinecraftServerFrontend"
VERSION="v1.0.0"
BASE_URL="https://github.com/$REPO/releases/download/$VERSION"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[  OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERR ]${NC} $1"; }

header() {
  echo ""
  echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║   MinecraftServerFrontend 一键部署脚本           ║${NC}"
  echo -e "${BOLD}║   https://github.com/$REPO  ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ── Prompt helpers ──
ask() {
  local prompt="$1" default="$2" var="$3"
  if [ -n "$default" ]; then
    read -rp "$(echo -e "${CYAN}?${NC} ${prompt} [${default}]: ")" input
    eval "$var=\"${input:-$default}\""
  else
    read -rp "$(echo -e "${CYAN}?${NC} ${prompt}: ")" input
    eval "$var=\"$input\""
  fi
}

ask_yn() {
  local prompt="$1" default="$2"
  local yn
  read -rp "$(echo -e "${CYAN}?${NC} ${prompt} [${default}]: ")" yn
  yn="${yn:-$default}"
  [[ "$yn" =~ ^[Yy] ]]
}

generate_secret() {
  openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -d '=/+' | head -c 32
}

# ── Check dependencies ──
check_deps() {
  info "检查系统依赖..."

  if ! command -v node &>/dev/null; then
    err "未检测到 Node.js，请先安装 Node.js >= 18"
    echo "  推荐: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
  fi

  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt 18 ]; then
    err "Node.js 版本过低 ($(node -v))，需要 >= 18"
    exit 1
  fi
  ok "Node.js $(node -v)"

  if ! command -v npm &>/dev/null; then
    err "未检测到 npm"
    exit 1
  fi
  ok "npm $(npm -v)"

  for cmd in curl tar; do
    if ! command -v "$cmd" &>/dev/null; then
      err "未检测到 $cmd，请先安装"
      exit 1
    fi
  done
  ok "curl, tar"
}

# ── Main ──
header
check_deps

# ─────────────────────────────────
# Step 1: Choose install directory
# ─────────────────────────────────
echo ""
echo -e "${BOLD}─── 步骤 1/5: 安装目录 ───${NC}"
ask "安装目录" "/opt/mc-admin-panel" INSTALL_DIR

mkdir -p "$INSTALL_DIR"
ok "安装目录: $INSTALL_DIR"

# ─────────────────────────────────
# Step 2: Download release files
# ─────────────────────────────────
echo ""
echo -e "${BOLD}─── 步骤 2/5: 下载文件 ───${NC}"

info "下载后端..."
curl -fSL "$BASE_URL/backend-dist.tar.gz" -o /tmp/backend-dist.tar.gz
mkdir -p "$INSTALL_DIR/backend"
tar xzf /tmp/backend-dist.tar.gz -C "$INSTALL_DIR/backend"
ok "后端已下载"

info "下载前端..."
curl -fSL "$BASE_URL/frontend-dist.tar.gz" -o /tmp/frontend-dist.tar.gz
mkdir -p "$INSTALL_DIR/frontend"
tar xzf /tmp/frontend-dist.tar.gz -C "$INSTALL_DIR/frontend"
ok "前端已下载"

info "下载插件..."
curl -fSL "$BASE_URL/MuCraftBridge.jar" -o "$INSTALL_DIR/MuCraftBridge.jar"
ok "插件已下载: $INSTALL_DIR/MuCraftBridge.jar"

info "安装后端依赖..."
cd "$INSTALL_DIR/backend"
npm install --omit=dev --silent 2>&1 | tail -1
ok "依赖安装完成"

rm -f /tmp/backend-dist.tar.gz /tmp/frontend-dist.tar.gz

# ─────────────────────────────────
# Step 3: Configuration
# ─────────────────────────────────
echo ""
echo -e "${BOLD}─── 步骤 3/5: 配置 ───${NC}"
echo ""

ENV_FILE="$INSTALL_DIR/backend/.env"
JWT_DEFAULT=$(generate_secret)

echo -e "${BOLD}  【必填配置】${NC}"

ask "后端监听端口" "3000" CONF_PORT
ask "JWT 密钥 (自动生成)" "$JWT_DEFAULT" CONF_JWT_SECRET
ask "MC 服务器目录 (plugins/ 所在的目录)" "/opt/minecraft-server" CONF_MC_DIR

echo ""
echo -e "${BOLD}  【Bridge 插件配置】${NC}"
echo "  (后端通过 WebSocket 连接 MC 插件，两端密钥必须一致)"

ask "Bridge 监听地址" "127.0.0.1" CONF_BRIDGE_HOST
ask "Bridge 监听端口" "25580" CONF_BRIDGE_PORT

BRIDGE_SECRET_DEFAULT=$(generate_secret | head -c 24)
ask "Bridge 连接密钥" "$BRIDGE_SECRET_DEFAULT" CONF_BRIDGE_SECRET

echo ""
echo -e "${BOLD}  【管理员账号】${NC}"

ask "管理员用户名" "admin" CONF_ADMIN_USER
ask "管理员密码" "admin123" CONF_ADMIN_PASS

echo ""
echo -e "${BOLD}  【可选配置】${NC}"

CONF_UPTIME_URL=""
CONF_UPTIME_KEY=""
CONF_UPTIME_IDS=""
CONF_EXT_KEY=""

if ask_yn "是否配置 Uptime Kuma 延迟监控？" "N"; then
  ask "Uptime Kuma 地址" "http://localhost:3001" CONF_UPTIME_URL
  ask "Uptime Kuma API Key" "" CONF_UPTIME_KEY
  ask "监控项 ID (逗号分隔)" "3,6" CONF_UPTIME_IDS
fi

if ask_yn "是否配置 External API (供 AI 工具/自动化调用)？" "N"; then
  EXT_KEY_DEFAULT=$(generate_secret | head -c 32)
  ask "External API Key" "$EXT_KEY_DEFAULT" CONF_EXT_KEY
fi

# Write .env
cat > "$ENV_FILE" <<EOF
PORT=$CONF_PORT
JWT_SECRET=$CONF_JWT_SECRET
BRIDGE_HOST=$CONF_BRIDGE_HOST
BRIDGE_PORT=$CONF_BRIDGE_PORT
BRIDGE_SECRET=$CONF_BRIDGE_SECRET
MC_DIR=$CONF_MC_DIR
ADMIN_USERNAME=$CONF_ADMIN_USER
ADMIN_PASSWORD=$CONF_ADMIN_PASS
EOF

[ -n "$CONF_UPTIME_URL" ] && echo "UPTIME_URL=$CONF_UPTIME_URL" >> "$ENV_FILE"
[ -n "$CONF_UPTIME_KEY" ] && echo "UPTIME_API_KEY=$CONF_UPTIME_KEY" >> "$ENV_FILE"
[ -n "$CONF_UPTIME_IDS" ] && echo "UPTIME_MONITOR_IDS=$CONF_UPTIME_IDS" >> "$ENV_FILE"
[ -n "$CONF_EXT_KEY" ] && echo "EXTERNAL_API_KEY=$CONF_EXT_KEY" >> "$ENV_FILE"

chmod 600 "$ENV_FILE"
ok "配置已写入: $ENV_FILE"

# ─────────────────────────────────
# Step 4: Install plugin
# ─────────────────────────────────
echo ""
echo -e "${BOLD}─── 步骤 4/5: 安装插件 ───${NC}"

PLUGINS_DIR="$CONF_MC_DIR/plugins"
if [ -d "$PLUGINS_DIR" ]; then
  cp "$INSTALL_DIR/MuCraftBridge.jar" "$PLUGINS_DIR/"
  ok "插件已复制到: $PLUGINS_DIR/MuCraftBridge.jar"
  warn "请重启 MC 服务器以加载插件，然后编辑 $PLUGINS_DIR/MuCraftBridge/config.yml 将 secret 设为: $CONF_BRIDGE_SECRET"
else
  warn "未找到 $PLUGINS_DIR 目录，请手动复制:"
  echo "  cp $INSTALL_DIR/MuCraftBridge.jar $PLUGINS_DIR/"
  echo "  然后编辑 config.yml 将 secret 设为: $CONF_BRIDGE_SECRET"
fi

# ─────────────────────────────────
# Step 5: Process management
# ─────────────────────────────────
echo ""
echo -e "${BOLD}─── 步骤 5/5: 进程管理 ───${NC}"
echo ""
echo "  1) systemd  — 创建系统服务，开机自启（推荐）"
echo "  2) PM2      — 使用 PM2 管理进程"
echo "  3) 跳过     — 稍后手动启动"
echo ""
read -rp "$(echo -e "${CYAN}?${NC} 选择进程管理方式 [1]: ")" PM_CHOICE
PM_CHOICE="${PM_CHOICE:-1}"

case "$PM_CHOICE" in
  1)
    SERVICE_FILE="/etc/systemd/system/mc-admin-panel.service"
    CURRENT_USER=$(whoami)

    sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Minecraft Server Admin Panel
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=$(which node) dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable mc-admin-panel
    sudo systemctl start mc-admin-panel
    ok "systemd 服务已创建并启动"
    echo "  管理命令:"
    echo "    sudo systemctl status mc-admin-panel"
    echo "    sudo systemctl restart mc-admin-panel"
    echo "    sudo journalctl -u mc-admin-panel -f"
    ;;
  2)
    if ! command -v pm2 &>/dev/null; then
      info "安装 PM2..."
      npm install -g pm2
    fi
    cd "$INSTALL_DIR/backend"
    pm2 start dist/index.js --name mc-admin-panel
    pm2 save
    ok "PM2 进程已启动"
    echo "  管理命令:"
    echo "    pm2 status"
    echo "    pm2 restart mc-admin-panel"
    echo "    pm2 logs mc-admin-panel"
    ;;
  *)
    info "已跳过进程管理配置"
    echo "  手动启动: cd $INSTALL_DIR/backend && node dist/index.js"
    ;;
esac

# ─────────────────────────────────
# Done!
# ─────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║              ${GREEN}✅ 部署完成！${NC}${BOLD}                       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}安装目录:${NC}    $INSTALL_DIR"
echo -e "  ${BOLD}后端端口:${NC}    $CONF_PORT"
echo -e "  ${BOLD}管理员:${NC}      $CONF_ADMIN_USER / $CONF_ADMIN_PASS"
[ -n "$CONF_EXT_KEY" ] && echo -e "  ${BOLD}External API:${NC} $CONF_EXT_KEY"
echo ""
echo -e "  ${BOLD}前端文件:${NC}    $INSTALL_DIR/frontend/dist/"
echo -e "  ${BOLD}Nginx 配置示例:${NC}"
echo ""
echo "    server {"
echo "        listen 80;"
echo "        root $INSTALL_DIR/frontend/dist;"
echo "        index index.html;"
echo ""
echo "        location / {"
echo "            try_files \$uri \$uri/ /index.html;"
echo "        }"
echo "        location /api/ {"
echo "            proxy_pass http://127.0.0.1:$CONF_PORT;"
echo "            proxy_set_header Host \$host;"
echo "            proxy_set_header X-Real-IP \$remote_addr;"
echo "        }"
echo "        location /socket.io/ {"
echo "            proxy_pass http://127.0.0.1:$CONF_PORT;"
echo "            proxy_http_version 1.1;"
echo "            proxy_set_header Upgrade \$http_upgrade;"
echo "            proxy_set_header Connection \"upgrade\";"
echo "        }"
echo "    }"
echo ""
echo -e "  ${YELLOW}⚠️  别忘了:${NC}"
echo "    1. 将 Nginx 配置写入 /etc/nginx/sites-available/ 并 reload"
echo "    2. 重启 MC 服务器以加载 MuCraftBridge 插件"
echo "    3. 编辑插件 config.yml 确保 secret 与后端一致"
echo ""
