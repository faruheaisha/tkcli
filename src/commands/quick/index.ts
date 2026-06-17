import { Command } from 'commander';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { scaffold, INFRA_MODULES } from './scaffold.js';
import { runPrompt } from './prompt.js';
import { composePrompt } from './compose-prompt.js';
import { logger } from '../../logger.js';
import { getDevCommand } from './dev-command.js';

export const quickCommand = new Command('quick')
  .description('Scaffold an AI-ready project in seconds')
  .argument('[project-name]', 'Name of the project')
  .option('--stack <type>', 'Project stack')
  .option('--components <list>', 'Additional component stacks (comma-separated, e.g. "express,react-spa")')
  .option('--addons <list>', 'Infra addons to include (comma-separated: docker,ci,security)')
  .option('--description <text>', 'Project description')
  .option('--no-ai', 'Skip AI context files (CLAUDE.md, .editorconfig)')
  .option('--no-git', 'Skip git initialization')
  .option('--no-install', 'Skip npm/pip install')
  .option('--force', 'Overwrite existing directory')
  .option('--dry-run', 'Preview what would be created without writing files')
  .option('-y, --yes', 'Skip interactive prompts, use defaults')
  .addHelpText('after', `
Infra addons (--addons):
  docker     Add Dockerfile + docker-compose.yml
  ci         Add GitHub Actions CI workflow
  security   Add gitleaks + pre-commit hooks

Example:
  tk quick my-api --stack express                          # Minimal project
  tk quick my-api --stack express --addons docker,ci       # With infra
`)
  .action(async (projectName: string | undefined, options: Record<string, unknown>) => {
    try {
      const compStr = options.components as string | undefined;
      const components = compStr
        ? compStr.split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined;

      const addonsStr = options.addons as string | undefined;
      const addons = addonsStr
        ? addonsStr.split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined;

      let opts: {
        projectName: string;
        description: string;
        stack: string;
        includeAi: boolean;
        initGit: boolean;
        installDeps: boolean;
        components: string[] | undefined;
        addons: string[] | undefined;
      };

      if (projectName) {
        opts = {
          projectName,
          description: (options.description as string) || '',
          stack: (options.stack as string) || 'node-ts',
          includeAi: options.ai !== false,
          initGit: options.git !== false,
          installDeps: options.install !== false,
          components,
          addons,
        };
      } else if (options.yes) {
        const inferredName = process.cwd().split(/[\\/]/).pop() || 'my-project';
        opts = {
          projectName: inferredName,
          description: (options.description as string) || '',
          stack: (options.stack as string) || 'node-ts',
          includeAi: options.ai !== false,
          initGit: options.git !== false,
          installDeps: options.install !== false,
          components,
          addons,
        };
      } else {
        let answersComponents = components;
        if (!answersComponents) {
          answersComponents = await composePrompt();
        }

        const answers = await runPrompt();

        opts = {
          projectName: answers.projectName,
          description: options.description
            ? (options.description as string)
            : answers.description,
          stack: (options.stack as string) || answers.stack,
          includeAi: options.ai !== undefined ? options.ai !== false : answers.includeAi,
          initGit: options.git !== undefined ? options.git !== false : answers.initGit,
          installDeps: options.install !== undefined ? options.install !== false : answers.installDeps,
          components: answersComponents,
          addons,
        };
      }

      const targetDir = join(process.cwd(), opts.projectName);

      if (!options.dryRun && existsSync(targetDir) && readdirSync(targetDir).length > 0) {
        if (!options.force) {
          logger.error(`Directory "${opts.projectName}" already exists and is not empty. Use --force to overwrite.`);
          process.exit(1);
        }
        logger.warn('Directory exists. Overwriting with --force...');
      }

      await scaffold({
        projectName: opts.projectName,
        description: opts.description,
        stack: opts.stack,
        targetDir,
        includeAi: opts.includeAi,
        initGit: opts.initGit,
        installDeps: opts.installDeps,
        dryRun: options.dryRun as boolean | undefined,
        components: opts.components,
        addons: opts.addons,
      });
    } catch (err) {
      logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });
