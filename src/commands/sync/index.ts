import { Command } from 'commander';
import { existsSync } from 'fs';
import { syncProject } from './sync-project.js';
import { logger } from '../../logger.js';

export const syncCommand = new Command('sync')
  .description('Refresh CLAUDE.md to match the project\'s real structure (preserves your Project Notes)')
  .option('--stack <type>', 'Force a specific stack (auto-detected by default)')
  .option('--description <text>', 'Project description for AI context')
  .option('--dry-run', 'Preview what would change without writing files')
  .addHelpText('after', `
What it does:
  Scans the current project's actual files and rewrites the
  <!-- tk:managed --> block in CLAUDE.md (stack, commands, structure).
  Your "## Project Notes" (the tk:user region) are never touched.

Examples:
  tk sync                 # detect stack, refresh CLAUDE.md structure
  tk sync --dry-run       # preview the change
  tk sync --stack go      # force a stack
`)
  .action(async (options: Record<string, unknown>) => {
    try {
      const targetDir = process.cwd();

      if (!existsSync(targetDir)) {
        logger.error('Current directory does not exist.');
        process.exit(1);
      }

      await syncProject({
        targetDir,
        projectName: targetDir.split(/[\\/]/).pop() || 'project',
        description: (options.description as string) || '',
        stack: options.stack as string | undefined,
        dryRun: options.dryRun as boolean | undefined,
      });
    } catch (err) {
      logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });
