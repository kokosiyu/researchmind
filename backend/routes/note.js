import express from 'express';

const router = express.Router();

// 获取所有笔记
router.get('/', async (req, res) => {
  try {
    const notes = await req.db.all('SELECT * FROM notes');
    // 解析tags字段
    const parsedNotes = notes.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : []
    }));
    res.json(parsedNotes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 根据论文ID获取笔记
router.get('/paper/:paperId', async (req, res) => {
  try {
    const notes = await req.db.all('SELECT * FROM notes WHERE paperId = ?', [req.params.paperId]);
    // 解析tags字段
    const parsedNotes = notes.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : []
    }));
    res.json(parsedNotes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 获取单个笔记
router.get('/:id', async (req, res) => {
  try {
    const note = await req.db.get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (!note) {
      return res.status(404).json({ message: '笔记不存在' });
    }
    // 解析tags字段
    note.tags = note.tags ? JSON.parse(note.tags) : [];
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 创建新笔记
router.post('/', async (req, res) => {
  const { paperId, content, tags } = req.body;
  
  try {
    const result = await req.db.run(
      `INSERT INTO notes (paperId, content, tags)
       VALUES (?, ?, ?)`,
      [paperId, content, JSON.stringify(tags)]
    );
    
    const newNote = await req.db.get('SELECT * FROM notes WHERE id = ?', [result.lastID]);
    newNote.tags = newNote.tags ? JSON.parse(newNote.tags) : [];
    res.status(201).json(newNote);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 更新笔记
router.put('/:id', async (req, res) => {
  try {
    const note = await req.db.get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (!note) {
      return res.status(404).json({ message: '笔记不存在' });
    }

    const { paperId, content, tags } = req.body;
    
    await req.db.run(
      `UPDATE notes SET 
       paperId = ?, content = ?, tags = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [paperId, content, JSON.stringify(tags), req.params.id]
    );
    
    const updatedNote = await req.db.get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    updatedNote.tags = updatedNote.tags ? JSON.parse(updatedNote.tags) : [];
    res.json(updatedNote);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 删除笔记
router.delete('/:id', async (req, res) => {
  try {
    const note = await req.db.get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (!note) {
      return res.status(404).json({ message: '笔记不存在' });
    }

    await req.db.run('DELETE FROM notes WHERE id = ?', [req.params.id]);
    res.json({ message: '笔记已删除' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export const noteRoutes = router;
