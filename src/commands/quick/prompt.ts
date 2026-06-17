import { STACKS } from './stacks.js';
import { getStack } from './stacks.js';

export interface PromptAnswers {
  projectName: string;
  description: string;
  stack: string;
  includeAi: boolean;
  initGit: boolean;
  installDeps: boolean;
}

/** Learned defaults from the local usage profile, applied to the interactive prompts. */
export interface PromptDefaults {
  stack?: string;
  includeAi?: boolean;
  initGit?: boolean;
  installDeps?: boolean;
}

export async function runPrompt(defaults: PromptDefaults = {}): Promise<PromptAnswers> {
  const { default: inquirer } = await import('inquirer');
  const answers = await inquirer.prompt<PromptAnswers>([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: 'my-project',
      validate: (input: string) => {
        if (input.trim().length === 0) return 'Project name is required';
        if (!/^[a-zA-Z0-9._-]+$/.test(input)) return 'Use only letters, numbers, dots, hyphens, and underscores';
        return true;
      },
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      default: 'A cool project',
      validate: (input: string) => input.length <= 200 || 'Description must be 200 characters or fewer',
    },
    {
      type: 'list',
      name: 'stack',
      message: 'Select stack:',
      default: defaults.stack,
      choices: STACKS.map((s) => ({
        name: `${s.label} - ${s.description}`,
        value: s.id,
      })),
    },
    {
      type: 'confirm',
      name: 'includeAi',
      message: 'Add AI context files (CLAUDE.md, .editorconfig, CI)?',
      default: defaults.includeAi ?? true,
    },
    {
      type: 'confirm',
      name: 'initGit',
      message: 'Initialize Git repository?',
      default: defaults.initGit ?? true,
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: 'Install dependencies now?',
      default: (answers: PromptAnswers) => defaults.installDeps ?? (getStack(answers.stack)?.needsNpmInstall ?? false),
    },
  ]);

  return answers;
}
