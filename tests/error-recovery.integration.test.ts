import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, existsSync } from 'fs';

const mockState = vi.hoisted(() => ({
  count: 0,
  shouldThrowAfter: 3,
}));

vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('fs');
  return {
    ...actual,
    writeFileSync: vi.fn(
      (path: string | URL, data: string | Uint8Array, options?: unknown) => {
        mockState.count++;
        if (mockState.count > mockState.shouldThrowAfter) {
          throw new Error('Simulated disk error during scaffold');
        }
        return actual.writeFileSync(path, data, options);
      },
    ),
  };
});

describe('tk quick - error recovery rollback', () => {
  beforeEach(() => {
    mockState.count = 0;
  });

  it('cleans up target directory when scaffold fails mid-way', async () => {
    const { scaffold } = await import('../src/commands/quick/scaffold.js');
    const dir = mkdtempSync(join(tmpdir(), 'tk-rollback-'));
    const targetDir = join(dir, 'rollback-project');

    await expect(
      scaffold({
        projectName: 'rollback-project',
        description: 'test',
        stack: 'rust',
        targetDir,
        includeAi: false,
        initGit: false,
        installDeps: false,
      }),
    ).rejects.toThrow('Simulated disk error');

    // Target directory should be cleaned up by rollback
    expect(existsSync(targetDir)).toBe(false);
  });
});
