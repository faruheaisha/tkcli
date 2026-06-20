import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import Handlebars from 'handlebars';
import { findTemplatesDir, buildContext } from '../quick/scaffold.js';
import { detectStack } from '../../utils/detect-stack.js';
import { logger } from '../../logger.js';

const SAFE_TO_OVERWRITE = [
  'CLAUDE.md', '.cursorrules', '.windsurfrules',
  '.github/copilot-instructions.md', '.editorconfig',
  '.gitignore', '.env.example', '.gitleaks.toml',
  'docker-compose.yml', 'Dockerfile',
  '.github/workflows/ci.yml',
  '.claude/settings.json',
];

export interface DiffOptions {
  targetDir: string;
  projectName: string;
  description: string;
  all?: boolean;
}

export interface DiffEntry {
  file: string;
  status: 'new' | 'changed' | 'unchanged';
}

/**
 * Compare on-disk files with fresh template renders, showing what `tk update` would change.
 */
export async function diffProject(opts: DiffOptions): Promise<DiffEntry[]> {
  const { targetDir, projectName, description, all } = opts;

  if (!existsSync(targetDir)) {
    throw new Error(`Directory "${targetDir}" does not exist. Run 'tk quick' first.`);
  }

  const templatesDir = findTemplatesDir();
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

  const results: DiffEntry[] = [];

  function walkDir(dir: string, baseSrcDir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('_') && !entry.startsWith('__')) continue;
      const srcPath = join(dir, entry);
      const s = statSync(srcPath);

      if (s.isDirectory()) {
        walkDir(srcPath, baseSrcDir);
      } else if (s.isFile()) {
        const destName = entry.endsWith('.hbs') ? entry.slice(0, -4) : entry;
        const relative = join(dir.substring(baseSrcDir.length + 1), destName).replace(/\\/g, '/');
        const isSafe = all
          ? true
          : SAFE_TO_OVERWRITE.some(p => relative === p || relative.endsWith(p));
        if (!isSafe) continue;

        const destPath = join(targetDir, relative.includes('/') ? relative : relative);

        const content = readFileSync(srcPath, 'utf-8');
        const rendered = entry.endsWith('.hbs')
          ? Handlebars.compile(content)(ctx)
          : content;

        if (!existsSync(destPath)) {
          results.push({ file: relative, status: 'new' });
        } else {
          const existing = readFileSync(destPath, 'utf-8');
          if (existing !== rendered) {
            results.push({ file: relative, status: 'changed' });
          } else {
            results.push({ file: relative, status: 'unchanged' });
          }
        }
      }
    }
  }

  // Walk shared templates
  const sharedDir = join(templatesDir, 'shared');
  if (existsSync(sharedDir)) {
    walkDir(sharedDir, sharedDir);
  }

  // Walk per-stack templates
  const stackDir = join(templatesDir, stack);
  if (existsSync(stackDir)) {
    walkDir(stackDir, stackDir);
  }

  return results;
}