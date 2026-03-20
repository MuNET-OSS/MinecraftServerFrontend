/**
 * Bridge service — WebSocket client that connects to the MuCraftBridge plugin
 * running inside the Minecraft server. Replaces RCON entirely.
 *
 * The plugin provides:
 *   - Real-time status push (TPS, memory, CPU, players) every 5s
 *   - Console command execution via Bukkit.dispatchCommand
 *   - Real-time log streaming via Log4j interceptor
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { config } from '../config.js';

type BridgeStatus = 'connected' | 'disconnected' | 'reconnecting';

interface ServerStatus {
  tps: { tps1m: number; tps5m: number; tps15m: number };
  players: { online: number; max: number; list: string[] };
  memory: { used: number; total: number; free: number };
  cpu: { process: number; system: number };
  mspt: number;
}

interface CommandResult {
  success: boolean;
  result: string;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

class BridgeService extends EventEmitter {
  private ws: WebSocket | null = null;
  private _status: BridgeStatus = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isShuttingDown = false;
  private pendingCommands = new Map<string, {
    resolve: (value: CommandResult) => void;
    reject: (reason: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private pendingTabCompletes = new Map<string, {
    resolve: (value: string[]) => void;
    reject: (reason: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private commandCounter = 0;

  // Cached latest status from the plugin
  private cachedStatus: ServerStatus | null = null;

  // Cached command list from the plugin
  private cachedCommands: string[] = [];
  private commandsResolvers: Array<(commands: string[]) => void> = [];

  // ── Status ──────────────────────────────────────────────

  get status(): BridgeStatus {
    return this._status;
  }

  getStatus(): string {
    return this._status;
  }

  getCachedServerStatus(): ServerStatus | null {
    return this.cachedStatus;
  }

  private setStatus(next: BridgeStatus): void {
    if (this._status !== next) {
      this._status = next;
      this.emit('status', next);
    }
  }

  // ── Public API ──────────────────────────────────────────

  async init(): Promise<void> {
    await this.connect();
  }

  /**
   * Send a command to the MC server via the bridge plugin.
   * Returns the command result.
   */
  async sendCommand(command: string): Promise<CommandResult> {
    if (!this.ws || this._status !== 'connected') {
      throw new Error('Bridge 未连接');
    }

    const id = String(++this.commandCounter);

    return new Promise<CommandResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error('命令执行超时'));
      }, 15000);

      this.pendingCommands.set(id, { resolve, reject, timer });

      this.ws!.send(JSON.stringify({
        type: 'command',
        command,
        id,
      }));
    });
  }

  /**
   * Request an immediate status update from the plugin.
   */
  requestStatus(): void {
    if (this.ws && this._status === 'connected') {
      this.ws.send(JSON.stringify({ type: 'status' }));
    }
  }

  /**
   * Get all registered commands from the MC server.
   * Returns cached list if available, otherwise requests from plugin.
   */
  async getCommands(): Promise<string[]> {
    if (this.cachedCommands.length > 0) {
      return this.cachedCommands;
    }

    if (!this.ws || this._status !== 'connected') {
      throw new Error('Bridge 未连接');
    }

    return new Promise<string[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('获取命令列表超时'));
      }, 10000);

      this.commandsResolvers.push((commands) => {
        clearTimeout(timer);
        resolve(commands);
      });

      this.ws!.send(JSON.stringify({ type: 'commands' }));
    });
  }

  /**
   * Request tab completion suggestions from the MC server.
   * Uses the server's Brigadier-backed completion system.
   */
  async tabComplete(input: string): Promise<string[]> {
    if (!this.ws || this._status !== 'connected') {
      throw new Error('Bridge 未连接');
    }

    const id = String(++this.commandCounter);

    return new Promise<string[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingTabCompletes.delete(id);
        reject(new Error('补全请求超时'));
      }, 5000);

      this.pendingTabCompletes.set(id, { resolve, reject, timer });

      this.ws!.send(JSON.stringify({
        type: 'tabcomplete',
        input,
        id,
      }));
    });
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    this.clearReconnectTimer();

    // Reject all pending commands
    for (const [id, pending] of this.pendingCommands) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Bridge disconnecting'));
    }
    this.pendingCommands.clear();
    for (const [id, pending] of this.pendingTabCompletes) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Bridge disconnecting'));
    }
    this.pendingTabCompletes.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
    this.isShuttingDown = false;
  }

  // ── Connection ──────────────────────────────────────────

  private connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = `ws://${config.bridge.host}:${config.bridge.port}`;

      try {
        this.ws = new WebSocket(url);
      } catch (err) {
        this.setStatus('disconnected');
        this.scheduleReconnect();
        reject(err);
        return;
      }

      const connectTimeout = setTimeout(() => {
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        this.setStatus('disconnected');
        this.scheduleReconnect();
        reject(new Error('Connection timeout'));
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectTimeout);
        // Send authentication
        this.ws!.send(JSON.stringify({
          type: 'auth',
          secret: config.bridge.secret,
        }));
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(msg, resolve, reject, connectTimeout);
        } catch (err) {
          console.error('[Bridge] Failed to parse message:', err);
        }
      });

      this.ws.on('close', () => {
        clearTimeout(connectTimeout);
        if (!this.isShuttingDown) {
          console.warn('[Bridge] Connection closed');
          this.handleDisconnect();
        }
      });

      this.ws.on('error', (err) => {
        clearTimeout(connectTimeout);
        console.error('[Bridge] WebSocket error:', err.message);
        // 'close' event will fire after 'error', so reconnect is handled there
      });
    });
  }

  private handleMessage(
    msg: any,
    connectResolve?: (value: void) => void,
    connectReject?: (reason: Error) => void,
    connectTimeout?: ReturnType<typeof setTimeout>,
  ): void {
    switch (msg.type) {
      case 'auth':
        if (msg.success) {
          this.reconnectAttempt = 0;
          this.setStatus('connected');
          console.log('[Bridge] Authenticated successfully');
          connectResolve?.();
        } else {
          console.error('[Bridge] Authentication failed');
          if (connectTimeout) clearTimeout(connectTimeout);
          connectReject?.(new Error('Authentication failed'));
        }
        break;

      case 'status':
        this.cachedStatus = {
          tps: msg.tps,
          players: msg.players,
          memory: msg.memory,
          cpu: msg.cpu,
          mspt: msg.mspt,
        };
        this.emit('serverStatus', this.cachedStatus);
        break;

      case 'log':
        this.emit('log', msg.line, msg.timestamp);
        break;

      case 'commands':
        this.cachedCommands = msg.commands || [];
        // Resolve any pending getCommands() calls
        for (const resolver of this.commandsResolvers) {
          resolver(this.cachedCommands);
        }
        this.commandsResolvers = [];
        break;

      case 'command_result': {
        const pending = this.pendingCommands.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingCommands.delete(msg.id);
          pending.resolve({
            success: msg.success,
            result: msg.result || '',
          });
        }
        break;
      }

      case 'tabcomplete': {
        const tabPending = this.pendingTabCompletes.get(msg.id);
        if (tabPending) {
          clearTimeout(tabPending.timer);
          this.pendingTabCompletes.delete(msg.id);
          tabPending.resolve(msg.suggestions || []);
        }
        break;
      }

      case 'error':
        console.warn('[Bridge] Server error:', msg.message);
        break;
    }
  }

  // ── Reconnect ───────────────────────────────────────────

  private handleDisconnect(): void {
    if (this.isShuttingDown) return;

    this.ws = null;

    // Reject all pending commands
    for (const [id, pending] of this.pendingCommands) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Bridge disconnected'));
    }
    this.pendingCommands.clear();
    for (const [id, pending] of this.pendingTabCompletes) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Bridge disconnected'));
    }
    this.pendingTabCompletes.clear();

    this.cachedStatus = null;
    this.cachedCommands = [];
    this.setStatus('reconnecting');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) return;
    this.clearReconnectTimer();

    const delayIdx = Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1);
    const delay = RECONNECT_DELAYS[delayIdx];

    console.log(`[Bridge] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempt + 1})`);
    this.setStatus('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      void this.connect().catch(() => {
        // connect() already schedules next reconnect on failure
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/** Singleton bridge service instance. */
export const bridgeService = new BridgeService();
