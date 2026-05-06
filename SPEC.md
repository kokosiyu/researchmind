# 智研笔记（ResearchMind）系统项目书

> 文档版本：v2.0
> 最后更新：2026-05-05
> 项目地址：https://github.com/your-repo/researchmind

---

## 一、项目概述

### 1.1 项目简介

**智研笔记（ResearchMind）** 是一款面向科研人员、研究生和学术工作者的智能论文管理与笔记协作平台。平台支持用户上传、解析、管理学术论文，生成摘要与关键词，构建个人知识图谱，并提供 AI 智能助手进行学术问答与写作辅助。

核心能力包括：多格式论文解析（PDF、TXT、DOCX）、基于 DeepSeek LLM 的论文分析、知识图谱可视化、Markdown 笔记管理、AI 辅助写作、论文查重与相似度分析、研究趋势分析、语音交互以及摄像头图像 AI 分析等功能。

### 1.2 目标用户

| 用户群体 | 使用场景 |
|---------|---------|
| 研究生新生 | 大量阅读文献，建立个人论文库 |
| 科研人员 | 管理项目相关论文，整理笔记 |
| 学术写作者 | 论文润色、辅助写作 |
| 教授/导师 | 追踪领域最新研究 |

### 1.3 技术栈概览

| 层级 | 技术选型 |
|-----|---------|
| 前端框架 | React 18 + TypeScript + Vite |
| UI 样式 | Tailwind CSS + Framer Motion |
| 状态管理 | Zustand（持久化到 localStorage） |
| 路由管理 | React Router DOM v7 |
| 后端框架 | Express.js (Node.js ES Module) |
| 数据库 | SQLite3（文件数据库） |
| 认证方案 | JWT（JSON Web Token） |
| AI 能力 | DeepSeek API（流式 SSE，支持多模态图片理解） |
| 语音交互 | Web Speech API（浏览器原生语音识别） |
| 文件解析 | pdf-parse + mammoth（后端） |
| 文本分析 | TF-IDF + 余弦相似度 + 滑动窗口分词 |
| 聚类分析 | K-Means 聚类 + 趋势分析 |
| 图表可视化 | D3.js + Recharts |
| 3D 动画 | Three.js + @react-three/fiber |

### 1.4 项目目录结构

```
c:\Users\张生昊\Desktop\4\
├── backend/                          # Node.js 后端服务
│   ├── server.js                    # Express 服务器入口
│   ├── loadEnv.js                   # .env 环境变量加载
│   ├── routes/                      # 路由模块
│   │   ├── paper.js                 # 论文 CRUD 路由
│   │   ├── note.js                  # 笔记 CRUD 路由
│   │   ├── analyze.js               # 论文解析/分析路由
│   │   ├── auth.js                  # 用户认证路由
│   │   ├── assistant.js             # AI 助手路由（SSE 流式+多模态）
│   │   ├── similarity.js            # 论文查重与相似度分析路由
│   │   └── trends.js                # 研究趋势分析路由
│   ├── services/                    # 业务服务层
│   │   ├── authService.js           # JWT 认证服务
│   │   ├── aiService.js             # DeepSeek AI 服务封装
│   │   ├── tokenizer.js             # 中文分词算法（滑动窗口 Bigram）
│   │   ├── tfidf.js                 # TF-IDF 向量化与余弦相似度
│   │   ├── kmeans.js                # K-Means 聚类算法
│   │   └── trends.js                # 研究趋势分析服务
│   ├── utils/                       # 工具函数
│   │   └── textExtraction.js         # PDF/TXT/DOCX 文本提取
│   ├── uploads/                     # 上传文件存储目录
│   │   ├── note-images/             # 笔记图片上传
│   │   └── *.pdf/*.docx/*.txt       # 用户上传的论文文件
│   ├── researchmind.db              # SQLite 数据库文件
│   └── package.json
├── src/                             # React 前端源码
│   ├── App.tsx                      # 应用根组件（含路由配置）
│   ├── main.tsx                     # React DOM 入口
│   ├── index.css                    # 全局样式（Tailwind）
│   ├── components/                  # 公共组件
│   │   ├── features/                # 功能组件
│   │   │   ├── AIAssistant.tsx      # AI 助手浮窗组件（语音+摄像头+眼睛动画）
│   │   │   ├── KnowledgeGraph.tsx   # 知识图谱可视化
│   │   │   ├── PaperUploader.tsx    # 论文上传/解析组件
│   │   │   ├── ParticleAnimation.tsx # 粒子背景动画
│   │   │   └── ResearchFunnel.tsx   # 研究漏斗图
│   │   └── layout/                  # 布局组件
│   │       ├── Header.tsx            # 顶部导航栏（可拖拽滚动+箭头按钮）
│   │       └── Footer.tsx           # 页脚
│   ├── pages/                       # 页面组件
│   │   ├── Home.tsx                 # 首页（/）
│   │   ├── Dashboard.tsx            # 数据看板（/dashboard）
│   │   ├── Analyze.tsx              # 论文分析页（/analyze）
│   │   ├── Graph.tsx                # 知识图谱页（/graph，含浮动导航栏）
│   │   ├── Workbench.tsx            # 工作台/笔记页（/workbench）
│   │   ├── Search.tsx               # 论文搜索页（/search）
│   │   ├── Similarity.tsx           # 论文查重页（/similarity）
│   │   ├── Trends.tsx               # 研究趋势分析页（/trends）
│   │   ├── Login.tsx                # 登录页（/login）
│   │   ├── Register.tsx             # 注册页（/register）
│   │   └── Profile.tsx              # 个人中心（/profile）
│   ├── services/                    # API 服务层
│   │   └── api.ts                   # Axios API 封装（含 token 拦截器）
│   ├── store/                       # Zustand 状态管理
│   │   └── useAppStore.ts           # 全局状态存储
│   ├── types/                       # TypeScript 类型定义
│   │   └── index.ts                 # 所有接口类型定义
│   ├── hooks/                       # 自定义 React Hooks
│   │   └── useTheme.ts              # 主题切换
│   └── lib/                         # 第三方库封装
│       └── utils.ts                 # 通用工具函数
├── public/                          # 静态资源（前端构建产物）
├── package.json                     # 前端依赖配置
├── vite.config.ts                  # Vite 构建配置
├── tailwind.config.js              # Tailwind CSS 配置
├── tsconfig.json                   # TypeScript 配置
├── eslint.config.js                # ESLint 代码检查配置
├── start.bat                       # Windows 一键启动脚本
├── plan.md                         # RAG 知识库实施计划
└── README.md                       # 项目说明
```

---

## 二、系统架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React SPA (前端单页应用)                    │  │
│  │   Header / Home / Dashboard / Graph / Workbench ...   │  │
│  │   AIAssistant (右下角浮窗)                              │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/HTTPS (REST API + SSE)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express 后端服务器                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/auth     → 用户注册/登录/个人信息管理              │  │
│  │  /api/papers   → 论文 CRUD + 上传文件                   │  │
│  │  /api/notes    → 笔记 CRUD                             │  │
│  │  /api/analyze  → 论文解析/AI 分析                       │  │
│  │  /api/assistant → AI 助手聊天 (SSE 流式 + 多模态)       │  │
│  │  /api/similarity → 论文查重/相似度分析                   │  │
│  │  /api/trends    → 研究趋势分析                          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SQLite 数据库 (researchmind.db)                      │  │
│  │  └── users / papers / notes 表                        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ DeepSeek API (HTTPS)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     DeepSeek 云服务                           │
│  └── 大语言模型 (deepseek-chat)                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术架构分层

| 层级 | 职责 | 关键实现 |
|-----|------|---------|
| **展示层** | 用户界面渲染、交互响应 | React + Tailwind + Framer Motion |
| **路由层** | 页面导航、认证守卫 | React Router DOM v7 |
| **状态层** | 全局状态管理、数据持久化 | Zustand + localStorage persist |
| **通信层** | API 请求、token 自动注入 | Axios interceptors |
| **业务层** | 路由处理、参数校验、业务逻辑 | Express Router |
| **服务层** | AI 服务封装、认证服务 | authService / aiService |
| **数据层** | SQLite 数据库操作 | sqlite3 + promises |
| **工具层** | 文本提取、文件处理 | textExtraction.js |

### 2.3 前端状态流

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Login/Reg   │────▶│  Zustand     │────▶│  API Call    │
│  页面        │     │  Store       │     │  (带 Token)  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                    │
                     保存 token, user          携带 Bearer
                     到 localStorage            Token 请求
```

### 2.4 认证流程

```
用户登录/注册
     │
     ▼
POST /api/auth/login 或 /register
     │
     ▼
后端验证密码 → 生成 JWT (包含 userId/username/email/role)
     │
     ▼
前端存储 token 到 Zustand (localStorage 持久化)
     │
     ▼
后续所有 API 请求通过 Axios Interceptor 自动附加:
Authorization: Bearer <token>
     │
     ▼
后端中间件 authenticate() 验证 token → req.user
     │
     ▼
路由处理器根据 req.user.id 过滤数据，确保用户只能访问自己的数据
```

---

## 三、数据库设计

### 3.1 数据库概览

- **数据库类型**：SQLite3（文件数据库）
- **数据库文件**：`backend/researchmind.db`
- **表数量**：3 张（users / papers / notes）
- **外键约束**：papers.userId → users.id，notes.userId → users.id

### 3.2 表结构定义

#### 3.2.1 users（用户表）

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    UNIQUE NOT NULL,
  email         TEXT    UNIQUE NOT NULL,
  password      TEXT    NOT NULL,
  role          TEXT    DEFAULT 'user',
  createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| 字段 | 类型 | 约束 | 说明 |
|-----|------|-----|-----|
| id | INTEGER | PK, AUTOINCREMENT | 用户唯一标识 |
| username | TEXT | UNIQUE, NOT NULL | 用户名 |
| email | TEXT | UNIQUE, NOT NULL | 邮箱 |
| password | TEXT | NOT NULL | 密码（bcrypt 哈希存储） |
| role | TEXT | DEFAULT 'user' | 角色：user / admin |
| createdAt | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updatedAt | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### 3.2.2 papers（论文表）

```sql
CREATE TABLE IF NOT EXISTS papers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  userId        INTEGER,
  title         TEXT    NOT NULL,
  authors       TEXT    NOT NULL,
  abstract      TEXT    NOT NULL,
  journal       TEXT,
  year          INTEGER,
  doi           TEXT,
  keywords      TEXT,
  content       TEXT,
  summary       TEXT,
  fileName      TEXT,
  filePath      TEXT,
  createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

| 字段 | 类型 | 约束 | 说明 |
|-----|------|-----|-----|
| id | INTEGER | PK, AUTOINCREMENT | 论文唯一标识 |
| userId | INTEGER | FK → users.id | 所属用户（数据隔离关键字段） |
| title | TEXT | NOT NULL | 论文标题 |
| authors | TEXT | NOT NULL | 作者（逗号分隔字符串） |
| abstract | TEXT | NOT NULL | 摘要 |
| journal | TEXT | | 期刊名称 |
| year | INTEGER | | 发表年份 |
| doi | TEXT | | DOI 标识符 |
| keywords | TEXT | | 关键词（JSON 数组字符串） |
| content | TEXT | | 论文全文文本 |
| summary | TEXT | | AI 生成的摘要 |
| fileName | TEXT | | 上传文件名 |
| filePath | TEXT | | 服务器存储路径 |
| createdAt | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updatedAt | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### 3.2.3 notes（笔记表）

```sql
CREATE TABLE IF NOT EXISTS notes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  userId        INTEGER,
  paperId       INTEGER,
  content       TEXT    NOT NULL,
  tags          TEXT,
  createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (paperId) REFERENCES papers(id)
);
```

| 字段 | 类型 | 约束 | 说明 |
|-----|------|-----|-----|
| id | INTEGER | PK, AUTOINCREMENT | 笔记唯一标识 |
| userId | INTEGER | FK → users.id | 所属用户（数据隔离关键字段） |
| paperId | INTEGER | FK → papers.id | 关联论文（可为空） |
| content | TEXT | NOT NULL | 笔记内容（Markdown 格式） |
| tags | TEXT | | 标签（JSON 数组字符串） |
| createdAt | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updatedAt | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 3.3 数据隔离机制

**核心原则**：所有论文和笔记数据的 CRUD 操作都必须携带 `userId` 进行过滤。

```sql
-- 查询：必须带 userId
SELECT * FROM papers WHERE userId = ?;

-- 新增：必须指定 userId
INSERT INTO papers (userId, title, ...) VALUES (?, ?, ...);

-- 修改/删除：必须带 userId 条件
UPDATE papers SET ... WHERE id = ? AND userId = ?;
DELETE FROM papers WHERE id = ? AND userId = ?;
```

---

## 四、后端 API 设计

### 4.1 API 基础信息

| 项目 | 值 |
|-----|---|
| 基础 URL | `/api` |
| 端口 | 5000（默认） |
| 认证方式 | Bearer Token（JWT） |
| 内容类型 | `application/json` |
| 文件上传 | `multipart/form-data` |
| 超时时间 | 600 秒（10 分钟） |

### 4.2 认证相关 /api/auth

#### POST /api/auth/register - 用户注册

**请求体：**
```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "password": "123456"
}
```

**成功响应（201）：**
```json
{
  "message": "注册成功",
  "user": { "id": 1, "username": "zhangsan", "email": "zhangsan@example.com", "role": "user" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**错误响应：**
- 400：用户名或邮箱已存在 / 参数缺失
- 500：服务器错误

---

#### POST /api/auth/login - 用户登录

**请求体：**
```json
{
  "username": "zhangsan",
  "password": "123456"
}
```

**成功响应（200）：**
```json
{
  "message": "登录成功",
  "user": { "id": 1, "username": "zhangsan", "email": "zhangsan@example.com", "role": "user" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**错误响应：**
- 400：参数缺失
- 401：用户名或密码错误

---

#### GET /api/auth/me - 获取当前用户信息

**请求头：**
```
Authorization: Bearer <token>
```

**成功响应（200）：**
```json
{
  "user": { "id": 1, "username": "zhangsan", "email": "zhangsan@example.com", "role": "user" }
}
```

**错误响应：**
- 401：未提供 token / token 无效

---

#### PUT /api/auth/update - 更新用户信息

**请求头：**
```
Authorization: Bearer <token>
```

**请求体：**
```json
{
  "username": "zhangsan_new",
  "email": "new@example.com"
}
```

**成功响应（200）：**
```json
{
  "message": "更新成功",
  "user": { "id": 1, "username": "zhangsan_new", "email": "new@example.com", "role": "user" }
}
```

---

#### DELETE /api/auth/delete - 删除账户

**请求头：**
```
Authorization: Bearer <token>
```

**成功响应（200）：**
```json
{ "message": "账户已删除" }
```

---

### 4.3 论文相关 /api/papers

所有论文接口**必须携带** `Authorization: Bearer <token>` 请求头。

#### GET /api/papers - 获取当前用户的所有论文

**查询参数：** 无

**成功响应（200）：**
```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "Deep Learning for NLP",
    "authors": "John Smith, Jane Doe",
    "abstract": "...",
    "journal": "JMLR",
    "year": 2024,
    "doi": "10.1234/xxxx",
    "keywords": ["deep learning", "nlp"],
    "content": "...",
    "summary": "AI 生成的摘要...",
    "fileName": "paper.pdf",
    "filePath": "/uploads/xxx.pdf",
    "createdAt": "2026-05-01T10:00:00Z"
  }
]
```

**行为说明：** 仅返回 `WHERE userId = ?` 的数据（由 `authenticate` 中间件注入 `req.user.id`）。

---

#### GET /api/papers/:id - 获取单篇论文详情

**成功响应（200）：**
```json
{
  "id": 1,
  "title": "...",
  ...
}
```

**错误响应：**
- 404：论文不存在 或 不属于当前用户

---

#### POST /api/papers - 创建新论文

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "title": "论文标题",
  "authors": "张三, 李四",
  "abstract": "论文摘要内容",
  "journal": "期刊名",
  "year": 2024,
  "doi": "10.1234/xxxx",
  "keywords": ["AI", "NLP"]
}
```

**成功响应（201）：**
```json
{
  "id": 2,
  "userId": 1,
  "title": "论文标题",
  ...
  "createdAt": "2026-05-03T12:00:00Z"
}
```

---

#### PUT /api/papers/:id - 更新论文

**请求头：**
```
Authorization: Bearer <token>
```

**请求体：** 同 POST（所有字段可选）

**成功响应（200）：**
```json
{
  "id": 2,
  "title": "更新后的标题",
  ...
}
```

**错误响应：**
- 404：论文不存在 或 不属于当前用户

---

#### DELETE /api/papers/:id - 删除论文

**请求头：**
```
Authorization: Bearer <token>
```

**成功响应（200）：**
```json
{ "message": "论文已删除" }
```

**级联删除：** 会同时删除该论文关联的所有笔记（notes）。

---

### 4.4 笔记相关 /api/notes

所有笔记接口**必须携带** `Authorization: Bearer <token>` 请求头。

#### GET /api/notes - 获取当前用户的所有笔记

**成功响应（200）：**
```json
[
  {
    "id": 1,
    "userId": 1,
    "paperId": 1,
    "content": "# 笔记标题\n笔记内容...",
    "tags": ["重要", "待整理"],
    "createdAt": "2026-05-01T10:00:00Z"
  }
]
```

---

#### GET /api/notes/paper/:paperId - 获取指定论文的笔记

**成功响应（200）：**
```json
[
  {
    "id": 1,
    "content": "...",
    "tags": ["重要"],
    "paperId": 1
  }
]
```

**过滤条件：** `WHERE paperId = ? AND userId = ?`

---

#### GET /api/notes/:id - 获取单条笔记

**成功响应（200）：**
```json
{
  "id": 1,
  "content": "...",
  "tags": ["重要"],
  "paperId": 1
}
```

---

#### POST /api/notes - 创建笔记

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "paperId": 1,
  "content": "# 我的笔记\n笔记内容...",
  "tags": ["重要", "AI"]
}
```

**成功响应（201）：**
```json
{
  "id": 3,
  "userId": 1,
  "paperId": 1,
  "content": "...",
  "tags": ["重要", "AI"]
}
```

---

#### PUT /api/notes/:id - 更新笔记

**请求体：** 同 POST

**成功响应（200）：**
```json
{ "id": 3, "content": "更新后...", "tags": ["已整理"] }
```

---

#### DELETE /api/notes/:id - 删除笔记

**成功响应（200）：**
```json
{ "message": "笔记已删除" }
```

---

### 4.5 论文分析 /api/analyze

#### POST /api/analyze/upload - 上传并解析论文

**请求头：**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求体（form-data）：**
| 字段 | 类型 | 说明 |
|-----|------|-----|
| file | File | 上传文件（PDF/TXT/DOCX，最大 50MB） |

**成功响应（200）：**
```json
{
  "success": true,
  "paper": {
    "title": "从上传文件名提取的标题",
    "content": "提取的全文文本",
    "fileName": "original_name.pdf",
    "filePath": "/uploads/xxx.pdf"
  },
  "message": "文件上传成功"
}
```

**AI 分析结果：**
```json
{
  "success": true,
  "paper": { ... },
  "aiAnalysis": {
    "summary": "AI 生成的论文摘要",
    "keywords": ["深度学习", "自然语言处理", "Transformer"],
    "title": "优化后的论文标题"
  }
}
```

**错误响应：**
- 400：不支持的文件格式 / 文件过大
- 413：文件超过 50MB 限制

---

### 4.6 AI 助手 /api/assistant

#### POST /api/assistant/chat - AI 智能助手对话

**请求头：**
```
Authorization: Bearer <token>（可选）
Content-Type: application/json
```

**请求体：**
```json
{
  "message": "帮我总结这篇论文的核心观点",
  "context": [
    { "role": "user", "content": "之前的消息", "image": "data:image/jpeg;base64,..." },
    { "role": "assistant", "content": "AI 的回复" }
  ],
  "image": "data:image/jpeg;base64,..."
}
```

| 字段 | 类型 | 必填 | 说明 |
|-----|------|-----|-----|
| message | string | 是（可为空，有 image 时） | 用户输入的消息文本 |
| context | array | 否 | 对话历史上下文，支持携带图片 |
| image | string | 否 | 拍照图片的 base64 数据（data:image/jpeg;base64,...） |

**图片分析请求示例：**
```json
{
  "message": "请分析这个图表的趋势",
  "image": "data:image/jpeg;base64,/9j/4AAQSkZ..."
}
```

**响应格式：** Server-Sent Events（SSE）流式响应

```
data: {"content": "这", "done": false}
data: {"content": "篇", "done": false}
data: {"content": "论文...", "done": false}
data: [DONE]
```

**图片分析能力：**
- 支持拍照上传图表、数据图、论文示意图等
- 使用 DeepSeek 多模态模型进行图片理解
- 图片数据以 base64 格式通过 `image_url` 字段传递给 LLM
- 历史对话中的图片也会正确传回，保持上下文连贯

**错误响应：**
- 400：消息为空且无图片 / 超过 2000 字
- 429：IP 请求过于频繁（30 次/分钟限制）
- 500：DeepSeek API 未配置

---

### 4.7 论文查重与相似度 /api/similarity

#### POST /api/similarity/compare - 两段文本对比

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "textA": "深度学习在图像识别领域取得了重大突破...",
  "textB": "深度学习在图像分类任务中表现出色..."
}
```

**响应体：**
```json
{
  "similarity": 45.67,
  "level": "低度相似",
  "keywordsA": [{"term": "深度", "score": 0.52}, ...],
  "keywordsB": [{"term": "图像", "score": 0.48}, ...]
}
```

#### POST /api/similarity/check - 论文库查重

**请求体：**
```json
{
  "text": "待检测的论文文本...",
  "papers": [
    { "id": "1", "title": "论文标题", "content": "论文内容" }
  ]
}
```

**响应体：**
```json
{
  "overallSimilarity": 67.89,
  "level": "中度相似",
  "totalPapersChecked": 5,
  "details": [
    {
      "paperId": "1",
      "title": "论文标题",
      "overallSimilarity": 67.89,
      "maxParagraphSimilarity": 85.2,
      "matchedParagraphs": [...]
    }
  ]
}
```

#### POST /api/similarity/keywords - TF-IDF 关键词提取

**请求体：**
```json
{
  "text": "论文文本内容...",
  "topN": 10
}
```

**响应体：**
```json
{
  "keywords": [{"term": "深度", "score": 0.523}, ...],
  "tokenCount": 1234,
  "uniqueTokenCount": 345
}
```

---

### 4.8 研究趋势分析 /api/trends

#### GET /api/trends/overview - 获取研究趋势概览

**请求头：**
```
Authorization: Bearer <token>
```

**成功响应（200）：**
```json
{
  "yearDistribution": [
    { "year": 2020, "count": 3 },
    { "year": 2021, "count": 5 },
    { "year": 2022, "count": 8 }
  ],
  "keywordClusters": [
    { "clusterId": 0, "label": "深度学习", "keywords": ["深度学习", "神经网络", "卷积"], "count": 12 },
    { "clusterId": 1, "label": "自然语言处理", "keywords": ["NLP", "Transformer", "BERT"], "count": 8 }
  ],
  "keywordTimeline": [
    { "year": 2020, "keywords": { "深度学习": 2.5, "神经网络": 1.8 } },
    { "year": 2021, "keywords": { "深度学习": 3.2, "Transformer": 2.1 } }
  ],
  "topKeywords": [
    { "keyword": "深度学习", "count": 15, "years": [2019, 2020, 2021, 2022] }
  ],
  "totalPapers": 25
}
```

**核心算法：**
- **关键词聚类**：基于 TF-IDF 向量化的 K-Means 聚类，将论文按主题分组
- **趋势时间线**：使用滑动窗口分词提取关键词，计算每篇论文中关键词的出现频率
- **年份分布**：按年统计论文数量

---

## 五、前端模块设计

### 5.1 页面路由

| 路径 | 组件 | 说明 | 认证要求 |
|-----|------|-----|---------|
| `/` | Home | 首页（产品介绍+功能展示） | 否 |
| `/login` | Login | 登录页 | 否（已登录重定向首页） |
| `/register` | Register | 注册页 | 否（已登录重定向首页） |
| `/dashboard` | Dashboard | 数据看板 | 是 |
| `/analyze` | Analyze | 论文上传分析页 | 是 |
| `/graph` | Graph | 知识图谱可视化页 | 是 |
| `/workbench` | Workbench | 论文管理+笔记工作台 | 是 |
| `/search` | SearchPage | 论文搜索页 | 是 |
| `/similarity` | Similarity | 论文查重与相似度分析页 | 是 |
| `/trends` | Trends | 研究趋势分析页 | 是 |
| `/profile` | Profile | 个人中心 | 是 |

### 5.2 核心页面说明

#### 5.2.1 首页（Home）

- 展示产品核心功能与优势
- 粒子动画背景效果（ParticleAnimation）
- 功能卡片引导跳转
- 示例数据加载按钮（`loadSampleData`）

#### 5.2.2 数据看板（Dashboard）

- 论文总数、笔记总数、本月新增统计
- 论文年度分布柱状图
- 研究领域漏斗图（ResearchFunnel）
- 最近上传论文列表
- 搜索过滤功能

#### 5.2.3 论文上传分析页（Analyze）

- 拖拽上传区域（支持 PDF/TXT/DOCX）
- 上传进度显示
- AI 自动解析：标题、作者、摘要、关键词、摘要
- 人工校正表单
- 保存到个人论文库

#### 5.2.4 知识图谱页（Graph）

- 12 列栅格布局（左侧 4 列、右侧 8 列）
- D3.js 力导向图可视化
- 节点类型：论文（Paper）、作者（Author）、关键词（Keyword）
- 边的类型：引用（citation）、相似度（similarity）、合著（co-author）
- 节点点击查看详情
- 关键词高亮标注
- 右侧面板固定高度+内部滚动（`max-h-[calc(100vh-260px)]`）
- 右侧浮动导航栏（IntersectionObserver 自动高亮当前区域）
- 5 个锚点区域：论文信息、知识图谱、关键词、关联论文、论文详情

#### 5.2.5 工作台（Workbench）

- 左侧论文列表
- 右侧 Markdown 笔记编辑器
- 笔记 Markdown 渲染预览
- 图片粘贴上传
- 笔记标签管理
- 论文/笔记删除确认

#### 5.2.6 研究趋势分析页（Trends）

- 论文年份分布柱状图（Recharts BarChart）
- 关键词主题聚类展示（K-Means 聚类结果）
- 关键词趋势时间线折线图（Recharts LineChart）
- 每篇论文关键词出现频率为 Y 轴（非百分比）
- 自动过滤低频关键词（出现 ≥ 2 次）
- 热门关键词排行（Top 10）
- 论文总量与年份跨度统计

#### 5.2.7 论文查重页（Similarity）

- 双文本对比输入区
- 实时相似度百分比计算
- 相似度等级划分：高度相似（≥80%）、中度相似（50%-79%）、低度相似（20%-49%）、基本不相似（<20%）
- TF-IDF 关键词提取与展示
- 论文库查重功能（与已有论文批量对比）

### 5.3 全局组件

#### 5.3.1 AIAssistant（右下角浮窗）

- **眼睛动画组件（Eyes）**：SVG 绘制的拟人化眼睛，瞳孔跟随鼠标移动
  - 圆角矩形脸 + 椭圆眼白 + 圆形瞳孔 + 高光点 + 粉色小鼻子
  - 监听全局 `mousemove` 事件，根据鼠标角度和距离计算瞳孔偏移
  - 在 4 个位置使用：浮动按钮（44px）、聊天标题（36px）、欢迎页（70px）、消息头像（26px）
- **语音输入**：基于浏览器 Web Speech API（`SpeechRecognition`）
  - 麦克风按钮，点击开始/停止录音
  - 支持中文连续语音识别（`lang: zh-CN`）
  - 实时转文字显示在输入框
  - 录音中红色脉冲动画
  - 不支持的浏览器自动隐藏按钮
- **摄像头拍照分析**：基于浏览器 `getUserMedia` API
  - 相机按钮，弹出拍照弹窗（模态框）
  - 优先使用后置摄像头（`facingMode: environment`）
  - 拍照后预览，可重新拍照或直接发送
  - 图片以 base64 发送到后端，调用 DeepSeek 多模态模型分析
  - 聊天消息中显示拍摄的图片缩略图
- 展开/收起动画（Framer Motion）
- 快捷问题按钮
- 消息列表（带用户/AI 角色区分）
- 流式 AI 回复（SSE）
- Markdown 渲染（react-markdown）
- 加载状态动画

#### 5.3.2 Header（顶部导航）

- Logo 与网站名称
- **可拖拽滚动导航栏**（`useDragScroll` 自定义 Hook）
  - 鼠标拖拽平滑滚动导航项
  - 左右箭头按钮（ChevronLeft/ChevronRight），内容溢出时显示
  - 切换页面时自动滚动到当前活动项
  - 隐藏滚动条（`scrollbar-none` CSS 类）
  - 紧凑图标样式
- 登录/注册按钮（或用户头像+下拉菜单）
- 移动端响应式菜单

#### 5.3.3 Footer（底部）

- 版权信息
- 社交链接占位

---

## 六、关键功能流程

### 6.1 论文上传解析流程

```
用户拖拽上传 PDF 文件
        │
        ▼
PaperUploader 组件处理拖拽状态
        │
        ▼
调用 analyzeApi.uploadFile(file) via multipart/form-data
        │
        ▼
后端 /api/analyze/upload 接收文件
        │
        ├── 保存文件到 backend/uploads/
        ├── 调用 extractTextFromFile() 提取文本
        ├── 调用 DeepSeek API 进行 AI 分析
        │   └── 提取: title, authors, abstract, keywords, summary
        └── 返回 { paper, aiAnalysis }
        │
        ▼
前端显示 AI 分析结果供用户确认
        │
        ▼
用户确认 → 调用 paperApi.create() 保存到数据库
```

### 6.2 数据隔离流程（用户登录后）

```
用户打开网站 → 检查 localStorage 中的 token
        │
        ▼
App 组件 useEffect 触发 loadPapers() + loadNotes()
        │
        ▼
useAppStore.loadPapers() → paperApi.getAll()
        │
        ├── Axios Interceptor 自动附加:
        │   Authorization: Bearer <token>
        └── 请求头携带 token 发往 /api/papers
        │
        ▼
后端 authenticate 中间件验证 token → req.user = { id, username, ... }
        │
        ▼
GET /papers 路由执行:
  db.all('SELECT * FROM papers WHERE userId = ?', [req.user.id])
        │
        ▼
仅返回当前用户自己的论文列表
        │
        ▼
前端 Zustand store 更新 papers 状态
        │
        ▼
Dashboard/Workbench 等页面渲染数据
```

### 6.3 AI 助手对话流程

#### 6.3.1 文字消息流程

```
用户输入消息 → 点击发送
        │
        ▼
AIAssistant 组件 setIsLoading(true)
        │
        ▼
调用 assistantApi.sendMessage(message, context)
        │
        ▼
后端 /api/assistant/chat 接收请求
        │
        ├── IP 限流检查 (30 req/min)
        ├── 加载用户论文库数据（已登录用户）
        └── 调用 DeepSeek API (fetch SSE 流)
        │
        ▼
SSE 流式响应分片返回前端
        │
        ▼
前端通过 fetch + ReadableStream 读取流
        │
        ▼
逐字符/逐词追加到 messages 状态
        │
        ▼
流结束后 setIsLoading(false)
```

#### 6.3.2 拍照分析流程

```
用户点击相机按钮
        │
        ▼
弹出摄像头弹窗 → getUserMedia 请求摄像头权限
        │
        ├── 成功：显示实时视频流
        └── 失败：显示权限错误提示
        │
        ▼
用户点击「拍照」→ canvas 截取视频帧 → base64
        │
        ▼
预览图片 → 可「重新拍照」或「发送分析」
        │
        ▼
用户可选：输入文字描述 + 点击发送
        │
        ▼
前端组装 { message, image } → 发送到后端
        │
        ▼
后端构建多模态消息（image_url + text）→ 发送到 DeepSeek Vision API
        │
        ▼
SSE 流式返回分析结果 → 前端逐字显示
```

#### 6.3.3 语音输入流程

```
用户点击麦克风按钮
        │
        ▼
浏览器 SpeechRecognition API 启动（zh-CN）
        │
        ▼
实时语音转文字 → 更新 input 状态
        │
        ▼
用户点击停止 或 点击发送
        │
        ▼
自动停止录音 → 文字消息发送（同 6.3.1）
```

---

## 七、环境变量配置

### 7.1 前端环境变量

路径：`/backend/.env`

```env
PORT=5000
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
JWT_SECRET=your-secret-key-change-in-production-please-use-a-random-string
```

### 7.2 配置说明

| 变量名 | 说明 | 必填 | 示例 |
|-------|------|-----|-----|
| PORT | 后端服务端口 | 否（默认 5000） | 5000 |
| DEEPSEEK_API_KEY | DeepSeek API 密钥 | 是 | sk-354269459b4741edb... |
| DEEPSEEK_API_URL | DeepSeek API 地址 | 否（有默认值） | https://api.deepseek.com/v1 |
| DEEPSEEK_MODEL | 使用的模型 | 否（默认 deepseek-chat） | deepseek-chat |
| JWT_SECRET | JWT 签名密钥 | 是（生产必须改） | 随机字符串 |

---

## 八、部署方案

### 8.1 本地开发部署

#### 前端开发
```bash
cd c:\Users\张生昊\Desktop\4
npm run dev        # 启动 Vite 开发服务器 (默认 5173 端口)
```

#### 后端开发
```bash
cd c:\Users\张生昊\Desktop\4\backend
npm start          # 启动 Express 服务器 (默认 5000 端口)
```

#### 一键启动（Windows）
```bash
.\start.bat        # 启动后端 + cpolar 内网穿透
```

### 8.2 生产构建

```bash
# 前端构建
npm run build      # TypeScript 编译 + Vite 打包

# 复制构建产物到后端 public 目录
xcopy /E /I /Y dist backend\public

# 重启后端
cd backend && npm start
```

### 8.3 cpolar 内网穿透

通过 cpolar 将本地服务暴露到公网：
```bash
"C:\Program Files\cpolar\cpolar.exe" http 5000
```
- 提供随机公网 URL（如 `https://xxxx.trycpolar.com`）
- 免费版会话有效期 24 小时
- 适合临时演示，不适合长期生产

### 8.4 长期部署建议

| 方案 | 适用场景 | 成本 |
|-----|---------|-----|
| 云服务器（阿里云/腾讯云） | 长期稳定运行 | ¥30-100/月 |
| 收费 cpolar | 固定域名 + 长期运行 | 订阅制 |
| Docker + 云服务器 | 容器化部署 | ¥30-100/月 + Docker |
| Vercel/Railway 前端 + 云服务器后端 | 前端静态托管 | 前端免费 + 后端付费 |

---

## 九、第三方依赖清单

### 9.1 前端依赖

| 包名 | 版本 | 用途 |
|-----|------|-----|
| react | ^18.3.1 | UI 框架 |
| react-dom | ^18.3.1 | DOM 渲染 |
| react-router-dom | ^7.3.0 | 路由管理 |
| zustand | ^5.0.3 | 状态管理 |
| axios | ^1.6.2 | HTTP 客户端 |
| framer-motion | ^11.11.10 | 动画效果 |
| lucide-react | ^0.511.0 | 图标库 |
| react-markdown | ^10.1.0 | Markdown 渲染 |
| @uiw/react-markdown-editor | ^6.1.4 | Markdown 编辑器 |
| recharts | ^2.10.3 | 图表库 |
| d3 | ^7.8.5 | 数据可视化 |
| three | ^0.160.0 | 3D 渲染 |
| @react-three/fiber | ^8.16.2 | React Three.js 绑定 |
| tailwindcss | ^3.4.17 | CSS 框架 |
| @tailwindcss/typography | ^0.5.19 | Markdown 排版 |
| vite | ^6.3.5 | 构建工具 |
| typescript | ~5.8.3 | 类型系统 |

### 9.2 后端依赖

| 包名 | 版本 | 用途 |
|-----|------|-----|
| express | ^4.18.2 | Web 框架 |
| sqlite3 | ^5.1.7 | SQLite 数据库 |
| multer | ^1.4.5-lts.1 | 文件上传 |
| cors | ^2.8.5 | 跨域资源共享 |
| dotenv | ^16.4.7 | 环境变量 |
| jsonwebtoken | ^9.0.0 | JWT 签发与验证 |
| bcryptjs | ^2.4.3 | 密码哈希 |
| pdf-parse | ^1.1.1 | PDF 文本提取 |
| mammoth | ^1.8.0 | DOCX 文本提取 |
| node-fetch | ^3.3.2 | Fetch API（ESM） |
| jest | ^29.7.0 | 测试框架（devDependencies） |
| supertest | ^6.3.3 | API 测试工具（devDependencies） |

---

## 十、安全考虑

### 10.1 认证与授权

- 所有论文/笔记 API 均通过 `authenticate` 中间件保护
- JWT token 包含 userId，后端按 userId 过滤数据
- 密码使用 bcrypt 哈希存储（参考 authService.js 的 `hashPassword`）
- 敏感操作（删除账户）需要认证

### 10.2 输入校验

- 后端所有 API 对输入参数进行校验
- AI 助手消息长度限制 2000 字
- 文件上传限制 50MB
- 支持文件格式白名单：PDF、TXT、DOCX
- AI 助手支持图片输入（base64 格式，前端压缩 JPEG 质量 80%）

### 10.3 限流

- AI 助手接口：每 IP 30 次请求/分钟
- 登录接口：暂无限制（建议生产环境添加）
- 语音识别和摄像头功能基于浏览器 API，不涉及后端限流

### 10.4 数据隔离

- SQLite 数据库每个用户只能访问 `userId` 匹配的数据
- 前端 Zustand 存储按用户隔离
- 登录/登出时清空本地 papers/notes 缓存
- AI 助手的论文上下文通过 `optionalAuth` 注入，未登录用户无法访问论文数据

### 10.5 待加强的安全项

| 项目 | 当前状态 | 建议改进 |
|-----|---------|---------|
| 密码强度 | 简单校验 | 增加复杂度要求（大小写+数字+特殊字符） |
| SQL 注入 | 参数化查询（已防护） | 持续保持 |
| XSS | React 自动转义（已防护） | 富文本编辑器需注意 |
| CORS | `origin: *`（开发） | 生产环境应限制具体域名 |
| 文件上传 | 白名单格式 | 增加文件内容检测（MIME type） |
| Rate Limiting | AI 接口已有 | 登录/注册接口建议添加 |

---

## 十一、已知问题与改进计划

### 11.1 已修复

| 问题 | 修复时间 | 修复方案 |
|-----|---------|---------|
| 注册失败（表创建顺序错误） | 2026-05-03 | users 表移至 papers/notes 之前创建 |
| 数据隔离失败（无 userId 过滤） | 2026-05-03 | 后端 authenticate 中间件 + 前端 token 拦截器 |
| 切换账号后旧数据仍显示 | 2026-05-03 | login/register/logout 时清空 Zustand papers/notes |
| AI 助手无法分析论文数据 | 2026-05-04 | assistant 路由注入 db + optionalAuth + 论文上下文加载 |
| 论文查重返回 0% | 2026-05-04 | 重写 tokenizer：滑动窗口分词 + 优化停用词 |
| 趋势分析图表为直线 | 2026-05-05 | 改为每篇论文关键词出现频率 + 低频关键词过滤 |
| 顶部导航栏拥挤 | 2026-05-05 | 添加 useDragScroll 拖拽滚动 + 箭头按钮 |
| 知识图谱右侧过长 | 2026-05-05 | 12 列栅格布局 + 固定高度滚动 + 浮动导航栏 |

### 11.2 改进计划（参考 plan.md）

| 功能 | 优先级 | 说明 |
|-----|-------|-----|
| RAG 知识库问答 | 高 | 上传 PDF 构建个人知识库，基于向量检索的 AI 问答 |
| 固定域名部署 | 中 | 升级 cpolar 套餐或迁移到云服务器 |
| 论文分享功能 | 中 | 生成论文阅读链接 |
| 团队协作 | 低 | 多用户论文共享与批注 |

---

## 十二、常见问题排查

### 12.1 注册/登录失败

**可能原因：**
1. 用户名或邮箱已被注册
2. 数据库 users 表创建顺序问题（确保 server.js 中 users 表在其他表之前创建）
3. 密码字段为空

**排查方法：** 检查后端控制台日志输出

### 12.2 论文列表为空

**排查顺序：**
1. 检查是否已登录（Header 显示用户名）
2. 检查浏览器控制台网络请求是否有 401 错误
3. 检查 localStorage 中 `research-platform-storage` 的 token 是否存在
4. 清除浏览器缓存后重新登录

### 12.3 AI 助手请求失败

**可能原因：**
1. DEEPSEEK_API_KEY 未配置或已过期
2. DeepSeek API 服务不可用
3. 请求超过 IP 限流（30 次/分钟）

### 12.4 文件上传失败

**可能原因：**
1. 文件超过 50MB 限制
2. 文件格式不支持（仅支持 PDF/TXT/DOCX）
3. 后端 uploads 目录权限问题
4. PDF 加密或损坏

---

## 附录 A：端口占用排查

```bash
# 查找端口占用
netstat -ano | findstr :5000

# 终止进程（将 PID 替换为实际值）
taskkill /F /PID <PID>
```

## 附录 B：数据库直接操作

```bash
# 进入 SQLite CLI
cd backend
sqlite3 researchmind.db

# 查看表
sqlite> .tables

# 查看表结构
sqlite> .schema papers

# 查看当前用户论文
sqlite> SELECT id, title FROM papers WHERE userId = 1;
```

## 附录 C：npm 常用命令

```bash
npm run dev              # 前端开发服务器
npm run build            # 前端生产构建
npm run lint             # ESLint 代码检查
npm run check            # TypeScript 类型检查
cd backend && npm start  # 启动后端
cd backend && npm test   # 运行后端单元测试（7 套件 112 测试用例）
```
