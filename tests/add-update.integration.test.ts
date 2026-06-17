import { existsSync, readdirSync, readFileSync, mkdtempSync, statSync } from 'fs';
import { join, extname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { describe, it, expect, beforeEach } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLKIT_ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(TOOLKIT_ROOT, 'src', 'templates');

// ---- Helpers ----

let testCounter = 0;
function tmpDir(): string {
  testCounter++;
  return mkdtempSync(join(tmpdir(), `tk-add-${testCounter}-`));
}

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

function exists(path: string): boolean {
  try { return existsSync(path); } catch { return false; }
}

function nPath(p: string): string {
  return p.replace(/\\/g, '/');
}

function hasFile(files: string[], suffix: string): boolean {
  return files.some(f => nPath(f).endsWith(suffix));
}

describe('tk add - CLI infrastructure', () => {
  it('tk --help includes add command', async () => {
    const { createCLI } = await import('../src/cli.js');
    const program = createCLI();
    const help = program.helpInformation();
    expect(help).toContain('add');
    expect(help).toContain('quick');
    expect(help).toContain('update');
    expect(help).toContain('list');
    expect(help).toContain('info');
  });
});

describe('tk add - add module to existing project', () => {
  let projectDir: string;
  beforeEach(async () => {
    projectDir = tmpDir();
    // Create a node-ts project first
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'existing',
      description: 'A test project',
      stack: 'node-ts',
      targetDir: join(projectDir, 'existing'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    });
  });

  it('adds express module to existing node-ts project', async () => {
    const { addModule } = await import('../src/commands/add/add-module.js');
    const files = await addModule({
      module: 'express',
      targetDir: join(projectDir, 'existing'),
      projectName: 'existing',
      description: 'A test project',
    });

    expect(hasFile(files, 'routes/index.ts')).toBe(true);
    expect(hasFile(files, 'app.test.ts')).toBe(true);

    // express deps should be merged into package.json
    const pkg = JSON.parse(read(join(projectDir, 'existing', 'package.json')));
    expect(pkg.dependencies.express).toBeDefined();
    // original deps should still be there
    expect(pkg.devDependencies.vitest).toBeDefined();
  });

  it('rejects unknown module', async () => {
    const { addModule } = await import('../src/commands/add/add-module.js');
    await expect(addModule({
      module: 'nonexistent',
      targetDir: join(projectDir, 'existing'),
      projectName: 'existing',
      description: '',
    })).rejects.toThrow(/Unknown module/);
  });

  it('rejects non-existent target directory', async () => {
    const { addModule } = await import('../src/commands/add/add-module.js');
    await expect(addModule({
      module: 'express',
      targetDir: join(projectDir, 'nonexistent'),
      projectName: 'test',
      description: '',
    })).rejects.toThrow(/does not exist/);
  });

  it('dry-run does not write files', async () => {
    const { addModule } = await import('../src/commands/add/add-module.js');
    const files = await addModule({
      module: 'express',
      targetDir: join(projectDir, 'existing'),
      projectName: 'existing',
      description: '',
      dryRun: true,
    });
    expect(files).toHaveLength(0);
  });
});

describe('tk add - add to non-npm project types', () => {
  let projectDir: string;
  beforeEach(async () => {
    projectDir = tmpDir();
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'api',
      description: 'Python API',
      stack: 'fastapi',
      targetDir: join(projectDir, 'api'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    });
  });

  it('adds node-ts module to fastapi project', async () => {
    const { addModule } = await import('../src/commands/add/add-module.js');
    const files = await addModule({
      module: 'node-ts',
      targetDir: join(projectDir, 'api'),
      projectName: 'api',
      description: 'Python API',
    });
    // Should add node-ts files alongside python files
    expect(hasFile(files, 'src/index.ts')).toBe(true);
    expect(hasFile(files, 'tests/index.test.ts')).toBe(true);
    expect(hasFile(files, 'package.json')).toBe(true);
    // Original python files should still be there
    expect(exists(join(projectDir, 'api', 'pyproject.toml'))).toBe(true);
    expect(exists(join(projectDir, 'api', 'src', 'main.py'))).toBe(true);
  });
});

describe('tk update - re-render shared templates', () => {
  let projectDir: string;
  beforeEach(async () => {
    projectDir = tmpDir();
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'update-test',
      description: 'For update testing',
      stack: 'node-ts',
      targetDir: join(projectDir, 'update-test'),
      includeAi: true,
      initGit: false,
      installDeps: false,
    });
  });

  it('updates CLAUDE.md with current context', async () => {
    const { updateProject } = await import('../src/commands/update/update-project.js');
    const result = await updateProject({
      targetDir: join(projectDir, 'update-test'),
      projectName: 'update-test',
      description: 'Updated description',
    });
    expect(result.updated).toContain(join(projectDir, 'update-test', 'CLAUDE.md'));
    expect(result.updated).toContain(join(projectDir, 'update-test', '.cursorrules'));

    // CLAUDE.md should render stack-specific content (npm commands for node-ts)
    const claudeMd = read(join(projectDir, 'update-test', 'CLAUDE.md'));
    expect(claudeMd).toContain('npm run dev');
    expect(claudeMd).toContain('npm test');
  });

  it('dry-run does not write files', async () => {
    const { updateProject } = await import('../src/commands/update/update-project.js');
    const result = await updateProject({
      targetDir: join(projectDir, 'update-test'),
      projectName: 'update-test',
      description: '',
      dryRun: true,
    });
    expect(result.updated).toHaveLength(0);
    expect(result.newFiles).toHaveLength(0);
  });

  it('rejects non-existent directory', async () => {
    const { updateProject } = await import('../src/commands/update/update-project.js');
    await expect(updateProject({
      targetDir: join(projectDir, 'nonexistent'),
      projectName: 'test',
      description: '',
    })).rejects.toThrow(/does not exist/);
  });
});

describe('tk update - detect stack from existing project', () => {
  let projectDir: string;
  beforeEach(async () => {
    projectDir = tmpDir();
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'py-update',
      description: 'Python update test',
      stack: 'fastapi',
      targetDir: join(projectDir, 'py-update'),
      includeAi: false, // no shared templates first
      initGit: false,
      installDeps: false,
    });
  });

  it('detects python stack and renders correct CLAUDE.md', async () => {
    const { updateProject } = await import('../src/commands/update/update-project.js');
    const result = await updateProject({
      targetDir: join(projectDir, 'py-update'),
      projectName: 'py-update',
      description: 'Python API project',
    });
    expect(result.updated).toContain(join(projectDir, 'py-update', 'CLAUDE.md'));
    const claudeMd = read(join(projectDir, 'py-update', 'CLAUDE.md'));
    // Should have python-specific content (pip install command)
    expect(claudeMd).toContain('pip install');
    expect(claudeMd).toContain('pyproject.toml');
  });
});

describe('tk init - add AI context files to existing project', () => {
  let dir: string;

  beforeEach(() => {
    dir = tmpDir();
  });

  it('adds shared templates to existing node-ts project', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'no-ai',
      description: 'Project without AI files',
      stack: 'node-ts',
      targetDir: join(dir, 'no-ai'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    });

    const { initProject } = await import('../src/commands/init/init-project.js');
    const files = await initProject({
      targetDir: join(dir, 'no-ai'),
      projectName: 'no-ai',
      description: 'Project without AI files',
    });
    expect(files.length).toBeGreaterThan(0);
    // CLAUDE.md is from the per-stack template, already on disk after scaffold
    expect(exists(join(dir, 'no-ai', 'CLAUDE.md'))).toBe(true);
    // .cursorrules and .windsurfrules are now per-stack templates, already on disk after scaffold
    expect(exists(join(dir, 'no-ai', '.cursorrules'))).toBe(true);
    expect(exists(join(dir, 'no-ai', '.windsurfrules'))).toBe(true);
    expect(hasFile(files, '.cursorrules')).toBe(false); // already existed, not newly added
    expect(hasFile(files, '.windsurfrules')).toBe(false); // already existed, not newly added
    expect(hasFile(files, 'CLAUDE.md')).toBe(false); // already existed, not newly added
  });

  it('does not overwrite existing files', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'has-ai',
      description: 'Already has AI files',
      stack: 'node-ts',
      targetDir: join(dir, 'has-ai'),
      includeAi: true,
      initGit: false,
      installDeps: false,
    });

    const { initProject } = await import('../src/commands/init/init-project.js');
    const files = await initProject({
      targetDir: join(dir, 'has-ai'),
      projectName: 'has-ai',
      description: 'Already has AI files',
    });
    expect(files).toHaveLength(0);
  });

  it('dry-run does not write files', async () => {
    const { initProject } = await import('../src/commands/init/init-project.js');
    const files = await initProject({
      targetDir: dir,
      projectName: 'init-test',
      description: '',
      dryRun: true,
    });
    expect(files).toHaveLength(0);
  });
});
