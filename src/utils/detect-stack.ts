import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** package.json dependency → stack id, for fine-grained JS/TS detection. */
const PACKAGE_MAP: Record<string, string> = {
  'react-dom': 'react-spa',
  'vue': 'vue',
  'nuxt': 'nuxt',
  'express': 'express',
  'next': 'nextjs',
  '@remix-run/react': 'express',
};

/**
 * Auto-detect the project stack from config files in `dir`.
 * For JS/TS projects, reads package.json dependencies for a finer match,
 * falling back to 'node-ts'.
 */
export function detectStack(dir: string): string {
  if (existsSync(join(dir, 'Cargo.toml'))) return 'rust';
  if (existsSync(join(dir, 'go.mod'))) return 'go';
  if (existsSync(join(dir, 'pubspec.yaml'))) return 'flutter';
  if (existsSync(join(dir, 'pyproject.toml'))) return 'python';
  if (existsSync(join(dir, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [pkgName, stack] of Object.entries(PACKAGE_MAP)) {
        if (allDeps[pkgName]) return stack;
      }
    } catch {
      // malformed package.json — fall through to default
    }
    return 'node-ts';
  }
  return 'node-ts';
}
