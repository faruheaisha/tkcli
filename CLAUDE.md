# tk — AI developer toolkit

> AI-ready project scaffolding across 13 stacks (Node.js, Express, React, Vue, Next.js, Nuxt, FastAPI, Python, Rust, Go, Flutter, CLI, Generic)

## AI Development Context

This is the **tk CLI tool itself** — the harness framework for AI-assisted development.
See [AGENTS.md](AGENTS.md) for full AI development guidelines.

## Quick Start

```bash
npm install
npm run build               # tsc → dist/
npm link                     # make `tk` available globally
npx tsx src/index.ts list   # dev mode, skip build
```

## Architecture: Commander.js + Handlebars Templates

```
src/
├── index.ts                # Entry point (#!/usr/bin/env node)
├── logger.ts               # Console output (chalk + spinner)
├── commands/
│   ├── quick/              # `tk quick` — scaffold new project
│   │   ├── index.ts        #   CLI definition + args
│   │   ├── scaffold.ts     #   Template rendering engine
│   │   ├── composer.ts     #   Multi-stack merge
│   │   ├── prompt.ts       #   Interactive prompts
│   │   └── stacks.ts       #   Stack definitions
│   ├── add/                # `tk add` — add component/infra
│   ├── init/               # `tk init` — add AI files to existing project
│   ├── update/             # `tk update` — re-render AI files
│   ├── list/               # `tk list` — show available stacks
│   └── info/               # `tk info` — system/version info
├── utils/
│   └── fs.ts               # ensureDir, etc.
└── templates/              # Per-stack + shared .hbs templates
    ├── shared/             # .gitignore, .cursorrules, .editorconfig
    ├── infra/              # docker/, ci/, security/ (add-only)
    ├── cli-ts/
    ├── node-ts/
    ├── express/
    └── ...
```

### Key Modules

- **scaffold.ts** `~335 lines` — core: `copyTemplates()`, `copyInfraModule()`, `scaffold()`, error rollback
- **composer.ts** `~130 lines` — `mergePackageJson()`, `composeScaffold()` for multi-stack projects
- **stacks.ts** `~110 lines` — 13 stack definitions with toolchain metadata

### Template Convention

- `.hbs` files are Handlebars templates rendered with `{{projectName}}`, `{{description}}`, `{{stack}}`, `{{year}}`
- Stack-specific variants: `Dockerfile.{stack}.hbs` → resolves to `Dockerfile`
- Per-stack templates override shared templates when both exist (e.g. `node-ts/CLAUDE.md.hbs` > `shared/CLAUDE.md.hbs`)

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev mode (tsx) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled dist |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Watch mode |

## Testing

```
tests/
├── quick.integration.test.ts   # Scaffold integration tests (~60 tests)
├── composer-unit.test.ts       # Multi-stack merge logic
```

Test patterns:
- Scaffold into temp dir → verify files exist with rendered content
- Test error paths: invalid stack, bad name, path traversal
- Test flags: --dry-run, --force, -y, --no-ai, --no-git, --no-install
- Each test cleans up its temp dir after itself
- No filesystem mocks — always test against real temp directories

## Common Pitfalls (Avoid These)

1. **Adding stack logic to shared templates** — Use per-stack template files, not `if_eq` branches in shared templates
2. **Hardcoded template paths** — `findTemplatesDir()` auto-detects from `__dirname` — always use it
3. **Windows path issues** — `path.join()` not string concat
4. **Scaffolding into repo** — Tests must create temp dirs, never scaffold into the toolkit directory itself
5. **Stale test expectations** — When editing `.hbs` templates, update corresponding test assertions

## AI Assistant Instructions

This is a **TypeScript CLI** (Commander.js, Handlebars, Vitest, ESM).

1. **Read `package.json` and `tsconfig.json` first** — understand deps and tsconfig
2. **`tsx` for dev, `tsc` for build** — dev runs type-stripped, build outputs JS to `dist/`
3. **Template changes require test updates** — editing `.hbs` means updating the scaffold test that checks file output
4. **ESM only** — `import`/`export`, no `require()`
5. **Build before commit** — `npm run build && npm test` must pass
6. **No scaffolding into toolkit dir** — always use a temp directory for scaffold tests
7. **Commit conventions** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
