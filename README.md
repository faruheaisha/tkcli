# tk — Project Harness Generator for AI-Assisted Development

> `npx tkcli quick my-app --stack nextjs` — 13 stacks. Multi-stack composition. Per-stack AI context. One command.

You just scaffolded a project. Now your AI agent needs to know how to work with it. Language? Framework? Build tool? Test runner? Error handling style? Conventions?

Instead of telling it every time, **tk generates the harness** — CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, .claude/settings.json, copilot-instructions, .gitignore, .editorconfig — all specific to your stack. Your AI agent picks it up from the first `cd` command.

## When to use tk

- **Starting a new project** and want AI-assisted development that works out of the box
- **Working across multiple tech stacks** — tk is the only tool with 13 stack templates and multi-stack composition
- **Need I-to generate a fullstack app** — `tk quick app --stack nextjs --components express` merges both stacks into one project
- **Adding AI context to an existing project** — `tk init` detects the stack and injects config files

## Quick Start

```bash
tk quick                                    # Interactive (6-step guided prompt)
tk quick my-api --stack fastapi             # One-shot
tk quick my-api --stack express --addons docker,ci   # With infra
tk quick my-api --dry-run                   # Preview before writing
```

## Stacks (13)

| Stack | Dev Command | Best for |
|-------|-------------|----------|
| `node-ts` | `npm run dev` | TypeScript services |
| `react-spa` | `npm run dev` | React 19 + Vite SPA |
| `vue` | `npm run dev` | Vue 3 + Pinia |
| `nuxt` | `npm run dev` | Nuxt 4 SSR apps |
| `express` | `npm run dev` | Express + Prisma APIs |
| `nextjs` | `npm run dev` | Next.js 15 fullstack |
| `fastapi` | `uvicorn src.main:app --reload` | Python async APIs |
| `rust` | `cargo run` | High-performance CLI/libs |
| `go` | `go run ./cmd/server` | Go microservices |
| `flutter` | `flutter run` | Cross-platform mobile |
| `cli-ts` | `npm run dev -- hello` | TypeScript CLI tools |
| `python` | `python src/main.py` | Python scripts/libs |
| `generic` | — | Custom project skeleton |

## What you get with `tk quick`

```
my-app/
├── src/                     # Source code (stack-specific layout)
├── tests/                   # Tests (Vitest, pytest, cargo test, etc.)
├── CLAUDE.md                # Project identity for AI agents
├── AGENTS.md                # Agent operating instructions (commands, conventions)
├── .cursorrules             # Cursor AI rules (per-stack)
├── .windsurfrules           # Windsurf AI rules (per-stack)
├── .claude/settings.json    # Claude Code settings
├── .github/copilot-instructions.md  # GitHub Copilot context
├── .gitignore               # Language-appropriate ignores
├── .editorconfig            # Cross-editor consistency
└── package.json / Cargo.toml / pyproject.toml / pubspec.yaml / go.mod
```

## Compared to Alternatives

| Tool | Stacks | AI Harness | Multi-Stack | Per-Stack IDE Rules |
|------|--------|-----------|-------------|-------------------|
| **tkcli** | **13** | **CLAUDE.md + AGENTS.md + .cursorrules + .windsurfrules + .claude/settings.json + copilot-instructions** | **`--components`** | **Yes** |
| create-next-app | 1 | — | — | — |
| create-vite | 4 | — | — | — |
| Context Forge | — | CLAUDE.md + .claude/ surface | — | — |
| create-arthus-harness | — | CLAUDE.md + .claude/ surface | — | — |

## Features

- **13 stack templates** — from Rust to Flutter, each with AI config tuned to the stack
- **Multi-stack composition** — `tk quick app --stack nextjs --components express` merges stacks
- **Per-stack IDE rules** — `.cursorrules` and `.windsurfrules` differ by stack (not one-size-fits-all)
- **`.claude/settings.json`** — permission allowlist + MCP placeholder for Claude Code
- **copilot-instructions.md** — GitHub Copilot context matching the stack
- **Infra addons** — `--addons docker,ci,security` for Dockerfile, CI workflow, gitleaks
- **`tk init`** — add AI context to existing projects (auto-detects stack)
- **`tk add`** — add module to existing project incrementally
- **`tk update`** — re-render AI context files without touching your code
- **`--dry-run`** — preview before writing
- **`-y` / `--yes`** — skip prompts when you know what you want

## Commands

```
tk quick [name]   Scaffold a project
tk init           Add AI context files to an existing project (auto-syncs structure)
tk add <module>   Add a component/infra module
tk update         Re-render AI context files (preserves your Project Notes)
tk sync           Refresh CLAUDE.md to match the project's real structure
tk list           List all available stacks and infra modules
tk info           Show version and system info
```

## Keeping context in sync

tk doesn't just generate context once and walk away — it maintains it. Generated
`CLAUDE.md` files are split into two regions:

```markdown
<!-- tk:managed:start -->   ← tk sync regenerates this from your real files
**Stack:** … · **Dev:** … · **Test:** …
## Commands          (scanned from package.json scripts)
## Project Structure (scanned from the actual directory tree)
<!-- tk:managed:end -->

## Project Notes
<!-- tk:user:start -->   ← yours; tk never overwrites it
- Domain rules, decisions, gotchas…
<!-- tk:user:end -->
```

Run `tk sync` anytime your project structure changes and the managed region updates
to reflect reality — so your AI agent never reads a stale or hallucinated layout.
Your Project Notes are always preserved.

### Auto-sync every session (opt-in)

Pass `--auto-sync` to `tk quick` and tk drops a Claude Code **SessionStart hook** into
`.claude/settings.local.json` — so `tk sync` runs automatically whenever a Claude Code
session begins, and the context is never stale. It lives in the per-developer local
settings (gitignored), so `tk update` never clobbers it and it stays off your teammates'
machines unless they opt in too.

```bash
tk quick my-app --stack express --auto-sync
```

## Smart defaults that learn from you

tk remembers the choices you make and offers them as defaults next time. Scaffold
Express a few times and `tk quick` will default to Express; keep skipping `npm install`
and it stops asking. This lives in a local `~/.config/toolkit/profile.json` — it is
**never transmitted anywhere**. Delete the file to reset, or pass explicit flags
(`--stack`, `--no-install`, …) to override the learned defaults anytime.

## Install

```bash
npm install -g tkcli
npx tkcli quick my-app
```

Node >= 20.

## Development

```bash
npm run dev -- quick my-test-app
npm run build
npm test
```

## License

MIT
