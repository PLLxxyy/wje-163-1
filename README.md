# 社区回收站预约管理系统

全栈社区可回收物回收站预约管理系统，支持居民预约回收、回收员接单、管理员后台管理等功能。

## 技术栈

- **前端**：Vite + React 18 + TypeScript（默认端口 5183）
- **后端**：Express + TypeScript + better-sqlite3（默认端口 3213）
- **认证**：JWT + bcryptjs
- **样式**：内联 style 标签（无第三方 UI 库）
- **启动**：concurrently 同时启动前后端

## 启动方式

```bash
# 安装所有依赖
npm run install:all

# 启动开发服务器（前后端同时启动）
npm run dev
```

启动后访问 http://localhost:5183

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 居民 | resident | 123456 |
| 回收员 | recycler | 123456 |
| 管理员 | admin | 123456 |

## 功能说明

### 居民端
- 注册登录（支持居民和回收员角色注册）
- 查看附近回收站列表（名称、地址、营业时间、排队人数）
- 站点详情查看（回收品类及价格）
- 预约上门回收或到站回收
- 查看我的预约（状态：待接单→回收中→待确认→已完成）
- 确认回收完成
- 评价回收员
- 个人中心（回收记录、累计收益、月度趋势）

### 回收员端
- 查看待接单列表
- 接单操作
- 填写实际称重和金额，标记完成
- 评价居民
- 查看个人评分和接单统计

### 管理员后台
- 回收站信息管理（增删改）
- 回收品类价格调整
- 各站点订单量和回收量统计排行
- 月度统计图表
- 回收员接单量和服务评分查看

## 项目结构

```
wje-163/
├── package.json          # 根目录，concurrently 启动
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts      # Express 服务入口，所有路由
│       ├── db.ts         # SQLite 数据库初始化和 seed
│       ├── auth.ts       # JWT 认证中间件
│       └── types.ts      # TypeScript 类型定义
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts    # Vite 配置，代理 /api 到 3213
    ├── index.html        # 包含所有样式
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types.ts
        ├── api.ts
        ├── context/AuthContext.tsx
        ├── components/Toast.tsx
        ├── components/Navbar.tsx
        ├── components/StarRating.tsx
        └── pages/        # 各页面组件
```

## 注意事项

1. 数据库文件 `server/data.db` 会在首次启动时自动创建，包含建表和初始数据
2. 前端通过 Vite 代理 `/api` 请求到后端 3213 端口
3. 仅使用 `concurrently` 作为根目录的 devDependency
4. 所有样式写在 `index.html` 的 `<style>` 标签中，无 CSS 文件导入
5. seed 数据包含 4 个回收站、多个回收品类、示例预约和评价记录
6. 可通过 `VITE_PORT`、`VITE_API_PORT`、`PORT` 和 `JWT_SECRET` 覆盖默认配置
