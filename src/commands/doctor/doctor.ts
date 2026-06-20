import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { detectStack } from '../../utils/detect-stack.js';
import { logger } from '../../logger.js';

export interface DoctorResult {
  check: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
}

/**
 * Diagnose common issues with tk-managed projects.
 */
export async function runDoctor(targetDir: string): Promise<DoctorResult[]> {
  const results: DoctorResult[] = [];

  // 1. Check CLAUDE.md exists and has managed/user regions
  const claudePath = join(targetDir, 'CLAUDE.md');
  if (!existsSync(claudePath)) {
    results.push({ check: 'CLAUDE.md', status: 'fail', message: 'Missing. Run "tk init" to generate.' });
  } else {
    const content = readFileSync(claudePath, 'utf-8');
    const hasManaged = content.includes('<!-- tk:managed:start -->') && content.includes('<!-- tk:managed:end -->');
    const hasUser = content.includes('<!-- tk:user:start -->') && content.includes('<!-- tk:user:end -->');
    if (!hasManaged && !hasUser) {
      results.push({ check: 'CLAUDE.md', status: 'warn', message: 'Missing tk region markers. Run "tk update" to add them.' });
    } else if (!hasManaged) {
      results.push({ check: 'CLAUDE.md', status: 'warn', message: 'Missing managed region. Run "tk update" to fix.' });
    } else if (!hasUser) {
      results.push({ check: 'CLAUDE.md', status: 'warn', message: 'Missing user notes region. Run "tk update" to fix.' });
    } else {
      results.push({ check: 'CLAUDE.md', status: 'ok', message: 'Has managed + user regions.' });
    }
  }

  // 2. Check stack detection
  const stack = detectStack(targetDir);
  if (stack === 'node-ts') {
    const hasPkgJson = existsSync(join(targetDir, 'package.json'));
    if (!hasPkgJson) {
      results.push({ check: 'Stack detection', status: 'warn', message: 'Fell back to node-ts. No package.json or other config found.' });
    } else {
      results.push({ check: 'Stack detection', status: 'ok', message: `Detected: ${stack}` });
    }
  } else {
    results.push({ check: 'Stack detection', status: 'ok', message: `Detected: ${stack}` });
  }

  // 3. Check .claude/settings.json
  const settingsPath = join(targetDir, '.claude', 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.permissions?.allow) {
        results.push({ check: '.claude/settings.json', status: 'ok', message: `${settings.permissions.allow.length} allow rules.` });
      } else {
        results.push({ check: '.claude/settings.json', status: 'warn', message: 'No permissions.allow found. AI agent may prompt for every action.' });
      }
    } catch {
      results.push({ check: '.claude/settings.json', status: 'fail', message: 'Malformed JSON. Run "tk update" to regenerate.' });
    }
  } else {
    results.push({ check: '.claude/settings.json', status: 'warn', message: 'Missing. Run "tk init" or "tk update" to generate.' });
  }

  // 4. Check .gitignore includes .env
  const gitignorePath = join(targetDir, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (gitignore.includes('.env')) {
      results.push({ check: '.gitignore', status: 'ok', message: 'Covers .env files.' });
    } else {
      results.push({ check: '.gitignore', status: 'warn', message: 'Missing .env entries. Add ".env" and ".env.local" to .gitignore.' });
    }
  } else {
    results.push({ check: '.gitignore', status: 'fail', message: 'Missing. Run "tk init" to generate.' });
  }

  // 5. Check auto-sync hook
  const localSettingsPath = join(targetDir, '.claude', 'settings.local.json');
  if (existsSync(localSettingsPath)) {
    try {
      const local = JSON.parse(readFileSync(localSettingsPath, 'utf-8'));
      const hasSyncHook = local.hooks?.SessionStart?.some(
        (h: { hooks: { command: string }[] }) => h.hooks?.some((hk: { command: string }) => hk.command?.includes('tk sync')),
      );
      if (hasSyncHook) {
        results.push({ check: 'Auto-sync', status: 'ok', message: 'SessionStart hook is configured.' });
      } else {
        results.push({ check: 'Auto-sync', status: 'warn', message: 'settings.local.json exists but has no tk sync hook.' });
      }
    } catch {
      results.push({ check: 'Auto-sync', status: 'warn', message: 'settings.local.json is malformed JSON.' });
    }
  } else {
    results.push({ check: 'Auto-sync', status: 'warn', message: 'Not configured. Run "tk quick --auto-sync" to enable.' });
  }

  // 6. Check git repo
  if (existsSync(join(targetDir, '.git'))) {
    results.push({ check: 'Git', status: 'ok', message: 'Repository initialized.' });
  } else {
    results.push({ check: 'Git', status: 'warn', message: 'No git repo. Run "git init" to track changes.' });
  }

  return results;
}