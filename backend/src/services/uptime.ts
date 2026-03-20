/**
 * Uptime Kuma polling service.
 * Fetches Prometheus /metrics every 30s and caches history per monitor.
 */

import { config } from '../config.js';

export interface UptimeMonitor {
  id: string;
  name: string;
  type: string;
  hostname: string;
  port: string;
  status: number;        // 1=UP, 0=DOWN
  responseTime: number;  // ms
  uptime1d: number;      // 0-1
  uptime30d: number;     // 0-1
}

export interface UptimeDataPoint {
  timestamp: number;     // epoch ms
  monitors: UptimeMonitor[];
}

const POLL_INTERVAL = 30_000;   // 30s
const MAX_HISTORY = 120;        // 120 points × 30s = 60min

let history: UptimeDataPoint[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function parseMetrics(text: string): UptimeMonitor[] {
  const targetIds = config.uptime.monitorIds;
  const monitors: UptimeMonitor[] = [];

  // Parse monitor_status lines
  const statusRegex = /monitor_status\{[^}]*monitor_id="(\d+)",monitor_name="([^"]*)",monitor_type="([^"]*)",[^}]*monitor_hostname="([^"]*)",monitor_port="([^"]*)"\}\s+([\d.]+)/g;
  let match;
  while ((match = statusRegex.exec(text)) !== null) {
    const [, id, name, type, hostname, port, value] = match;
    if (targetIds.includes(id) && type !== 'group') {
      const existing = monitors.find(m => m.id === id && m.hostname === hostname);
      if (!existing) {
        monitors.push({
          id, name, type, hostname, port,
          status: parseFloat(value),
          responseTime: 0,
          uptime1d: 0,
          uptime30d: 0,
        });
      }
    }
  }

  // Parse monitor_response_time (instant, not windowed)
  const rtLines = text.split('\n').filter(l => l.startsWith('monitor_response_time{') && !l.includes('window='));
  for (const line of rtLines) {
    const rtMatch = /monitor_id="(\d+)".*?monitor_hostname="([^"]*)".*?\}\s+([\d.]+)/.exec(line);
    if (rtMatch) {
      const m = monitors.find(x => x.id === rtMatch[1] && x.hostname === rtMatch[2]);
      if (m) m.responseTime = parseFloat(rtMatch[3]);
    }
  }

  // Parse uptime ratios
  const uptimeRegex = /monitor_uptime_ratio\{[^}]*monitor_id="(\d+)",[^}]*monitor_hostname="([^"]*)",[^}]*window="(\w+)"\}\s+([\d.]+)/g;
  while ((match = uptimeRegex.exec(text)) !== null) {
    const [, id, hostname, window, value] = match;
    const m = monitors.find(x => x.id === id && x.hostname === hostname);
    if (m) {
      if (window === '1d') m.uptime1d = parseFloat(value);
      if (window === '30d') m.uptime30d = parseFloat(value);
    }
  }

  // Deduplicate by id — keep the entry with IP hostname
  const seen = new Map<string, UptimeMonitor>();
  for (const m of monitors) {
    const existing = seen.get(m.id);
    if (!existing || /^\d+\.\d+/.test(m.hostname)) {
      seen.set(m.id, m);
    }
  }

  return Array.from(seen.values());
}

async function poll(): Promise<void> {
  try {
    const metricsUrl = `${config.uptime.url}/metrics`;
    const response = await fetch(metricsUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(':' + config.uptime.apiKey).toString('base64')}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return;

    const text = await response.text();
    const monitors = parseMetrics(text);

    if (monitors.length > 0) {
      history.push({ timestamp: Date.now(), monitors });
      if (history.length > MAX_HISTORY) {
        history = history.slice(-MAX_HISTORY);
      }
    }
  } catch {
    // Silently ignore poll failures
  }
}

export function startUptimePolling(): void {
  if (timer) return;
  // Initial fetch immediately
  poll();
  timer = setInterval(poll, POLL_INTERVAL);
  console.log('Uptime Kuma polling started (every 30s)');
}

export function stopUptimePolling(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** Get the latest snapshot */
export function getLatestUptime(): UptimeMonitor[] {
  if (history.length === 0) return [];
  return history[history.length - 1].monitors;
}

/** Get full history for chart rendering */
export function getUptimeHistory(): UptimeDataPoint[] {
  return history;
}
