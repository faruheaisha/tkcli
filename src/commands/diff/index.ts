import { Command } from 'commander';
import { diffProject } from './diff-project.js';
import { logger } from '../../logger.js';

export const diffCommand = new Command('diff')
  .description('Preview what tk update would change in your project')
  .option('--all', 'Compare all templates (default: only safe-to-overwrite files)')
  .action(async (options: Record<string, unknown>) => {
    try {
      const targetDir = process.cwd();
      const projectName = targetDir.split(/[\\/]/).pop() || 'project';

      const entries = await diffProject({
        targetDir,
        projectName,
        description: '',
        all: options.all as boolean | undefined,
      });

      if (entries.length === 0) {
        logger.info('No template files found to compare. Is this a tk-generated project?');
        return;
      }

      const newFiles = entries.filter(e => e.status === 'new');
      const changed = entries.filter(e => e.status === 'changed');
      const unchanged = entries.filter(e => e.status === 'unchanged');

      if (newFiles.length > 0) {
        logger.info('Files that would be created:');
        for (const f of newFiles) logger.dim(`  + ${f.file}`);
      }
      if (changed.length > 0) {
        logger.info('Files that would be updated (user notes preserved):');
        for (const f of changed) logger.dim(`  ~ ${f.file}`);
      }
      if (unchanged.length > 0) {
        logger.info('Files already up to date:');
        for (const f of unchanged) logger.dim(`  = ${f.file}`);
      }

      const total = newFiles.length + changed.length;
      if (total > 0) {
        logger.dim(`\nRun 'tk update' to apply ${total} change${total > 1 ? 's' : ''}.`);
      } else {
        logger.success('All template files are up to date.');
      }
    } catch (err) {
      logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });