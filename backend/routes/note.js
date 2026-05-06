import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authService } from '../services/authService.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const noteImagesDir = path.join(__dirname, '..', 'uploads', 'note-images');
fs.mkdirSync(noteImagesDir, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, noteImagesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, uniqueSuffix + ext);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG/PNG/GIF/WebP/BMP 格式的图片'));
    }
  },
});

router.post('/upload-image', (req, res) => {
  imageUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }
    const imageUrl = `/uploads/note-images/${req.file.filename}`;
    res.json({ url: imageUrl, filename: req.file.filename });
  });
});

// 获取当前用户的笔记
router.get('/', authenticate, async (req, res) => {
  try {
    const notes = await req.db.all('SELECT * FROM notes WHERE userId = ?', [req.user.id]);
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
router.get('/paper/:paperId', authenticate, async (req, res) => {
  try {
    const notes = await req.db.all('SELECT * FROM notes WHERE paperId = ? AND userId = ?', [req.params.paperId, req.user.id]);
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
router.get('/:id', authenticate, async (req, res) => {
  try {
    const note = await req.db.get('SELECT * FROM notes WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!note) {
      return res.status(404).json({ message: '笔记不存在' });
    }
    note.tags = note.tags ? JSON.parse(note.tags) : [];
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 创建新笔记
router.post('/', authenticate, async (req, res) => {
  const { paperId, content, tags } = req.body;
  
  try {
    const result = await req.db.run(
      `INSERT INTO notes (userId, paperId, content, tags)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, paperId, content, JSON.stringify(tags)]
    );
    
    const newNote = await req.db.get('SELECT * FROM notes WHERE id = ?', [result.lastID]);
    newNote.tags = newNote.tags ? JSON.parse(newNote.tags) : [];
    res.status(201).json(newNote);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 更新笔记
router.put('/:id', authenticate, async (req, res) => {
  try {
    const note = await req.db.get('SELECT * FROM notes WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!note) {
      return res.status(404).json({ message: '笔记不存在' });
    }

    const { paperId, content, tags } = req.body;
    
    await req.db.run(
      `UPDATE notes SET 
       paperId = ?, content = ?, tags = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ? AND userId = ?`,
      [paperId, content, JSON.stringify(tags), req.params.id, req.user.id]
    );
    
    const updatedNote = await req.db.get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    updatedNote.tags = updatedNote.tags ? JSON.parse(updatedNote.tags) : [];
    res.json(updatedNote);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 删除笔记
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const note = await req.db.get('SELECT * FROM notes WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
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
