import express from 'express';
import { calculateDocumentSimilarity, batchSimilarity, TFIDFCalculator } from '../services/tfidf.js';
import { processText } from '../services/tokenizer.js';
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

function extractParagraphs(text, minLen = 20) {
  const raw = text.split(/\n{2,}/);
  return raw.map(p => p.replace(/\r/g, '').trim()).filter(p => p.length >= minLen);
}

router.post('/compare', authenticate, async (req, res) => {
  try {
    const { textA, textB } = req.body;

    if (!textA || !textB) {
      return res.status(400).json({ message: '请提供两段文本进行比较' });
    }

    const similarity = calculateDocumentSimilarity(textA, textB);
    const percent = Math.round(similarity * 10000) / 100;

    const topTermsA = new TFIDFCalculator();
    topTermsA.addDocument('a', textA);
    topTermsA.build();
    const keywordsA = topTermsA.getTopTerms('a', 10);

    const topTermsB = new TFIDFCalculator();
    topTermsB.addDocument('b', textB);
    topTermsB.build();
    const keywordsB = topTermsB.getTopTerms('b', 10);

    res.json({
      similarity: percent,
      level: percent >= 80 ? '高度相似' : percent >= 50 ? '中度相似' : percent >= 20 ? '低度相似' : '基本不相似',
      keywordsA: keywordsA.map(k => ({ term: k.term, score: Math.round(k.score * 100) / 100 })),
      keywordsB: keywordsB.map(k => ({ term: k.term, score: Math.round(k.score * 100) / 100 }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/check', authenticate, async (req, res) => {
  try {
    const { text, papers } = req.body;

    if (!text) {
      return res.status(400).json({ message: '请提供待检测文本' });
    }

    if (!papers || !Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({ message: '请提供对比论文列表' });
    }

    const targetParagraphs = extractParagraphs(text);
    if (targetParagraphs.length === 0) {
      return res.status(400).json({ message: '文本内容过短，无法进行查重' });
    }

    const results = [];

    for (const paper of papers) {
      const paperParagraphs = extractParagraphs(paper.content || paper.abstract || '');
      if (paperParagraphs.length === 0) continue;

      const matchResults = batchSimilarity(text, paperParagraphs);
      const topMatches = matchResults.filter(r => r.similarity >= 15).slice(0, 5);

      let maxSim = 0;
      if (matchResults.length > 0) {
        maxSim = matchResults[0].similarity;
      }

      const wholeSim = calculateDocumentSimilarity(text, paper.content || paper.abstract || '');
      const wholePercent = Math.round(wholeSim * 10000) / 100;

      results.push({
        paperId: paper.id,
        title: paper.title,
        overallSimilarity: wholePercent,
        maxParagraphSimilarity: maxSim,
        matchedParagraphs: topMatches.map(m => ({
          paragraphIndex: m.index,
          similarity: m.similarity,
          text: paperParagraphs[m.index]?.substring(0, 200) || ''
        }))
      });
    }

    results.sort((a, b) => b.overallSimilarity - a.overallSimilarity);

    const overallPercent = results.length > 0 ? results[0].overallSimilarity : 0;

    res.json({
      overallSimilarity: overallPercent,
      level: overallPercent >= 80 ? '高度相似' : overallPercent >= 50 ? '中度相似' : overallPercent >= 20 ? '低度相似' : '基本不相似',
      totalPapersChecked: results.length,
      details: results
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/keywords', authenticate, async (req, res) => {
  try {
    const { text, topN = 10 } = req.body;

    if (!text) {
      return res.status(400).json({ message: '请提供文本内容' });
    }

    const calculator = new TFIDFCalculator();
    calculator.addDocument('input', text);
    calculator.build();

    const keywords = calculator.getTopTerms('input', topN);

    const tokens = processText(text);
    const uniqueTokens = new Set(tokens);

    res.json({
      keywords: keywords.map(k => ({
        term: k.term,
        score: Math.round(k.score * 1000) / 1000
      })),
      tokenCount: tokens.length,
      uniqueTokenCount: uniqueTokens.size
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export const similarityRoutes = router;
