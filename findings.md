# Findings & Decisions

## Requirements
- 独立 Web 应用
- 用户创建私密链接（文字 + 图片 + 聊天）
- 只有指定的豆瓣小组成员通过豆瓣 OAuth 验证后才能查看
- 白名单用户之间可以互相聊天
- 批量导入：粘贴豆瓣小组成员页 URL 自动抓取
- 创建者同时支持手动输入 UID 或粘贴主页链接
- 链接生命周期：手动删除 + 可选过期时间（24h/7天/30天/自定义）
- 响应式设计，移动端优先
- Docker 部署

## Research Findings
- 豆瓣 OAuth 2.0 端点：
  - 授权: https://www.douban.com/service/auth2/auth
  - Token: https://www.douban.com/service/auth2/token
  - 用户信息: https://api.douban.com/v2/user/~me
- 需在 https://developers.douban.com 注册应用获取 Client ID / Client Secret
- Scope `douban_basic_common` 仅获取公开基础信息，不涉及隐私

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Next.js 16 App Router | 与现有 weibo-ops 技术栈一致 |
| Prisma 7 + PostgreSQL | 类型安全 ORM，一键 Docker |
| Tailwind CSS 4 | 快速响应式开发 |
| 豆瓣 OAuth 2.0 | 无密码验证，安全 |
| JWT session | 无状态，支持多实例 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
- 设计文档: `docs/superpowers/specs/2026-05-12-douban-private-link-design.md`
- 现有参考项目: `weibo-ops/` (Next.js 16 + Prisma + Docker)
