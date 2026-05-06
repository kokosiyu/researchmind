import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { paperRoutes } from './routes/paper.js';
import { noteRoutes } from './routes/note.js';
import { analyzeRoutes } from './routes/analyze.js';
import { authRoutes } from './routes/auth.js';
import { assistantRoutes } from './routes/assistant.js';
import { similarityRoutes } from './routes/similarity.js';
import { trendsRoutes } from './routes/trends.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// 增加超时时间，适应大型文件处理
app.use((req, res, next) => {
  req.setTimeout(300000); // 300秒
  res.setTimeout(300000); // 300秒
  next();
});

// 连接数据库
async function initDatabase() {
  const dbPath = path.join(__dirname, 'researchmind.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // 创建用户表（必须最先创建，因为其他表引用它）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 创建论文表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      title TEXT NOT NULL,
      authors TEXT NOT NULL,
      abstract TEXT NOT NULL,
      journal TEXT,
      year INTEGER,
      doi TEXT,
      keywords TEXT,
      content TEXT,
      summary TEXT,
      fileName TEXT,
      filePath TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  // 创建笔记表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      paperId INTEGER,
      content TEXT NOT NULL,
      tags TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (paperId) REFERENCES papers(id)
    );
  `);

  // 给已有表添加 userId 列（如果不存在）
  try {
    await db.exec(`ALTER TABLE papers ADD COLUMN userId INTEGER`);
  } catch (e) { /* 列已存在，忽略 */ }
  try {
    await db.exec(`ALTER TABLE notes ADD COLUMN userId INTEGER`);
  } catch (e) { /* 列已存在，忽略 */ }

  return db;
}

// 全局数据库连接
let db;

// 初始化数据库
initDatabase().then((database) => {
  db = database;
  console.log('SQLite 数据库连接成功');
}).catch(err => {
  console.error('SQLite 数据库连接失败:', err);
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 静态文件服务，用于下载上传的文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/papers', (req, res, next) => {
  req.db = db;
  next();
}, paperRoutes);

app.use('/api/notes', (req, res, next) => {
  req.db = db;
  next();
}, noteRoutes);

app.use('/api/analyze', analyzeRoutes);

app.use('/api/auth', (req, res, next) => {
  req.db = db;
  next();
}, authRoutes);

app.use('/api/assistant', (req, res, next) => {
  req.db = db;
  next();
}, assistantRoutes);

app.use('/api/similarity', (req, res, next) => {
  req.db = db;
  next();
}, similarityRoutes);

app.use('/api/trends', (req, res, next) => {
  req.db = db;
  next();
}, trendsRoutes);

// 静态文件服务，用于提供前端构建文件
app.use(express.static('public'));

// 全局错误处理（返回 JSON 而非 HTML）
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体过大，请压缩图片后重试' });
  }
  console.error('[Server] 未处理的错误:', err.message);
  res.status(500).json({ error: '服务器内部错误' });
});

// 处理前端路由，所有未匹配的路由都返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 增加服务器连接超时时间
server.timeout = 600000; // 600秒 = 10分钟
server.keepAliveTimeout = 600000;
server.headersTimeout = 600000;
