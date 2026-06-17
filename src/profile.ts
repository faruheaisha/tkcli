import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

/**
 * Local, private usage profile. tk records which choices you make so it can offer
 * smarter defaults next time. This file never leaves your machine — nothing is
 * transmitted. Delete it to reset learned defaults.
 */
export interface Profile {
  /** stack id → times chosen */
  stackUsage: Record<string, number>;
  /** addon id → times chosen */
  addonUsage: Record<string, number>;
  /** Last value chosen for each boolean toggle. */
  optionDefaults: {
    initGit?: boolean;
    installDeps?: boolean;
    includeAi?: boolean;
  };
  lastUpdated?: string;
}

const DEFAULT_PROFILE: Profile = { stackUsage: {}, addonUsage: {}, optionDefaults: {} };

function defaultProfilePath(): string {
  return join(homedir(), '.config', 'toolkit', 'profile.json');
}

export function loadProfile(profilePath = defaultProfilePath()): Profile {
  try {
    if (existsSync(profilePath)) {
      const raw = JSON.parse(readFileSync(profilePath, 'utf-8'));
      return {
        stackUsage: raw.stackUsage ?? {},
        addonUsage: raw.addonUsage ?? {},
        optionDefaults: raw.optionDefaults ?? {},
        lastUpdated: raw.lastUpdated,
      };
    }
  } catch {
    // corrupted profile — start fresh
  }
  return { ...DEFAULT_PROFILE, stackUsage: {}, addonUsage: {}, optionDefaults: {} };
}

export function saveProfile(profile: Profile, profilePath = defaultProfilePath()): void {
  try {
    mkdirSync(dirname(profilePath), { recursive: true });
    writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
  } catch {
    // profile is best-effort; never block a scaffold on it
  }
}

export interface Usage {
  stack: string;
  initGit: boolean;
  installDeps: boolean;
  includeAi: boolean;
  addons?: string[];
}

/** Record one scaffold's choices into the profile. */
export function recordUsage(usage: Usage, profilePath = defaultProfilePath()): void {
  const profile = loadProfile(profilePath);
  profile.stackUsage[usage.stack] = (profile.stackUsage[usage.stack] ?? 0) + 1;
  for (const addon of usage.addons ?? []) {
    profile.addonUsage[addon] = (profile.addonUsage[addon] ?? 0) + 1;
  }
  profile.optionDefaults = {
    initGit: usage.initGit,
    installDeps: usage.installDeps,
    includeAi: usage.includeAi,
  };
  profile.lastUpdated = new Date().toISOString();
  saveProfile(profile, profilePath);
}

/** The stack chosen most often, or undefined if there's no history. */
export function getPreferredStack(profilePath = defaultProfilePath()): string | undefined {
  const { stackUsage } = loadProfile(profilePath);
  let best: string | undefined;
  let bestCount = 0;
  for (const [stack, count] of Object.entries(stackUsage)) {
    if (count > bestCount) { best = stack; bestCount = count; }
  }
  return best;
}

/** Learned boolean defaults, or undefined per key when there's no history. */
export function getOptionDefaults(profilePath = defaultProfilePath()): Profile['optionDefaults'] {
  return loadProfile(profilePath).optionDefaults;
}
