import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.log(chalk.red('✖'), msg),
  /** Magical touch for the "wow" moments */
  magic: (msg: string) => console.log(chalk.magenta('✦'), chalk.magenta.bold(msg)),
  headline: (msg: string) => console.log(chalk.cyan.bold('\n' + msg)),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  raw: (msg: string) => console.log(msg),
};

/** Minimal spinner — shows a rotating bar while a promise runs. No extra dependencies. */
export async function withSpinner<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const write = (s: string) => process.stdout.write(`\r${chalk.cyan(s)} ${label}`);
  write(frames[0]);
  const timer = setInterval(() => {
    i = (i + 1) % frames.length;
    write(frames[i]);
  }, 80);
  try {
    const result = await fn();
    clearInterval(timer);
    process.stdout.write(`\r${chalk.green('✔')} ${label}\n`);
    return result;
  } catch (e) {
    clearInterval(timer);
    process.stdout.write(`\r${chalk.red('✖')} ${label}\n`);
    throw e;
  }
}
