<!-- language switcher -->
[English](README.md) | **简体中文**

# tk — AI 上下文生成器

> `npx @faruhe/tkcli quick my-app --stack nextjs` 一行命令生成项目 + 所有 AI Agent 上下文文件。

刚搭好一个新项目，你的 AI Agent 需要知道怎么配合它——语言、框架、构建工具、测试框架、编码规范。每次会话都要重新解释一遍？**tk 替你生成这些上下文文件**，让 AI 助手从第一秒就开始有效工作。

## 为什么需要 tk

AI 编程助手（Claude Code、Cursor、Copilot、Windsurf）需要项目上下文才能发挥价值。没有上下文，它们会瞎猜配置、用错规范、反复问你已经答过的问题。tk 为每个技术栈生成精准的上下文文件，告诉 AI Agent 你的项目到底怎么运行。

**核心洞察：tk 不止是脚手架——它让上下文保持同步。** 当你新增目录或改动了脚本，`tk sync`（或 `tk refresh`）会自动更新 CLAUDE.md 的托管区域，同时绝不触碰你的个人笔记。

## 快速开始

```bash
tk quick                                    # 3 步交互引导
tk quick my-api --stack fastapi             # 一行搞定
tk quick my-api --stack express --addons docker,ci   # 带基础设施
tk quick my-app --stack nextjs --ai-tool claude,cursor  # 只生成 Claude + Cursor 规则
tk quick my-api --dry-run                   # 预览效果，不写文件
```

## 生成的文件结构

```
my-app/
├── src/                     # 源码（按技术栈布局）
├── tests/                   # 测试
├── CLAUDE.md                # 双区域：托管区（自动同步）+ 用户笔记（永不覆盖）
├── AGENTS.md                # Agent 操作指引
├── .cursorrules             # Cursor AI 规则（按栈定制）
├── .windsurfrules           # Windsurf AI 规则（按栈定制）
├── .claude/settings.json    # Claude Code 配置，按栈定制的权限
├── .github/copilot-instructions.md  # GitHub Copilot 上下文
├── .gitignore               # 语言适配的忽略规则
├── .editorconfig            # 跨编辑器一致性
└── package.json / Cargo.toml / pyproject.toml / pubspec.yaml / go.mod
```

用 `--ai-tool` 只生成你需要的文件：
```bash
tk quick my-app --stack express --ai-tool claude    # 只有 CLAUDE.md + .claude/settings.json
tk quick my-app --stack express --ai-tool cursor     # 只有 .cursorrules
tk quick my-app --stack express --ai-tool claude,copilot  # 多工具组合
```

## 支持的技术栈（14 个）

| 栈 | 开发命令 | 适用场景 |
|-------|-------------|----------|
| `node-ts` | `npm run dev` | TypeScript 服务 |
| `react-spa` | `npm run dev` | React 19 + Vite SPA |
| `vue` | `npm run dev` | Vue 3 + Pinia |
| `nuxt` | `npm run dev` | Nuxt 4 SSR |
| `express` | `npm run dev` | Express + Prisma API |
| `nextjs` | `npm run dev` | Next.js 15 全栈 |
| `fastapi` | `uvicorn src.main:app --reload` | Python 异步 API |
| `rust` | `cargo run` | 高性能 CLI/库 |
| `go` | `go run ./cmd/server` | Go 微服务 |
| `flutter` | `flutter run` | 跨平台移动端 |
| `cli-ts` | `npm run dev -- hello` | TypeScript CLI 工具 |
| `mcp-server` | `npm run dev` | MCP 协议服务 |
| `python` | `python src/main.py` | Python 脚本/库 |

## 所有命令

```
tk quick [name]              创建新项目（3 步核心引导，其余智能默认）
tk quick [name] --interactive 完整 6 步交互
tk init                      为已有项目注入 AI 上下文文件
tk add <module>              添加组件或基础设施模块
tk update                    重新渲染 AI 模板文件（保留你的笔记）
tk sync                      从真实项目结构刷新 CLAUDE.md 托管区
tk refresh                   更新模板 + 同步结构（update + sync 二合一）
tk diff                      预览 tk update 会改什么
tk doctor                    诊断 tk 管理项目的常见问题
tk list                      列出所有技术栈和模块
tk info                      显示版本和系统信息
```

## 上下文永不掉队

`CLAUDE.md` 被拆成两个区域：

```markdown
<!-- tk:managed:start -->   ← tk sync/tk refresh 从你的真实项目自动生成
**Stack:** nextjs · **Dev:** npm run dev · **Test:** npm test
## Commands          （从 package.json scripts 实时扫描）
## Project Structure （从实际目录树实时扫描）
<!-- tk:managed:end -->

## Project Notes
<!-- tk:user:start -->   ← 你的专属区域，tk 绝不覆盖
- 记录架构决策、领域规则、踩坑经验……
<!-- tk:user:end -->
```

项目结构调整后，执行 `tk refresh`，托管区自动更新——AI Agent 永远不会读到过时的目录结构。你的笔记原封不动。

### 每次会话自动同步（可选）

```bash
tk quick my-app --stack express --auto-sync
```

会在 `.claude/settings.local.json` 写入一个 **SessionStart 钩子**——每次启动 Claude Code 都自动执行 `tk sync`。该文件按开发者独立配置（已加入 .gitignore），队友各自决定是否启用。

## 健康诊断

```bash
tk doctor
```

检查项目：CLAUDE.md 区域标记、技术栈识别、权限配置合法性、.gitignore 覆盖范围、自动同步钩子、Git 仓库状态。

## 与替代方案对比

| 工具 | 做什么 | AI 上下文文件 | 支持栈 | 保持同步 |
|------|-------------|-------------------|--------|-------------|
| **tk** | 脚手架 + AI 上下文生成 | 6 种格式，按栈定制权限 | 14 | `tk sync` / `tk refresh` |
| Yeoman | 项目脚手架（2000+ 生成器） | 无 | 2000+ | 否 |
| Cookiecutter | 跨语言模板 | 无 | 1400+ | 否 |
| Plop | 微生成器框架 | 无 | 自建 | 否 |
| Hygen | 项目内生成器 | 无 | 自建 | 否 |
| create-next-app | 仅 Next.js | 无 | 1 | 否 |
| Context Forge | 仅生成 CLAUDE.md | CLAUDE.md + .claude/ | — | 否 |

**tk 的不同之处：** Yeoman/Cookiecutter/Plop 生成项目；tk 让项目原生兼容 AI。`tk sync` / `tk refresh` 机制让上下文随项目演进保持准确——目前没有其他工具能做到。

**tk 暂不支持：** 自定义模板目录、Monorepo、社区模板生态、团队共享配置。

## 智能默认

tk 会学习你的使用习惯，逐步优化默认值。多用 Express 几次，下次它就会默认选 Express。数据存在 `~/.config/toolkit/profile.json` ——永不外传。

## 安装

```bash
npm install -g @faruhe/tkcli
npx @faruhe/tkcli quick my-app
```

Node >= 20。

## 开发

```bash
npm run dev -- quick my-test-app
npm run build
npm test
```

## License

MIT