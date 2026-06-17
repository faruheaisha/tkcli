/** Stack-specific dev command hints */
export function getDevCommand(stack: string): string | null {
  const dev: Record<string, string> = {
    'node-ts': 'npm run dev',
    'react-spa': 'npm run dev',
    'vue': 'npm run dev',
    'nuxt': 'npm run dev',
    'express': 'npm run dev',
    'nextjs': 'npm run dev',
    'cli-ts': 'npm run dev -- hello',
    'fastapi': 'uvicorn src.main:app --reload',
    'rust': 'cargo run',
    'go': 'go run ./cmd/server',
    'flutter': 'flutter run',
    'python': 'python src/main.py',
  };
  return dev[stack] ?? null;
}

/** Stack-specific test command hints */
export function getTestCommand(stack: string): string | null {
  const test: Record<string, string> = {
    'node-ts': 'npm test',
    'react-spa': 'npm test',
    'vue': 'npm test',
    'nuxt': 'npm test',
    'express': 'npm test',
    'nextjs': 'npm test',
    'cli-ts': 'npm test',
    'fastapi': 'pytest',
    'rust': 'cargo test',
    'go': 'go test ./...',
    'flutter': 'flutter test',
    'python': 'pytest',
  };
  return test[stack] ?? null;
}
