import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { quickCommand } from './commands/quick/index.js';
import { initCommand } from './commands/init/index.js';
import { addCommand } from './commands/add/index.js';
import { updateCommand } from './commands/update/index.js';
import { syncCommand } from './commands/sync/index.js';
import { listCommand } from './commands/list/index.js';
import { infoCommand } from './commands/info/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  const pkgPath = join(__dirname, '..', 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

export function createCLI(): Command {
  const program = new Command();

  program
    .name('tk')
    .description('AI developer toolkit - scaffold, build, and monetize your side projects')
    .version(getVersion(), '-v, --version', 'Show tk version');

  program.addCommand(quickCommand);
  program.addCommand(initCommand);
  program.addCommand(addCommand);
  program.addCommand(updateCommand);
  program.addCommand(syncCommand);
  program.addCommand(listCommand);
  program.addCommand(infoCommand);

  return program;
}
