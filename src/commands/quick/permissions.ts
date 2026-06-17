/**
 * Per-stack Claude Code permission rules. A node project should not ship cargo/flutter
 * permissions, and a Rust project should not ship npm — each stack gets only the
 * toolchain it actually uses, plus a shared base (file tools + safe git).
 */

const BASE: string[] = [
  'Read', 'Edit', 'Write', 'Glob', 'Grep',
  'Bash(git status)', 'Bash(git diff:*)', 'Bash(git log:*)',
  'Bash(git add:*)', 'Bash(git commit:*)',
];

const NPM: string[] = ['Bash(npm:*)', 'Bash(npx:*)', 'Bash(pnpm:*)', 'Bash(yarn:*)', 'Bash(node:*)'];
const PY: string[] = ['Bash(python:*)', 'Bash(pip:*)', 'Bash(uv:*)', 'Bash(pytest:*)', 'Bash(ruff:*)', 'Bash(mypy:*)'];

const STACK_PERMISSIONS: Record<string, string[]> = {
  'node-ts': NPM,
  'cli-ts': NPM,
  'mcp-server': NPM,
  'react-spa': NPM,
  'vue': NPM,
  'nuxt': NPM,
  'express': NPM,
  'express-prisma': [...NPM, 'Bash(prisma:*)'],
  'nextjs': NPM,
  'rust': ['Bash(cargo:*)'],
  'go': ['Bash(go:*)', 'Bash(gofmt:*)'],
  'flutter': ['Bash(flutter:*)', 'Bash(dart:*)'],
  'python': PY,
  'fastapi': [...PY, 'Bash(uvicorn:*)', 'Bash(alembic:*)'],
};

/**
 * Build the deduped allow-list for a primary stack plus any composed components.
 * Order is stable: base first, then toolchain rules in stack order.
 */
export function getClaudePermissions(stack: string, components: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (rule: string) => {
    if (!seen.has(rule)) { seen.add(rule); out.push(rule); }
  };

  for (const rule of BASE) push(rule);
  for (const id of [stack, ...components]) {
    for (const rule of STACK_PERMISSIONS[id] ?? []) push(rule);
  }
  return out;
}
