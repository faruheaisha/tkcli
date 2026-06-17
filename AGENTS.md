# tk — AI developer toolkit

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev mode (tsx) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled production build |
| `npm test` | Run tests (Vitest, full suite) |
| `npm run test:watch` | Watch mode |

## Architecture

This project uses **Commander.js** for CLI and **Handlebars** for template rendering.

### Key Modules

- **src/commands/quick/scaffold.ts** — Core scaffold logic: copy templates, render .hbs, error rollback, git init, npm install
- **src/commands/quick/composer.ts** — Multi-stack composition: merge package.json, merge templates
- **src/commands/quick/stacks.ts** — 14 stack definitions with toolchain metadata
- **src/templates/** — Per-stack Handlebars templates (`.hbs`), rendered with `{{projectName}}`, `{{description}}`, `{{stack}}`, `{{year}}`

### Template Convention

- `.hbs` files are Handlebars templates. Non-`.hbs` files copy verbatim.
- Stack-specific variants: `Dockerfile.{stack}.hbs` resolves to `Dockerfile`
- Per-stack templates override shared templates when path matches

### Infra Modules

Infra modules (docker, ci, security) are add-only — not scaffolded by default. Available via `tk add docker` or `--addons docker,ci,security` flag.

## Testing

```
tests/
├── quick.integration.test.ts   # ~60 scaffold integration tests
└── composer-unit.test.ts       # package.json merge tests
```

Test patterns:
- Scaffold into temporary directory, verify files exist with rendered content
- Test error paths: invalid stack name, bad project name, path traversal
- Test CLI flags: --dry-run, --force, -y, --no-ai, --no-git, --no-install
- Each test cleans up after itself
- No mocking — always test against real temp directories

## AI Assistant Instructions

You are working on **tk CLI** — the scaffolding tool itself.

1. **Read `package.json` and `tsconfig.json` first** — understand deps and build config
2. **`tsx` for dev, `tsc` for build** — never ship `tsx`-only code
3. **Template changes need test updates** — editing `.hbs` means updating scaffold test assertions
4. **ESM only** — `import`/`export`, never `require()`
5. **Build before commit** — `npm run build && npm test` must pass
6. **No scaffolding into toolkit dir** — always use temp directories for scaffold tests
7. **Never add a dependency** without adding it to `package.json` first
8. **Error messages must be actionable** — tell user what went wrong AND how to fix it
9. **Commit conventions** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
