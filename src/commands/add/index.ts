import { Command } from 'commander';
import { join } from 'path';
import { existsSync } from 'fs';
import { addModule } from './add-module.js';
import { logger } from '../../logger.js';
import { INFRA_MODULES } from '../quick/scaffold.js';

const infraHelp = INFRA_MODULES.map(m => `  ${m.id.padEnd(12)} ${m.description}`).join('\n');

export const addCommand = new Command('add')
  .description('Add a component or infra module to an existing project')
  .argument('<module>', 'Module to add (component stack or infra module)')
  .option('--dry-run', 'Preview what would be added without writing files')
  .addHelpText('after', `
Infra modules:
${infraHelp}

Component stacks: cli-ts, express, express-prisma, fastapi, flutter, go, nextjs, node-ts, nuxt, python, react-spa, rust, vue

Examples:
  tk add express              # Add Express to a node-ts project
  tk add docker               # Add Dockerfile + docker-compose
  tk add ci                   # Add GitHub Actions CI
  tk add security             # Add gitleaks + pre-commit
`)
  .action(async (module: string, options: Record<string, unknown>) => {
    try {
      const targetDir = process.cwd();

      if (!existsSync(join(targetDir, 'package.json')) &&
          !existsSync(join(targetDir, 'Cargo.toml')) &&
          !existsSync(join(targetDir, 'go.mod')) &&
          !existsSync(join(targetDir, 'pubspec.yaml')) &&
          !existsSync(join(targetDir, 'pyproject.toml'))) {
        logger.warn('No recognized project config found in current directory.');
        logger.info('Continuing anyway — template files will still be added.');
      }

      const files = await addModule({
        module,
        targetDir,
        projectName: targetDir.split(/[\\/]/).pop() || 'project',
        description: '',
        dryRun: options.dryRun as boolean | undefined,
      });

      if (!options.dryRun) {
        logger.success(`Module "${module}" added (${files.length} files)`);
      }
    } catch (err) {
      logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });
