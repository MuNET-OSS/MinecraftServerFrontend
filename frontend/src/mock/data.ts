// Mock data for demo mode
import type { Announcement, PluginInfo } from '../types'

export const DEMO_TOKEN = 'demo-token-mock-12345'
export const DEMO_USERNAME = 'admin'

export const mockPlayers = {
  online: 6,
  max: 100,
  list: ['Steve', 'Alex', 'Notch', 'Dream', 'Technoblade', 'Philza'],
  players: [
    { name: 'Steve' },
    { name: 'Alex' },
    { name: 'Notch' },
    { name: 'Dream' },
    { name: 'Technoblade' },
    { name: 'Philza' },
  ]
}

export const mockAnnouncements: Announcement[] = [
  {
    id: 1,
    title: 'Server Maintenance Notice',
    content: 'Server will be undergoing maintenance on Saturday from 2:00 AM to 4:00 AM UTC. Please plan accordingly.',
    is_pinned: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 2,
    title: 'New Plugin: MuCraftBridge v1.2',
    content: 'MuCraftBridge plugin has been updated to v1.2 with improved WebSocket stability and new tab completion support.',
    is_pinned: false,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 3,
    title: 'Welcome to the Server!',
    content: 'Welcome to our Minecraft server! Please read the rules and have fun.',
    is_pinned: false,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    updated_at: new Date(Date.now() - 604800000).toISOString(),
  },
]

export const mockPlugins: PluginInfo[] = [
  { name: 'MuCraftBridge', fileName: 'MuCraftBridge-1.0.jar', enabled: true },
  { name: 'EssentialsX', fileName: 'EssentialsX-2.20.1.jar', enabled: true },
  { name: 'WorldEdit', fileName: 'WorldEdit-7.3.0.jar', enabled: true },
  { name: 'LuckPerms', fileName: 'LuckPerms-5.4.jar', enabled: true },
  { name: 'Vault', fileName: 'Vault-1.7.3.jar', enabled: true },
  { name: 'CoreProtect', fileName: 'CoreProtect-22.2.jar', enabled: true },
  { name: 'PlaceholderAPI', fileName: 'PlaceholderAPI-2.11.5.jar', enabled: true },
  { name: 'SkinsRestorer', fileName: 'SkinsRestorer-15.0.9.jar', enabled: false },
]

export const mockServerCommands = [
  'help', 'list', 'say', 'tell', 'msg', 'kick', 'ban', 'pardon',
  'op', 'deop', 'gamemode', 'give', 'tp', 'teleport', 'time',
  'weather', 'difficulty', 'whitelist', 'stop', 'restart',
  'tps', 'gc', 'plugins', 'version', 'reload',
]

export function generateMockServerStatus() {
  const tps1m = 19.2 + Math.random() * 0.7
  return {
    tps: {
      tps1m: Math.min(20, tps1m),
      tps5m: Math.min(20, 19.5 + Math.random() * 0.4),
      tps15m: Math.min(20, 19.7 + Math.random() * 0.2),
    },
    players: {
      online: mockPlayers.online,
      max: mockPlayers.max,
      list: mockPlayers.list,
    },
    memory: {
      used: 4096 + Math.floor(Math.random() * 512),
      total: 8192,
      free: 3584 - Math.floor(Math.random() * 512),
    },
    cpu: {
      process: 12 + Math.random() * 8,
      system: 25 + Math.random() * 15,
    },
    mspt: 38 + Math.random() * 10,
    bridgeStatus: 'connected' as const,
  }
}

export function generateMockUptimeMonitors() {
  return {
    monitors: [
      {
        id: '3',
        name: 'MC Server (Primary)',
        status: 1,
        responseTime: Math.floor(15 + Math.random() * 10),
        uptime1d: 0.998,
        uptime30d: 0.995,
        hostname: 'mc.example.com',
      },
      {
        id: '6',
        name: 'MC Server (Backup)',
        status: 1,
        responseTime: Math.floor(35 + Math.random() * 15),
        uptime1d: 0.992,
        uptime30d: 0.988,
        hostname: 'mc2.example.com',
      },
    ]
  }
}

export function generateMockUptimeHistory() {
  const now = Date.now()
  const history = []
  for (let i = 60; i >= 0; i--) {
    history.push({
      timestamp: now - i * 60000,
      monitors: [
        { id: '3', responseTime: Math.floor(12 + Math.random() * 15), status: 1 },
        { id: '6', responseTime: Math.floor(30 + Math.random() * 20), status: 1 },
      ]
    })
  }
  return { history }
}

export const mockConsoleLogs = [
  '[00:00:01 INFO]: Starting Minecraft server version 1.21.4',
  '[00:00:01 INFO]: Loading properties',
  '[00:00:01 INFO]: Default game type: SURVIVAL',
  '[00:00:02 INFO]: Starting Minecraft server on *:25565',
  '[00:00:02 INFO]: Using epoll channel type',
  '[00:00:03 INFO]: Preparing level "world"',
  '[00:00:05 INFO]: Preparing start region for dimension minecraft:overworld',
  '[00:00:08 INFO]: Preparing spawn area: 52%',
  '[00:00:09 INFO]: Preparing spawn area: 100%',
  '[00:00:09 INFO]: Time elapsed: 6234 ms',
  '[00:00:09 INFO]: Preparing start region for dimension minecraft:the_nether',
  '[00:00:10 INFO]: Preparing start region for dimension minecraft:the_end',
  '[00:00:10 INFO]: [MuCraftBridge] Enabling MuCraftBridge v1.0',
  '[00:00:10 INFO]: [MuCraftBridge] WebSocket server started on 127.0.0.1:25580',
  '[00:00:10 INFO]: [EssentialsX] Enabling EssentialsX v2.20.1',
  '[00:00:10 INFO]: [LuckPerms] Enabling LuckPerms v5.4',
  '[00:00:11 INFO]: [WorldEdit] Enabling WorldEdit v7.3.0',
  '[00:00:11 INFO]: Done (9.823s)! For help, type "help"',
  '[00:01:23 INFO]: Steve[/192.168.1.10:54321] logged in with entity id 42',
  '[00:01:23 INFO]: Steve joined the game',
  '[00:02:15 INFO]: Alex[/192.168.1.11:54322] logged in with entity id 43',
  '[00:02:15 INFO]: Alex joined the game',
  '[00:05:30 INFO]: <Steve> Hello everyone!',
  '[00:05:45 INFO]: <Alex> Hey Steve!',
  '[00:10:00 INFO]: [MuCraftBridge] Admin panel connected',
]

const randomLogMessages = [
  '[INFO]: <Steve> Anyone want to go mining?',
  '[INFO]: <Alex> Sure, let me grab my pickaxe',
  '[INFO]: <Dream> I found diamonds!',
  '[INFO]: <Notch> Nice find!',
  '[INFO]: [Server] Saving chunks for level \'world\'',
  '[INFO]: <Technoblade> PVP arena is open',
  '[INFO]: <Philza> Starting a building project at spawn',
  '[WARN]: Can\'t keep up! Is the server overloaded?',
  '[INFO]: [MuCraftBridge] Status update sent',
  '[INFO]: <Steve> Check out the new build at /warp castle',
]

export function getRandomLogLine(): string {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  const msg = randomLogMessages[Math.floor(Math.random() * randomLogMessages.length)]
  return `[${time} ${msg}`
}
