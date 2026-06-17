# 开发过程全记录：tk 项目框架从零到一的完整旅程

> **视角**：按时间顺序，记录每个决定、每次重构、每个框架视角注入的关键节点。所有的"为什么"和"当时发生了什么"。

---

## 第一阶段：概念与起步（Day 1-5）

### 初始动机

创造者的日常工作涉及大量重复劳动——每次启动新项目都要手动设置 AI 编码工具的工作上下文。市面上没有现成的工具能同时解决"生成项目代码"和"让 AI 理解项目"这两个问题。

### 第一天：最简单的版本

第一个可工作的版本只有三个文件：
- `src/index.ts` — CLI 入口，使用 Commander.js
- `src/scaffold.ts` — 复制模板、渲染 Handlebars、Git 初始化
- `src/templates/` — 几个栈的模板文件

**最早的三个栈：** node-ts、express、react-spa

### 核心决策（没有完全想清楚的）

1. **为什么不从 create-react-app 改？** 因为需要跨栈的统一接口
2. **为什么用 Commander.js？** npm 上最成熟的 Node.js CLI 框架，链式 API 简洁
3. **为什么用 Handlebars？** 最小模板引擎，零学习成本

### 第一次运行成功

```
tk quick my-app --stack node-ts
```

输出：一个带 package.json、tsconfig.json、src/、tests/ 和 CLAUDE.md 的项目。AI Agent 第一次知道自己的项目上下文。

---

## 第二阶段：栈扩张期（Day 6-20）

### 快速扩张

从 3 个栈快速扩张到 8 个、10 个、13 个。每加一个栈就是加一个 `xxx/` 模板目录。

### 栈扩张的顺序

| 序号 | 栈 | 加入理由 |
|------|-----|---------|
| 1 | node-ts | TypeScript 服务的基础 |
| 2 | express | 最流行的 Node.js API 框架 |
| 3 | react-spa | 前端 SPA |
| 4 | vue | Vue 生态（当时还在思考和 React 的竞争） |
| 5 | nextjs | 全栈 React（App Router） |
| 6 | nuxt | 全栈 Vue（SSR） |
| 7 | fastapi | Python 异步 API |
| 8 | python | Python 脚本/库 |
| 9 | rust | 高性能 CLI/库 |
| 10 | go | Go 微服务 |
| 11 | flutter | 跨平台移动端 |
| 12 | cli-ts | TypeScript CLI 工具 |
| 13 | generic | 自定义项目骨架 |

### 这个阶段的代码质量

- `scaffold.ts` 膨胀到 400+ 行
- 共享 AI 模板开始长出 `if_eq` 森林
- 没有测试（凭感觉相信代码是对的）
- 交互提示很简陋（直接问 4 个问题，没有验证）

---

## 第三阶段：第一次自我审视（Day 21-30）

### 发现问题

1. **共享模板的 if_eq 失控**：`CLAUDE.md.hbs` 里有几十个 `{{#if_eq stack 'xxx'}}` 分支
2. **没有错误处理**：无效输入直接抛非友好错误
3. **没有测试**：改了一行代码也不知道是否破坏了什么
4. **没有版本管理**：改了就改了，没有版本号的概念

### 第一次大重构

- 加入输入验证（`validateInput()`）
- 加入 `ALLOWED_STACK_IDS` 白名单
- 加入路径穿越防护
- 加入 `--force` 覆盖模式
- 开始写临时目录测试

### 决定通过测试来衡量

```typescript
// 第一个测试
it('scaffolds node-ts project with all expected files', async () => {
  const files = await scaffold({...});
  expect(files.length).toBeGreaterThan(3);
  expect(hasFile(files, 'package.json')).toBe(true);
});
```

这个决定的影响远超想象——它迫使 tk 的 API 界面清晰可测。

---

## 第四阶段：多栈组合的诞生（Day 31-40）

### 用户需求

"我的项目是 Express API + React 前端，怎么用 tk 一次生成？"

### 设计选择

考虑过三种方案：
1. 让用户跑两次 `tk quick`，手动合并 → 太麻烦
2. 支持一个参数接受多个栈 → 参数解析复杂
3. `--stack` + `--components` 分离 → 当前方案

### Composer 的第一次实现

`composer.ts` 只有 50 行：

```typescript
mergePackageJson(base, overlay)  // dependencies + scripts 合并
composeScaffold(opts)            // 多栈渲染 + 合并
```

### 冲突问题

"两个栈都生成了 src/routes/index.ts，怎么办？"
→ 后来的者优先（last write wins），但打印 warning

---

## 第五阶段：Karpathy 视角的注入（关键转折点）

### 引入 Karpathy 思维框架

这是 tk 开发过程中最重要的外部视角。Karpathy 的核心问题：

1. **复杂的本质是什么？** neural network 的"认知核心"只有 200 行代码，剩下的靠 scale。你的工具的核心是什么？
2. **条件分支森林在掩饰什么？** `if_eq` 说明共享模板的思路是错的。真正的方案是 per-stack 文件。
3. **你多写了什么？** AI 配置文件的每一行都需要 justify。

### Karpathy 的直接批评

> "你 template 里的 if_eq 应该全部去掉。每个 stack 的文件应该完全独立。你的 CLAUDE.md/hbs 不用知道如果 stack 是 express 应该怎么样——那是 express/CLAUDE.md.hbs 的工作。"

### 具体实施的变革

| 变更 | 之前 | 之后 |
|------|------|------|
| 模板架构 | 共享 + if_eq 森林 | per-stack 文件 |
| CLAUDE.md | 1 个共享文件 | 12 个栈特定文件 |
| AGENTS.md | 1 个共享文件 | 12 个栈特定文件 |
| .cursorrules | 1 个共享文件 | 12 个栈特定文件 |
| Harness 概念 | 不存在 | 3 个契约（CLAUDE + AGENTS + IDE） |
| 测试覆盖 | 基础集成测试 | 60+ 个测试 |
| 错误处理 | 基础验证 | 三层防御 + rollback |

### 第二个 Karpathy 影响："Composability"

> "如果你要把 tools 写进 CLAUDE.md，记住 Claude Code 不需要你告诉它怎么用工具——这是它的 work style 的一部分。AGENTS.md 应该只包含 project-specific 的行为指导。"

这导致了 AI 配置文件的精简——只放项目特定的指令，不放通用 AI 知识。

### Karpathy 的第三个影响：复杂度预算

> "每一行代码、每一个依赖、每一层抽象都必须通过可衡量的收益来证明其存在。"

这个原则直接导致了：
- 不加 agent/skills/hooks 框架（不在默认生成范围内）
- 不加 plugin 系统（`tk add` 已经够用）
- Docker/CI/Security 做成 add-only（不污染默认输出）
- 不在模板中引入 DSL 或自定义语法

---

## 第六阶段：Palmer 视角的交叉验证

### Palmer 的入场

在 Karpathy 的架构大改后，需要第二个视角来交叉验证。Palmer 的第一个评论：

> "Let's only do the least amount of work possible."

### Palmer 发现的问题

#### 1. 目录结构不一致（最严重的批评）

> "你的模板被 mkdir 逻辑污染了。每个 stack 应该自己定义 src/tests 的目录结构——不需要 scaffold.ts 帮你创建。"

→ `hasCustomLayout` 元数据字段加入。Rust、Go、Flutter 等有自建目录结构的栈跳过默认目录创建。

#### 2. 组合覆盖不足

> "你的 mergePackageJson 在被单栈调用时也在运行。如果栈已经自己管好了，就不需要 composer 参与。"

→ 拆分单栈和多栈路径。

#### 3. Prisma 应该解耦

> "Express 和 Prisma 应该分开。用户可能想用 Express + TypeORM 或者其他 ORM。"

→ Express 模板剥离 Prisma，创建 `express-prisma` 作为可选组件。

### Palmer 的竞争对标

Palmer 要求 tk 对标 6 个竞争对手的模板，逐项打分：

| 竞争对手 | 做法 | 学习点 |
|----------|------|--------|
| cookiecutter-pypackage | 全套 CI/CD + AGENTS.md | 安全 CI、uv 包管理器 |
| full-stack-fastapi-template | Docker Compose + CRUD | Docker 基础设施 |
| create-next-app | 极简输出 | 减少默认模板文件 |
| create-vite | 零配置 | 模板自动适配 |
| express-generator | 入门级 | 太少（靠用户自己配太多） |
| flutter create | 完整项目骨架 | Feature 目录结构 |

### 评分体系的建立

每个栈按 5 个维度评分（1-10）：
1. **工具链完整性** — 开发构建测试链条是否完整
2. **AI 配置深度** — CLAUDE.md / AGENTS.md 的指导质量
3. **错误处理** — 编译时和运行时错误提示
4. **文档质量** — README / "What to modify" 的可操作性
5. **竞争对手对比** — 对比该栈最佳实践工具

经过 3 轮迭代评分，所有栈达到 7/10 以上。

---

## 第七阶段：TJ Holowaychuk 的 25% 裁减

### TJ 的核心视角

> "Small, robust tooling. 你的模板有太多行不需要。砍掉 25%。"

### 具体削减

| 削减项 | 删了什么 | 理由 |
|--------|---------|------|
| 模板注释 | package.json.hbs 中的 JSON 注释 | 不 valid |
| 过度示例 | express/routes/index.ts 中 8 个例子 | 3 个足够 |
| 多余脚本 | Makefile 中 10+ 个目标 | 6-7 个就够了 |
| 不存在场景 | Dockerfile 中的 debug config | 生产/开发两阶段足够 |
| 非核心 | 文档中过度夸大的 promise | 说实话 |

### TJ 的 CLI-ts 批评

> "你的 cli-ts 示例命令是 'greet'——没人用一个脚手架工具来生成 hello world CLI。改成 'json' 命令，展示真正的 value——处理 JSON 输入。"

→ cli-ts 的示例从 `greet` 改为 `json`（处理 stdin JSON 的实用命令）。

### TJ 的 infra 批评

> "你把 Docker 和 CI 放在默认输出里？那应该用 `--addons` 标记才对。"

→ 这个洞察和 Palmer 的"最小工作量"原则一致——Docker、CI、Security 全部移出默认输出，改为 add-only。（这个改动已经在更早就完成了，设计思路一致）

---

## 第八阶段：品牌重塑与差距修复

### 品牌重新定位

从"AI developer toolkit"重新定位为 **"Project Harness Generator for AI-Assisted Development"**：

| 方面 | 之前 | 之后 |
|------|------|------|
| 一句话描述 | "AI-ready project scaffolding" | "Project Harness Generator" |
| 核心价值 | 生成项目模板 | 生成 AI Agent 工作框架 |
| 用户感知 | 又一个脚手架 | 让 AI 理解你的项目 |
| 竞品对比 | 列 create-xxx | 列 Context Forge 等 |
| 关键词 | scaffold, template | harness, context, contracts |

### 关键修复

1. **npm 包名冲突**：`tk` → `tkcli`（npm 上有同名的 `tk` 包）
2. **没有 .claude/settings.json**：加入 Claude Code 权限配置
3. **没有 copilot-instructions.md**：加入 GitHub Copilot 支持
4. **tk update 假更新**：内容感知 diff
5. **tk init 不支持 --stack**：加入 `--stack generic` 用于无法自动检测的项目
6. **缺少 eslint 配置**：为所有 7 个 JS/TS 栈加入 `eslint.config.mjs`
7. **缺少 AGENTS.md**：为 6 个缺失栈补上 AGENTS.md

---

## 第九阶段：深潜研究 —— 6 个竞品

### 研究方法

对每个竞争对手做深度代码分析：
1. 下载并运行 `cookiecutter-pypackage` → 分析生成的文件
2. 对比每个文件：它们做了什么 → tk 做了什么 → 差距
3. 生成改进报告 → 按重要性排序 → 实施

### 迭代 1：cookiecutter-pypackage (Python)

| 发现 | tk 的问题 | 改进 |
|------|-----------|------|
| 使用 uv（不是 pip） | pyproject.toml 缺少约束 | 升级包管理器配置 |
| 全套 GitHub Actions | tk python 栈没有 CI | 加入 CI 模板 |
| 有 AGENTS.md | tk python 没有 | 加入 AGENTS.md |
| Sigstore attestation | 太高级，不需要 | —— |

### 迭代 2：full-stack-fastapi-template

| 发现 | tk 的问题 | 改进 |
|------|-----------|------|
| Docker Compose 基础设施 | tk fastapi 没有 compose | 加入 Docker Compose（add-only） |
| CRUD 示例（items/users） | tk 只有 hello world | 加入 CRUD 模式的 README 指引 |
| Pydantic schemas 分离 | schemas 和 models 混合 | 示例中分离 schemas.py |
| Alembic 迁移 | 没有迁移配置 | 加入 pyproject.toml 配置 |

### 迭代 3：flutter create

| 发现 | tk 的问题 | 改进 |
|------|-----------|------|
| Feature-based lib/ 结构 | tk fluter 是 flat 结构 | 重构为 feature-based（counter/） |
| 严格 lint 规则 | 没有 analysis_options.yaml | 加入 flutter_lints + 额外规则 |
| 测试基础设施 | 只有占位测试 | 完整 widget + logic 测试 |
| l10n/coverage | 没有 | 加入 pubspec.yaml 配置 |

### 迭代 4：create-next-app + nuxi init

| 发现 | tk 的问题 | 改进 |
|------|-----------|------|
| Next.js 有 loading/error 边界 | tk nextjs 没有 | 加入 loading.tsx + error.tsx |
| Next.js 有 API route | tk nextjs 只有页面 | 加入 API route 示例 |
| Nuxt 有 server/api/ | tk nuxt 没有 | 加入 server/api/hello.ts |
| Nuxt 4 App 目录 | tk nuxt 用 pages/ | 升级为 Nuxt 4 app/ 结构 |

### 迭代 5：create-vite

| 发现 | tk 的问题 | 改进 |
|------|-----------|------|
| vite.config.ts 开箱即用 | 已经有 | —— |
| 模板最小化 | 已经够小 | —— |
| TypeScript 严格模式 | 没有 | 加入 tsconfig strict |

### 迭代 6：express-generator

| 发现 | tk 的问题 | 改进 |
|------|-----------|------|
| 最基本的项目骨架 | tk express 太多内容 | 适当精简 |
| 不包含 ORM | tk express 绑定了 Prisma | 剥离 Prisma |

---

## 第十阶段：完整测试体系建设

### 测试从 0 到 60+

| 阶段 | 测试数 | 覆盖范围 |
|------|--------|---------|
| 初始 | 0 | 无 |
| 基础 | 8 | CLI 基础设施、基础 scaffold |
| 深度 | 18 | 多栈、错误路径、--force、--dry-run |
| 完整 | 25+ | 所有栈模板完整性、组件组合 |
| 当前 | 60+ | 含超时/压力测试 |

### 测试设计原则

1. **零 mock** — 所有测试在真实临时目录运行
2. **自包含** — 每个测试不依赖其他测试的状态
3. **可断言** — 生成的文件列表用于断言文件名
4. **覆盖完整性** — 每个栈有独立测试断言关键文件存在

---

## 第十一期：当前状态与未来方向

### 当前基线（截至记录时）

| 指标 | 值 |
|------|----|
| 栈数 | 13（含 1 个组件栈） |
| 模板文件 | 200+ .hbs 模板 |
| 命令数 | 6（quick / init / add / update / list / info） |
| 测试数 | 60+ |
| 代码行数 | ~3000 行 TypeScript |
| 依赖数 | 4（commander / handlebars / inquirer / chalk） |
| 外部依赖 | 0 个 AI 或云服务 |
| 包名 | tkcli（npm published） |

### 已完成的核心里程碑

- [x] 13 栈 per-stack AI 配置
- [x] 多栈组合（`--components`）
- [x] Add-only infra（docker/ci/security）
- [x] 内容感知更新（`tk update`）
- [x] 错误回滚
- [x] 所有栈 7/10+ 评分
- [x] 60+ 集成测试
- [x] Karpathy / Palmer / TJ 框架验证
- [x] Brand repositioning（README + package.json）
- [x] .claude/settings.json + copilot-instructions.md

### 剩余操作项

- [ ] 栈特定模板深度提升（Go DDD、Next.js API routes、FastAPI CRUD、Flutter coverage、cli-ts clack、Nuxt type-safe API）
- [ ] 每个栈的 .cursorrules/.windsurfrules 深耕
- [ ] broad open-source research for all 13 stacks
- [ ] User docs / CONTRIBUTING / CHANGELOG
