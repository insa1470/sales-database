# Cloudflare Pages 部署指南

## 部署指令（每次改完代码后执行）

```bash
~/.nvm/versions/node/v24.14.1/bin/node ~/.nvm/versions/node/v24.14.1/bin/wrangler pages deploy /Users/insahung/Documents/10_進行中專案/業務系統/行銷資料庫 --project-name=sales-database --branch=main
```

---

## 背景与检讨（2026-04-16）

### 问题描述
修改 index.html 后，无法自动部署到 Cloudflare Pages，导致花了大量时间才让网站更新。

### 根本原因

1. **没有 Git integration**
   - 这个 Cloudflare Pages 项目当初是用「直接上传」建立的，没有连接 GitHub
   - 因此 push 到 GitHub 不会触发自动部署
   - Dashboard 上显示「没有 Git 连线」

2. **wrangler 未登录**
   - 本机没有安装全局 wrangler，需要透过 nvm 的 node 路径执行
   - 第一次使用需要先执行 `wrangler login` 完成授权

3. **npx 无法使用**
   - 终端机的 zsh 环境没有自动加载 nvm，导致 `npx` 命令找不到
   - 需要完整路径才能执行

### 解决过程
1. 确认 nvm 已安装 node v24.14.1
2. 用完整路径执行 `wrangler whoami` 确认登录状态
3. 用完整路径执行 `wrangler pages deploy` 成功部署

### 下次避免的方法

**每次改完代码，直接执行上方的部署指令**，不要依赖 GitHub 自动部署。

### 待改善（未来可做）
- 在 Cloudflare Pages 连接 GitHub repo，实现 push 自动部署
- 或者把部署指令写成 alias 加进 ~/.zshrc，简化操作

---

## 项目基本信息

| 项目 | 值 |
|------|-----|
| Cloudflare 账号 | Insa.eco@gmail.com |
| Pages 项目名称 | sales-database |
| 网址 | sales-database.pages.dev / sales.deepmystic.net |
| GitHub repo | github.com/insa1470/sales-database |
| D1 数据库 | marketing-db |
| Node 路径 | ~/.nvm/versions/node/v24.14.1/bin/ |
