# 架构演进史：tk 项目框架的诞生与演进

> **视角**：从架构和代码结构的角度，追溯 tk 从简单脚手架工具到 AI Agent 项目框架（Project Harness Framework）的完整演进过程。

---

## 一、起点：为什么需要一个新的脚手架工具？

tk 的产生源于一个具体的痛点：开发者使用 AI 编码助手（Claude Code、Cursor、Windsurf、GitHub Copilot）时，每次启动新项目都需要反复向 AI 解释项目上下文。

**原始问题链：**
1. 你用 `create-next-app` 生成了项目 → AI 不知道项目结构
2. 你让它写 API 路由 → AI 用错了测试框架（它猜是 Jest，实际是 Vitest）
3. 你手动粘贴 CLAUDE.md 解释项目 → 下一个项目再来一遍

已有的脚手架工具（create-next-app、create-vite、cookiecutter 等）只管生成代码文件，不管让 AI 理解它们。已有的 AI 上下文注入工具（Context Forge、create-arthus-harness）管生成 CLAUDE.md，但不管栈特定性——所有栈共享同一份 AI 配置。

tk 的核心理念：**每次 `tk quick` 生成的不只是一个项目，而是一个让 AI Agent 能够正确理解和操作该项目的完整工作框架（Harness）。**

---

## 二、第一代架构：通用脚手架引擎（v0.0.1）

### 初始设计

最早的架构非常朴素——一个 `scaffold.ts` 文件包揽一切：

```
src/
├── index.ts          # CLI 入口
├── scaffold.ts       # 核心逻辑：复制模板 + 渲染 Handlebars + git init + npm install
├── stacks.ts         # 栈定义（id / label / description / templateDir）
└── templates/        # 模板目录
    ├── shared/       # 共享模板
    ├── node-ts/
    ├── express/
    ├── react-spa/
    └── ...
```

### 核心数据流

```
用户输入 tk quick my-app --stack node-ts
  → scaffold.ts 接收 ScaffoldOptions
  → validateInput() 检查参数合法性
  → findTemplatesDir() 定位模板目录（支持开发/生产两种路径）
  → buildContext() 构建 Handlebars 上下文 {projectName, description, stack, year}
  → copyTemplates() 递归遍历模板目录
      → .hbs 文件用 Handlebars.compile() 渲染
      → 非 .hbs 文件直接复制
  → gitInit() 初始化 git 仓库并做首次提交
  → installDeps() 运行 npm install
```

这个引擎的核心是 `copyTemplates()` 函数，只有 30 行代码：

```typescript
export function copyTemplates(srcDir, destDir, ctx): string[] {
  // 遍历 srcDir
  //   .hbs 文件 → renderContent() 渲染
  //   非 .hbs → cp 原样
  //   目录 → 递归
  // 返回创建的文件的绝对路径列表
}
```

### 第一代的设计决策

| 决策 | 理由 | 后续影响 |
|------|------|---------|
| Commander.js | TJ 的成熟 CLI 框架，链式 API 简洁 | 坚持至今，未替换 |
| Handlebars | 最小模板引擎，{{var}} 语法零学习成本 | 至今仍是最佳选择 |
| 返回文件列表而非 void | 支持测试断言和后续操作 | 成为各子命令的基础协议 |
| 废弃目录自动清理 | 避免残留旧文件 | 保留至今 |

---

## 三、第二代架构：多栈识别与条件渲染（v0.1.0）

### 加入 AI 配置文件

最早的突破性设计是加入 `CLAUDE.md.hbs` 共享模板。但这个模板需要用 `{{#if_eq stack 'node-ts'}}` 来处理不同栈的差异：

```
// shared/CLAUDE.md.hbs
{{#if_eq stack 'node-ts'}}
## Commands
npm run dev  # TypeScript dev
npm test     # Vitest
{{/if_eq}}

{{#if_eq stack 'express'}}
## Commands
npm run dev  # Express + Prisma
npm test     # Vitest + Supertest
{{/if_eq}}
```

### 注册 if_eq 辅助函数

```typescript
// scaffold.ts 中的 registerHelpers()
Handlebars.registerHelper('if_eq', function(a, b, opts) {
  return a === b ? opts.fn(this) : opts.inverse(this);
});
```

### 这种模式的代价

随着栈从 3 个增加到 13 个，`if_eq` 分支变成了"森林"——一个 CLAUDE.md.hbs 文件里有几十个条件分支。每次加入新栈，所有共享条件模板都需要同步更新。这是典型的**条件驱动的代码膨胀**。

### 第二代的问题

1. **认知负担高**：理解一个模板需要看完整文件，因为条件分支分散在各处
2. **维护成本线性增长**：每加一个新栈，N 个共享模板都要加对应分支
3. **容易遗漏**：加栈时忘记更新某个共享模板，导致生成的 AI 配置不对
4. **可测试性差**：测试需要覆盖所有条件组合

---

## 四、第三代架构：Per-Stack 差异化 + 组合式架构（v0.2.0）

### Karpathy 洞察

这是 tk 架构的最大转折点。Karpathy 指出：

> "你的 CLAUDE.md 模板被 `if_eq` 污染了。每份 AI 配置文件都应该是栈特定的，而不是共享的条件分支森林。"

核心洞察：
1. **AI 配置文件是 "harness" 而非 "template"** — 每个栈需要不同的 AI 行为指令
2. **Per-stack 优于 shared + if_eq** — 13 个独立的 CLAUDE.md.hbs，没有条件分支
3. **AGENTS.md 是独立的操作契约** — 与 CLAUDE.md 分离（项目身份 vs Agent 指令）

### 架构重构

```
// 之前：共享 + 条件分支
src/templates/shared/CLAUDE.md.hbs  <!-- 50行 if_eq 森林 -->

// 之后：每个栈自己的文件
src/templates/node-ts/CLAUDE.md.hbs  <!-- 15行，纯 node-ts 内容 -->
src/templates/express/CLAUDE.md.hbs  <!-- 15行，纯 express 内容 -->
src/templates/rust/CLAUDE.md.hbs     <!-- 15行，纯 rust 内容 -->
```

### 三大核心理念（3 Kernel Contracts）

#### 契约 1：CLAUDE.md — 项目身份

每个项目生成的 `CLAUDE.md` 告诉 AI Agent：
- 这个项目是什么（项目名称、描述、架构概览）
- 用什么技术栈（语言、框架、工具链）
- 目录结构是怎样的
- 有哪些命令可用（dev / build / test / lint）
- 常见的陷阱（Common Pitfalls）

这是 AI Agent 的"项目身份证"——加载项目时第一个读取的文件。

#### 契约 2：AGENTS.md — Agent 操作指令

每个项目生成的 `AGENTS.md` 告诉 AI Agent：
- 如何安装依赖和运行项目
- 测试模式是怎样的（测试框架、命名约定、目录约定）
- 架构约束（ESM only、类型安全策略等）
- 编码规范（导入顺序、错误处理模式、提交信息格式）

这是 AI Agent 的"操作手册"——明确什么是被期望的行为。

#### 契约 3：IDE 集成规则

- `.cursorrules` — Cursor 专属规则（代码生成风格、文件操作模式）
- `.windsurfrules` — Windsurf 专属规则
- `.claude/settings.json` — Claude Code 设置（权限白名单、MCP 占位符）
- `.github/copilot-instructions.md` — Copilot 上下文指令

这些文件确保不同的 AI 编码工具都能理解项目上下文。

### 模板解析优先级

```
src/templates/
├── shared/           # 公共模板（所有栈共享）
│   ├── .gitignore.hbs
│   ├── .editorconfig.hbs
│   ├── .env.example.hbs
│   ├── .cursorrules.hbs
│   ├── .windsurfrules.hbs
│   └── .claude/settings.json.hbs
├── {stack}/          # 栈特定模板（覆盖共享的同名文件）
│   ├── CLAUDE.md.hbs
│   ├── AGENTS.md.hbs
│   ├── README.md.hbs
│   ├── package.json.hbs      # npm 栈
│   ├── Cargo.toml.hbs        # Rust
│   ├── go.mod.hbs            # Go
│   ├── pyproject.toml.hbs    # Python/FastAPI
│   ├── pubspec.yaml.hbs      # Flutter
│   ├── .cursorrules.hbs      # 栈特定的 IDE 规则
│   └── src/ / tests/ / app/  # 源代码模板
```

渲染时，共享模板先渲染，栈模板后渲染（相同路径覆盖）。这个优先级规则不用 `if_eq`，用文件系统层次结构自然解决了差异。

---

## 五、组合架构：多栈合并（Composer）

### 为什么需要组合？

真实的项目往往是多栈的：Express API + React 前端 + Prisma ORM。或者 Nuxt 全栈 + Express 数据层。tk 需要支持这种场景。

### 组合机制

`composer.ts` 实现了 `composeScaffold()`：

```
用户输入：tk quick my-app --stack express --components react-spa

执行流程：
1. 渲染 shared/ 共享模板
2. 渲染 express/ 模板（主栈）
3. 渲染 react-spa/ 模板（组件）
4. mergePackageJson() 合并 package.json
   - dependencies / devDependencies 合并
   - scripts 合并（同名覆盖）
5. 文件冲突检测（logging warning）
6. git init + npm install
```

### mergePackageJson 的设计

```typescript
export function mergePackageJson(base, overlay) {
  // dependencies / devDependencies / peerDependencies 合并（overlay 优先）
  // scripts 合并（overlay 优先）
  // name 使用 projectName
}
```

后续栈优先策略：先渲染的主栈可以被后渲染的组件覆盖同名文件。

### 冲突检测

```
// 文件来源于多个栈时的 warning
allPaths Map<relativePath, stackId>
→ Conflict: "src/routes/index.ts" from "react-spa" overwrites file from "express"
```

---

## 六、Infra 模块：Add-Only 架构

### 设计原则

Docker、CI、Security 这些基础设施文件不是每个项目都需要的。把它们做成 add-only 模块：

```typescript
export const INFRA_MODULES = [
  { id: 'docker',   label: 'Docker',      dir: 'infra/docker' },
  { id: 'ci',       label: 'CI/CD',       dir: 'infra/ci' },
  { id: 'security', label: 'Security',    dir: 'infra/security' },
];
```

### 链式调用

```
tk quick my-app --stack nextjs --addons docker,ci
→ 生成 nextjs 项目 + Dockerfile + GitHub Actions CI
```

### Per-Stack 变体解析

Infra 模块支持栈特定变体：

```
infra/docker/
├── Dockerfile.node-ts.hbs    # → 对 node-ts 栈生成 Dockerfile
├── Dockerfile.express.hbs    # → 对 express 栈生成 Dockerfile
├── Dockerfile.nextjs.hbs     # → 对 nextjs 栈生成 Dockerfile
└── docker-compose.yml.hbs    # → 通用
```

`copyInfraModule()` 函数负责解析 `.{stack}.` 命名模式：

```
Dockerfile.node-ts.hbs
  → 检测 stack = 'node-ts'
  → 从文件名中去掉 '.node-ts'
  → 变为 Dockerfile
  → 渲染 Handlebars 后写入目标目录
```

---

## 七、命令体系演进

### v0.0.1：单命令

```typescript
// 只有一个 quick 命令
program.command('quick').action(scaffold);
```

### v0.1.0：四命令

```typescript
// 加入 list（展示可用栈）、info（版本信息）
program
  .addCommand(quickCommand)
  .addCommand(listCommand)
  .addCommand(infoCommand);
```

### v0.2.0+：六命令

```typescript
program
  .addCommand(quickCommand)    // 快速生成新项目
  .addCommand(initCommand)     // 为已有项目注入 AI 配置
  .addCommand(addCommand)      // 追加组件或 infra 模块
  .addCommand(updateCommand)   // 重新渲染 AI 配置文件
  .addCommand(listCommand)     // 列出可用栈
  .addCommand(infoCommand);    // 显示版本和系统信息
```

### 各命令的职责

| 命令 | 场景 | 协议 |
|------|------|------|
| `quick` | 新项目 | scaffold → [compose] → git init → npm install |
| `init` | 已有项目注入 AI 配置 | detectStack → 模板渲染（不覆盖已有文件） |
| `add` | 追加组件/模块 | detectStack → mergeDeps → copyTemplates |
| `update` | 重新渲染 AI 配置 | 内容感知 diff（只改有变更的） |
| `list` | 展示信息 | 自动从 STACKS 数组生成 |
| `info` | 调试信息 | 版本 + 平台 + 配置路径 |

---

## 八、错误处理架构

### 三层防御

#### 输入验证层（validateInput）

```typescript
export function validateInput(opts: ScaffoldOptions): void {
  // 栈 ID 白名单检查（防止注入）
  if (!ALLOWED_STACK_IDS.has(opts.stack)) throw Error(...)
  // 项目名安全字符检查（防止路径穿越）
  if (safeName !== opts.projectName) throw Error(...)
  // 描述长度限制
  if (opts.description.length > 200) throw Error(...)
  // 组件栈 ID 白名单
  for (const c of opts.components) { if (!ALLOWED_STACK_IDS.has(c)) throw Error(...) }
}
```

#### 运行时保护

```typescript
// copyTemplates 中的路径穿越检测
if (!destPath.startsWith(resolvedDest)) {
  throw new Error(`Path traversal detected: ${destPath} is outside ${resolvedDest}`);
}
```

#### 错误回滚（Rollback）

```typescript
// scaffold 中的 try/catch 包裹
try {
  // ... 整个 scaffold 过程
} catch (err) {
  // 发生任何错误，删除整个目标目录
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  throw err;  // 重新抛出，上层 CLI handler 显示错误信息
}
```

这个设计确保：**要么生成完整的项目，要么完全不留下痕迹**。不会出现因部分失败导致的残缺项目。

---

## 九、内容感知更新（tk update）

### 痛点

最早的 `tk update` 总是报告"Updated N files"，即使用户的 AI 配置文件没有实质变化。

### 解决方案

`updateProject()` 返回 `UpdateResult`：

```typescript
export interface UpdateResult {
  updated: string[];    // 内容发生变化的文件
  unchanged: string[];  // 内容没有变化的文件
  newFiles: string[];   // 新生成的文件（之前不存在）
}
```

在写文件之前，先读已有文件内容做对比：

```typescript
if (existsSync(destPath)) {
  const existing = readFileSync(destPath, 'utf-8');
  if (existing === final) {
    result.unchanged.push(destPath);
    continue;  // 跳过写入
  }
  writeFileSync(destPath, final, 'utf-8');
  result.updated.push(destPath);
} else {
  writeFileSync(destPath, final, 'utf-8');
  result.newFiles.push(destPath);
}
```

输出格式：`10 template files (3 updated, 7 unchanged)`

当所有文件都没有变化时：`All template files are up to date.`

---

## 十、模板架构总览

### 13 个栈的目录结构

| 栈 ID | 包管理器 | CLI 框架 | 测试框架 | 特点 |
|-------|---------|---------|---------|------|
| node-ts | npm | — | Vitest | 最通用的 TS 项目基础 |
| express | npm | — | Vitest + Supertest | Express 5 + Zod 验证 |
| express-prisma | npm | — | Vitest + Supertest | Express 5 + Prisma ORM（组件） |
| react-spa | npm | — | Vitest + Testing Library | React 19 + Vite + TanStack Query |
| vue | npm | — | Vitest + @vue/test-utils | Vue 3 + Pinia + Vue Router |
| nuxt | npm | — | Vitest + @vue/test-utils | Nuxt 4 SSR + Nitro API |
| nextjs | npm | — | Vitest + Testing Library | Next.js 15 App Router |
| fastapi | pip | Typer + Uvicorn | pytest + httpx | FastAPI + SQLAlchemy async |
| python | pip | Typer | pytest | Python scripts/libs |
| rust | cargo | clap | cargo test | Rust edition 2021 + tokio |
| go | go mod | cobra / gin | go test | Go 1.23 + DDD layout |
| flutter | pub | — | flutter test | Flutter + Riverpod + GoRouter |
| cli-ts | npm | Commander | Vitest | TypeScript CLI |
| generic | — | — | — | 自定义项目骨架 |

### 每个栈的模板文件清单

典型栈（以 `express` 为例）：
```
src/templates/express/
├── package.json.hbs       # 依赖和脚本
├── tsconfig.json.hbs      # TypeScript 配置
├── src/index.ts.hbs       # 入口文件
├── src/routes/index.ts.hbs # 路由定义
├── tests/app.test.ts.hbs  # 集成测试
├── CLAUDE.md.hbs          # 项目身份
├── AGENTS.md.hbs          # Agent 指令
├── README.md.hbs          # "What to modify" 文档
├── eslint.config.mjs.hbs  # ESLint 配置
└── .env.example.hbs       # 环境变量模板
```

### 模板引擎协议

```
Handlebars 上下文:
{
  projectName: string,   // 项目名
  description: string,   // 项目描述
  stack: string,         // 栈 ID（如 'node-ts'）
  components: string[],  // 组合的组件列表
  year: number,          // 当前年份（用于版权等）
}
```

模板文件命名约定：
- `.hbs` 后缀 = Handlebars 模板（需要渲染）
- 非 `.hbs` 后缀 = 静态文件（直接复制）
- `_` 前缀 = 忽略（不需要在生成的项目中出现）

---

## 十一、测试架构

### 测试层级

```
tests/
├── quick.integration.test.ts   # ~60 个集成测试
│   ├── CLI 基础设施（2 个）
│   ├── 12 栈模板完整性（2 × 12 = 24 个）
│   ├── 非交互模式 scaffold（7 个）
│   ├── 错误处理（3 个）
│   ├── --force 覆盖（1 个）
│   ├── --dry-run（1 个）
│   ├── 共享模板完整性（1 个）
│   ├── infra 模块（3 个）
│   ├── 安全验证（1 个）
│   └── 组件组合（5 个）
└── composer-unit.test.ts       # 3 个单元测试
    ├── overlay 覆盖
    ├── 无冲突合并
    └── scripts 合并
```

### 测试策略

1. **不 mock 文件系统** — 使用真实临时目录（`mkdtempSync`）
2. **每个测试清理自己** — `beforeEach` 创建临时目录，测试结束后不依赖清理
3. **断言内容渲染正确** — 检查所有生成文件不包含未渲染的 `{{}}`
4. **断言文件名正确** — `hasFile()` 辅助函数检查文件路径后缀
5. **测试所有错误路径** — 非法栈名、非法项目名、超长描述、组件注入

---

## 十二、当前架构图谱

```
cli.ts (Commander.js)
├── tk quick ─────────── scaffold.ts
│   ├── validateInput()
│   ├── composeScaffold() ──── composer.ts
│   │   ├── mergePackageJson()
│   │   └── copyTemplates() (per stack)
│   ├── copyTemplates()
│   │   ├── shared/         (AI harness 模板)
│   │   └── {stack}/        (栈特定模板)
│   ├── copyInfraModule()   (add-only)
│   ├── gitInit()
│   └── installDeps()
│       └── withSpinner()   (ora 风格 spinner)
├── tk init ─────────── init-project.ts
│   ├── detectStack()
│   └── walkDir() (不覆盖已有文件)
├── tk add ─────────── add-module.ts
│   ├── detectStack()
│   ├── mergeDeps()
│   ├── copyInfraModule()
│   └── copyTemplates()
├── tk update ───────── update-project.ts
│   ├── 内容感知 diff
│   └── UpdateResult {updated, unchanged, newFiles}
├── tk list ────────── stacks.ts + INFRA_MODULES
└── tk info ────────── config.ts + package.json

基础设施：
├── stacks.ts        — 13 栈定义元数据
├── dev-command.ts   — 栈特定的 dev 命令提示
├── compose-prompt.ts— 交互式组件组合选择
├── prompt.ts        — 6 步交互式提示流程
├── config.ts        — 用户配置持久化
├── logger.ts        — chalk + spinner
└── fs.ts            — ensureDir 工具
```

---

## 十三、关键设计模式总结

| 模式 | 出现位置 | 解决的问题 |
|------|---------|-----------|
| 文件系统层次结构代替条件分支 | 模板渲染 | `if_eq` 森林 → per-stack 文件 |
| 返回列表代替 void | 所有子命令 | 统一的文件管理协议 |
| 先渲染后比较再写入 | tk update | 内容感知更新，避免假变更 |
| Add-Only 模块 | infra 模块 | 不污染默认输出 |
| Stack-specific 文件命名 | Dockerfile.{stack}.hbs | per-stack 变体 |
| 三层输入验证 | scaffold.ts | 注入/穿越/长度保护 |
| 全部回滚 | scaffold catch | 失败不留痕迹 |
| 真实目录测试 | 测试套件 | 零 mock 的可靠性 |
| 自包含模板 | 每个栈 | 零外部依赖的模板渲染 |
| 多栈包合并 | composer.ts | N 个 npm 栈共享 package.json |
