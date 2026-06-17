import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import { initProject } from './init-project.js';
import { logger } from '../../logger.js';

export const initCommand = new Command('init')
  .description('Add AI context files to an existing project (CLAUDE.md, .cursorrules, CI)')
  .option('--stack <type>', 'Force a specific stack (auto-detected by default)')
  .option('--description <text>', 'Project description for AI context')
  .option('--dry-run', 'Preview what would be added without writing files')
  .action(async (options: Record<string, unknown>) => {
    try {
      const targetDir = process.cwd();

      if (!existsSync(targetDir)) {
        logger.error('Current directory does not exist.');
        process.exit(1);
      }

      const files = await initProject({
        targetDir,
        projectName: targetDir.split(/[\\/]/).pop() || 'project',
        description: (options.description as string) || '',
        stack: options.stack as string | undefined,
        dryRun: options.dryRun as boolean | undefined,
      });

      if (files.length === 0 && !options.dryRun) {
        logger.warn('No AI context files were written. All files already exist.');
      } else if (!options.dryRun) {
        logger.success(`Added ${files.length} AI context files`);
        logger.dim('Run `git diff` to review changes before committing.');
      }
    } catch (err) {
      logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });
