import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../test_researchmind.db');

export async function setupTestDatabase() {
  // 尝试删除旧的测试数据库（忽略错误）
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch (e) {
    console.log('无法删除旧的测试数据库:', e.message);
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // 创建用户表
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

  return db;
}

export async function cleanupTestDatabase(db) {
  // 先关闭数据库连接
  if (db && typeof db.close === 'function') {
    try {
      await db.close();
    } catch (e) {
      console.log('关闭数据库失败:', e.message);
    }
  }
  // 然后删除数据库文件
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch (e) {
    console.log('删除测试数据库失败:', e.message);
  }
}