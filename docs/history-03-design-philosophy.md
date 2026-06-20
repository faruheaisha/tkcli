# 设计哲学与决策日志：tk 为什么这样设计

> **视角**：从设计决策的角度，记录 tk 每个关键"为什么"——为什么这样做而不是那样做，背后是什么原则，代价是什么。

---

## 核心命题：Scaffolder 还是 Harness？

### 问题

tk 的项目生成能力让它看起来像一个"脚手架工具"。如果你只看表面，它会和 create-next-app、create-vite、cookiecutter 放在一起比较。但脚手架只做一半——它生成代码，但不管 AI 是否理解代码。

### 定义

tk 将自己定位为 **Harness Framework（项目工作框架）** 而非 Scaffolder（脚手架）：

| 维度 | Scaffolder | Harness Framework |
|------|-----------|------------------|
| 输出 | 项目代码 | 项目代码 + AI 理解能力 |
| 核心文件 | package.json, src/ | package.json, src/, **CLAUDE.md, AGENTS.md, .cursorrules** |
| 用户 | 开发者（人） | 开发者 + AI Agent |
| 可维护性 | 需要手动写文档 | AI 自动理解项目结构 |
| 迭代能力 | 每次修改需解释上下文 | AI 自带项目上下文 |

### 架构含义

这个定位的架构含义：
1. AI 配置文件不是"附属品"，是和源代码同等重要的输出
2. 每个栈的 AI 配置需要独立维护——不同栈的 AI 需要不同的指令
3. 工具必须支持**增量注入**（`tk init`）——已有项目也能获得 AI 理解能力

---

## 设计原则一：Per-Stack 优于 Shared

### 决策

每个技术栈生成独立的 CLAUDE.md、AGENTS.md、.cursorrules、.windsurfrules——不与别的栈共享模板。

### 为什么

共享模板需要条件分支来区分不同栈：

```
{{#if_eq stack 'node-ts'}}
## 指令
npm run dev, npm test
{{/if_eq}}

{{#if_eq stack 'rust'}}
## 指令
cargo run, cargo test
{{/if_eq}}
```

随着栈增加到 13，同一个文件里有几十个条件分支。这产生了四个问题：

1. **认知负荷高**——单文件超过 100 行，理解它等于理解所有栈
2. **维护耦合**——加一个新栈需要改 N 个共享模板
3. **容易遗漏**——忘记更新某个共享模板，生成错误的 AI 配置
4. **测试覆盖难**——每个条件组合需要独立测试

### 代价

- 每个栈多 4-5 个文件（CLAUDE.md.hbs、AGENTS.md.hbs 等），13 个栈多 ~60 个文件
- 跨栈一致性需要手动维护（所有栈的 AGENTS.md 都遵循相同的结构约定）
- 栈越多，模板目录越膨胀

### 判断标准

当共享模板中的条件分支超过 3 个时，就应该拆成 per-stack 文件。这是 TK 的经验阈值：3 个 if 是便利，超过 3 个就是设计错了。

---

## 设计原则二：Add-Only Infra

### 决策

Docker、CI/CD、Security 配置不作为默认输出。用户需要显式指定 `--addons docker,ci,security` 才会生成。

### 为什么

脚手架工具最容易被指责的一点是"生成太多文件"。每个项目都带 Dockerfile 未必有用——也许用户的目标是部署到 serverless 平台。

TJ Holowaychuk 对此的观点很直接："You should not ship what users didn't ask for."

Karpathy 的版本："每一行代码都需要 justify——Docker 在 node-ts 项目中的 justify 是什么？用户可能不部署。"

### 代价

- 用户需要多记一个 `--addons` 参数
- 不能再宣称"一条命令生成完整生产项目"（因为完整需要 `--addons docker,ci`）

### 判断标准

如果一项功能不是 >80% 用户的初始需求，就应该做成可选的。Docker 不是、CI 不是、Security 不是。

---

## 设计原则三：零 AI 依赖

### 决策

tk 本身不使用任何 AI 技术（LLM、embedding、AI API）。它是一个纯工具。

### 为什么

如果你的依赖是 AI 工具（LLM API），你的用户遇到的问题：

| 问题 | 具体表现 |
|------|---------|
| 可用性 | API 关闭、超时、限流时工具不可用 |
| 成本 | 每次使用 token 成本 |
| 延迟 | API 调用 1-5 秒延迟 |
| 确定性 | 同样的输入产生不同的输出 |
| 离线 | 没有网络就不能用 |

tk 生成的是 AI 工具的工作上下文，但自己不依赖 AI。

### 代价

- 不能做"智能模板"（根据用户描述自动选择最合适的栈）
- 不能做"项目分析"（读取已有项目自动优化配置）
- 更长的代码（很多逻辑用手工编码实现，而不是 LLM 生成）
- 在某些场景下用户期望"AI 帮我选栈"，但 tk 需要手动指定

### 判断标准

如果可以在离线/无 AI 环境下工作，就可以加。否则不加。tk 只在 npm 包依赖层面有网络依赖（安装时），使用时不依赖任何网络。

---

## 设计原则四：自包含模板

### 决策

每个栈的模板是自包含的——不需要外部库、外部模板、运行时代码来渲染。Handlebars 就是运行时，`.hbs` 文件就是全部输入。

### 为什么

```
// 错误的做法
src/templates/shared/_partials/header.hbs  ← 被多个栈引用
src/templates/express/index.hbs ← 引用了 _partials/header.hbs
```

这种"部分共享"模式在 Web 框架中常见（如 Rails 的 partials），但不适合项目脚手架：

1. **移动即破坏**——移动 shared/header.hbs 会破坏所有引用它的模板
2. **隐式依赖**——一个栈需要哪些共享部分只有运行时才知道
3. **渲染上下文不透明**——某个 partial 需要的变量需要用户猜

tk 的做法：

```
// 正确的做法
src/templates/express/CLAUDE.md.hbs  ← 完全自包含
src/templates/rust/CLAUDE.md.hbs     ← 完全自包含
```

每个文件都包含自己需要的全部信息。模板之间没有交叉引用。

### 代价

- 文件之间有内容重复（每个栈的 AGENTS.md 都有类似的"how to install"部分）
- 修改需要批量操作（改一个公共格式得改 13 份）
- 文件总数大（13 个栈 × 每个栈 10+ 文件 = 150+ 文件）

### 判断标准

如果一段内容在两个或以上栈中出现，复制而不是共享。直到复制超过 5 次且变更成本明显高于维护成本，才考虑提取公共部分。

---

## 设计原则五：三层错误防御

### 决策

每个用户输入都经过三层检查：类型验证 → 白名单 → 运行时保护。

### 为什么

脚手架工具的直接用户是开发者，但开发者也会犯安全错误：

1. **路径穿越攻击示例**
   ```
   tk quick ../../etc --stack node-ts
   ```
   如果不检查，项目名中的 `..` 会导致在 `/etc` 下创建文件。

2. **栈注入示例**
   ```
   tk quick my-app --stack "rm -rf /"
   ```
   如果不做白名单，字符串被直接用作目录名。

3. **文件名覆盖示例**
   多栈组合时，两个栈可能生成同名文件覆盖彼此。

### 三层设计

```
第一层：validateInput()
  → 栈 ID 白名单检查
  → 项目名安全字符检查（仅字母、数字、点、横线、下划线）
  → 描述长度限制（≤200 字符）
  → 组件栈 ID 白名单

第二层：copyTemplates()
  → 路径穿越检测（destPath startsWith resolvedDest）
  → 隐藏文件忽略（_ 前缀）

第三层：scaffold() try/catch
  → 任何错误 → 删除整个目标目录（Rollback）
  → 用户看到的错误信息：可操作的消息（"Use --force to overwrite"）
```

---

## 设计原则六：返回列表，不返 void

### 决策

tk 的每个核心函数都返回**操作的文件列表**，而不是 void。

```typescript
// 正确的做法
export async function scaffold(opts): Promise<string[]> {
  // ... 生成文件
  return createdFiles;  // [绝对路径1, 绝对路径2, ...]
}

// 错误的做法
export async function scaffold(opts): Promise<void> {
  // ... 生成文件
  // 调用者无法知道生成了什么
}
```

### 为什么

返回文件列表支持三个关键场景：

1. **测试断言**——`expect(hasFile(files, 'Cargo.toml')).toBe(true)`
2. **差异比较**——`tk update` 需要对比新旧文件列表
3. **组合追踪**——`composeScaffold()` 需要知道每个栈生成了什么

### 影响

这个设计产生了连锁的积极结果：
- 所有子命令（init、add、update）都返回文件列表
- 前端交互（显示生成数量、timing）不需要额外跟踪
- 测试可以通过文件列表检查结果，不需要读文件内容

---

## 设计原则七：内容感知更新

### 决策

`tk update` 在写文件前先读已有文件，只有内容变化时才写入。

### 为什么

用户运行 `tk update` 的正常场景不是"我改了模板想重新生成"，而是"我不确定我的 AI 配置是否最新了，跑一下确保没问题"。

如果每次运行都重写所有文件，用户看到的 `git diff` 全是假变更（仅仅因为 Handlebars 重新渲染了相同的内容）。

### 实现

```typescript
if (existsSync(destPath)) {
  const existing = readFileSync(destPath, 'utf-8');
  if (existing === final) {
    result.unchanged.push(destPath);  // 不变
    continue;  // 跳过写入
  }
  writeFileSync(destPath, final, 'utf-8');
  result.updated.push(destPath);     // 有变更
} else {
  writeFileSync(destPath, final, 'utf-8');
  result.newFiles.push(destPath);    // 新文件
}
```

输出：**"10 template files (3 updated, 7 unchanged)"** — 精确的信息，零噪音。

---

## 设计原则八：Debt-Free Defaults

### 决策

tk 默认生成最少的文件，不预设用户的需求。

### 实际含义

```
tk quick my-app --stack nextjs
→ 生成:
  - src/app/ (layout, page, globals.css)
  - tests/
  - package.json, tsconfig.json, next.config.ts
  - CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules
  - .claude/settings.json, .github/copilot-instructions.md
  - .gitignore, .editorconfig

→ 不生成（需要 --addons）:
  - Dockerfile （没有 --addons docker）
  - .github/workflows/ci.yml （没有 --addons ci）
  - .gitleaks.toml, .pre-commit-config.yaml （没有 --addons security）
```

### 为什么

每个默认文件都是一项债务——用户必须理解它、维护它、在不需要时删除它。

引用 Palmer 的话："默认值应该是 80% 用户需要的——超出部分用选项。"

### 判断标准

如果一项功能 >20% 的用户不需要，就不应该作为默认。

---

## 设计原则九：没有 Plugin 系统

### 决策

tk 不加 plugin/extension 系统。

### 为什么

加 plugin 系统意味着：

1. **一个稳定 API**——plugin 接口一旦发布就是长期承诺
2. **文档冗余**——需要 plugin 开发文档和指南
3. **版本管理**——plugin 和内核版本兼容性

目前 tk 的"plugin 系统"就是 Handlebars 模板 + 文件系统约定：
- 把模板目录放入 `src/templates/`
- 在 `stacks.ts` 中注册
- 用 `tk add` 追加组件

这已经足够满足所有已知场景。

### 代价

- 第三方不能为 tk 写扩展
- 某些"通过 plugin 自动化"的场景需要改 tk 核心代码

### 何时加

如果同时满足以下条件：
1. 有超过 10 个外部团队请求写 plugin
2. 目前的模板方案明确不够用
3. 有维护 plugin 系统的资源

---

## 设计原则十：Ergonomic CLI

### 决策

tk 的 CLI 接口遵循"串行学习曲线"的设计——从最简到最复杂，每个阶段都有对应的使用方式。

### 三阶段使用

#### 阶段一：完全交互

```
tk quick
→ 6 步提示：项目名 → 描述 → 选择栈 → AI → Git → 安装
→ 不需要记任何参数
```

#### 阶段二：部分提示

```
tk quick my-app
→ 3 步提示：描述 → 选择栈 → 安装（AI 和 Git 用默认 true）
→ 知道项目名就够了
```

#### 阶段三：完全非交互

```
tk quick my-app --stack nextjs --description "My app" -y
→ 不提示，全参数
→ 适合脚本化和 CI 环境
```

### 每个阶段的使用场景

| 阶段 | 用户 | 场景 |
|------|------|------|
| 交互 | 新用户 | 首次使用，探索栈选项 |
| 部分 | 普通用户 | 知道项目名，不记得参数 |
| 非交互 | 高级用户 | 脚本、重复操作、CI |

---

## 技术栈决策

### 为什么 Commander.js 而不是 yargs

| 方面 | Commander.js | yargs |
|------|-------------|-------|
| API 风格 | 链式调用 | 配置对象 |
| TypeScript 支持 | 原生 | 社区类型 |
| 维护状态 | TJ 维护中 | 活跃 |
| tk 的选择理由 | 链式 .command().description().action() 极简 | — |

真正的理由：链式 API 和 tk 的脚手架模式一致——构建器模式。

### 为什么 Handlebars 而不是 EJS/Pug

| 方面 | Handlebars | EJS |
|------|-----------|-----|
| 语法 | `{{var}}` 零学习 | `<%= var %>` 类似 JS |
| 逻辑 | 无逻辑（禁止业务逻辑） | 嵌入 JS |
| 安全性 | 默认 HTML 转义 | 需手动控制 |
| tk 的选择理由 | 模板不是程序，不应有逻辑 | — |

核心原因：Handlebars 强制模板不包含业务逻辑。EJS 允许在模板中写任意 JavaScript——这在脚手架中引入运行时错误的主要来源。

### 为什么 inquirer 而不是 clack

| 方面 | inquirer | clack |
|------|---------|-------|
| 成熟度 | 最广泛使用的 Node.js 提示库 | 较新 |
| 维护 | 活跃维护（12.x） | 维护中 |
| 功能 | 全部需要（checkbox、list、confirm） | 基本覆盖 |
| tk 的选择理由 | 稳定，已知问题少 | — |

inquirer 是"不会错的选择"。clack 的动画视觉效果更适合消费级工具，不太适合 tk 这样的工程工具。

### 为什么 chalk 而不是 picocolors

| 方面 | chalk | picocolors |
|------|-------|-----------|
| 大小 | 较大 | 极小 |
| 功能 | 完整（包括 dim、magenta 等全部样式） | 基础 |
| tk 的选择理由 | chalk.magenta("✦") + chalk.dim() 等样式需要 | — |

tk 的日志系统用到了 `chalk.magenta`（magic 输出）、`chalk.dim`（次要信息）、`chalk.cyan`（spinner）。picocolors 不支持 `magenta`。

---

## 命名决策

### 项目名：tk

短、打字快、不是已有项目的名字（检查过 npm）。

### 包名：@faruhe/tkcli

npm 上已有 `tk`（Tk toolkit for Tcl），且 `tkcli` 被 npm 判定与 `tk-cli` 过于相似而拒绝，因此采用带 scope 的 `@faruhe/tkcli`。命令名仍是 `tk`。

### 命令名

```
quick    → "快速生成"（语义最清晰）
init     → "初始化已有项目"（行业标准）
add      → "追加组件"（Git 风格）
update   → "更新配置"（语义直接）
list     → "列出信息"（标准命名）
info     → "版本信息"（行业标准）
```

`quick` 没有用 `create` 或 `new`，原因：
- `create` 已被 npm 官方使用（`npm create`），容易混淆
- `new` 太宽泛
- `quick` 强调速度——这也是 tk 的核心卖点

### 栈命名

```
node-ts       → 不是 "node-typescript"（太长）
react-spa     → 不是 "react"（可能和 React 服务端渲染混淆）
express-prisma → 组件栈，命名样式：{parent}-{feature}
```

约定：小写 kebab-case，不超过 12 字符。

---

## 反模式与拒绝清单

### 完整拒绝的问题清单

| 被拒绝的提案 | 被拒绝的理由 | 替代方案 |
|-------------|-------------|---------|
| 加 plugin 系统 | 复杂度过高，现有模板机制够用 | Handlebars + 文件约定 |
| 加 AI 自动选择栈 | 不满足"零 AI 依赖"原则 | 交互式选择 |
| 用远程模板仓库 | 不满足"自包含"原则 | 本地模板 |
| 加 UI 界面 | CLI 即可，不增加维护维度 | CLI |
| 加代码生成 API | 不一致（不满足"纯工具"原则） | Handlebars |
| 加依赖清理工具 | 超出范围，有更好的工具（如 depcheck） | 推荐用户使用 depcheck |
| 加配置文件管理 | 用户自己管理配置文件 | — |
| 加项目迁移工具 | 不同栈的项目迁移是运行时问题 | 推荐用户手动迁移 |
| 加模板市场 | plugin 系统的变种，复杂性更高 | — |

### 每个拒绝的合理性

#### Plugin 系统

如果加了 plugin 系统，tk 需要：
1. 定义 plugin 接口（生命周期、hook 点、错误处理）
2. 编写 plugin 开发文档
3. 维护 plugin 兼容性
4. 管理 plugin 仓库或目录约定

目前生成一个新栈只需要：创建模板目录 + 在 `stacks.ts` 注册 + 写测试。接口复杂度 ≈ 0。

plugin 系统只有在超过 10 个独立团队需要写扩展时才划算。目前不需要。

#### AI 功能（自动识别栈、优化配置等）

tk 的战略定位是"AI 的工作框架"，但自己不使用 AI。如果 tk 本身依赖 AI：
- 离线不可用
- 每次都花 token
- 非确定性输出
- API 崩溃时不可用

"纯工具"是 tk 相对于 AI-first tools（如 v0、bolt.new）的差异化优势。

#### UI 界面

CLI 工具是最适合脚手架场景的交互界面：
- 可以在 headless 环境运行
- 可以集成到 CI pipeline
- 可以通过脚本自动化
- 维护成本远低于 GUI

---

## 错误哲学

### 错误信息格式

每条错误信息遵循"出错信息 + 可操作建议"：

```
✔ 错误信息：Directory "my-app" already exists and is not empty.
→ 可操作建议：Use --force to overwrite.

✔ 错误信息：Unknown stack "nonexistent". Allowed: node-ts, express, ...
→ 可操作建议：Run 'tk list' to see all available stacks.

✔ 错误信息：Invalid project name "my project!!!".
→ 可操作建议：Use only letters, numbers, dots, hyphens, and underscores.
```

### 不要做的

- 不打印 stack trace
- 不输出内部状态
- 不用"Something went wrong"这种无信息错误
- 不用情绪化表述

### 错误码

所有错误通过 `process.exit(1)` 退出。不定义错误码区分——目前不需要自动化处理不同错误类型的场景。

---

## 测试哲学

### 核心原则

1. **零 mock** — 使用真实临时目录。mock 文件系统会导致"测试通过但生产失败"的差异。
2. **每个测试独立** — 不依赖其他测试的产物。每个测试创建自己的临时目录。
3. **断言行为，不实现** — 断言生成的文件列表，不断言函数调用的顺序或内部状态。

### 测试覆盖策略

```
必须测试：
  ✓ 正常路径（每种栈至少一个）
  ✓ 错误路径（无效输入、非法操作）
  ✓ 边界值（空项目名、最长描述、非法字符）
  ✓ --force 覆盖
  ✓ --dry-run 不写文件
  ✓ 组件组合（多栈合并）
  ✓ 安全注入（路径穿越、shell 注入）
  ✓ 模板渲染正确性（无残留 {{}}）

不测试：
  ✗ Commander.js 本身的参数解析（相信 Commander）
  ✗ Handlebars 本身的模板渲染（相信 Handlebars）
  ✗ Git 操作的错误处理（依赖于 Git 环境）
  ✗ npm install 的成功率（依赖于网络环境）
```

---

## 复杂度预算

### 允许的复杂度

| 维度 | 允许 | 不允许 |
|------|------|--------|
| 依赖数 | ≤10 | >10 |
| 核心模块行数 | ≤400 | >400 |
| 每个栈模板数 | ≤20 | >20 |
| 命令数 | ≤10 | >10 |
| 测试执行时间 | ≤30s | >60s |

### 当前状态

| 维度 | 当前值 | 状态 |
|------|--------|------|
| 依赖数 | 4 | 良好 |
| scaffold.ts 行数 | ~320 | 良好 |
| 每个栈模板数 | 6-15 | 良好 |
| 命令数 | 6 | 良好 |
| 测试执行时间 | ~5s | 良好 |

### 超出预算的应对

如果某个维度超出预算：
1. 优先删除而非增加
2. 无法删除时提取成独立模块
3. 独立模块还不行就单独成包

---

## 总结：设计决策树

当面对新功能请求时，tk 的设计决策树：

```
新功能请求
├── 这个功能是否需要 AI 能力？
│   ├── 是 → 拒绝（零 AI 依赖原则）
│   └── 否
│
├── 这个功能是否需要增加默认输出？
│   ├── 是 → >80% 用户需要吗？
│   │   ├── 是 → 加入默认
│   │   └── 否 → 做成选项/插件
│   └── 否
│
├── 这个功能是否需要新的依赖？
│   ├── 是 → 加入后依赖数超过 10？
│   │   ├── 是 → 拒绝或用已有依赖实现
│   │   └── 否 → 评估依赖质量后决定
│   └── 否
│
├── 这个功能是否需要修改模板协议？
│   ├── 是 → 向后兼容吗？
│   │   ├── 是 → 评估后决定
│   │   └── 否 → 需要明确版本升级策略
│   └── 否
│
├── 这个功能能否用现有机制实现？
│   ├── 是 → 实现（tk add、--addons、--components 等）
│   └── 否 → 拒绝/归档
│
└── 这个功能的核心行数多少？
    ├── <100 行 → 直接加
    ├── 100-300 行 → 设计后加
    └── >300 行 → 需要整体评估
```
