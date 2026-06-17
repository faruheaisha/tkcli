import { Command } from 'commander';
import { loadConfig, getConfigPath } from '../../config.js';
import { logger } from '../../logger.js';

export const infoCommand = new Command('info')
  .description('Show system and version information')
  .action(() => {
    const config = loadConfig();

    logger.raw(`\n  tk - System Information\n`);
    logger.raw(`  Version:     ${'0.1.0'}`);
    logger.raw(`  Node.js:     ${process.version}`);
    logger.raw(`  Platform:    ${process.platform} (${process.arch})`);
    logger.raw(`  Config:      ${getConfigPath()}`);
    logger.raw(`  Config data: ${JSON.stringify(config, null, 4)}\n`);
  });
