export interface ServerStatus {
  tps: { tps1m: number; tps5m: number; tps15m: number } | null;
  players: { online: number; max: number; list: string[] } | null;
  memory: { used: number; total: number; free: number } | null;
  cpu: { process: number; system: number } | null;
  mspt: number | null;
  bridgeStatus: 'connected' | 'disconnected' | 'reconnecting';
  // Legacy alias — frontend uses rconStatus in some places
  rconStatus?: 'connected' | 'disconnected' | 'reconnecting';
}

export interface Player {
  name: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface PluginInfo {
  name: string;
  fileName: string;
  enabled: boolean;
}
