import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  bridge: {
    host: process.env.BRIDGE_HOST || '127.0.0.1',
    port: parseInt(process.env.BRIDGE_PORT || '25580', 10),
    secret: process.env.BRIDGE_SECRET || 'change-me-secret',
  },
  mcDir: process.env.MC_DIR || '/opt/minecraft-server',
  uptime: {
    url: process.env.UPTIME_URL || 'http://localhost:3001',
    apiKey: process.env.UPTIME_API_KEY || '',
    monitorIds: (process.env.UPTIME_MONITOR_IDS || '3,6').split(','),
  },
};
