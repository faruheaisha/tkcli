# tk — AI Context Generator for Developer Projects

> `npx tkcli quick my-app --stack nextjs` generates your project AND all AI agent context files in one command.

You just scaffolded a project. Now your AI agent needs to know how to work with it — language, framework, build tool, test runner, conventions. Instead of explaining this every session, **tk generates the context files** that make AI assistants effective from the start.

## Why tk exists

AI coding agents (Claude Code, Cursor, Copilot, Windsurf) need project context to be useful. Without it, they hallucinate configs, use wrong conventions, and ask you the same questions every session. tk solves this by generating stack-specific context files that tell your AI agent exactly how your project works.

**The key insight: tk doesn't just scaffold — it keeps context in sync.** If you add a new directory or change your scripts, `tk sync` (or `tk refresh`) updates the managed region of CLAUDE.md, while never touching your own notes.

## Quick Start

```bash
tk quick                                    # 3-step guided prompt
tk quick my-api --stack fastapi             # One-shot
tk quick my-api --stack express --addons docker,ci   # With infra
tk quick my-app --stack nextjs --ai-tool claude,cursor  # Only Claude + Cursor rules
tk quick my-api --dry-run                   # Preview before writing
```

## What you get

```
my-app/
├── src/                     # Source code (stack-specific layout)
├── tests/                   # Tests
├── CLAUDE.md                # Split: managed region (auto-synced) + user notes (never overwritten)
├── AGENTS.md                # Agent operating instructions
├── .cursorrules             # Cursor AI rules (per-stack)
├── .windsurfrules           # Windsurf AI rules (per-stack)
├── .claude/settings.json    # Claude Code settings with per-stack permissions
├── .github/copilot-instructions.md  # GitHub Copilot context
├── .gitignore               # Language-appropriate ignores
├── .editorconfig            # Cross-editor consistency
└── package.json / Cargo.toml / pyproject.toml / pubspec.yaml / go.mod
```

Use `--ai-tool` to generate only the files you need:
```bash
tk quick my-app --stack express --ai-tool claude    # Only CLAUDE.md + .claude/settings.json
tk quick my-app --stack express --ai-tool cursor     # Only .cursorrules
tk quick my-app --stack express --ai-tool claude,copilot  # Multiple tools
```

## Stacks (14)

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
| `mcp-server` | `npm run dev` | Model Context Protocol servers |
| `python` | `python src/main.py` | Python scripts/libs |

## Commands

```
tk quick [name]          Scaffold a project (3 core prompts, smart defaults for the rest)
tk quick [name] --interactive   Full 6-step interactive prompt
tk init                  Add AI context files to an existing project
tk add <module>          Add a component/infra module
tk update                Re-render AI context files (preserves your notes)
tk sync                  Refresh CLAUDE.md managed region from real project structure
tk refresh               Update templates + sync structure (update + sync combined)
tk diff                  Preview what tk update would change
tk doctor                Diagnose common issues with tk-managed projects
tk list                  List all available stacks and infra modules
tk info                  Show version and system info
```

## Context that stays in sync

`CLAUDE.md` is split into two regions:

```markdown
<!-- tk:managed:start -->   ← tk sync/tk refresh regenerates this from your real project
**Stack:** nextjs · **Dev:** npm run dev · **Test:** npm test
## Commands          (scanned from package.json scripts)
## Project Structure (scanned from the actual directory tree)
<!-- tk:managed:end -->

## Project Notes
<!-- tk:user:start -->   ← yours; tk never overwrites it
- Domain rules, decisions, gotchas…
<!-- tk:user:end -->
```

Run `tk refresh` anytime your project structure changes. The managed region updates to reflect reality — your AI agent never reads a stale layout. Your Project Notes are always preserved.

### Auto-sync every session (opt-in)

```bash
tk quick my-app --stack express --auto-sync
```

Drops a Claude Code **SessionStart hook** into `.claude/settings.local.json` — `tk sync` runs automatically every session. Per-developer (gitignored), so teammates opt in independently.

## Diagnose issues

```bash
tk doctor
```

Checks: CLAUDE.md region markers, stack detection, .claude/settings.json validity, .gitignore coverage, auto-sync hook, git repository.

## Compared to alternatives

| Tool | What it does | AI context files | Stacks | Keep-in-sync |
|------|-------------|-------------------|--------|-------------|
| **tk** | Scaffold + AI context generation | 6 formats, per-stack permissions | 14 | `tk sync` / `tk refresh` |
| Yeoman | Project scaffolding (2000+ generators) | None | 2000+ | No |
| Cookiecutter | Cross-language templates | None | 1400+ | No |
| Plop | Micro-generator framework | None | DIY | No |
| Hygen | In-project generators | None | DIY | No |
| create-next-app | Next.js-only scaffold | None | 1 | No |
| Context Forge | CLAUDE.md generator only | CLAUDE.md + .claude/ | — | No |

**What tk does differently:** Yeoman/Cookiecutter/Plop generate projects; tk makes those projects AI-native. The `tk sync` / `tk refresh` mechanism keeps context accurate as your project evolves — something no other tool does.

**What tk doesn't do (yet):** Custom template directories, monorepo support, community template ecosystem, team-shared config.

## Smart defaults

tk learns from your usage and offers smarter defaults over time. Scaffold Express a few times and it becomes the default. Lives in `~/.config/toolkit/profile.json` — never transmitted.

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