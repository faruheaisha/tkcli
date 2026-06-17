import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import Handlebars from 'handlebars';
import { ensureDir } from '../../utils/fs.js';
import { findTemplatesDir, buildContext } from '../quick/scaffold.js';
import { getDevCommand } from '../quick/dev-command.js';
import { detectStack } from '../../utils/detect-stack.js';
import { logger } from '../../logger.js';

export interface InitOptions {
  targetDir: string;
  projectName: string;
  description: string;
  stack?: string;
  dryRun?: boolean;
}

export async function initProject(opts: InitOptions): Promise<string[]> {
  const { targetDir, projectName, description, dryRun } = opts;
  const stack = opts.stack || detectStack(targetDir);

  const templatesDir = findTemplatesDir();
  const sharedDir = join(templatesDir, 'shared');
  if (!existsSync(sharedDir)) {
    throw new Error('Shared templates directory not found.');
  }

  const ctx = buildContext({
    projectName,
    description,
    stack,
    targetDir,
    includeAi: true,
    initGit: false,
    installDeps: false,
  });

  const createdFiles: string[] = [];

  if (dryRun) {
    logger.info(`[dry-run] Would add AI context files to ${targetDir}`);
    logger.info(`[dry-run] Detected stack: ${stack}`);
    const entries = readdirSync(sharedDir);
    for (const entry of entries) {
      if (entry.startsWith('_') && !entry.startsWith('__')) continue; // skip _partials, keep __dunder__ files
      const destName = entry.endsWith('.hbs') ? entry.slice(0, -4) : entry;
      const destPath = join(targetDir, destName);
      if (existsSync(destPath)) {
        logger.dim(`  [exists] ${destName}`);
      } else {
        logger.dim(`  [new]    ${destName}`);
      }
    }
    const devHint = getDevCommand(stack);
    if (devHint) logger.info(`[dry-run] Stack dev command: ${devHint}`);
    return [];
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
        let relative = join(dir.substring(baseSrcDir.length + 1), destName);
        relative = relative.replace(/\\/g, '/');

        const destPath = join(targetDir, relative);
        if (existsSync(destPath)) continue; // don't overwrite existing files

        const content = readFileSync(srcPath, 'utf-8');
        const final = entry.endsWith('.hbs')
          ? Handlebars.compile(content)(ctx)
          : content;

        ensureDir(join(targetDir, relative.includes('/') ? relative.split('/').slice(0, -1).join('/') : '.'));
        writeFileSync(destPath, final, 'utf-8');
        createdFiles.push(destPath);
      }
    }
  }

  // Walk per-stack templates first
  const stackDir = join(templatesDir, stack);
  if (existsSync(stackDir)) {
    walkDir(stackDir, stackDir);
  }

  // Walk shared templates second (skips files already written by stack or on disk)
  walkDir(sharedDir, sharedDir);

  if (createdFiles.length > 0) {
    logger.info(`AI context files added for stack: ${stack}`);
  }

  return createdFiles;
}
