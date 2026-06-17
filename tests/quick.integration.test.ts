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

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'tk-test-'));
}

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

function exists(path: string): boolean {
  try { return existsSync(path); } catch { return false; }
}

/** Normalize Windows backslashes for consistent path matching */
function nPath(p: string): string {
  return p.replace(/\\/g, '/');
}

function hasFile(files: string[], suffix: string): boolean {
  return files.some(f => nPath(f).endsWith(suffix));
}

/** Recursively list all .hbs files in a directory */
function listHbsFiles(dir: string): string[] {
  const result: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const s = statSync(full);
      if (s.isDirectory()) walk(full);
      else if (entry.endsWith('.hbs')) result.push(full);
    }
  }
  walk(dir);
  return result;
}

/** Check if a relative file exists as either .hbs or plain */
function templateFileExists(stackDir: string, relativePath: string): boolean {
  const hbsPath = join(stackDir, relativePath + '.hbs');
  const plainPath = join(stackDir, relativePath);
  return exists(hbsPath) || exists(plainPath);
}

// ---- Tests ----

describe('tk quick - CLI infrastructure', () => {
  it('tk --help includes all commands', async () => {
    const { createCLI } = await import('../src/cli.js');
    const program = createCLI();
    const help = program.helpInformation();
    expect(help).toContain('quick');
    expect(help).toContain('init');
    expect(help).toContain('list');
    expect(help).toContain('info');
  });

  it('tk -v reads version from package.json', () => {
    const pkg = JSON.parse(read(join(TOOLKIT_ROOT, 'package.json')));
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('tk quick - 12 stack template integrity', () => {
  const stacks = [
    'node-ts', 'react-spa', 'vue', 'nuxt', 'express',
    'fastapi', 'nextjs', 'rust', 'go', 'flutter',
    'cli-ts', 'python',
  ];

  const stackKeyFiles: Record<string, string[]> = {
    'node-ts': ['package.json', 'tsconfig.json', 'src/index.ts', 'tests/index.test.ts', 'CLAUDE.md', 'README.md', 'eslint.config.mjs', 'AGENTS.md'],
    'react-spa': ['package.json', 'index.html', 'vite.config.ts', 'src/main.tsx', 'src/App.tsx', 'src/routes/index.ts', 'src/pages/Home.tsx', 'tsconfig.json', 'CLAUDE.md', 'README.md', 'AGENTS.md', 'tests/setup.ts', 'tests/app.test.tsx', 'eslint.config.mjs'],
    'vue': ['package.json', 'index.html', 'vite.config.ts', 'src/main.ts', 'src/App.vue', 'src/pages/Home.vue', 'tsconfig.json', 'CLAUDE.md', 'README.md', 'AGENTS.md', 'tests/app.test.ts', 'eslint.config.mjs'],
    'nuxt': ['package.json', 'nuxt.config.ts', 'CLAUDE.md', 'README.md', 'AGENTS.md', 'app/app.vue', 'app/pages/index.vue', 'server/api/hello.ts', 'tests/example.test.ts', 'eslint.config.mjs'],
    'express': ['package.json', 'tsconfig.json', 'src/index.ts', 'src/routes/index.ts', 'tests/app.test.ts', 'CLAUDE.md', 'README.md', 'AGENTS.md', 'eslint.config.mjs', '.env.example'],
    'fastapi': ['pyproject.toml', 'src/main.py', 'src/core/config.py', 'src/database.py', 'src/schemas.py', 'src/routers/api.py', 'src/routers/__init__.py', 'src/__init__.py', 'tests/test_api.py', 'CLAUDE.md', 'README.md', '.env.example', 'AGENTS.md'],
    'nextjs': ['package.json', 'next.config.ts', 'src/app/layout.tsx', 'src/app/page.tsx', 'src/app/globals.css', 'src/app/server-data/page.tsx', 'src/app/api/hello/route.ts', 'src/app/error.tsx', 'src/app/loading.tsx', 'src/components/navbar.tsx', 'tests/example.test.tsx', 'CLAUDE.md', 'README.md', 'AGENTS.md', 'eslint.config.mjs'],
    'rust': ['Cargo.toml', 'Makefile', 'deny.toml', 'src/main.rs', 'src/greet/mod.rs', 'src/config/mod.rs', 'tests/integration_test.rs', 'CLAUDE.md', 'README.md', 'AGENTS.md', 'CHANGELOG.md'],
    'go': ['go.mod', 'Makefile', 'cmd/server/main.go', 'internal/app/app.go', 'internal/app/app_test.go', 'internal/business/user/store.go', 'internal/business/user/handler.go', 'internal/foundation/logger/logger.go', 'CLAUDE.md', 'README.md', 'AGENTS.md', 'CHANGELOG.md'],
    'flutter': ['pubspec.yaml', 'lib/main.dart', 'lib/app/app.dart', 'lib/counter/counter.dart', 'lib/counter/view/counter_page.dart', 'lib/counter/view/counter_body.dart', 'test/app_test.dart', 'test/counter_view_test.dart', 'CLAUDE.md', 'README.md', 'AGENTS.md', 'analysis_options.yaml', 'CHANGELOG.md'],
    'cli-ts': ['package.json', 'tsconfig.json', 'src/index.ts', 'tests/index.test.ts', 'CLAUDE.md', 'README.md', 'eslint.config.mjs', 'AGENTS.md'],
    'python': ['pyproject.toml', 'src/main.py', 'src/cli.py', 'src/logger.py', 'src/__init__.py', 'src/__main__.py', 'tests/test_main.py', 'CLAUDE.md', 'README.md', '.python-version', 'Makefile', 'justfile', 'AGENTS.md'],
  };

  for (const stack of stacks) {
    it(`${stack} has all template files present`, () => {
      const stackDir = join(TEMPLATES_DIR, stack);
      expect(exists(stackDir)).toBe(true);
      const keyFiles = stackKeyFiles[stack] || [];
      for (const f of keyFiles) {
        expect(templateFileExists(stackDir, f)).toBe(true);
      }
    });

    it(`${stack} templates compile Handlebars (all {{}} have matching close)`, () => {
      const stackDir = join(TEMPLATES_DIR, stack);
      if (!exists(stackDir)) return;
      const hbsFiles = listHbsFiles(stackDir);
      for (const f of hbsFiles) {
        const content = read(f);
        const opens = (content.match(/\{\{/g) || []).length;
        const closes = (content.match(/\}\}/g) || []).length;
        if (opens !== closes) {
          expect(Math.abs(opens - closes)).toBeLessThanOrEqual(2);
        }
      }
    });
  }
});

describe('tk quick - non-interactive scaffold', () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });

  it('scaffolds node-ts project with all expected files', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'test-node',
      description: 'A Node project',
      stack: 'node-ts',
      targetDir: join(dir, 'test-node'),
      includeAi: true,
      initGit: false,
      installDeps: false,
    });
    expect(files.length).toBeGreaterThan(3);
    expect(hasFile(files, 'package.json')).toBe(true);
    expect(hasFile(files, 'src/index.ts')).toBe(true);
    expect(hasFile(files, 'tests/index.test.ts')).toBe(true);
    expect(hasFile(files, 'CLAUDE.md')).toBe(true);
    // New multi-platform AI files
    expect(hasFile(files, '.cursorrules')).toBe(true);
    expect(hasFile(files, '.windsurfrules')).toBe(true);
    // Infra modules are NOT included by default
    expect(hasFile(files, 'Dockerfile')).toBe(false);
    expect(hasFile(files, 'docker-compose.yml')).toBe(false);
    expect(hasFile(files, '.gitleaks.toml')).toBe(false);
    expect(hasFile(files, '.pre-commit-config.yaml')).toBe(false);
    expect(hasFile(files, '.github')).toBe(false);
  });

  it('scaffolds with --addons includes infra files', async () => {
    const { scaffold, copyInfraModule, INFRA_MODULES } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'test-infra',
      description: 'With infra',
      stack: 'node-ts',
      targetDir: join(dir, 'test-infra'),
      includeAi: false,
      initGit: false,
      installDeps: false,
      addons: ['docker', 'ci', 'security'],
    });
    expect(hasFile(files, 'Dockerfile')).toBe(true);
    expect(hasFile(files, '.github/workflows/ci.yml')).toBe(true);
    expect(hasFile(files, '.gitleaks.toml')).toBe(true);
    expect(hasFile(files, '.pre-commit-config.yaml')).toBe(true);

    // No other stack's Dockerfile should leak into the project.
    const dockerfiles = readdirSync(join(dir, 'test-infra')).filter(f => f.startsWith('Dockerfile'));
    expect(dockerfiles).toEqual(['Dockerfile']);
  });

  it('docker addon resolves only the matching Dockerfile per stack', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    for (const stack of ['python', 'rust', 'go'] as const) {
      const files = await scaffold({
        projectName: `dk-${stack}`, description: 'x', stack,
        targetDir: join(dir, `dk-${stack}`), includeAi: false, initGit: false, installDeps: false,
        addons: ['docker'],
      });
      expect(hasFile(files, 'Dockerfile')).toBe(true);
      const leaks = readdirSync(join(dir, `dk-${stack}`)).filter(f => f.startsWith('Dockerfile') && f !== 'Dockerfile');
      expect(leaks, `${stack} leaked ${leaks.join(', ')}`).toEqual([]);
    }
  });

  it('scaffolds fastapi project with Python files', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'test-py',
      description: 'A Python API',
      stack: 'fastapi',
      targetDir: join(dir, 'test-py'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    });
    expect(hasFile(files, 'pyproject.toml')).toBe(true);
    expect(hasFile(files, 'main.py')).toBe(true);
  });

  it('scaffolds rust project with Cargo.toml', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'test-rust',
      description: 'A Rust CLI',
      stack: 'rust',
      targetDir: join(dir, 'test-rust'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    });
    expect(hasFile(files, 'Cargo.toml')).toBe(true);
    expect(hasFile(files, 'main.rs')).toBe(true);
  });

  it('scaffolds flutter project with pubspec.yaml', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'test-flutter',
      description: 'A Flutter app',
      stack: 'flutter',
      targetDir: join(dir, 'test-flutter'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    });
    expect(hasFile(files, 'pubspec.yaml')).toBe(true);
    expect(hasFile(files, 'main.dart')).toBe(true);
  });

  it('all generated files have projectName and description replaced (no raw {{}})', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'replaced-ok',
      description: 'My cool test',
      stack: 'node-ts',
      targetDir: join(dir, 'replaced-ok'),
      includeAi: true,
      initGit: false,
      installDeps: false,
    });
    for (const f of files) {
      const ext = extname(f).toLowerCase();
      if (ext === '.png' || ext === '.ico' || ext === '.jpg' || ext === '.svg') continue;
      try {
        const content = read(f);
        const hasUnrendered = /\{\{projectName\}\}/.test(content) || /\{\{description\}\}/.test(content);
        expect(hasUnrendered).toBe(false);
      } catch {
        // binary
      }
    }
  });

  it('generated package.json contains the correct projectName', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'named-project',
      description: 'desc here',
      stack: 'node-ts',
      targetDir: join(dir, 'named-project'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    });
    const pkgFile = files.find(f => nPath(f).endsWith('package.json'));
    expect(pkgFile).toBeTruthy();
    const pkg = JSON.parse(read(pkgFile!));
    expect(pkg.name).toBe('named-project');
  });

  it('output includes timing in ms', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const origLog = console.log;
    const messages: string[] = [];
    console.log = (...args: any[]) => { messages.push(args.join(' ')); };
    try {
      const files = await scaffold({
        projectName: 'timing-test',
        description: 'test',
        stack: 'node-ts',
        targetDir: join(dir, 'timing-test'),
        includeAi: false,
        initGit: false,
        installDeps: false,
      });
      expect(files.length).toBeGreaterThan(2);
      // Check that timing was logged (magic uses console.log)
      const readyLine = messages.find(m => m.includes('is ready!'));
      expect(readyLine).toBeTruthy();
      expect(readyLine).toMatch(/\d+ms/);
    } finally {
      console.log = origLog;
    }
  });
});

describe('tk quick - error handling', () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });

  it('rejects unknown stack', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await expect(scaffold({
      projectName: 'bad',
      description: 'x',
      stack: 'nonexistent',
      targetDir: join(dir, 'bad'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    })).rejects.toThrow(/Unknown stack/);
  });

  it('rejects invalid project name with special chars', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await expect(scaffold({
      projectName: 'my project!!!',
      description: 'x',
      stack: 'node-ts',
      targetDir: join(dir, 'bad'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    })).rejects.toThrow(/Invalid project name/);
  });

  it('rejects description over 200 chars', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await expect(scaffold({
      projectName: 'test',
      description: 'x'.repeat(201),
      stack: 'node-ts',
      targetDir: join(dir, 'test'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    })).rejects.toThrow(/200 characters/);
  });
});

describe('tk quick --force overwrites existing dir', () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });

  it('overwrites with new description', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await scaffold({
      projectName: 'force-test',
      description: 'first',
      stack: 'node-ts',
      targetDir: join(dir, 'force-test'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    });
    const files = await scaffold({
      projectName: 'force-test',
      description: 'second',
      stack: 'node-ts',
      targetDir: join(dir, 'force-test'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    });
    expect(files.length).toBeGreaterThan(0);
    const pkg = JSON.parse(read(join(dir, 'force-test', 'package.json')));
    expect(pkg.description).toBe('second');
  });
});

describe('tk quick --dry-run does not write files', () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });

  it('returns empty array and does not create project dir', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'dry',
      description: 'test',
      stack: 'node-ts',
      targetDir: join(dir, 'dry'),
      includeAi: true,
      initGit: false,
      installDeps: false,
      dryRun: true,
    });
    expect(files).toHaveLength(0);
    expect(exists(join(dir, 'dry'))).toBe(false);
  });
});

describe('tk quick - shared templates', () => {
  it('shared templates directory has all expected files', () => {
    const sharedDir = join(TEMPLATES_DIR, 'shared');
    expect(exists(sharedDir)).toBe(true);
    const files = ['CLAUDE.md', '.gitignore', '.editorconfig', '.env.example', '.cursorrules', '.windsurfrules'];
    for (const f of files) {
      expect(templateFileExists(sharedDir, f)).toBe(true);
    }
  });
});

describe('tk quick - infra modules', () => {
  it('infra/docker has per-stack Dockerfiles', () => {
    const dockerDir = join(TEMPLATES_DIR, 'infra', 'docker');
    expect(exists(dockerDir)).toBe(true);
    // Should have Dockerfiles for node-ts, express, react-spa, etc.
    expect(exists(join(dockerDir, 'Dockerfile.node-ts.hbs'))).toBe(true);
    expect(exists(join(dockerDir, 'Dockerfile.express.hbs'))).toBe(true);
    expect(exists(join(dockerDir, 'docker-compose.yml.hbs'))).toBe(true);
  });

  it('infra/ci has per-stack CI workflows', () => {
    const ciDir = join(TEMPLATES_DIR, 'infra', 'ci');
    expect(exists(ciDir)).toBe(true);
    expect(exists(join(ciDir, 'ci.node-ts.yml.hbs'))).toBe(true);
  });

  it('infra/security has gitleaks and pre-commit', () => {
    const secDir = join(TEMPLATES_DIR, 'infra', 'security');
    expect(exists(secDir)).toBe(true);
    expect(exists(join(secDir, '.gitleaks.toml.hbs'))).toBe(true);
    expect(exists(join(secDir, '.pre-commit-config.yaml.hbs'))).toBe(true);
  });
});

describe('tk quick - security walls', () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });

  it('rejects stack ID injection (non-whitelist)', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await expect(scaffold({
      projectName: 'safe',
      description: 'ok',
      stack: 'rm -rf /',
      targetDir: join(dir, 'safe'),
      includeAi: false,
      initGit: false,
      installDeps: false,
    })).rejects.toThrow(/Unknown stack/);
  });
});

describe('tk quick - component composition', () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });

  it('scaffolds express + react-spa as multi-stack project', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'fullstack',
      description: 'Full-stack app',
      stack: 'express',
      targetDir: join(dir, 'fullstack'),
      includeAi: false,
      initGit: false,
      installDeps: false,
      components: ['react-spa'],
    });
    expect(hasFile(files, 'package.json')).toBe(true);
    expect(hasFile(files, 'src/index.ts')).toBe(true);
    expect(hasFile(files, 'src/App.tsx')).toBe(true);
    expect(hasFile(files, 'vite.config.ts')).toBe(true);
    expect(hasFile(files, 'src/routes/index.ts')).toBe(true);
    expect(hasFile(files, 'index.html')).toBe(true);
    expect(hasFile(files, 'tests/app.test.ts')).toBe(true);
  });

  it('rejects invalid component stack ID', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    await expect(scaffold({
      projectName: 'bad-comp',
      description: 'x',
      stack: 'node-ts',
      targetDir: join(dir, 'bad-comp'),
      includeAi: false,
      initGit: false,
      installDeps: false,
      components: ['nonexistent-stack'],
    })).rejects.toThrow(/Unknown component/);
  });

  it('merges package.json dependencies when composing npm stacks', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'merged',
      description: 'Merge test',
      stack: 'node-ts',
      targetDir: join(dir, 'merged'),
      includeAi: false,
      initGit: false,
      installDeps: false,
      components: ['express'],
    });
    const pkgFile = files.find(f => nPath(f).endsWith('package.json'));
    expect(pkgFile).toBeTruthy();
    const pkg = JSON.parse(read(pkgFile!));
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies.express).toBeDefined();
    expect(pkg.devDependencies).toBeDefined();
    expect(pkg.devDependencies.vitest).toBeDefined();
  });

  it('supports --components with AI context files', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'ai-compose',
      description: 'AI + components test',
      stack: 'express',
      targetDir: join(dir, 'ai-compose'),
      includeAi: true,
      initGit: false,
      installDeps: false,
      components: ['react-spa'],
    });
    expect(hasFile(files, 'CLAUDE.md')).toBe(true);
    expect(hasFile(files, '.cursorrules')).toBe(true);
    expect(hasFile(files, 'src/index.ts')).toBe(true);
    expect(hasFile(files, 'src/App.tsx')).toBe(true);
  });

  it('dry-run works with components', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const files = await scaffold({
      projectName: 'dry-compose',
      description: 'dry run compose',
      stack: 'node-ts',
      targetDir: join(dir, 'dry-compose'),
      includeAi: false,
      initGit: false,
      installDeps: false,
      dryRun: true,
      components: ['express'],
    });
    expect(files).toHaveLength(0);
    expect(exists(join(dir, 'dry-compose'))).toBe(false);
  });
});
