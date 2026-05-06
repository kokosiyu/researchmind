import express from 'express';
import { authService } from '../services/authService.js';
import { analyzeResearchTrends, extractKeywordTimeline, clusterPapers, buildPaperNetwork } from '../services/trends.js';

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

router.get('/overview', authenticate, async (req, res) => {
  try {
    const papers = await req.db.all(
      'SELECT * FROM papers WHERE userId = ? ORDER BY year ASC',
      [req.user.id]
    );

    const parsedPapers = papers.map(p => ({
      ...p,
      keywords: p.keywords ? JSON.parse(p.keywords) : []
    }));

    if (parsedPapers.length === 0) {
      return res.json({
        timeline: { timelineData: [], topKeywords: [], years: [] },
        clustering: { clusters: [], k: 0, elbowResults: [] },
        network: { nodes: [], links: [] },
        summary: { totalPapers: 0, yearRange: null, topKeywords: [], clusterCount: 0 }
      });
    }

    const result = analyzeResearchTrends(parsedPapers);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/timeline', authenticate, async (req, res) => {
  try {
    const papers = await req.db.all(
      'SELECT * FROM papers WHERE userId = ? ORDER BY year ASC',
      [req.user.id]
    );

    const parsedPapers = papers.map(p => ({
      ...p,
      keywords: p.keywords ? JSON.parse(p.keywords) : []
    }));

    const timeline = extractKeywordTimeline(parsedPapers);
    res.json(timeline);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/clusters', authenticate, async (req, res) => {
  try {
    const papers = await req.db.all(
      'SELECT * FROM papers WHERE userId = ?',
      [req.user.id]
    );

    const parsedPapers = papers.map(p => ({
      ...p,
      keywords: p.keywords ? JSON.parse(p.keywords) : []
    }));

    const k = req.query.k ? parseInt(req.query.k) : undefined;
    const result = clusterPapers(parsedPapers, { k });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/network', authenticate, async (req, res) => {
  try {
    const papers = await req.db.all(
      'SELECT * FROM papers WHERE userId = ?',
      [req.user.id]
    );

    const parsedPapers = papers.map(p => ({
      ...p,
      keywords: p.keywords ? JSON.parse(p.keywords) : []
    }));

    const result = buildPaperNetwork(parsedPapers);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export const trendsRoutes = router;
