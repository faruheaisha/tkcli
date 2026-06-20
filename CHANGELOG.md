# Changelog

## 0.1.0 — first public release

**tk keeps your AI coding context honest and up to date — for the whole life of the project, not just the first `cd`.**

Most scaffolders generate a `CLAUDE.md` once and walk away; it rots the moment your
project changes. tk treats AI context as something to *maintain*.

### Highlights

- **Scaffold 14 stacks** — node-ts, express, react-spa, vue, nuxt, next.js, fastapi,
  rust, go, flutter, cli-ts, python, and a first-class **MCP server** stack
  (build a Model Context Protocol server with the official SDK in one command).
- **A maintain-loop, not a one-shot** — generated `CLAUDE.md` is split into a
  `tk:managed` region (regenerated) and a `tk:user` region (your notes, never touched).
  Run `tk sync` to refresh structure + commands from your *real* files; pass
  `--auto-sync` to keep it fresh automatically every Claude Code session.
- **Honest context, by design** — guard tests assert the generated `.claude/settings.json`
  is valid Claude Code config and that every path documented in `CLAUDE.md` actually
  exists on disk. No hallucinated directories.
- **Per-stack Claude Code permissions** — a node project never ships cargo/flutter rules.
- **Smart, local defaults** — tk learns your stack and option preferences
  (`~/.config/toolkit/profile.json`, never transmitted) and offers them next time.
- **Works on existing projects** — `tk init` detects the stack and syncs accurate context;
  `tk add` layers in docker / ci / security or another stack.

### Commands

`tk quick` · `tk init` · `tk sync` · `tk add` · `tk update` · `tk list` · `tk info`

### Install

```bash
npm install -g tkcli
# or
npx tkcli quick my-app --stack mcp-server
```

Node >= 20.

### Status

This is an early release (0.1.0). It's well-tested (113 tests, including a CI job that
installs and builds the generated projects), but unproven in the wild. Issues and
feedback are very welcome — they're how the stacks and context templates get better.
