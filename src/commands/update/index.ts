import { Command } from 'commander';
import { join } from 'path';
import { existsSync } from 'fs';
import { updateProject, type UpdateResult } from './update-project.js';
import { logger } from '../../logger.js';

export const updateCommand = new Command('update')
  .description('Re-render AI context files in an existing project')
  .option('--all', 'Re-render all templates (including stack-specific, default: shared only)')
  .option('--dry-run', 'Preview what would be updated without writing files')
  .action(async (options: Record<string, unknown>) => {
    try {
      const targetDir = process.cwd();

      if (!existsSync(targetDir)) {
        logger.error('Current directory does not exist.');
        process.exit(1);
      }

      const result = await updateProject({
        targetDir,
        projectName: targetDir.split(/[\\/]/).pop() || 'project',
        description: '',
        all: options.all as boolean | undefined,
        dryRun: options.dryRun as boolean | undefined,
      });

      if (!options.dryRun) {
        const changed = result.updated.length + result.newFiles.length;
        if (changed > 0) {
          logger.dim('Run `git diff` to review changes before committing.');
        } else {
          logger.info('All template files are up to date.');
        }
      }
    } catch (err) {
      logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });
