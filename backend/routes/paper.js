import express from 'express';
import { authService } from '../services/authService.js';

const router = express.Router();

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
  const token = authHeader.substring(7);
  const userInfo = authService.extractUserFromToken(token);
  if (!userInfo) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }
  req.user = userInfo;
  next();
}

// 获取当前用户的论文
router.get('/', authenticate, async (req, res) => {
  try {
    const papers = await req.db.all('SELECT * FROM papers WHERE userId = ?', [req.user.id]);
    const parsedPapers = papers.map(paper => ({
      ...paper,
      keywords: paper.keywords ? JSON.parse(paper.keywords) : []
    }));
    res.json(parsedPapers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 获取单个论文
router.get('/:id', authenticate, async (req, res) => {
  try {
    const paper = await req.db.get('SELECT * FROM papers WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!paper) {
      return res.status(404).json({ message: '论文不存在' });
    }
    paper.keywords = paper.keywords ? JSON.parse(paper.keywords) : [];
    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 创建新论文
router.post('/', authenticate, async (req, res) => {
  const { title, authors, abstract, journal, year, doi, keywords, content, fileName, filePath, summary } = req.body;
  
  try {
    const result = await req.db.run(
      `INSERT INTO papers (userId, title, authors, abstract, journal, year, doi, keywords, content, fileName, filePath, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, authors, abstract, journal, year, doi, JSON.stringify(keywords), content, fileName, filePath, summary]
    );
    
    const newPaper = await req.db.get('SELECT * FROM papers WHERE id = ?', [result.lastID]);
    newPaper.keywords = newPaper.keywords ? JSON.parse(newPaper.keywords) : [];
    res.status(201).json(newPaper);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 更新论文（支持部分更新）
router.put('/:id', authenticate, async (req, res) => {
  try {
    const paper = await req.db.get('SELECT * FROM papers WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!paper) {
      return res.status(404).json({ message: '论文不存在' });
    }

    const { title, authors, abstract, journal, year, doi, keywords, content, fileName, filePath, summary } = req.body;
    
    // 构建更新语句，只更新提供的字段
    const updateFields = [];
    const updateValues = [];
    
    if (title !== undefined) { updateFields.push('title = ?'); updateValues.push(title); }
    if (authors !== undefined) { updateFields.push('authors = ?'); updateValues.push(authors); }
    if (abstract !== undefined) { updateFields.push('abstract = ?'); updateValues.push(abstract); }
    if (journal !== undefined) { updateFields.push('journal = ?'); updateValues.push(journal); }
    if (year !== undefined) { updateFields.push('year = ?'); updateValues.push(year); }
    if (doi !== undefined) { updateFields.push('doi = ?'); updateValues.push(doi); }
    if (keywords !== undefined) { updateFields.push('keywords = ?'); updateValues.push(JSON.stringify(keywords)); }
    if (content !== undefined) { updateFields.push('content = ?'); updateValues.push(content); }
    if (fileName !== undefined) { updateFields.push('fileName = ?'); updateValues.push(fileName); }
    if (filePath !== undefined) { updateFields.push('filePath = ?'); updateValues.push(filePath); }
    if (summary !== undefined) { updateFields.push('summary = ?'); updateValues.push(summary); }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: '至少需要提供一个更新字段' });
    }
    
    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(req.params.id);
    updateValues.push(req.user.id);
    
    await req.db.run(
      `UPDATE papers SET ${updateFields.join(', ')} WHERE id = ? AND userId = ?`,
      updateValues
    );
    
    const updatedPaper = await req.db.get('SELECT * FROM papers WHERE id = ?', [req.params.id]);
    updatedPaper.keywords = updatedPaper.keywords ? JSON.parse(updatedPaper.keywords) : [];
    res.json(updatedPaper);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 删除论文
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const paper = await req.db.get('SELECT * FROM papers WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!paper) {
      return res.status(404).json({ message: '论文不存在' });
    }

    // 先删除相关的笔记
    await req.db.run('DELETE FROM notes WHERE paperId = ?', [req.params.id]);
    
    // 再删除论文
    await req.db.run('DELETE FROM papers WHERE id = ?', [req.params.id]);
    
    res.json({ message: '论文已删除' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export const paperRoutes = router;
