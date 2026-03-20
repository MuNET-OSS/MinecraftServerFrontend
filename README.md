# MinecraftServerFrontend - Minecraft服务器前端管理面板

一个全栈自定义 Minecraft 服务器管理面板，采用自研服务端插件直连架构，无需 RCON，通过 WebSocket 插件桥接实现低延迟、高可靠的服务器管控。

## 功能特性

- **实时仪表盘** — TPS、内存、CPU、在线玩家数等核心指标实时展示
- **玩家管理** — 查看在线玩家列表，支持踢出、封禁、给予物品等操作
- **Web 控制台** — 实时日志流 + 命令输入，支持 Tab 自动补全
- **公告系统** — 创建/编辑/删除公告，一键推送至游戏内
- **插件管理** — 查看已安装插件列表及状态
- **Uptime 监控** — 集成 Uptime Kuma，展示服务器延迟与可用率图表
- **响应式设计** — 桌面端侧边栏 + 移动端底部导航栏，完美适配各种设备
- **暗色/亮色主题** — 支持一键切换，带圆形扩散过渡动画

## 架构

```
┌─────────────┐     HTTP/WS      ┌──────────────┐    WebSocket     ┌────────────────┐
│   Browser   │ ◄──────────────► │   Node.js    │ ◄──────────────► │  MC Server     │
│  (Vue 3)    │                  │   Backend    │                  │  (Paper 1.21)  │
│             │                  │  Express 5   │                  │  Bridge Plugin │
└─────────────┘                  └──────────────┘                  └────────────────┘
                                       │
                                       ▼
                                 ┌──────────────┐
                                 │   SQLite     │
                                 │  (用户/公告)  │
                                 └──────────────┘
```

**核心特点：** 不依赖 RCON，通过自研 Paper 插件（MuCraftBridge）建立 WebSocket 直连通道，实现命令执行、日志转发、状态推送等功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Naive UI + ECharts + xterm.js |
| 后端 | Node.js + Express 5 + Socket.IO + better-sqlite3 |
| 插件 | Paper API 1.21 + Java-WebSocket + Gson |
| 构建 | Vite (前端) + tsc (后端) + Gradle Shadow (插件) |

## 快速开始

### 1. 克隆项目

```bash
git clone <repo-url> mc-admin-panel
cd mc-admin-panel
```

### 2. 构建插件

```bash
cd plugin
./gradlew build
```

将生成的 `build/libs/MuCraftBridge.jar` 复制到 MC 服务器的 `plugins/` 目录，重启服务器。

### 3. 配置并启动后端

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET、BRIDGE_SECRET 等
npm run build
npm start
```

### 4. 构建并部署前端

```bash
cd frontend
npm install
npm run build
```

将 `dist/` 目录部署到 Nginx 或其他静态文件服务器，配置反向代理将 `/api` 和 `/socket.io` 转发到后端。

### 5. 配置插件

编辑 MC 服务器中 `plugins/MuCraftBridge/config.yml`：

```yaml
port: 25580
secret: "your-secret-here"  # 与后端 .env 中的 BRIDGE_SECRET 保持一致
status-interval: 5000
```

### 6. 访问面板

打开浏览器访问部署地址，使用默认账号登录：

| 账号 | 密码 |
|------|------|
| admin | admin123 |

> ⚠️ **请在首次登录后通过环境变量修改默认凭据**

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3000` | 后端监听端口 |
| `JWT_SECRET` | — | JWT 签名密钥（**必须修改**） |
| `BRIDGE_HOST` | `127.0.0.1` | 插件 WebSocket 地址 |
| `BRIDGE_PORT` | `25580` | 插件 WebSocket 端口 |
| `BRIDGE_SECRET` | `change-me-secret` | 插件连接密钥（**必须修改**） |
| `MC_DIR` | `/opt/minecraft-server` | MC 服务器目录 |
| `ADMIN_USERNAME` | `admin` | 初始管理员用户名 |
| `ADMIN_PASSWORD` | `admin123` | 初始管理员密码 |
| `UPTIME_URL` | `http://localhost:3001` | Uptime Kuma 地址（可选） |
| `UPTIME_API_KEY` | — | Uptime Kuma API 密钥（可选） |
| `UPTIME_MONITOR_IDS` | `3,6` | 监控项 ID（可选） |

## 项目结构

```
mc-admin-panel/
├── backend/                # Node.js 后端
│   ├── src/                # TypeScript 源码
│   ├── .env.example        # 环境变量示例
│   └── package.json
├── frontend/               # Vue 3 前端
│   ├── src/                # Vue 源码
│   ├── public/             # 静态资源
│   └── package.json
├── plugin/                 # Paper 服务端插件
│   ├── src/main/           # Java 源码 + 资源文件
│   ├── build.gradle.kts
│   └── settings.gradle.kts
└── README.md
```

## License

MIT
