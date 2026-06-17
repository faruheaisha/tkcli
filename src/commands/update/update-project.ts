import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import Handlebars from 'handlebars';
import { ensureDir } from '../../utils/fs.js';
import { findTemplatesDir, buildContext } from '../quick/scaffold.js';
import { mergePreservingUser } from '../../utils/regions.js';
import { detectStack } from '../../utils/detect-stack.js';
import { logger } from '../../logger.js';

export interface UpdateOptions {
  targetDir: string;
  projectName: string;
  description: string;
  all?: boolean;
  dryRun?: boolean;
}

const SAFE_TO_OVERWRITE = [
  'CLAUDE.md', '.cursorrules', '.windsurfrules',
  '.github/copilot-instructions.md', '.editorconfig',
  '.gitignore', '.env.example', '.gitleaks.toml',
  'docker-compose.yml', 'Dockerfile',
  '.github/workflows/ci.yml',
  '.claude/settings.json',
];

export interface UpdateResult {
  updated: string[];
  unchanged: string[];
  newFiles: string[];
}

export async function updateProject(opts: UpdateOptions): Promise<UpdateResult> {
  const { targetDir, projectName, description, all, dryRun } = opts;

  if (!existsSync(targetDir)) {
    throw new Error(`Directory "${targetDir}" does not exist.`);
  }

  const templatesDir = findTemplatesDir();
  const sharedDir = join(templatesDir, 'shared');
  if (!existsSync(sharedDir)) {
    throw new Error('Shared templates directory not found.');
  }

  const stack = detectStack(targetDir);

  const ctx = buildContext({
    projectName,
    description,
    stack,
    targetDir,
    includeAi: true,
    initGit: false,
    installDeps: false,
  });

  const result: UpdateResult = { updated: [], unchanged: [], newFiles: [] };

  if (dryRun) {
    logger.info(`[dry-run] Would update shared templates in ${targetDir}`);
    const entries = readdirSync(sharedDir);
    for (const entry of entries) {
      if (entry.startsWith('_') && !entry.startsWith('__')) continue; // skip _partials, keep __dunder__ files
      const destName = entry.endsWith('.hbs') ? entry.slice(0, -4) : entry;
      const isSafe = SAFE_TO_OVERWRITE.some(p => destName === p || destName.endsWith(p));
      if (!isSafe) continue;
      const destPath = join(targetDir, destName);
      if (existsSync(destPath)) logger.dim(`  [update] ${destName}`);
      else logger.dim(`  [new]    ${destName}`);
    }
    return result;
  }

  function walkDir(dir: string, baseSrcDir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('_') && !entry.startsWith('__')) continue; // skip _partials, keep __dunder__ files
      const srcPath = join(dir, entry);
      const s = statSync(srcPath);

      if (s.isDirectory()) {
        walkDir(srcPath, baseSrcDir);
      } else if (s.isFile()) {
        const destName = entry.endsWith('.hbs') ? entry.slice(0, -4) : entry;
        const relative = join(dir.substring(baseSrcDir.length + 1), destName);
        const isSafe = SAFE_TO_OVERWRITE.some(p => relative === p || relative.endsWith(p));
        if (!isSafe) continue;

        const destPath = join(targetDir, relative);
        const content = readFileSync(srcPath, 'utf-8');
        const rendered = entry.endsWith('.hbs')
          ? Handlebars.compile(content)(ctx)
          : content;

        ensureDir(join(targetDir, relative.includes('/') ? relative.split('/').slice(0, -1).join('/') : '.'));

        if (existsSync(destPath)) {
          const existing = readFileSync(destPath, 'utf-8');
          // Preserve the user's protected region (e.g. CLAUDE.md "Project Notes").
          const final = mergePreservingUser(rendered, existing);
          if (existing === final) {
            result.unchanged.push(destPath);
            continue;
          }
          writeFileSync(destPath, final, 'utf-8');
          result.updated.push(destPath);
        } else {
          writeFileSync(destPath, rendered, 'utf-8');
          result.newFiles.push(destPath);
        }
      }
    }
  }

  walkDir(sharedDir, sharedDir);

  // Also walk per-stack templates (CLAUDE.md, CI config, etc.)
  const stackDir = join(templatesDir, stack);
  if (existsSync(stackDir)) {
    walkDir(stackDir, stackDir);
  }

  const total = result.updated.length + result.unchanged.length + result.newFiles.length;
  const changedParts: string[] = [];
  if (result.updated.length) changedParts.push(`${result.updated.length} updated`);
  if (result.newFiles.length) changedParts.push(`${result.newFiles.length} new`);
  if (result.unchanged.length) changedParts.push(`${result.unchanged.length} unchanged`);

  logger.success(`${total} template files (${changedParts.join(', ')})`);
  return result;
}
