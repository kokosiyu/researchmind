
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { aiService } from '../services/aiService.js';
import { extractTextFromFile } from '../utils/textExtraction.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

function fixFileName(name) {
  if (!name) return name;
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (/[\u4e00-\u9fa5]/.test(decoded)) return decoded;
  } catch {}
  try {
    const decoded = Buffer.from(name, 'binary').toString('utf8');
    if (/[\u4e00-\u9fa5]/.test(decoded)) return decoded;
  } catch {}
  return name;
}

// 配置 multer：50MB 限制
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    file.originalname = fixFileName(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
      const mimeToExt = {
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/pdf': '.pdf',
        'text/plain': '.txt',
        'text/markdown': '.md'
      };
      ext = mimeToExt[file.mimetype] || '.txt';
    }
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 处理上传错误的中间件
function handleUpload(req, res, next) {
  upload.single('paper')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            message: '文件过大，请上传小于 50MB 的文件'
          });
        }
        return res.status(400).json({
          message: `上传错误: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          message: err.message || '文件上传失败'
        });
      }
    }
    if (req.file) {
      req.file.originalname = fixFileName(req.file.originalname);
    }
    next();
  });
}

function cleanupFile(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('清理临时文件失败:', filePath, err.message);
  }
}

router.post('/paper', handleUpload, async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传论文文件' });
    }

    console.log('开始处理文件:', req.file.originalname);

    const extractionResult = await extractTextFromFile(filePath, req.file.originalname);
    if (!extractionResult.success) {
      return res.status(400).json({
        message: extractionResult.message || '文档解析失败'
      });
    }

    const text = extractionResult.text;

    if (text.length < 50) {
      return res.status(400).json({
        message: '文档内容过短，无法有效分析，请上传更长的文档'
      });
    }

    console.log('文档提取完成，文本长度:', text.length);

    console.log('调用AI分析...');
    const analysisResult = await aiService.summarizePaper(text, req.file.originalname);
    console.log('AI 分析完成');

    const maxContentLength = 50000;
    const storedContent = text.length <= maxContentLength ? text : text.substring(0, maxContentLength);

    const result = {
      title: analysisResult.title || req.file.originalname.replace(/\.[^/.]+$/, ''),
      authors: analysisResult.authors || '研究团队',
      abstract: analysisResult.abstract || analysisResult.summary || '文档摘要',
      journal: analysisResult.journal || '',
      year: analysisResult.year || new Date().getFullYear(),
      doi: analysisResult.doi || '',
      keywords: Array.isArray(analysisResult.keywords) ? analysisResult.keywords : [],
      content: storedContent,
      summary: analysisResult.summary || analysisResult.abstract || '文档总结',
      fileName: req.file.originalname,
      filePath: req.file.filename,
      processing: false
    };

    res.json(result);
  } catch (err) {
    console.error('分析失败:', err);
    res.status(500).json({
      message: `服务器错误: ${err.message}`
    });
  } finally {
    cleanupFile(filePath);
  }
});

export const analyzeRoutes = router;
