import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ensureDir } from '../../utils/fs.js';
import { copyTemplates, findTemplatesDir, buildContext, ALLOWED_STACK_IDS, INFRA_MODULES, getInfraModule, copyInfraModule } from '../quick/scaffold.js';
import { getStack } from '../quick/stacks.js';
import { logger } from '../../logger.js';

export interface AddOptions {
  module: string;
  targetDir: string;
  projectName: string;
  description: string;
  dryRun?: boolean;
}

function detectStack(targetDir: string): string | null {
  if (existsSync(join(targetDir, 'Cargo.toml'))) return 'rust';
  if (existsSync(join(targetDir, 'go.mod'))) return 'go';
  if (existsSync(join(targetDir, 'pubspec.yaml'))) return 'flutter';
  if (existsSync(join(targetDir, 'pyproject.toml'))) return 'python';
  if (existsSync(join(targetDir, 'package.json'))) {
    const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
    if (pkg.dependencies?.express) return 'express';
    if (pkg.dependencies?.next) return 'nextjs';
    if (pkg.dependencies?.nuxt) return 'nuxt';
    if (pkg.dependencies?.vue) return 'vue';
    if (pkg.dependencies?.react) return 'react-spa';
    if (pkg.dependencies?.commander) return 'cli-ts';
    if (pkg.devDependencies?.vitest && !pkg.dependencies?.express) return 'node-ts';
    return 'node-ts';
  }
  if (existsSync(join(targetDir, 'setup.py'))) return 'python';
  return null;
}

function mergeDeps(targetDir: string, existing: Record<string, unknown>, stackId: string): Record<string, unknown> {
  const templatesDir = findTemplatesDir();
  const templatePkgPath = join(templatesDir, stackId, 'package.json.hbs');
  if (!existsSync(templatePkgPath)) return existing;

  const raw = readFileSync(templatePkgPath, 'utf-8');
  const rendered = raw
    .replace(/\{\{projectName\}\}/g, existing.name as string || 'my-project')
    .replace(/\{\{description\}\}/g, existing.description as string || '');
  let overlay: Record<string, unknown>;
  try { overlay = JSON.parse(rendered); } catch { return existing; }

  const result = { ...existing };
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
    const baseDeps = (result[key] as Record<string, string>) || {};
    const overlayDeps = (overlay[key] as Record<string, string>) || {};
    result[key] = { ...baseDeps, ...overlayDeps };
  }
  const baseScripts = (result.scripts as Record<string, string>) || {};
  const overlayScripts = (overlay.scripts as Record<string, string>) || {};
  result.scripts = { ...baseScripts, ...overlayScripts };
  return result;
}

export async function addModule(opts: AddOptions): Promise<string[]> {
  const { module, targetDir, projectName, description, dryRun } = opts;

  // Check if it's an infra module
  const infraModule = getInfraModule(module);

  if (!infraModule && !ALLOWED_STACK_IDS.has(module)) {
    throw new Error(`Unknown module "${module}". Allowed stacks: ${[...ALLOWED_STACK_IDS].join(', ')}. Infra modules: ${INFRA_MODULES.map(m => m.id).join(', ')}`);
  }

  if (!existsSync(targetDir)) {
    throw new Error(`Directory "${targetDir}" does not exist. Run 'tk quick' first.`);
  }

  const templatesDir = findTemplatesDir();

  if (dryRun) {
    const label = infraModule ? infraModule.label : (getStack(module)?.label || module);
    logger.info(`[dry-run] Would add "${label}" to ${targetDir}`);
    return [];
  }

  const detectedStack = detectStack(targetDir);
  const ctx = buildContext({
    projectName,
    description,
    stack: detectedStack || 'node-ts',
    targetDir,
    includeAi: false,
    initGit: false,
    installDeps: false,
    components: [module],
  });

  const createdFiles: string[] = [];

  if (infraModule) {
    // Infra module — a simple addon that uses per-stack template resolution
    const moduleDir = join(templatesDir, infraModule.dir);
    if (!existsSync(moduleDir)) {
      throw new Error(`Infra module "${module}" has no template directory.`);
    }
    const files = copyInfraModule(moduleDir, targetDir, ctx, detectedStack || 'node-ts');
    createdFiles.push(...files);
    logger.success(`Added ${infraModule.label} (${createdFiles.length} new files)`);
    return createdFiles;
  }

  // Regular stack module
  const def = getStack(module);
  const moduleDir = join(templatesDir, module);
  if (!existsSync(moduleDir)) {
    throw new Error(`No template directory found for module "${module}".`);
  }

  if (!def?.hasCustomLayout) {
    const srcDir = def?.defaultSrcDir ?? 'src';
    const testDir = def?.defaultTestDir ?? 'tests';
    ensureDir(join(targetDir, srcDir));
    ensureDir(join(targetDir, testDir));
  }

  const files = copyTemplates(moduleDir, targetDir, ctx);
  createdFiles.push(...files);

  if (def?.needsNpmInstall && existsSync(join(targetDir, 'package.json'))) {
    const pkgPath = join(targetDir, 'package.json');
    const existing = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const merged = mergeDeps(targetDir, existing, module);
    writeFileSync(pkgPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
    logger.info(`Merged dependencies for "${module}" into package.json`);
  }

  logger.success(`Added ${module} (${createdFiles.length} new files)`);
  return createdFiles;
}
