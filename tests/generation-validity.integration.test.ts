import { existsSync, readFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, it, expect } from 'vitest';
import { extractRegion } from '../src/utils/regions.js';

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'tk-valid-'));
}

const STACKS = [
  'node-ts', 'react-spa', 'vue', 'nuxt', 'express',
  'fastapi', 'nextjs', 'rust', 'go', 'flutter', 'cli-ts', 'python', 'mcp-server',
];

/** Parse the ASCII tree inside a CLAUDE.md managed "Project Structure" block into relative paths. */
function parseStructurePaths(managedBody: string): { files: string[]; dirs: string[] } {
  const fenceMatch = managedBody.match(/```([\s\S]*?)```/);
  const files: string[] = [];
  const dirs: string[] = [];
  if (!fenceMatch) return { files, dirs };

  const pathStack: string[] = [];
  for (const raw of fenceMatch[1].split('\n')) {
    const line = raw.split('#')[0].replace(/\s+$/, '');
    if (line.trim() === '') continue;

    const connIdx = Math.max(line.indexOf('├── '), line.indexOf('└── '));
    let depth: number;
    let name: string;
    if (connIdx >= 0) {
      depth = connIdx / 4 + 1;
      name = line.slice(connIdx + 4).trim();
    } else {
      depth = 0;
      name = line.trim();
    }
    if (name === '' || name.startsWith('…')) continue;

    const isDir = name.endsWith('/');
    const clean = isDir ? name.slice(0, -1) : name;
    pathStack[depth] = clean;
    pathStack.length = depth + 1;

    const rel = pathStack.join('/');
    if (isDir) dirs.push(rel);
    else files.push(rel);
  }
  return { files, dirs };
}

describe('generation validity — guards against broken AI context', () => {
  for (const stack of STACKS) {
    it(`${stack}: .claude/settings.json is valid Claude Code config`, async () => {
      const { scaffold } = await import('../src/commands/quick/scaffold.js');
      const dir = tmpDir();
      await scaffold({
        projectName: 'valid-settings', description: 'x', stack,
        targetDir: join(dir, 'p'), includeAi: true, initGit: false, installDeps: false,
      });

      const settingsPath = join(dir, 'p', '.claude', 'settings.json');
      expect(existsSync(settingsPath)).toBe(true);

      const parsed = JSON.parse(readFileSync(settingsPath, 'utf-8'));

      // Invalid legacy top-level keys must be gone.
      expect(parsed.name).toBeUndefined();
      expect(parsed.stack).toBeUndefined();
      expect(parsed.description).toBeUndefined();

      // permissions.allow entries use valid Claude Code rule syntax.
      expect(Array.isArray(parsed.permissions?.allow)).toBe(true);
      for (const rule of parsed.permissions.allow) {
        expect(rule).toMatch(/^[A-Z][A-Za-z]*(\(.+\))?$/);
      }

      // statusLine must be a command object, not a bare string.
      if (parsed.statusLine !== undefined) {
        expect(typeof parsed.statusLine).toBe('object');
        expect(parsed.statusLine.type).toBe('command');
        expect(typeof parsed.statusLine.command).toBe('string');
      }
    });

    it(`${stack}: CLAUDE.md describes only files that actually exist (no hallucinated dirs)`, async () => {
      const { scaffold } = await import('../src/commands/quick/scaffold.js');
      const dir = tmpDir();
      const projectDir = join(dir, 'p');
      await scaffold({
        projectName: 'real-structure', description: 'x', stack,
        targetDir: projectDir, includeAi: true, initGit: false, installDeps: false,
      });

      const claude = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf-8');

      // No filler, no unrendered handlebars.
      expect(claude).not.toContain('## Year');
      expect(claude).not.toMatch(/\{\{/);

      const managed = extractRegion(claude, 'managed');
      expect(managed).not.toBeNull();

      const { files, dirs } = parseStructurePaths(managed!);
      // Every path in the documented structure must exist on disk.
      for (const rel of [...dirs, ...files]) {
        expect(existsSync(join(projectDir, rel)), `${stack}: structure lists "${rel}" but it was not generated`).toBe(true);
      }
    });
  }

  it('npm stacks generate a buildable package.json (valid JSON, build + test scripts)', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const npmStacks = ['node-ts', 'react-spa', 'vue', 'nuxt', 'express', 'nextjs', 'cli-ts', 'mcp-server'];
    for (const stack of npmStacks) {
      const dir = tmpDir();
      await scaffold({
        projectName: 'pkg', description: 'x', stack,
        targetDir: join(dir, 'p'), includeAi: false, initGit: false, installDeps: false,
      });
      const pkgRaw = readFileSync(join(dir, 'p', 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgRaw); // throws if invalid JSON
      expect(typeof pkg.scripts?.build, `${stack} missing build script`).toBe('string');
      expect(typeof pkg.scripts?.test, `${stack} missing test script`).toBe('string');
      // The build entry referenced by tsc/tsup/vite must have a real source entry on disk.
      expect(existsSync(join(dir, 'p', 'src')) || existsSync(join(dir, 'p', 'app')), `${stack} has no source dir`).toBe(true);
    }
  });

  it('tailors permissions per stack — no foreign toolchains', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const readAllow = async (stack: string): Promise<string[]> => {
      const dir = tmpDir();
      await scaffold({
        projectName: 'perm', description: 'x', stack,
        targetDir: join(dir, 'p'), includeAi: true, initGit: false, installDeps: false,
      });
      return JSON.parse(readFileSync(join(dir, 'p', '.claude', 'settings.json'), 'utf-8')).permissions.allow;
    };

    const node = await readAllow('node-ts');
    expect(node).toContain('Bash(npm:*)');
    expect(node.some(r => r.includes('cargo') || r.includes('flutter') || r.includes('pip'))).toBe(false);

    const rust = await readAllow('rust');
    expect(rust).toContain('Bash(cargo:*)');
    expect(rust.some(r => r.includes('npm') || r.includes('flutter'))).toBe(false);

    const fastapi = await readAllow('fastapi');
    expect(fastapi).toContain('Bash(uvicorn:*)');
    expect(fastapi.some(r => r.includes('npm') || r.includes('cargo'))).toBe(false);

    for (const list of [node, rust, fastapi]) {
      expect(list).toContain('Read');
      expect(list).toContain('Bash(git commit:*)');
    }
  });
});
