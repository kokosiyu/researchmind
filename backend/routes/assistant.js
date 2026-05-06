import express from 'express';
import { authService } from '../services/authService.js';

const router = express.Router();

const ipRateLimit = new Map();
const IP_WINDOW = 60 * 1000;
const IP_MAX = 30;

function checkIpRateLimit(ip) {
  const now = Date.now();
  const entry = ipRateLimit.get(ip);
  if (!entry || now - entry.start > IP_WINDOW) {
    ipRateLimit.set(ip, { start: now, count: 1 });
    return { ok: true };
  }
  entry.count++;
  if (entry.count > IP_MAX) {
    const wait = Math.ceil((IP_WINDOW - (now - entry.start)) / 1000);
    return { ok: false, retryAfter: wait };
  }
  return { ok: true };
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userInfo = authService.extractUserFromToken(token);
    if (userInfo) {
      req.user = userInfo;
    }
  }
  next();
}

router.post('/chat', optionalAuth, async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const rateCheck = checkIpRateLimit(ip);
  if (!rateCheck.ok) {
    return res.status(429).json({ error: `请求过于频繁，请 ${rateCheck.retryAfter} 秒后再试` });
  }

  const { message, context, image } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    if (!image) {
      return res.status(400).json({ error: '请输入消息内容' });
    }
  }

  if (message && message.length > 2000) {
    return res.status(400).json({ error: '消息内容过长，请控制在 2000 字以内' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    return res.status(500).json({ error: 'AI 服务未配置，请检查 DEEPSEEK_API_KEY' });
  }

  const hasImage = !!(image || (context && context.some(item => item.image)));

  let papersContext = '';
  if (req.user && req.db) {
    try {
      const papers = await req.db.all(
        'SELECT id, title, authors, abstract, journal, year, keywords, summary FROM papers WHERE userId = ? ORDER BY createdAt DESC LIMIT 20',
        [req.user.id]
      );
      if (papers.length > 0) {
        const papersInfo = papers.map(p => {
          const keywords = p.keywords ? JSON.parse(p.keywords) : [];
          const parts = [
            `标题：${p.title || '未知'}`,
            p.authors ? `作者：${p.authors}` : null,
            p.year ? `年份：${p.year}` : null,
            p.journal ? `期刊：${p.journal}` : null,
            keywords.length > 0 ? `关键词：${keywords.join(', ')}` : null,
            p.abstract ? `摘要：${p.abstract}` : null,
            p.summary ? `总结：${p.summary}` : null,
          ].filter(Boolean);
          return parts.join('\n');
        }).join('\n\n---\n\n');

        papersContext = `\n\n用户当前的论文库（共 ${papers.length} 篇论文）：\n\n${papersInfo}`;
      }
    } catch (err) {
      console.error('[Assistant] 加载论文数据失败:', err.message);
    }
  }

  let systemPrompt = `你是"智研小助手"，一个专业的学术研究助手。你的职责是：
1. 帮助用户解答学术问题和研究疑问
2. 辅助用户进行论文写作和笔记整理
3. 提供研究建议和思路启发
4. 基于用户上传的论文数据进行分析、总结和对比
5. 用简洁明了的语言回答问题

请用友好、专业的语气回答用户的问题。如果用户的问题不明确，请礼貌地请求更多信息。
当用户询问论文相关问题时，请基于其论文库中的数据进行回答。${papersContext}`;

  if (hasImage) {
    systemPrompt += `\n\n注意：用户当前发送了一张图片。由于当前系统暂不支持直接分析图片内容，请根据用户的文字描述来提供帮助。如果用户没有提供图片的详细描述，请礼貌地请用户描述图片中的具体内容（如文字、图表、数据等），以便你能提供更准确的帮助。`;
  }

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  if (context && Array.isArray(context)) {
    context.forEach(item => {
      const textContent = item.content || '';
      if (item.role === 'user' && item.image) {
        const imgText = textContent || '我发送了一张图片';
        messages.push({ role: 'user', content: `[附带图片] ${imgText}` });
      } else {
        messages.push({ role: item.role, content: textContent });
      }
    });
  }

  if (image) {
    const imgText = message?.trim() || '我发送了一张图片';
    messages.push({ role: 'user', content: `[附带图片] ${imgText}` });
  } else {
    messages.push({ role: 'user', content: message });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Assistant] API 错误:', response.status, errorText);
      res.write(`data: ${JSON.stringify({ error: `API 请求失败 (${response.status})` })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            break;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
          }
        }
      }
    }

    res.end();
  } catch (error) {
    console.error('[Assistant] 请求失败:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI 服务请求失败，请稍后重试' });
    } else {
      res.write(`data: ${JSON.stringify({ error: '请求失败，请稍后重试' })}\n\n`);
      res.end();
    }
  }
});

export { router as assistantRoutes };
