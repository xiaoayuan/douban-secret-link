# Task Plan: 豆瓣私密链接

## Goal
构建一个独立 Web 应用，允许用户创建私密链接（文字+图片+聊天），只有指定的豆瓣小组成员通过豆瓣 OAuth 验证后才能查看和参与讨论。

## Current Phase
Phase 1

## Phases

### Phase 1: 项目初始化
- [ ] 创建 Next.js 项目骨架（Next.js 16 + TypeScript + Tailwind CSS 4）
- [ ] 配置 Prisma + PostgreSQL
- [ ] 配置 Docker Compose
- [ ] 配置环境变量模板
- [ ] 配置 ESLint
- **Status:** in_progress

### Phase 2: 数据库与模型
- [ ] 编写 Prisma Schema（Secret, SecretImage, AllowedUser, Reply, User）
- [ ] 生成 Prisma Client
- [ ] 编写 seed 脚本
- **Status:** pending

### Phase 3: 豆瓣 OAuth 认证
- [ ] 实现豆瓣 OAuth 2.0 登录流程
- [ ] JWT session 管理
- [ ] 用户信息存储与读取
- [ ] API: /api/auth/login, /api/auth/callback, /api/auth/me
- **Status:** pending

### Phase 4: API 路由
- [ ] /api/secrets - 创建/读取/更新/删除密文
- [ ] /api/replies - 创建/读取回复
- [ ] /api/scrape/group-members - 抓取豆瓣小组成员列表
- [ ] 权限中间件（白名单校验）
- **Status:** pending

### Phase 5: 页面与 UI
- [ ] `/` 首页
- [ ] `/create` 创建密文（含图片上传、白名单批量抓取）
- [ ] `/s/[slug]` 查看密文与聊天
- [ ] `/m/[slug]` 管理密文
- [ ] 响应式布局（移动端优先）
- **Status:** pending

### Phase 6: 测试与交付
- [ ] 功能验证
- [ ] lint 检查
- [ ] Docker 构建验证
- [ ] 交付使用
- **Status:** pending

## Key Questions
1. 豆瓣 OAuth API 当前可用性如何？
2. 豆瓣小组成员页反爬策略如何应对？
3. 图片存储是否需要立即对接 S3/OSS？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Next.js 16 App Router | 与现有 weibo-ops 技术栈一致，经验可复用 |
| Prisma 7 + PostgreSQL | 与现有项目一致，Docker Compose 一键启动 |
| Tailwind CSS 4 | 快速开发响应式UI |
| 豆瓣 OAuth 2.0 认证 | 无需存储密码，安全性和用户体验平衡 |
| 本地上传图片 | 初版简单，后续可迁移 S3 |
| JWT session cookie | 无状态验证，适合 Docker 多实例部署 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- 设计文档: `docs/superpowers/specs/2026-05-12-douban-private-link-design.md`
- 豆瓣 OAuth 需要先在 developers.douban.com 注册应用获取 Client ID/Secret
