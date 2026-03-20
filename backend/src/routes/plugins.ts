import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { bridgeService } from '../services/bridge.js';

const router = Router();

const pluginsDir = path.join(config.mcDir, 'plugins');

function isValidFileName(name: string): boolean {
  if (
    name.includes('..') ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0')
  ) {
    return false;
  }
  return name === path.basename(name);
}

interface PluginInfo {
  name: string;
  fileName: string;
  enabled: boolean;
}

// GET /api/plugins
router.get('/', async (_req: Request, res: Response) => {
  let files: string[];
  try {
    files = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.jar') || f.endsWith('.jar.disabled'));
  } catch {
    files = [];
  }

  const plugins: PluginInfo[] = files.map((fileName) => {
    const disabled = fileName.endsWith('.jar.disabled');
    return {
      name: fileName.replace(/\.jar(\.disabled)?$/, ''),
      fileName,
      enabled: !disabled,
    };
  });

  // Try bridge to get runtime status (best-effort)
  try {
    if (bridgeService.getStatus() === 'connected') {
      const result = await bridgeService.sendCommand('pl');
      const raw = result.result || '';
      const colonIdx = raw.indexOf(':');
      if (colonIdx !== -1) {
        const pluginsPart = raw.substring(colonIdx + 1).trim();
        if (pluginsPart.length > 0) {
          const entries = pluginsPart.split(',');
          for (const entry of entries) {
            const trimmed = entry.trim();
            const enabled = !trimmed.includes('\u00a7c');
            const name = trimmed
              .replace(/\u00a7[0-9a-fk-or]/gi, '')
              .replace(/\x1b\[[0-9;]*m/g, '')
              .trim();
            const match = plugins.find(
              (p) => p.name.toLowerCase() === name.toLowerCase(),
            );
            if (match) {
              match.enabled = enabled;
            }
          }
        }
      }
    }
  } catch {
    // Bridge not available — filesystem data is sufficient
  }

  res.json({ plugins });
});

// POST /api/plugins/:fileName/disable
router.post('/:fileName/disable', async (req: Request, res: Response) => {
  const fileName = String(req.params.fileName);

  if (!isValidFileName(fileName)) {
    res.status(400).json({ error: '无效的文件名' });
    return;
  }

  // Support both "Plugin.jar" and "Plugin" as input
  const jarName = fileName.endsWith('.jar') ? fileName : `${fileName}.jar`;
  const srcPath = path.join(pluginsDir, jarName);
  const destPath = path.join(pluginsDir, `${jarName}.disabled`);

  try {
    await fs.promises.access(srcPath);
  } catch {
    res.status(404).json({ error: '插件不存在' });
    return;
  }

  await fs.promises.rename(srcPath, destPath);

  res.json({
    success: true,
    message: '插件已禁用，需要重启MC服务器才能生效',
  });
});

// POST /api/plugins/:fileName/enable
router.post('/:fileName/enable', async (req: Request, res: Response) => {
  const fileName = String(req.params.fileName);

  if (!isValidFileName(fileName)) {
    res.status(400).json({ error: '无效的文件名' });
    return;
  }

  // Support both "Plugin.jar.disabled" and "Plugin.jar" and "Plugin" as input
  let disabledName: string;
  if (fileName.endsWith('.jar.disabled')) {
    disabledName = fileName;
  } else if (fileName.endsWith('.jar')) {
    disabledName = `${fileName}.disabled`;
  } else {
    disabledName = `${fileName}.jar.disabled`;
  }

  const srcPath = path.join(pluginsDir, disabledName);
  const destPath = path.join(pluginsDir, disabledName.replace(/\.disabled$/, ''));

  try {
    await fs.promises.access(srcPath);
  } catch {
    res.status(404).json({ error: '插件不存在' });
    return;
  }

  await fs.promises.rename(srcPath, destPath);

  res.json({
    success: true,
    message: '插件已启用，需要重启MC服务器才能生效',
  });
});

export default router;
