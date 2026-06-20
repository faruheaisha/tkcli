import { STACKS } from './stacks.js';
import { getStack } from './stacks.js';
import { AI_TOOL_DEFS } from './scaffold.js';

export interface PromptAnswers {
  projectName: string;
  description: string;
  stack: string;
  includeAi: boolean;
  initGit: boolean;
  installDeps: boolean;
  aiTools: string[];
}

/** Learned defaults from the local usage profile, applied to the interactive prompts. */
export interface PromptDefaults {
  stack?: string;
  includeAi?: boolean;
  initGit?: boolean;
  installDeps?: boolean;
}

const ALL_AI_TOOLS = Object.keys(AI_TOOL_DEFS);

/**
 * Core 3-step prompt: name, description, stack, AI tools (checkbox, default all).
 * Use --interactive to get the full 6-step prompt instead.
 */
export async function runPrompt(defaults: PromptDefaults = {}, fullPrompt = false): Promise<PromptAnswers> {
  const { default: inquirer } = await import('inquirer');

  type CoreAnswers = { projectName: string; description: string; stack: string };
  const core = await inquirer.prompt<CoreAnswers>([
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
  ]);

  // AI tool selection — checkbox with all selected by default
  const { aiTools } = await inquirer.prompt<{ aiTools: string[] }>([
    {
      type: 'checkbox',
      name: 'aiTools',
      message: 'Which AI tools do you use? (uncheck ones you don\'t need)',
      choices: ALL_AI_TOOLS.map((id) => ({
        name: `${AI_TOOL_DEFS[id].label}`,
        value: id,
        checked: true,
      })),
      validate: (input: string[]) => input.length > 0 || 'Select at least one AI tool',
    },
  ]);

  if (fullPrompt) {
    const extra = await inquirer.prompt<Pick<PromptAnswers, 'includeAi' | 'initGit' | 'installDeps'>>([
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
        default: defaults.installDeps ?? (getStack(core.stack)?.needsNpmInstall ?? false),
      },
    ]);

    return { ...core, ...extra, aiTools };
  }

  // Smart defaults — skip the questions 99% of users answer Yes to
  const def = getStack(core.stack);
  return {
    ...core,
    includeAi: defaults.includeAi ?? true,
    initGit: defaults.initGit ?? true,
    installDeps: defaults.installDeps ?? (def?.needsNpmInstall ?? false),
    aiTools,
  };
}