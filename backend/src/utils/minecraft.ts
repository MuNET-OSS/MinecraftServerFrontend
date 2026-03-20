/**
 * Minecraft text parsing utilities.
 * Handles color code stripping and RCON response parsing.
 */

/**
 * Remove Minecraft section-sign color codes and ANSI escape sequences.
 */
export function stripColorCodes(text: string): string {
  return text
    .replace(/\u00a7[0-9a-fk-or]/gi, '')
    .replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Parse the RCON response from the `/list` command.
 *
 * Expected format:
 *   "There are X of a max of Y players online: player1, player2"
 *   "There are X of a max of Y players online:"
 */
export function parsePlayerList(response: string): {
  online: number;
  max: number;
  players: string[];
} {
  const clean = stripColorCodes(response);
  const match = clean.match(
    /There are (\d+) of a max of (\d+) players online:\s*(.*)/i,
  );

  if (!match) {
    return { online: 0, max: 0, players: [] };
  }

  const online = parseInt(match[1], 10);
  const max = parseInt(match[2], 10);
  const playerStr = match[3].trim();
  const players =
    playerStr.length > 0
      ? playerStr.split(',').map((p) => p.trim()).filter(Boolean)
      : [];

  return { online, max, players };
}

/**
 * Parse the RCON response from the `/tps` command (Paper / Spigot).
 *
 * Raw format:
 *   "§6TPS from last 1m, 5m, 15m: §a*20.0, §a*20.0, §a*20.0"
 * After stripping:
 *   "TPS from last 1m, 5m, 15m: *20.0, *20.0, *20.0"
 *
 * The asterisk prefix appears when TPS is exactly 20.
 */
export function parseTps(response: string): {
  tps1m: number;
  tps5m: number;
  tps15m: number;
} {
  const clean = stripColorCodes(response);
  // Match three numbers, optionally prefixed with *
  const match = clean.match(
    /\*?([\d.]+),?\s*\*?([\d.]+),?\s*\*?([\d.]+)\s*$/,
  );

  if (!match) {
    return { tps1m: 0, tps5m: 0, tps15m: 0 };
  }

  return {
    tps1m: parseFloat(match[1]),
    tps5m: parseFloat(match[2]),
    tps15m: parseFloat(match[3]),
  };
}

/**
 * Parse the RCON response from the `/pl` (plugins) command.
 *
 * Raw format:
 *   "Plugins (3): §aEnabled1, §cDisabled2, §aEnabled3"
 *
 * §a (green) = enabled, §c (red) = disabled.
 * We inspect the raw text BEFORE stripping to determine enabled/disabled,
 * then strip the name for clean output.
 */
export function parsePluginList(
  response: string,
): { name: string; enabled: boolean }[] {
  // Find the colon after "Plugins (N):" and grab the rest
  const colonIdx = response.indexOf(':');
  if (colonIdx === -1) {
    return [];
  }

  const pluginsPart = response.substring(colonIdx + 1).trim();
  if (pluginsPart.length === 0) {
    return [];
  }

  const entries = pluginsPart.split(',');

  return entries.map((entry) => {
    const trimmed = entry.trim();
    // Check for §a (enabled/green) or §c (disabled/red) before stripping
    const enabled = !trimmed.includes('\u00a7c');
    const name = stripColorCodes(trimmed).trim();
    return { name, enabled };
  }).filter((p) => p.name.length > 0);
}
