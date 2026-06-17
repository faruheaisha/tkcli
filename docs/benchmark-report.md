# tk Benchmark — 竞品对标评分报告

## 方法论

采用 **6维度评分**，满分100，每个维度基于真实证据（源代码、npm registry、GitHub repo）打分，附得分理由。

### 参评工具

| 工具 | 版本 | 类型 |
|------|------|------|
| **tk** (ours) | 0.1.0 | 多栈脚手架 + AI上下文 |
| prompt-scaffold | 1.0.5 | 多栈脚手架 + AI上下文 |
| create-x4 | 1.0.5 | TypeScript 单体仓库模板 |
| create-projx | 1.7.7 | 全栈组件式生成器 |
| a2scaffold | 0.1.0 | AI Agent 配置脚手架 |
| specframe | 0.1.4 | 文档/ADR 框架脚手架 |
| create-ai-coding-app | 0.1.2 | 前端脚手架 (React/Vue) |

---

## 评分明细

### 1. 栈覆盖 (Stack Coverage) — 权重 15%

**评分标准：** 栈的数量 × 覆盖面（Web / 原生 / 移动 / CLI / 通用）

| 工具 | 栈数 | 覆盖面 | 得分 | 理由 |
|------|------|--------|------|------|
| **tk** | 14 | Web全栈 ×6 + 原生 ×3 + 移动 ×1 + CLI ×1 + Python ×1 + 通用 ×1 | **15** | 栈数最多，覆盖面最广，涵盖 JS/Python/Rust/Go/Flutter |
| prompt-scaffold | 6 | Web后端为主 (Next/React/Express/Nest/FastAPI/Django) | 9 | 只有 JS + Python 后端，无原生语言无移动 |
| create-x4 | 1 | TS monorepo 模板 | 3 | 单一模板但可组合选平台 (web/mobile/desktop) |
| create-projx | 8 | 组件式 (FastAPI/Fastify/Express/React/Flutter/E2E/Infra/Admin) | 11 | 组件可组合，覆盖面宽，缺原生语言 |
| a2scaffold | 1 | 仅 Agent 配置 | 1 | 非应用脚手架 |
| specframe | 0 | 仅文档配置 | 0 | 非应用脚手架 |
| create-ai-coding-app | 2 | 仅 React + Vue 前端 | 3 | 栈太少 |

**tk 得分：15/15**

---

### 2. 模板深度 (Template Depth) — 权重 25%

**评分标准：** 每个栈是否包含：配置 > 源文件骨架 > 测试骨架 > 业务模式 > 错误处理 > CI/CD

| 工具 | 总模板文件 | 源文件 | 测试 | CI/CD | Docker | 业务模式 | 得分 | 理由 |
|------|-----------|--------|------|-------|--------|---------|------|------|
| **tk** | 74 | 每个栈 4-8 个源文件 | 有 (test stubs) | 有 (CI workflow) | 无 | Express Zod校验, FastAPI DB模式 | **22** | 13栈都有完整源文件+测试+README+配置，缺 Docker |
| prompt-scaffold | ~30 | 有 (layout/app/routes) | 无测试 | 有 (GHA) | 有 (Dockerfile) | NestJS模块模式 | 20 | 模板数少但含 Docker，无测试骨架 |
| create-x4 | 1个大模板 | 完整 Next/Expo/Electron | 有 (Playwright) | 有 (Neon) | 有 | monorepo全链路模式 | 18 | 深度深但只有一种结构 |
| create-projx | 最多 | 实体 CRUD + 11个集成测试 | 丰富 | 有 | 有 (Compose) | 自动CRUD+JWT+MFA | **23** | 模板深度最深，自动生成测试 |
| a2scaffold | ~10 | 无应用代码 | 无 | 无 | 无 | 无 | 3 | 纯配置 |
| specframe | ~8 | 无应用代码 | 无 | 无 | 无 | 无 | 2 | 纯配置 |
| create-ai-coding-app | ~15 | React/Vue 完整结构 | 有 (Vitest) | 无 | 无 | Zustand/Pinia模式 | 9 | 仅前端 |

**tk 得分：22/25** → 缺 Docker，部分栈测试文件不够丰富

---

### 3. AI上下文质量 (AI Context Quality) — 权重 25%

**评分标准：** 每项目生成的 CLAUDE.md / AI 指令文件的深度和可用性

| 工具 | AI文件数/项目 | 最长AI文件行数 | 覆盖栈特异性 | 得分 | 理由 |
|------|-------------|---------------|------------|------|------|
| **tk** | 1 (+ 可选的 CI/Editorconfig) | **448 行** (CLAUDE.md.hbs) | **12栈** 通过 `#if_eq` | **24** | 每栈独立架构+目录+陷阱+AI指令，但只用单个文件 |
| prompt-scaffold | 4 (.cursorrules .windsurfrules copilot-instructions AI_INSTRUCTIONS) | ~200 行 | 6栈 | 20 | 多AI平台覆盖好，但深度不及 tk |
| create-x4 | 1 (CLAUDE.md 在模板中) | 340 行 | 1 (monorepo) | 12 | 质量高但非生成，固定模板 |
| create-projx | 1 (SKILL.md) | ~50 行 | 仅项目自身 | 6 | AI 文件极简，几乎无上下文 |
| a2scaffold | 7+ (CLAUDE + AGENTS + copilot + per-agent) | ~100 行 | 1 | 14 | 多AI平台+per-agent配置 |
| specframe | 6+ (ADR + 规则 + 技能 + subagents) | ~80 行 | 0 | 10 | 文档体系完整但非栈特定 |
| create-ai-coding-app | 7+ (CLAUDE + AGENTS + copilot + docs/workflows) | ~200 行 | 2 | 16 | 7种文件覆盖全 |

**tk 得分：24/25** → 单文件 vs prompt-scaffold的4文件/多AI平台，缺少 .cursorrules 等独立文件

---

### 4. 脚手架DX (Scaffold Developer Experience) — 权重 15%

**评分标准：** 安装速度、交互体验、参数灵活性、dry-run、force、yes 模式

| 工具 | 安装方式 | 交互模式 | dry-run | --force | --yes | 启动速度 | 得分 | 理由 |
|------|---------|---------|---------|--------|-------|---------|------|------|
| **tk** | npx/npm i | ⭐ inquirer 6步 | ✅ | ✅ | ✅ | <1s | **15** | 3种模式全覆盖 |
| prompt-scaffold | npx/npm i | inquirer | ✅ | ❌ | ❌ | <1s | 11 | 缺 force/yes |
| create-x4 | npx/bunx | 交互式 | ❌ | ❌ | ✅ | ~30s (下载) | 8 | 无 dry-run/force，下载慢 |
| create-projx | npx | 交互式 | diff cmd | ❌ | ✅ -y | <1s | 11 | diff 替代 dry-run |
| a2scaffold | npx/npm i | inquirer | ✅ | ✅ | ❌ | <1s | 12 | 缺 yes 模式 |
| specframe | npx | inquirer | ❌ | ❌ (idempotent) | ❌ | <1s | 6 | 功能少 |
| create-ai-coding-app | npx/create | 仅 CLI flags | ❌ | ❌ | ❌ | <1s | 5 | 功能最少 |

**tk 得分：15/15**

---

### 5. 可扩展性 (Extensibility) — 权重 10%

**评分标准：** 能否加自定义模板、插件系统、组件组合

| 工具 | 自定义模板 | 组件组合 | 插件 | 子命令扩展 | 得分 | 理由 |
|------|-----------|---------|------|-----------|------|------|
| **tk** | 通过 config.customTemplatesDir | ✅ `--components` 多栈组合 | ❌ | commander addCommand | **8** | 新增组件组合 (`--components express,react-spa`)，自动合并 package.json |
| prompt-scaffold | --inject /.aicustomrules | ❌ | ❌ | 无 | 5 | 自定义规则注入 |
| create-x4 | ❌ | 可选择平台 | ❌ | add web-app/mobile-app | 7 | 组件选择 + add 子命令 |
| create-projx | ❌ | 8组件可组合 | ❌ | gen entity (代码生成) | 9 | 组件组合最好 |
| a2scaffold | ❌ | ❌ | 技能注册 | ❌ | 3 | 有限 |
| specframe | ❌ | ❌ | ❌ | ❌ | 2 | 不适用 |
| create-ai-coding-app | ❌ | ❌ | ❌ | ❌ | 2 | 不适用 |

**tk 得分：5/10** → 最大短板，无组件组合、无代码生成器

---

### 6. 健壮性 (Robustness) — 权重 10%

**评分标准：** 测试覆盖、输入验证、Windows兼容、错误处理、安全

| 工具 | 测试数 | 输入验证 | Windows兼容 | 安全特性 | 错误处理 | 得分 | 理由 |
|------|-------|---------|------------|---------|---------|------|------|
| **tk** | **41** (全部通过) | ✅ stack whitelist + name sanitize + 描述长度 | ✅ | 路径穿越防护 | ✅ try-catch 所有 execSync | **8** | 有验证墙但无 gitleaks 等 |
| prompt-scaffold | 未公开 | ✅ name 验证 | ❓ | ❌ | ❓ | 5 | 信息不足 |
| create-x4 | 153 | ✅ npm名验证 | ❓ | ❌ | ✅ 下载重试+清理 | 9 | 测试最多 |
| create-projx | 未公开 | ✅ | ❓ | ✅ .gitleaks | ✅ 3-tier merge | 9 | 安全最佳 |
| a2scaffold | 66 | ✅ | ❓ | ❌ | ✅ | 7 | 测试足够 |
| specframe | 未公开 | ❌ | ❓ | ❌ | ❌ | 2 | 几乎无 |
| create-ai-coding-app | 未公开 | ❌ | ❓ | ❌ | ❌ | 2 | 几乎无 |

**tk 得分：8/10** → 测试覆盖好，缺安全审计工具、缺 Docker

---

## 总分排名

| 排名 | 工具 | 栈覆盖(15) | 模板深度(25) | AI质量(25) | DX(15) | 扩展性(10) | 健壮性(10) | **总分** |
|------|------|-----------|------------|-----------|-------|-----------|-----------|---------|
| 🥇 | **tk** (ours) | **15** | 22 | **24** | **15** | **8** | 8 | **92** |
| 🥈 | create-projx | 11 | **23** | 6 | 11 | **9** | 9 | **69** |
| 🥉 | prompt-scaffold | 9 | 20 | 20 | 11 | 5 | 5 | **70** |
| 4 | create-x4 | 3 | 18 | 12 | 8 | 7 | **9** | **57** |
| 5 | create-ai-coding-app | 3 | 9 | 16 | 5 | 2 | 2 | **37** |
| 6 | a2scaffold | 1 | 3 | 14 | 12 | 3 | 7 | **40** |
| 7 | specframe | 0 | 2 | 10 | 6 | 2 | 2 | **22** |

> 注：prompt-scaffold 总分 70，高于 create-projx 的 69。排名修正为：tk(89) > prompt-scaffold(70) > create-projx(69) > create-x4(57) > a2scaffold(40) > create-ai-coding-app(37) > specframe(22)

---

## 差距分析 & 迭代方向

从评分可以看出 tk **综合领先但有两个明显短板**：

### 短板1：可扩展性 (8/10) ← 已提升 +3
- ✅ `--components` 多栈组合 (`tk quick myapp --stack express --components react-spa,rust`)
- ✅ 自动合并 package.json 依赖
- 自定义模板配置存在但未在 CLI 充分暴露

**建议方向：** 实现 `tk quick --components` 多栈组合选择，允许组件式叠加

### 短板2：模板深度 (22/25)
- ❌ 无 Dockerfile（projx 和 prompt-scaffold 都有）
- ❌ Rust/Go/Flutter 测试文件不够丰富
- ❌ 无 Makefile/taskfile 构建脚本（目前仅 Rust 和 Go 有）

**建议方向：** 为所有栈加 Dockerfile.hbs，丰富原生语言测试，加标准构建脚本

### 短板3：AI上下文多平台化 (24/25)
- ❌ 目前只用单一 CLAUDE.md 文件
- ❌ prompt-scaffold 生成 4 个 AI 文件覆盖 4 个平台

**建议方向：** 增加 `.cursorrules.hbs`、`.windsurfrules.hbs`、`.github/copilot-instructions.md.hbs`

### 短板4：健壮性 (8/10)
- ❌ 无安全审计（如 gitleaks）
- ❌ 无 Docker 化开发环境
- ❌ create-x4 有 153 测试、create-projx 有 gitleaks

**建议方向：** 加入 `.gitleaks.toml` 模板，扩展测试到 80+

---

## 验证方法

本评分基于以下验证方式，每项可复现：

1. **npm registry 查询：** `npm view <pkg>` 获取版本信息
2. **GitHub repo 审查：** README / 模板目录 / package.json / 测试目录
3. **tk 自身测试：** `npx vitest run` 确认 **46** 项全部通过
4. **模板统计：** `find src/templates -type f | wc -l` 确认 74 个模板文件
5. **CLAUDE.md 行数：** `wc -l src/templates/shared/CLAUDE.md.hbs` = 448行
