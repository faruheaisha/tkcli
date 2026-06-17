export interface StackDefinition {
  id: string;
  label: string;
  description: string;
  templateDir: string;
  defaultSrcDir: string;
  defaultTestDir: string;
  /** Whether this stack needs npm install after scaffold */
  needsNpmInstall: boolean;
  /** Whether to skip the generic src/tests/docs dirs (stack provides its own layout) */
  hasCustomLayout: boolean;
}

export const STACKS: StackDefinition[] = [
  {
    id: 'node-ts',
    label: 'Node.js + TypeScript',
    description: 'Modern Node.js with TypeScript, Vitest',
    templateDir: 'node-ts',
    defaultSrcDir: 'src',
    defaultTestDir: 'tests',
    needsNpmInstall: true,
    hasCustomLayout: false,
  },
  {
    id: 'react-spa',
    label: 'React SPA',
    description: 'React 19 + Vite + TanStack Query + React Router',
    templateDir: 'react-spa',
    defaultSrcDir: 'src',
    defaultTestDir: 'tests',
    needsNpmInstall: true,
    hasCustomLayout: false,
  },
  {
    id: 'vue',
    label: 'Vue 3',
    description: 'Vue 3 + Vite + Pinia + Vue Router',
    templateDir: 'vue',
    defaultSrcDir: 'src',
    defaultTestDir: 'tests',
    needsNpmInstall: true,
    hasCustomLayout: false,
  },
  {
    id: 'nuxt',
    label: 'Nuxt 4',
    description: 'Nuxt 4 + Vue 3 + Pinia + file-based routing',
    templateDir: 'nuxt',
    defaultSrcDir: 'app',
    defaultTestDir: 'tests',
    needsNpmInstall: true,
    hasCustomLayout: false,
  },
  {
    id: 'express',
    label: 'Express API',
    description: 'Express 5 + TypeScript + Prisma + Zod validation',
    templateDir: 'express',
    defaultSrcDir: 'src',
    defaultTestDir: 'tests',
    needsNpmInstall: true,
    hasCustomLayout: false,
  },
  {
    id: 'fastapi',
    label: 'FastAPI',
    description: 'FastAPI + Pydantic + SQLAlchemy + async PostgreSQL',
    templateDir: 'fastapi',
    defaultSrcDir: 'src',
    defaultTestDir: 'tests',
    needsNpmInstall: false,
    hasCustomLayout: false,
  },
  {
    id: 'nextjs',
    label: 'Next.js',
    description: 'Next.js 15 with App Router, TypeScript',
    templateDir: 'nextjs',
    defaultSrcDir: 'app',
    defaultTestDir: 'tests',
    needsNpmInstall: true,
    hasCustomLayout: false,
  },
  {
    id: 'rust',
    label: 'Rust',
    description: 'Rust + Cargo + clap + tokio + thiserror',
    templateDir: 'rust',
    defaultSrcDir: 'src',
    defaultTestDir: 'tests',
    needsNpmInstall: false,
    hasCustomLayout: true, // Rust uses Cargo.toml, custom src layout
  },
  {
    id: 'go',
    label: 'Go',
    description: 'Go 1.23 + Gin + pgx + cobra CLI',
    templateDir: 'go',
    defaultSrcDir: 'cmd',
    defaultTestDir: 'internal',
    needsNpmInstall: false,
    hasCustomLayout: true, // Go uses cmd/ layout
  },
  {
    id: 'flutter',
    label: 'Flutter',
    description: 'Flutter + Dart + Riverpod + GoRouter',
    templateDir: 'flutter',
    defaultSrcDir: 'lib',
    defaultTestDir: 'test',
    needsNpmInstall: false,
    hasCustomLayout: true,
  },
  {
    id: 'cli-ts',
    label: 'CLI (TypeScript)',
    description: 'Node.js CLI with Commander + chalk + Vitest',
    templateDir: 'cli-ts',
    defaultSrcDir: 'src',
    defaultTestDir: 'tests',
    needsNpmInstall: true,
    hasCustomLayout: false,
  },
  {
    id: 'mcp-server',
    label: 'MCP Server',
    description: 'Model Context Protocol server (TypeScript SDK, stdio)',
    templateDir: 'mcp-server',
    defaultSrcDir: 'src',
    defaultTestDir: 'tests',
    needsNpmInstall: true,
    hasCustomLayout: false,
  },
  {
    id: 'python',
    label: 'Python',
    description: 'Python project with pyproject.toml, pytest',
    templateDir: 'python',
    defaultSrcDir: 'src',
    defaultTestDir: 'tests',
    needsNpmInstall: false,
    hasCustomLayout: false,
  },
];

const COMPONENT_ONLY_STACKS = new Set(['express-prisma']);

/** Every stack id that can qualify a template filename (primary + component-only). */
export const ALL_STACK_IDS = new Set<string>([...STACKS.map((s) => s.id), ...COMPONENT_ONLY_STACKS]);

/** Stacks that can be selected as primary (not component-only) */
export function getPrimaryStacks(): StackDefinition[] {
  return STACKS.filter(s => !COMPONENT_ONLY_STACKS.has(s.id));
}

export function getStack(id: string): StackDefinition | undefined {
  return STACKS.find((s) => s.id === id);
}
