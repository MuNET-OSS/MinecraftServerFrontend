/**
 * Status service — receives real-time status from the MuCraftBridge plugin
 * and broadcasts to Socket.IO clients. No more RCON polling.
 */

import { bridgeService } from './bridge.js';
import { getIo } from './socket.js';

interface CachedStatus {
  tps: { tps1m: number; tps5m: number; tps15m: number } | null;
  players: { online: number; max: number; list: string[] } | null;
  memory: { used: number; total: number; free: number } | null;
  cpu: { process: number; system: number } | null;
  mspt: number | null;
  bridgeStatus: 'connected' | 'disconnected' | 'reconnecting';
}

let cachedStatus: CachedStatus = {
  tps: null,
  players: null,
  memory: null,
  cpu: null,
  mspt: null,
  bridgeStatus: 'disconnected',
};

export function getCachedStatus(): CachedStatus {
  return { ...cachedStatus };
}

function broadcast(): void {
  const io = getIo();
  if (io) {
    io.emit('server:status', cachedStatus);
  }
}

/**
 * Start listening for status updates from the bridge plugin.
 * Call once after Socket.IO is initialized.
 */
export function startStatusPolling(): void {
  // Listen for bridge connection status changes
  bridgeService.on('status', (newStatus: string) => {
    cachedStatus.bridgeStatus = newStatus as CachedStatus['bridgeStatus'];

    if (newStatus !== 'connected') {
      cachedStatus.tps = null;
      cachedStatus.players = null;
      cachedStatus.memory = null;
      cachedStatus.cpu = null;
      cachedStatus.mspt = null;
    }

    const io = getIo();
    if (io) {
      io.emit('rcon:status', { status: newStatus });
    }
    broadcast();
  });

  // Listen for real-time status pushes from the plugin
  bridgeService.on('serverStatus', (data: any) => {
    cachedStatus.tps = data.tps;
    cachedStatus.players = data.players;
    cachedStatus.memory = data.memory;
    cachedStatus.cpu = data.cpu;
    cachedStatus.mspt = data.mspt ?? null;
    cachedStatus.bridgeStatus = 'connected';
    broadcast();
  });

  // Send initial status to newly connected Socket.IO clients
  const io = getIo();
  if (io) {
    io.on('connection', (socket) => {
      socket.emit('server:status', cachedStatus);
      socket.emit('rcon:status', { status: cachedStatus.bridgeStatus });
    });
  }

  console.log('[StatusService] Listening for bridge status updates');
}

export function stopStatusPolling(): void {
  // Nothing to stop — we're event-driven now
}
