# 私密链接 — 项目文档

## 项目概述

一个基于豆瓣小组的私密内容分享平台。管理员设置豆瓣小组成员白名单，小组成员注册后可创建带验证数字的私密链接，分享给白名单用户查看和聊天。

**地址**: https://db.971014.xyz

## 技术栈

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Prisma 7 + PostgreSQL
- Nginx 反向代理 + Let's Encrypt SSL
- 部署: Ubuntu 22.04 VPS

## 核心功能

### 1. 账户系统

| 功能 | 说明 |
|------|------|
| 注册 | 输入豆瓣UID + 密码，昵称自动从白名单读取 |
| 登录 | UID + 密码 |
| 改密码 | 顶部导航栏"改密"按钮 |
| 首位注册者 | 自动成为管理员 |
| 激活机制 | 管理员手动激活 / 评论区扫描激活 |

### 2. 白名单管理

| 功能 | 说明 |
|------|------|
| 全量扫描 | 输入豆瓣小组成员页URL，自动翻页抓取所有成员 |
| 手动添加 | 输入UID添加，昵称自动从豆瓣抓取 |
| 全选删除 | 勾选成员批量删除 |
| 用户保护 | 标记用户为受保护，清理时不会被禁用 |

### 3. 私密链接

| 功能 | 说明 |
|------|------|
| 创建密文 | 文字 + 图片 + 验证数字 + 过期时间 |
| 访问密文 | 登录 → 输入验证数字 → 查看内容 |
| 聊天回复 | 文字 + 图片，每3秒自动刷新 |
| 链接识别 | 豆瓣链接绿色可点击，其他链接蓝色 |
| 创建者管理 | 开关密文、删除密文 |

### 4. 安全机制

- 全站 `robots: noindex, nofollow`
- 所有API需登录认证
- Cookie HttpOnly + SameSite
- 验证数字二次保护密文
- 只有白名单UID可注册
- 退出小组的用户自动禁用

## 部署

```bash
# VPS部署流程
cd /root/douban-secret-link
git checkout -- . && git pull
npm install
npm run db:generate && npm run db:push -- --accept-data-loss
rm -rf .next && npm run build
fuser -k 3006/tcp
PORT=3006 HOSTNAME=0.0.0.0 AUTH_COOKIE_SECURE=true UPLOAD_DIR=/var/www/dsl/uploads nohup npx next start -p 3006 > /tmp/dsl.log 2>&1 &
```

## Nginx配置

- 80端口 → 301重定向到HTTPS
- 443端口 → 反向代理localhost:3006
- `/uploads/` → nginx直接服务静态文件
- SSL证书: acme.sh + Let's Encrypt，自动续期

## 环境变量

| 变量 | 说明 | 生产值 |
|------|------|--------|
| DATABASE_URL | PostgreSQL连接 | postgresql://postgres:password@ip:5432/dsl_prod |
| JWT_SECRET | JWT签名密钥 | 至少32字符随机串 |
| AUTH_COOKIE_SECURE | Cookie Secure标志 | true (HTTPS) |
| UPLOAD_DIR | 上传文件存储路径 | /var/www/dsl/uploads |
| SCRAPE_DELAY_MS | 抓取间隔(防风控) | 2000 |
| SCRAPE_PROXY | HTTP代理 | 可选 |

## API路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册 |
| `/api/auth/login` | POST | 登录 |
| `/api/auth/me` | GET | 当前用户 |
| `/api/auth/logout` | GET | 登出 |
| `/api/auth/password` | POST | 改密码 |
| `/api/secrets` | POST | 创建密文 |
| `/api/secrets/[slug]` | GET/PATCH/DELETE | 密文操作 |
| `/api/secrets/[slug]/verify` | POST | 验证数字 |
| `/api/secrets/[slug]/replies` | POST | 发送回复 |
| `/api/upload` | POST | 上传图片 |
| `/api/admin/users` | GET/PATCH | 用户管理 |
| `/api/admin/members` | GET/POST/DELETE | 白名单管理 |
| `/api/admin/group` | GET/POST | 小组同步 |
| `/api/admin/activate` | POST | 评论区激活 |
| `/api/admin/proxy` | GET/POST | 抓取设置 |

## 数据库模型

- **User**: 用户(UID/密码/角色/状态/保护标记)
- **Secret**: 密文(标题/内容/验证数字/创建者/过期时间)
- **SecretImage**: 密文图片
- **Reply**: 回复(内容/作者)
- **GroupMember**: 小组成员白名单
- **SystemSetting**: 系统设置(小组URL/代理/Cookie)

## 管理员账号

- UID: `admin`
- 密码: `admin123`
- 面板: `/admin`
