import { Command } from 'commander';
import { runDoctor } from './doctor.js';
import { logger } from '../../logger.js';

export const doctorCommand = new Command('doctor')
  .description('Diagnose common issues with tk-managed projects')
  .action(async () => {
    try {
      const targetDir = process.cwd();
      const results = await runDoctor(targetDir);

      logger.headline('tk doctor');
      const icon: Record<string, string> = { ok: '✔', warn: '⚠', fail: '✖' };
      const color: Record<string, 'success' | 'warn' | 'error'> = { ok: 'success', warn: 'warn', fail: 'error' };

      for (const r of results) {
        const fn = logger[color[r.status]] ?? logger.info;
        fn(`${icon[r.status]} ${r.check}: ${r.message}`);
      }

      const fails = results.filter(r => r.status === 'fail').length;
      const warns = results.filter(r => r.status === 'warn').length;
      logger.raw('');
      if (fails === 0 && warns === 0) {
        logger.success('All checks passed.');
      } else {
        logger.info(`${fails} issue${fails !== 1 ? 's' : ''}, ${warns} warning${warns !== 1 ? 's' : ''}. Run "tk update" or "tk init" to fix.`);
      }
    } catch (err) {
      logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });