/**
 * Log stream service — receives real-time log lines from the MuCraftBridge
 * plugin's Log4j interceptor and broadcasts to Socket.IO clients.
 * No more file watching or disk I/O.
 */

import { bridgeService } from './bridge.js';
import { getIo } from './socket.js';

const MAX_HISTORY = 200;
const lines: string[] = [];

/**
 * Start listening for log lines from the bridge plugin.
 */
export function startLogStream(): void {
  // Listen for log lines from the bridge
  bridgeService.on('log', (line: string, _timestamp: number) => {
    lines.push(line);
    if (lines.length > MAX_HISTORY) {
      lines.shift();
    }

    const io = getIo();
    if (io) {
      io.emit('console:log', {
        line,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Send history to newly connected clients
  const io = getIo();
  if (io) {
    io.on('connection', (socket) => {
      socket.emit('console:history', { lines: getRecentLines() });
    });
  }

  console.log('[LogStream] Listening for bridge log lines');
}

/**
 * Return the last N lines from the in-memory circular buffer.
 */
export function getRecentLines(count: number = MAX_HISTORY): string[] {
  return lines.slice(-count);
}
