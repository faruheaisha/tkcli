# 栈扩展计划 + 模板质量标准

## 目标栈（12 个）

### Web 全栈
1. **nextjs** ✅ — Next.js 15 + App Router + TypeScript
2. **react-spa** — React 19 + Vite + TypeScript + React Router + TanStack Query
3. **vue** — Vue 3 + Vite + TypeScript + Pinia + Vue Router
4. **nuxt** — Nuxt 4 + Vue 3 + TypeScript
5. **express** — Express + TypeScript + Prisma + Zod
6. **fastapi** — FastAPI + Pydantic + SQLAlchemy + pytest

### 原生语言
7. **rust** — Rust + Cargo + clap (CLI) + tokio (async)
8. **go** — Go + Gin/Chi + sqlc + testing
9. **flutter** — Flutter + Dart + Riverpod + go_router

### 数据 / AI / 脚本
10. **python** ✅ — Python + pyproject.toml + pytest
11. **cli-ts** — Node.js CLI + commander + vitest (专注于 CLI 工具开发)

### 通用
12. **generic** ✅ — 无预设栈

## 每个栈必须包含的文件

```
stack-name/
├── CLAUDE.md.hbs          # AI 上下文（核心差异化！）
├── .gitignore.hbs
├── README.md.hbs
├── src/                   # 源文件骨架
├── tests/                 # 测试骨架
├── dev/                   # 开发配置（docker-compose 等）
└── Makefile.hbs / taskfile.yml.hbs  # 构建脚本
```

## CLAUDE.md 质量标准（每个栈必须覆盖）

1. **架构模式** — 该栈的最佳架构实践（如 Rust 的模块系统、Go 的包设计）
2. **目录结构约定** — src/ 下怎么组织文件
3. **测试约定** — 测试文件放哪、命名规范、mock 策略
4. **常见陷阱** — 新手在这个栈最容易犯的 3-5 个错误
5. **AI 指令** — 给 AI 助手的明确指令（代码风格、import 顺序、错误处理模式）
6. **dev 命令** — npm run dev / cargo run / go run 等
7. **构建 & 部署** — 生产构建命令、Docker 事项

## 评分标准（Benchmark Rubric）

| 维度 | 权重 | 满分 | 评分标准 |
|------|------|------|----------|
| 栈覆盖 | 15% | 15 | 支持的栈数量 + 覆盖面 |
| 模板深度 | 25% | 25 | 不只是骨架，有真实业务模式、错误处理、测试 |
| AI上下文质量 | 25% | 25 | CLAUDE.md 的深度、实用性、可执行性 |
| 脚手架DX | 15% | 15 | 安装速度、交互体验、参数灵活性 |
| 可扩展性 | 10% | 10 | 能否加自定义模板、是否支持插件 |
| 健壮性 | 10% | 10 | 错误处理、边界情况、Windows兼容、幂等性 |

总分：100
