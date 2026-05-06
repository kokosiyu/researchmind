import { TFIDFCalculator, cosineSimilarity } from './tfidf.js';
import { kmeans, autoSelectK } from './kmeans.js';
import { processText } from './tokenizer.js';

export function extractKeywordTimeline(papers) {
  const timeline = {};
  const yearPaperCount = {};

  for (const paper of papers) {
    const year = paper.year;
    if (!year) continue;

    yearPaperCount[year] = (yearPaperCount[year] || 0) + 1;

    const text = [paper.title, paper.abstract].filter(Boolean).join(' ');
    const tokens = processText(text);
    const uniqueTokens = new Set(tokens);

    if (!timeline[year]) {
      timeline[year] = {};
    }

    for (const token of uniqueTokens) {
      timeline[year][token] = (timeline[year][token] || 0) + 1;
    }
  }

  const years = Object.keys(timeline).sort();
  if (years.length === 0) {
    return { timelineData: [], topKeywords: [], years: [], yearPaperCount: {} };
  }

  const allKeywords = new Set();
  for (const year of years) {
    for (const kw of Object.keys(timeline[year])) {
      allKeywords.add(kw);
    }
  }

  const keywordGlobalCount = {};
  for (const kw of allKeywords) {
    let total = 0;
    for (const year of years) {
      total += timeline[year][kw] || 0;
    }
    keywordGlobalCount[kw] = total;
  }

  const topKeywords = Object.entries(keywordGlobalCount)
    .filter(([kw, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([kw]) => kw);

  if (topKeywords.length === 0) {
    const fallback = Object.entries(keywordGlobalCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([kw]) => kw);
    if (fallback.length > 0) {
      topKeywords.push(...fallback);
    }
  }

  const timelineData = years.map(year => {
    const entry = { year: Number(year) };
    const paperCount = yearPaperCount[year] || 1;

    for (const kw of topKeywords) {
      entry[kw] = Math.round(((timeline[year][kw] || 0) / paperCount) * 100) / 100;
    }
    return entry;
  });

  return { timelineData, topKeywords, years: years.map(Number), yearPaperCount };
}

export function clusterPapers(papers, options = {}) {
  if (!papers || papers.length === 0) {
    return { clusters: [], k: 0, elbowResults: [] };
  }

  const calculator = new TFIDFCalculator();
  for (const paper of papers) {
    const text = [paper.title, paper.abstract, paper.keywords].filter(Boolean).join(' ');
    calculator.addDocument(paper.id, text);
  }
  calculator.build();

  const vectors = papers.map(p => calculator.getVector(p.id)).filter(v => v != null);
  const validPapers = papers.filter((_, i) => calculator.getVector(papers[i].id) != null);

  if (vectors.length === 0) {
    return { clusters: [], k: 0, elbowResults: [] };
  }

  let k = options.k;
  let elbowResults = [];

  if (!k) {
    const autoResult = autoSelectK(vectors, Math.min(8, Math.floor(vectors.length / 2) + 1));
    k = autoResult.k;
    elbowResults = autoResult.elbowResults;
  }

  if (k <= 0) k = 1;
  if (k > vectors.length) k = vectors.length;

  const result = kmeans(vectors, { k, distanceFn: 'cosine' });

  const clusterMap = {};
  for (let i = 0; i < validPapers.length; i++) {
    const c = result.assignments[i];
    if (!clusterMap[c]) {
      clusterMap[c] = [];
    }
    clusterMap[c].push({
      id: validPapers[i].id,
      title: validPapers[i].title,
      year: validPapers[i].year,
      index: i
    });
  }

  const clusters = Object.entries(clusterMap).map(([clusterId, members]) => {
    const clusterPapers = members.map(m =>
      validPapers.find(p => p.id === m.id)
    ).filter(Boolean);

    const clusterTexts = clusterPapers.map(p =>
      [p.title, p.abstract].filter(Boolean).join(' ')
    ).join(' ');
    const clusterTokens = processText(clusterTexts);
    const tokenFreq = {};
    for (const t of clusterTokens) {
      tokenFreq[t] = (tokenFreq[t] || 0) + 1;
    }
    const topTerms = Object.entries(tokenFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term]) => term);

    return {
      id: Number(clusterId),
      label: topTerms.join('、'),
      topTerms,
      members,
      count: members.length
    };
  });

  return {
    clusters,
    k,
    iterations: result.iterations,
    inertia: result.inertia,
    elbowResults
  };
}

export function buildPaperNetwork(papers) {
  if (!papers || papers.length < 2) {
    return { nodes: [], links: [] };
  }

  const calculator = new TFIDFCalculator();
  for (const paper of papers) {
    const text = [paper.title, paper.abstract, paper.keywords].filter(Boolean).join(' ');
    calculator.addDocument(paper.id, text);
  }
  calculator.build();

  const nodes = papers.map(paper => {
    const keywords = calculator.getTopTerms(paper.id, 5);
    return {
      id: paper.id,
      title: paper.title,
      year: paper.year,
      keywords: keywords.map(k => k.term)
    };
  });

  const links = [];
  const threshold = 0.15;

  for (let i = 0; i < papers.length; i++) {
    const vecA = calculator.getVector(papers[i].id);
    if (!vecA) continue;

    for (let j = i + 1; j < papers.length; j++) {
      const vecB = calculator.getVector(papers[j].id);
      if (!vecB) continue;

      const similarity = cosineSimilarity(vecA, vecB);
      if (similarity >= threshold) {
        links.push({
          source: papers[i].id,
          target: papers[j].id,
          similarity: Math.round(similarity * 10000) / 10000
        });
      }
    }
  }

  return { nodes, links };
}

export function analyzeResearchTrends(papers) {
  const timeline = extractKeywordTimeline(papers);
  const clustering = clusterPapers(papers);
  const network = buildPaperNetwork(papers);

  return {
    timeline,
    clustering,
    network,
    summary: {
      totalPapers: papers.length,
      yearRange: timeline.years.length > 0
        ? { from: Math.min(...timeline.years), to: Math.max(...timeline.years) }
        : null,
      topKeywords: timeline.topKeywords.slice(0, 10),
      clusterCount: clustering.k
    }
  };
}
