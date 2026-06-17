import { describe, it, expect } from 'vitest';

describe('mergePackageJson', () => {
  it('overlay deps override base on conflict', async () => {
    const { mergePackageJson } = await import('../src/commands/quick/composer.js');

    const base = { dependencies: { express: '^5.0.0' }, devDependencies: { vitest: '^3.1.0' } };
    const overlay = { dependencies: { express: '^4.18.0' }, devDependencies: { vitest: '^3.0.0' } };
    const result = mergePackageJson(base, overlay);

    expect(result.dependencies).toHaveProperty('express', '^4.18.0'); // overlay wins
    expect(result.devDependencies).toHaveProperty('vitest', '^3.0.0');
  });

  it('merges non-conflicting deps', async () => {
    const { mergePackageJson } = await import('../src/commands/quick/composer.js');

    const base = { dependencies: { react: '^19.0.0' } };
    const overlay = { dependencies: { vue: '^3.5.0' } };
    const result = mergePackageJson(base, overlay);

    expect(result.dependencies).toHaveProperty('react', '^19.0.0');
    expect(result.dependencies).toHaveProperty('vue', '^3.5.0');
  });

  it('merges scripts', async () => {
    const { mergePackageJson } = await import('../src/commands/quick/composer.js');

    const base = { scripts: { dev: 'tsx watch src' } };
    const overlay = { scripts: { build: 'tsc' } };
    const result = mergePackageJson(base, overlay);

    expect(result.scripts).toHaveProperty('dev', 'tsx watch src');
    expect(result.scripts).toHaveProperty('build', 'tsc');
  });
});
