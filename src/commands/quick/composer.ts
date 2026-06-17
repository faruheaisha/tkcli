import { join, dirname, extname, relative } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { ensureDir } from '../../utils/fs.js';
import { copyTemplates, gitInit, findTemplatesDir, TemplateContext } from './scaffold.js';
import { getStack } from './stacks.js';
import { getDevCommand } from './dev-command.js';
import { logger, withSpinner } from '../../logger.js';

export interface ComposeOptions {
  projectName: string;
  targetDir: string;
  stacks: string[];
  templatesDir: string;
  ctx: TemplateContext;
  includeAi: boolean;
  initGit: boolean;
  installDeps: boolean;
}

/**
 * Merge two package.json objects.
 * Later stack's scripts/deps take priority on conflict.
 */
export function mergePackageJson(base: Record<string, unknown>, overlay: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base };
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
    const baseDeps = (result[key] as Record<string, string> | undefined) || {};
    const overlayDeps = (overlay[key] as Record<string, string> | undefined) || {};
    result[key] = { ...baseDeps, ...overlayDeps };
  }
  const baseScripts = (result.scripts as Record<string, string> | undefined) || {};
  const overlayScripts = (overlay.scripts as Record<string, string> | undefined) || {};
  result.scripts = { ...baseScripts, ...overlayScripts };
  return result;
}

/**
 * Scaffold a multi-stack project by merging template outputs from all specified stacks.
 */
export function composeScaffold(opts: ComposeOptions): string[] {
  const { targetDir, stacks, templatesDir, ctx, includeAi, initGit, installDeps } = opts;
  const createdFiles: string[] = [];
  let mergedPkg: Record<string, unknown> | null = null;
  let hasNpmStack = false;

  // Track file origins for conflict warnings
  const allPaths: Map<string, string> = new Map();

  // Render shared templates once (only when AI files are requested)
  if (includeAi) {
    const sharedDir = join(templatesDir, 'shared');
    if (existsSync(sharedDir)) {
      const files = copyTemplates(sharedDir, targetDir, ctx);
      createdFiles.push(...files);
    }
  }

  // Render each stack's templates
  for (const stackId of stacks) {
    const stackDir = join(templatesDir, stackId);
    if (!existsSync(stackDir)) continue;

    const def = getStack(stackId);

    if (!def?.hasCustomLayout) {
      const srcDir = def?.defaultSrcDir ?? 'src';
      const testDir = def?.defaultTestDir ?? 'tests';
      ensureDir(join(targetDir, srcDir));
      ensureDir(join(targetDir, testDir));
    }

    const files = copyTemplates(stackDir, targetDir, ctx);
    const relFiles = files.map(f => relative(targetDir, f).replace(/\\/g, '/'));

    for (const rel of relFiles) {
      if (allPaths.has(rel)) {
        logger.warn(`Conflict: "${rel}" from "${stackId}" overwrites file from "${allPaths.get(rel)}"`);
      } else {
        allPaths.set(rel, stackId);
      }
    }

    createdFiles.push(...files);

    if (def?.needsNpmInstall) {
      hasNpmStack = true;
    }
  }

  // Merge package.json for multi-stack npm projects
  if (stacks.length > 1) {
    for (const stackId of stacks) {
      const pkgHbsPath = join(templatesDir, stackId, 'package.json.hbs');
      if (!existsSync(pkgHbsPath)) continue;
      const raw = readFileSync(pkgHbsPath, 'utf-8');
      const rendered = raw
        .replace(/\{\{projectName\}\}/g, opts.projectName)
        .replace(/\{\{description\}\}/g, ctx.description);
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(rendered); } catch { continue; }
      mergedPkg = mergedPkg ? mergePackageJson(mergedPkg, parsed) : { ...parsed };
      mergedPkg.name = opts.projectName;
    }
    if (mergedPkg) {
      writeFileSync(join(targetDir, 'package.json'), JSON.stringify(mergedPkg, null, 2) + '\n', 'utf-8');
    }
  }

  if (initGit) {
    gitInit(targetDir);
    logger.info('Git repository initialized');
  }

  if (installDeps && hasNpmStack) {
    withSpinner('Installing dependencies...', async () => {
      execSync('npm install', { cwd: targetDir, stdio: 'pipe', timeout: 120_000 });
    }).catch(() => {
      logger.warn('npm install failed. Run it manually later.');
    });
  }

  return createdFiles;
}
