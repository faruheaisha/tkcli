import { mkdtempSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, it, expect } from 'vitest';
import {
  loadProfile, recordUsage, getPreferredStack, getOptionDefaults,
} from '../src/profile.js';

function profilePath(): string {
  return join(mkdtempSync(join(tmpdir(), 'tk-profile-')), 'profile.json');
}

describe('usage profile — local self-iterating defaults', () => {
  it('returns empty defaults with no history', () => {
    const p = profilePath();
    expect(getPreferredStack(p)).toBeUndefined();
    expect(getOptionDefaults(p)).toEqual({});
    expect(loadProfile(p).stackUsage).toEqual({});
  });

  it('records a scaffold and surfaces it as the preferred stack', () => {
    const p = profilePath();
    recordUsage({ stack: 'express', initGit: true, installDeps: false, includeAi: true }, p);
    expect(getPreferredStack(p)).toBe('express');
    expect(getOptionDefaults(p)).toEqual({ initGit: true, installDeps: false, includeAi: true });
  });

  it('prefers the most-used stack, not the most recent', () => {
    const p = profilePath();
    recordUsage({ stack: 'express', initGit: true, installDeps: true, includeAi: true }, p);
    recordUsage({ stack: 'express', initGit: true, installDeps: true, includeAi: true }, p);
    recordUsage({ stack: 'rust', initGit: false, installDeps: false, includeAi: true }, p);
    expect(getPreferredStack(p)).toBe('express'); // 2 vs 1
    // option defaults track the latest choice
    expect(getOptionDefaults(p).initGit).toBe(false);
  });

  it('accumulates addon usage', () => {
    const p = profilePath();
    recordUsage({ stack: 'express', initGit: true, installDeps: true, includeAi: true, addons: ['docker', 'ci'] }, p);
    recordUsage({ stack: 'express', initGit: true, installDeps: true, includeAi: true, addons: ['docker'] }, p);
    expect(loadProfile(p).addonUsage).toEqual({ docker: 2, ci: 1 });
  });

  it('survives a corrupted profile file', () => {
    const p = profilePath();
    writeFileSync(p, '{ not valid json', 'utf-8');
    expect(() => loadProfile(p)).not.toThrow();
    expect(getPreferredStack(p)).toBeUndefined();
  });

  it('persists to disk', () => {
    const p = profilePath();
    recordUsage({ stack: 'go', initGit: true, installDeps: false, includeAi: true }, p);
    expect(existsSync(p)).toBe(true);
    // a fresh load sees the persisted data
    expect(getPreferredStack(p)).toBe('go');
  });
});
