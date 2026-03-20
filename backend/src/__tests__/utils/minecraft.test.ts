import { describe, it, expect } from 'vitest';
import {
  stripColorCodes,
  parsePlayerList,
  parseTps,
  parsePluginList,
} from '../../utils/minecraft.js';

// ─── stripColorCodes ────────────────────────────────────────────

describe('stripColorCodes', () => {
  it('strips §-style color codes', () => {
    expect(stripColorCodes('§6text')).toBe('text');
  });

  it('strips multiple consecutive codes', () => {
    expect(stripColorCodes('§a§lBold Green')).toBe('Bold Green');
  });

  it('strips ANSI escape sequences', () => {
    expect(stripColorCodes('\x1b[32mGreen\x1b[0m')).toBe('Green');
  });

  it('handles empty string', () => {
    expect(stripColorCodes('')).toBe('');
  });

  it('passes through text without color codes', () => {
    expect(stripColorCodes('Hello World')).toBe('Hello World');
  });
});

// ─── parsePlayerList ────────────────────────────────────────────

describe('parsePlayerList', () => {
  it('parses normal list with players', () => {
    const result = parsePlayerList(
      'There are 3 of a max of 20 players online: Steve, Alex, Notch',
    );
    expect(result).toEqual({
      online: 3,
      max: 20,
      players: ['Steve', 'Alex', 'Notch'],
    });
  });

  it('parses empty server', () => {
    const result = parsePlayerList(
      'There are 0 of a max of 20 players online:',
    );
    expect(result).toEqual({
      online: 0,
      max: 20,
      players: [],
    });
  });

  it('handles color codes in response', () => {
    const result = parsePlayerList(
      '§6There are §a3§6 of a max of §a20§6 players online: §aSteve§6, §aAlex§6, §aNotch',
    );
    expect(result.online).toBe(3);
    expect(result.max).toBe(20);
    expect(result.players).toEqual(['Steve', 'Alex', 'Notch']);
  });

  it('returns defaults on invalid input', () => {
    expect(parsePlayerList('Some random text')).toEqual({
      online: 0,
      max: 0,
      players: [],
    });
  });

  it('returns defaults on empty string', () => {
    expect(parsePlayerList('')).toEqual({
      online: 0,
      max: 0,
      players: [],
    });
  });
});

// ─── parseTps ───────────────────────────────────────────────────

describe('parseTps', () => {
  it('parses normal TPS response', () => {
    const result = parseTps(
      '§6TPS from last 1m, 5m, 15m: §a20.0, §a20.0, §a20.0',
    );
    expect(result).toEqual({ tps1m: 20, tps5m: 20, tps15m: 20 });
  });

  it('handles asterisk prefix', () => {
    const result = parseTps(
      '§6TPS from last 1m, 5m, 15m: §a*20.0, §a*20.0, §a*20.0',
    );
    expect(result).toEqual({ tps1m: 20, tps5m: 20, tps15m: 20 });
  });

  it('handles low TPS values', () => {
    const result = parseTps(
      '§6TPS from last 1m, 5m, 15m: §c12.5, §c15.3, §a18.7',
    );
    expect(result).toEqual({ tps1m: 12.5, tps5m: 15.3, tps15m: 18.7 });
  });

  it('returns defaults on invalid input', () => {
    expect(parseTps('Not a TPS response')).toEqual({
      tps1m: 0,
      tps5m: 0,
      tps15m: 0,
    });
  });

  it('returns defaults on empty string', () => {
    expect(parseTps('')).toEqual({
      tps1m: 0,
      tps5m: 0,
      tps15m: 0,
    });
  });
});

// ─── parsePluginList ────────────────────────────────────────────

describe('parsePluginList', () => {
  it('parses mixed enabled/disabled plugins', () => {
    const result = parsePluginList(
      'Plugins (3): \u00a7aEssentials, \u00a7cWorldEdit, \u00a7aVault',
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: 'Essentials', enabled: true });
    expect(result[1]).toEqual({ name: 'WorldEdit', enabled: false });
    expect(result[2]).toEqual({ name: 'Vault', enabled: true });
  });

  it('handles all enabled plugins', () => {
    const result = parsePluginList(
      'Plugins (2): \u00a7aEssentials, \u00a7aVault',
    );
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.enabled)).toBe(true);
  });

  it('handles empty plugin list', () => {
    const result = parsePluginList('Plugins (0):');
    expect(result).toEqual([]);
  });

  it('returns empty array on invalid input', () => {
    expect(parsePluginList('Not a plugin list')).toEqual([]);
  });

  it('returns empty array on empty string', () => {
    expect(parsePluginList('')).toEqual([]);
  });
});
