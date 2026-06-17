import Handlebars from 'handlebars';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, rmSync } from 'fs';
import { join, dirname, extname, normalize } from 'path';
import { fileURLToPath } from 'url';
import { execSync, ExecSyncOptions } from 'child_process';
import { ensureDir } from '../../utils/fs.js';
import { logger, withSpinner } from '../../logger.js';
import { getStack } from './stacks.js';
import { STACKS, ALL_STACK_IDS } from './stacks.js';
import { getDevCommand } from './dev-command.js';
import { getClaudePermissions } from './permissions.js';
import { composeScaffold } from './composer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ALLOWED_STACK_IDS = new Set(STACKS.map((s) => s.id));

export interface ScaffoldOptions {
  projectName: string;
  description: string;
  stack: string;
  targetDir: string;
  includeAi: boolean;
  initGit: boolean;
  installDeps: boolean;
  dryRun?: boolean;
  components?: string[];
  /** Infra addons to include at scaffold time */
  addons?: string[];
}

export interface TemplateContext {
  projectName: string;
  description: string;
  stack: string;
  components: string[];
  year: number;
  /** Claude Code allow-list rules tailored to this stack (+ composed components). */
  claudePermissions: string[];
}

export function findTemplatesDir(): string {
  const candidates = [
    join(__dirname, '..', '..', '..', 'src', 'templates'),
    join(__dirname, '..', '..', '..', '..', 'src', 'templates'),
    join(process.cwd(), 'src', 'templates'),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  throw new Error('Cannot find templates directory. Ensure src/templates/ exists.');
}

export function buildContext(opts: ScaffoldOptions): TemplateContext {
  const components = opts.components ?? [];
  return {
    projectName: opts.projectName,
    description: opts.description,
    stack: opts.stack,
    components,
    year: new Date().getFullYear(),
    claudePermissions: getClaudePermissions(opts.stack, components),
  };
}

export function renderContent(content: string, ctx: TemplateContext): string {
  return Handlebars.compile(content)(ctx);
}

/** Walk a template directory, copying files and rendering .hbs. Returns created file paths. */
export function copyTemplates(srcDir: string, destDir: string, ctx: TemplateContext): string[] {
  const resolvedDest = normalize(destDir);
  const entries = readdirSync(srcDir);
  const created: string[] = [];
  for (const entry of entries) {
    if (entry.startsWith('_') && !entry.startsWith('__')) continue; // skip _partials, keep __dunder__ files
    const srcPath = join(srcDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      const subDest = join(resolvedDest, entry);
      ensureDir(subDest);
      const subFiles = copyTemplates(srcPath, subDest, ctx);
      created.push(...subFiles);
    } else if (stat.isFile()) {
      const isHbs = extname(entry) === '.hbs';
      const destName = isHbs ? entry.slice(0, -4) : entry;
      const content = readFileSync(srcPath, 'utf-8');
      const final = isHbs ? renderContent(content, ctx) : content;
      const destPath = join(resolvedDest, destName);
      if (!destPath.startsWith(resolvedDest)) {
        throw new Error(`Path traversal detected: ${destPath} is outside ${resolvedDest}`);
      }
      const parent = dirname(destPath);
      if (parent !== resolvedDest) ensureDir(parent);
      writeFileSync(destPath, final, 'utf-8');
      created.push(destPath);
    }
  }
  return created;
}

export function validateInput(opts: ScaffoldOptions): void {
  if (!ALLOWED_STACK_IDS.has(opts.stack)) {
    throw new Error(`Unknown stack "${opts.stack}". Allowed: ${[...ALLOWED_STACK_IDS].join(', ')}`);
  }

  const safeName = opts.projectName.replace(/[^a-zA-Z0-9._-]/g, '');
  if (safeName !== opts.projectName) {
    throw new Error(`Invalid project name "${opts.projectName}". Use only letters, numbers, dots, hyphens, and underscores.`);
  }

  if (opts.description.length > 200) {
    throw new Error('Description must be 200 characters or fewer.');
  }

  if (opts.components) {
    for (const c of opts.components) {
      if (!ALLOWED_STACK_IDS.has(c)) {
        throw new Error(`Unknown component stack "${c}". Allowed: ${[...ALLOWED_STACK_IDS].join(', ')}`);
      }
    }
  }
}

export function gitInit(targetDir: string): void {
  const opts: ExecSyncOptions = { cwd: targetDir, stdio: 'ignore', timeout: 30_000 };
  try {
    execSync('git init', opts);
    execSync('git add -A', opts);
    execSync('git commit -m "Initial scaffold by tk"', opts);
  } catch {
    // git not available or already a repo
  }
}

function installDeps(targetDir: string): void {
  withSpinner('Installing dependencies...', async () => {
    execSync('npm install', { cwd: targetDir, stdio: 'pipe', timeout: 120_000 });
  }).catch(() => {
    logger.warn('npm install failed. Run it manually later.');
  });
}

/**
 * Copy an infra module (docker, ci, security) into the target project.
 * Infra module files may use {stack}.{suffix} naming variants (e.g. Dockerfile.node-ts.hbs).
 */
export function copyInfraModule(moduleDir: string, targetDir: string, ctx: TemplateContext, stack: string): string[] {
  const resolvedDest = normalize(targetDir);
  const entries = readdirSync(moduleDir);
  const created: string[] = [];
  const outputPaths: string[] = [];

  for (const entry of entries) {
    if (entry.startsWith('_') && !entry.startsWith('__')) continue; // skip _partials, keep __dunder__ files
    const srcPath = join(moduleDir, entry);
    const stat = statSync(srcPath);
    if (!stat.isFile()) continue;

    const isHbs = extname(entry) === '.hbs';
    const baseName = isHbs ? entry.slice(0, -4) : entry;

    // Resolve stack-specific variant: Dockerfile.node-ts.hbs → Dockerfile, ci.node-ts.yml.hbs → .github/workflows/ci.yml.
    // Files qualified for a DIFFERENT stack (e.g. Dockerfile.rust in a node-ts project) are skipped.
    let destName = baseName;
    const parts = baseName.split('.');
    const stackQualifier = parts.find((p) => ALL_STACK_IDS.has(p));
    if (stackQualifier) {
      if (stackQualifier !== stack) continue; // belongs to another stack
      destName = parts.filter((p) => p !== stackQualifier).join('.');
      if (destName.endsWith('.yml') && !destName.includes('/')) {
        destName = '.github/workflows/' + destName;
      }
    }

    // Prevent dupes
    if (outputPaths.includes(destName)) continue;
    outputPaths.push(destName);

    const content = readFileSync(srcPath, 'utf-8');
    const final = isHbs ? renderContent(content, ctx) : content;
    const destPath = join(resolvedDest, destName);
    if (!destPath.startsWith(resolvedDest)) continue;

    const parent = dirname(destPath);
    if (parent !== resolvedDest) ensureDir(parent);
    // Skip if file already exists
    if (existsSync(destPath)) continue;
    writeFileSync(destPath, final, 'utf-8');
    created.push(destPath);
  }
  return created;
}

export interface InfraModule {
  id: string;
  label: string;
  description: string;
  dir: string;
}

export const INFRA_MODULES: InfraModule[] = [
  { id: 'docker', label: 'Docker', description: 'Add Dockerfile and docker-compose.yml', dir: 'infra/docker' },
  { id: 'ci', label: 'CI/CD', description: 'Add GitHub Actions CI workflow (.github/workflows/ci.yml)', dir: 'infra/ci' },
  { id: 'security', label: 'Security', description: 'Add gitleaks and pre-commit config', dir: 'infra/security' },
];

export function getInfraModule(id: string): InfraModule | undefined {
  return INFRA_MODULES.find(m => m.id === id);
}

export async function scaffold(opts: ScaffoldOptions): Promise<string[]> {
  const startTime = Date.now();
  const { projectName, targetDir, includeAi, initGit, installDeps: doInstall, dryRun, components, addons } = opts;

  validateInput(opts);

  const createdFiles: string[] = [];

  if (dryRun) {
    logger.info(`[dry-run] Would create project "${projectName}" in ${targetDir}`);
    logger.info(`[dry-run] Stack: ${opts.stack}, AI context: ${includeAi}, Git: ${initGit}, Install: ${doInstall}`);
    const templatesDir = findTemplatesDir();
    const stackDir = join(templatesDir, opts.stack);
    if (existsSync(stackDir)) {
      logger.info(`[dry-run] Would render stack templates from: ${stackDir}`);
    }
    return createdFiles;
  }

  logger.headline(`✦ Creating ${projectName}...`);

  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }

  ensureDir(targetDir);

  const templatesDir = findTemplatesDir();
  const ctx = buildContext(opts);

  try {
    // Handle multi-stack composition
    if (components && components.length > 0) {
      const allStacks = [opts.stack, ...components];
      const composeFiles = composeScaffold({
        projectName: ctx.projectName,
        targetDir,
        stacks: allStacks.filter(id => existsSync(join(templatesDir, id))),
        templatesDir,
        ctx,
        includeAi,
        initGit,
        installDeps: doInstall,
      });
      createdFiles.push(...composeFiles);
    } else {
      // Single-stack path
      const def = getStack(opts.stack);
      if (!def?.hasCustomLayout) {
        const srcDir = def?.defaultSrcDir ?? 'src';
        const testDir = def?.defaultTestDir ?? 'tests';
        ensureDir(join(targetDir, srcDir));
        ensureDir(join(targetDir, testDir));
      }

      // Render shared AI templates
      if (includeAi) {
        const sharedDir = join(templatesDir, 'shared');
        if (existsSync(sharedDir)) {
          const files = copyTemplates(sharedDir, targetDir, ctx);
          createdFiles.push(...files);
        }
      }

      // Render stack templates
      const stackDir = join(templatesDir, opts.stack);
      if (existsSync(stackDir)) {
        const files = copyTemplates(stackDir, targetDir, ctx);
        createdFiles.push(...files);
      }

      // Render requested infra addons
      if (addons) {
        for (const addonId of addons) {
          const addon = getInfraModule(addonId);
          if (addon) {
            const addonDir = join(templatesDir, addon.dir);
            if (existsSync(addonDir)) {
              const files = copyInfraModule(addonDir, targetDir, ctx, opts.stack);
              createdFiles.push(...files);
            }
          }
        }
      }

      // Git init
      if (initGit) {
        gitInit(targetDir);
      }

      // Install deps
      if (doInstall && def?.needsNpmInstall) {
        installDeps(targetDir);
      }
    }

    // Success summary with timing
    const elapsed = Date.now() - startTime;
    logger.magic(`${projectName} is ready! (${createdFiles.length} files, ${elapsed}ms)`);
    logger.dim(`  cd ${projectName}`);
    if (addons && addons.length > 0) {
      logger.dim(`  Addons: ${addons.join(', ')}`);
    }
    const devHint = getDevCommand(opts.stack);
    if (devHint) logger.dim(`  ${devHint}`);

    return createdFiles;
  } catch (err) {
    // Rollback: clean up any partial files
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true });
    }
    throw err;
  }
}
