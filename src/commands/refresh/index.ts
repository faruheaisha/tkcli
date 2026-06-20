import { Command } from 'commander';
import { join } from 'path';
import { existsSync } from 'fs';
import { updateProject } from '../update/update-project.js';
import { syncProject } from '../sync/sync-project.js';
import { logger } from '../../logger.js';

export const refreshCommand = new Command('refresh')
  .description('Update AI context files and sync project structure (combines update + sync)')
  .option('--context-only', 'Only refresh CLAUDE.md managed region from real project structure (sync only)')
  .option('--templates-only', 'Only re-render template files (update only)')
  .option('--all', 'Re-render all templates including stack-specific (default: shared only)')
  .option('--dry-run', 'Preview changes without writing files')
  .action(async (options: Record<string, unknown>) => {
    try {
      const targetDir = process.cwd();

      if (!existsSync(targetDir)) {
        logger.error('Current directory does not exist.');
        process.exit(1);
      }

      const projectName = targetDir.split(/[\\/]/).pop() || 'project';
      const dryRun = options.dryRun as boolean | undefined;

      // Default: do both update and sync
      const doSync = !options.templatesOnly;
      const doUpdate = !options.contextOnly;

      if (doUpdate) {
        logger.info('Refreshing template files...');
        const result = await updateProject({
          targetDir,
          projectName,
          description: '',
          all: options.all as boolean | undefined,
          dryRun,
        });

        if (!dryRun) {
          const changed = result.updated.length + result.newFiles.length;
          if (changed > 0) {
            logger.success(`${result.updated.length} updated, ${result.newFiles.length} new, ${result.unchanged.length} unchanged`);
          } else {
            logger.info('All template files are up to date.');
          }
        }
      }

      if (doSync) {
        logger.info('Syncing CLAUDE.md with project structure...');
        const result = await syncProject({
          targetDir,
          projectName,
          description: '',
          dryRun,
        });

        if (!dryRun) {
          if (result.status === 'created') {
            logger.success('Created CLAUDE.md with live project structure.');
          } else if (result.status === 'updated') {
            logger.success('Synced CLAUDE.md structure.');
          } else if (result.status === 'unchanged') {
            logger.info('CLAUDE.md is already in sync.');
          } else {
            logger.warn('CLAUDE.md has no tk:managed region — run "tk init" first.');
          }
        }
      }

      if (dryRun) {
        logger.info('[dry-run] No files were written. Run without --dry-run to apply.');
      }
    } catch (err) {
      logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });