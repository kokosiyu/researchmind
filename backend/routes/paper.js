import express from 'express';

const router = express.Router();

// 获取所有论文
router.get('/', async (req, res) => {
  try {
    const papers = await req.db.all('SELECT * FROM papers');
    // 解析keywords字段
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
router.get('/:id', async (req, res) => {
  try {
    const paper = await req.db.get('SELECT * FROM papers WHERE id = ?', [req.params.id]);
    if (!paper) {
      return res.status(404).json({ message: '论文不存在' });
    }
    // 解析keywords字段
    paper.keywords = paper.keywords ? JSON.parse(paper.keywords) : [];
    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 创建新论文
router.post('/', async (req, res) => {
  const { title, authors, abstract, journal, year, doi, keywords, content, fileName, filePath, summary } = req.body;
  
  try {
    const result = await req.db.run(
      `INSERT INTO papers (title, authors, abstract, journal, year, doi, keywords, content, fileName, filePath, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, authors, abstract, journal, year, doi, JSON.stringify(keywords), content, fileName, filePath, summary]
    );
    
    const newPaper = await req.db.get('SELECT * FROM papers WHERE id = ?', [result.lastID]);
    newPaper.keywords = newPaper.keywords ? JSON.parse(newPaper.keywords) : [];
    res.status(201).json(newPaper);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 更新论文
router.put('/:id', async (req, res) => {
  try {
    const paper = await req.db.get('SELECT * FROM papers WHERE id = ?', [req.params.id]);
    if (!paper) {
      return res.status(404).json({ message: '论文不存在' });
    }

    const { title, authors, abstract, journal, year, doi, keywords, content, fileName, filePath, summary } = req.body;
    
    await req.db.run(
      `UPDATE papers SET 
       title = ?, authors = ?, abstract = ?, journal = ?, year = ?, doi = ?, keywords = ?, content = ?, fileName = ?, filePath = ?, summary = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, authors, abstract, journal, year, doi, JSON.stringify(keywords), content, fileName, filePath, summary, req.params.id]
    );
    
    const updatedPaper = await req.db.get('SELECT * FROM papers WHERE id = ?', [req.params.id]);
    updatedPaper.keywords = updatedPaper.keywords ? JSON.parse(updatedPaper.keywords) : [];
    res.json(updatedPaper);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 删除论文
router.delete('/:id', async (req, res) => {
  try {
    const paper = await req.db.get('SELECT * FROM papers WHERE id = ?', [req.params.id]);
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
