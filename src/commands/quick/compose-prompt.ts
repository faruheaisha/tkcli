import { STACKS } from './stacks.js';

export async function composePrompt(): Promise<string[] | undefined> {
  const { default: inquirer } = await import('inquirer');
  const { useComponents } = await inquirer.prompt<{ useComponents: boolean }>([
    {
      type: 'confirm',
      name: 'useComponents',
      message: 'Add additional component stacks? (compose multiple frameworks)',
      default: false,
    },
  ]);

  if (!useComponents) return undefined;

  const { components } = await inquirer.prompt<{ components: string[] }>([
    {
      type: 'checkbox',
      name: 'components',
      message: 'Select additional components (the primary stack is set separately):',
      choices: STACKS.map((s) => ({
        name: `${s.label} — ${s.description}`,
        value: s.id,
      })),
      validate: (input: string[]) => input.length > 0 || 'Select at least one component',
    },
  ]);

  return components;
}
