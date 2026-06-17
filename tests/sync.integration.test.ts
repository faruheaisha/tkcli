import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, it, expect, beforeEach } from 'vitest';
import { extractRegion } from '../src/utils/regions.js';

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'tk-sync-'));
}

describe('tk sync — keep CLAUDE.md aligned with real structure', () => {
  let projectDir: string;

  beforeEach(async () => {
    const dir = tmpDir();
    projectDir = join(dir, 'app');
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'app', description: 'sync test', stack: 'node-ts',
      targetDir: projectDir, includeAi: true, initGit: false, installDeps: false,
    });
  });

  it('reflects newly added directories in the managed region', async () => {
    const { syncProject } = await import('../src/commands/sync/sync-project.js');

    // Add a real directory + file the scaffold never created.
    mkdirSync(join(projectDir, 'src', 'services'), { recursive: true });
    writeFileSync(join(projectDir, 'src', 'services', 'user.ts'), 'export const x = 1;\n');

    const result = await syncProject({ targetDir: projectDir, projectName: 'app', description: 'sync test' });
    expect(result.status).toBe('updated');

    const claude = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf-8');
    const managed = extractRegion(claude, 'managed')!;
    expect(managed).toContain('services/');
    expect(managed).toContain('user.ts');
  });

  it('never touches the tk:user region', async () => {
    const { syncProject } = await import('../src/commands/sync/sync-project.js');
    const claudePath = join(projectDir, 'CLAUDE.md');

    // Simulate a user writing project notes.
    const before = readFileSync(claudePath, 'utf-8');
    const userMark = '- Our domain rule: orders are immutable after fulfillment.';
    const edited = before.replace(
      '- _Record architecture decisions, domain rules, and gotchas here._',
      userMark,
    );
    writeFileSync(claudePath, edited, 'utf-8');

    mkdirSync(join(projectDir, 'src', 'routes'), { recursive: true });
    writeFileSync(join(projectDir, 'src', 'routes', 'index.ts'), 'export {};\n');
    await syncProject({ targetDir: projectDir, projectName: 'app', description: 'sync test' });

    const after = readFileSync(claudePath, 'utf-8');
    expect(after).toContain(userMark); // user note survived
    expect(extractRegion(after, 'managed')!).toContain('routes/'); // managed still refreshed
  });

  it('is idempotent — a second sync reports no change', async () => {
    const { syncProject } = await import('../src/commands/sync/sync-project.js');
    await syncProject({ targetDir: projectDir, projectName: 'app', description: 'sync test' });
    const second = await syncProject({ targetDir: projectDir, projectName: 'app', description: 'sync test' });
    expect(second.status).toBe('unchanged');
  });

  it('dry-run does not write', async () => {
    const { syncProject } = await import('../src/commands/sync/sync-project.js');
    mkdirSync(join(projectDir, 'src', 'lib'), { recursive: true });
    writeFileSync(join(projectDir, 'src', 'lib', 'util.ts'), 'export {};\n');
    const before = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf-8');
    await syncProject({ targetDir: projectDir, projectName: 'app', description: 'sync test', dryRun: true });
    const after = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf-8');
    expect(after).toBe(before);
  });

  it('builds a Commands block from real package.json scripts', async () => {
    const { syncProject } = await import('../src/commands/sync/sync-project.js');
    await syncProject({ targetDir: projectDir, projectName: 'app', description: 'sync test' });
    const managed = extractRegion(readFileSync(join(projectDir, 'CLAUDE.md'), 'utf-8'), 'managed')!;
    expect(managed).toContain('## Commands');
    // node-ts package.json defines a dev script → surfaced as `npm run dev`.
    expect(managed).toContain('npm run dev');
  });

  it('tk init auto-syncs real structure for an existing project', async () => {
    // Fresh project WITHOUT AI files, with an extra real directory.
    const dir = tmpDir();
    const proj = join(dir, 'legacy');
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'legacy', description: 'existing', stack: 'node-ts',
      targetDir: proj, includeAi: false, initGit: false, installDeps: false,
    });
    mkdirSync(join(proj, 'src', 'services'), { recursive: true });
    writeFileSync(join(proj, 'src', 'services', 'order.ts'), 'export {};\n');

    const { initProject } = await import('../src/commands/init/init-project.js');
    await initProject({ targetDir: proj, projectName: 'legacy', description: 'existing' });

    const managed = extractRegion(readFileSync(join(proj, 'CLAUDE.md'), 'utf-8'), 'managed')!;
    expect(managed).toContain('services/');
    expect(managed).toContain('order.ts');
    expect(managed).not.toContain('Run `tk sync` to populate'); // placeholder replaced
  });

  it('--auto-sync writes a valid SessionStart hook to settings.local.json', async () => {
    const dir = tmpDir();
    const proj = join(dir, 'hooked');
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'hooked', description: 'x', stack: 'node-ts',
      targetDir: proj, includeAi: true, initGit: false, installDeps: false, autoSync: true,
    });

    const localPath = join(proj, '.claude', 'settings.local.json');
    expect(existsSync(localPath)).toBe(true);
    const parsed = JSON.parse(readFileSync(localPath, 'utf-8'));
    const cmd = parsed.hooks.SessionStart[0].hooks[0];
    expect(cmd.type).toBe('command');
    expect(cmd.command).toContain('tk sync');

    // Managed settings.json stays clean (hook is NOT in the tk-managed file).
    const managedSettings = JSON.parse(readFileSync(join(proj, '.claude', 'settings.json'), 'utf-8'));
    expect(managedSettings.hooks).toBeUndefined();

    // settings.local.json must be gitignored.
    expect(readFileSync(join(proj, '.gitignore'), 'utf-8')).toContain('.claude/settings.local.json');
  });

  it('omits settings.local.json without --auto-sync', async () => {
    const dir = tmpDir();
    const proj = join(dir, 'plain');
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'plain', description: 'x', stack: 'node-ts',
      targetDir: proj, includeAi: true, initGit: false, installDeps: false,
    });
    expect(existsSync(join(proj, '.claude', 'settings.local.json'))).toBe(false);
  });

  it('distinguishes FastAPI from plain Python via pyproject.toml', async () => {
    const dir = tmpDir();
    const proj = join(dir, 'svc');
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'svc', description: 'api', stack: 'fastapi',
      targetDir: proj, includeAi: true, initGit: false, installDeps: false,
    });
    const { syncProject } = await import('../src/commands/sync/sync-project.js');
    const result = await syncProject({ targetDir: proj, projectName: 'svc', description: 'api' });
    expect(result.stack).toBe('fastapi');
    const managed = extractRegion(readFileSync(join(proj, 'CLAUDE.md'), 'utf-8'), 'managed')!;
    expect(managed).toContain('FastAPI');
    expect(managed).toContain('uvicorn');
  });

  it('preserves the user region across tk update too', async () => {
    const { updateProject } = await import('../src/commands/update/update-project.js');
    const claudePath = join(projectDir, 'CLAUDE.md');
    const before = readFileSync(claudePath, 'utf-8');
    const userMark = '- Critical: never log PII.';
    writeFileSync(claudePath, before.replace(
      '- _Record architecture decisions, domain rules, and gotchas here._',
      userMark,
    ), 'utf-8');

    await updateProject({ targetDir: projectDir, projectName: 'app', description: 'changed desc' });

    expect(readFileSync(claudePath, 'utf-8')).toContain(userMark);
  });
});
