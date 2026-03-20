import http from 'http';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { seedAdmin } from './db/seed.js';
import { bridgeService } from './services/bridge.js';
import { initSocketServer } from './services/socket.js';
import { startStatusPolling } from './services/status.js';
import { startLogStream } from './services/logstream.js';
import { startUptimePolling } from './services/uptime.js';
import { app } from './app.js';

runMigrations();
seedAdmin();

const server = http.createServer(app);
initSocketServer(server);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  startStatusPolling();
  startLogStream();
  startUptimePolling();

  // Connect to MuCraftBridge plugin after Socket.IO is ready
  bridgeService.init().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Bridge init failed, will retry:', msg);
  });
});

export default app;
