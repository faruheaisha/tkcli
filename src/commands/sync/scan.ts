import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getDevCommand, getTestCommand } from '../quick/dev-command.js';

/** Directories and files that never belong in a project-structure overview. */
const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'target',
  '.next', '.nuxt', '.output', '.svelte-kit', 'coverage', '.turbo',
  '.venv', 'venv', '__pycache__', '.dart_tool', '.idea', '.vscode',
  '.cache', '.pytest_cache', '.mypy_cache', '.ruff_cache',
]);

const IGNORED_FILES = new Set([
  '.DS_Store', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
  'Cargo.lock', 'poetry.lock', 'uv.lock',
]);

export interface ScanOptions {
  /** Max directory depth to descend (root entries are depth 0). */
  maxDepth?: number;
  /** Hard cap on rendered lines, to keep the tree readable. */
  maxEntries?: number;
}

interface Node {
  name: string;
  isDir: boolean;
  children: Node[];
}

function buildNode(dir: string, depth: number, maxDepth: number): Node[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  const nodes: Node[] = [];
  for (const name of entries) {
    if (IGNORED_DIRS.has(name) || IGNORED_FILES.has(name)) continue;
    const full = join(dir, name);
    let isDir: boolean;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    const children = isDir && depth < maxDepth ? buildNode(full, depth + 1, maxDepth) : [];
    nodes.push({ name, isDir, children });
  }

  // Directories first, then files; alphabetical within each group.
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return nodes;
}

/**
 * Render an ASCII tree of the project's real structure, skipping build artifacts
 * and lockfiles. Returns the tree body (no surrounding code fence).
 */
export function scanStructure(rootDir: string, opts: ScanOptions = {}): string {
  const maxDepth = opts.maxDepth ?? 4;
  const maxEntries = opts.maxEntries ?? 120;
  const roots = buildNode(rootDir, 0, maxDepth);

  const lines: string[] = [];
  let truncated = false;

  function render(nodes: Node[], prefix: string) {
    nodes.forEach((node, i) => {
      if (lines.length >= maxEntries) {
        truncated = true;
        return;
      }
      const isLast = i === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${connector}${node.name}${node.isDir ? '/' : ''}`);
      if (node.children.length > 0) {
        render(node.children, prefix + (isLast ? '    ' : '│   '));
      }
    });
  }

  render(roots, '');
  if (truncated) lines.push('… (truncated)');
  return lines.join('\n');
}

export interface CommandEntry {
  invoke: string;
  detail: string;
}

/**
 * Discover the project's real commands. For npm stacks, reads package.json scripts
 * (the source of truth — users add their own). Otherwise falls back to the stack's
 * conventional dev/test commands.
 */
export function scanCommands(rootDir: string, stack: string): CommandEntry[] {
  const pkgPath = join(rootDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts as Record<string, string> | undefined;
      if (scripts && Object.keys(scripts).length > 0) {
        return Object.entries(scripts)
          .slice(0, 12)
          .map(([name, body]) => ({
            invoke: `npm run ${name}`,
            detail: String(body).length > 60 ? String(body).slice(0, 57) + '…' : String(body),
          }));
      }
    } catch {
      // malformed package.json — fall through to conventional commands
    }
  }

  const entries: CommandEntry[] = [];
  const dev = getDevCommand(stack);
  const test = getTestCommand(stack);
  if (dev) entries.push({ invoke: dev, detail: 'run locally' });
  if (test) entries.push({ invoke: test, detail: 'run tests' });
  return entries;
}
