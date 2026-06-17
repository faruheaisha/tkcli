import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ToolkitConfig {
  /** Templates custom directory (default: built-in) */
  customTemplatesDir?: string;
  /** Last update check timestamp */
  lastUpdateCheck?: string;
  /** Default stack for quick command */
  defaultStack?: string;
}

const CONFIG_DIR = join(homedir(), '.config', 'toolkit');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: ToolkitConfig = {};

export function loadConfig(): ToolkitConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // Corrupted config file, return defaults
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: ToolkitConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
