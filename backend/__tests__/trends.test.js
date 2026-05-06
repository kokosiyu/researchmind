import {
  extractKeywordTimeline,
  clusterPapers,
  buildPaperNetwork,
  analyzeResearchTrends
} from '../services/trends.js';

const mockPapers = [
  { id: '1', title: '深度学习在图像识别中的应用', abstract: '本文研究了深度学习卷积神经网络在图像识别中的应用', keywords: '深度学习,图像识别', year: 2020 },
  { id: '2', title: '基于卷积网络的目标检测', abstract: '提出了一种基于卷积神经网络的目标检测方法', keywords: '目标检测,卷积网络', year: 2020 },
  { id: '3', title: '自然语言处理中的Transformer', abstract: '研究了Transformer架构在自然语言处理中的应用', keywords: '自然语言处理,Transformer', year: 2021 },
  { id: '4', title: 'BERT模型在文本分类中的应用', abstract: '使用BERT预训练模型进行文本分类任务', keywords: 'BERT,文本分类', year: 2021 },
  { id: '5', title: '知识图谱构建技术综述', abstract: '综述了知识图谱的构建方法和技术', keywords: '知识图谱,综述', year: 2022 },
  { id: '6', title: '基于图神经网络的知识推理', abstract: '提出了基于图神经网络的知识图谱推理方法', keywords: '图神经网络,知识推理', year: 2022 },
  { id: '7', title: '大语言模型的发展趋势', abstract: '分析了大语言模型的发展趋势和挑战', keywords: '大语言模型,发展趋势', year: 2023 },
  { id: '8', title: 'GPT-4在学术写作中的应用', abstract: '探索了GPT-4大语言模型在学术写作中的应用', keywords: 'GPT-4,学术写作', year: 2023 },
];

describe('extractKeywordTimeline', () => {
  it('should return timeline with years', () => {
    const result = extractKeywordTimeline(mockPapers);
    expect(result.years).toEqual([2020, 2021, 2022, 2023]);
  });

  it('should extract top keywords', () => {
    const result = extractKeywordTimeline(mockPapers);
    expect(result.topKeywords.length).toBeGreaterThan(0);
    expect(result.topKeywords.length).toBeLessThanOrEqual(20);
  });

  it('should have timeline data for each year', () => {
    const result = extractKeywordTimeline(mockPapers);
    expect(result.timelineData.length).toBe(4);
    result.timelineData.forEach(entry => {
      expect(entry.year).toBeDefined();
    });
  });

  it('should handle papers without years', () => {
    const papersNoYear = [{ id: '1', title: '测试论文', abstract: '测试摘要', year: null }];
    const result = extractKeywordTimeline(papersNoYear);
    expect(result.years).toEqual([]);
    expect(result.timelineData).toEqual([]);
  });

  it('should handle empty paper list', () => {
    const result = extractKeywordTimeline([]);
    expect(result.years).toEqual([]);
    expect(result.topKeywords).toEqual([]);
  });
});

describe('clusterPapers', () => {
  it('should cluster papers into groups', () => {
    const result = clusterPapers(mockPapers, { k: 3 });
    expect(result.clusters.length).toBeGreaterThan(0);
    expect(result.k).toBe(3);
  });

  it('should assign each paper to exactly one cluster', () => {
    const result = clusterPapers(mockPapers, { k: 3 });
    const totalMembers = result.clusters.reduce((sum, c) => sum + c.members.length, 0);
    expect(totalMembers).toBe(mockPapers.length);
  });

  it('should auto-detect k when not specified', () => {
    const result = clusterPapers(mockPapers);
    expect(result.k).toBeGreaterThanOrEqual(1);
    expect(result.k).toBeLessThanOrEqual(mockPapers.length);
    expect(result.elbowResults.length).toBeGreaterThan(0);
  });

  it('should generate labels for each cluster', () => {
    const result = clusterPapers(mockPapers, { k: 2 });
    result.clusters.forEach(cluster => {
      expect(cluster.topTerms.length).toBeGreaterThan(0);
      expect(cluster.label).toBeDefined();
      expect(typeof cluster.label).toBe('string');
    });
  });

  it('should handle empty papers', () => {
    const result = clusterPapers([]);
    expect(result.clusters).toEqual([]);
    expect(result.k).toBe(0);
  });

  it('should handle single paper', () => {
    const result = clusterPapers([mockPapers[0]], { k: 1 });
    expect(result.clusters.length).toBe(1);
    expect(result.clusters[0].members.length).toBe(1);
  });
});

describe('buildPaperNetwork', () => {
  it('should build nodes for each paper', () => {
    const result = buildPaperNetwork(mockPapers);
    expect(result.nodes.length).toBe(mockPapers.length);
  });

  it('should include keywords in nodes', () => {
    const result = buildPaperNetwork(mockPapers);
    result.nodes.forEach(node => {
      expect(node.keywords.length).toBeGreaterThan(0);
    });
  });

  it('should build links between similar papers', () => {
    const result = buildPaperNetwork(mockPapers);
    expect(result.nodes.length).toBe(mockPapers.length);
  });

  it('should have links with similarity scores', () => {
    const result = buildPaperNetwork(mockPapers);
    result.links.forEach(link => {
      expect(link.similarity).toBeGreaterThan(0);
      expect(link.similarity).toBeLessThanOrEqual(1);
    });
  });

  it('should have links sorted or at least valid', () => {
    const result = buildPaperNetwork(mockPapers);
    result.links.forEach(link => {
      expect(link.source).toBeDefined();
      expect(link.target).toBeDefined();
      expect(link.source).not.toBe(link.target);
    });
  });

  it('should handle empty papers', () => {
    const result = buildPaperNetwork([]);
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it('should handle single paper', () => {
    const result = buildPaperNetwork([mockPapers[0]]);
    expect(result.nodes.length).toBe(0);
    expect(result.links.length).toBe(0);
  });
});

describe('analyzeResearchTrends', () => {
  it('should return complete analysis', () => {
    const result = analyzeResearchTrends(mockPapers);
    expect(result.timeline).toBeDefined();
    expect(result.clustering).toBeDefined();
    expect(result.network).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('should have correct summary', () => {
    const result = analyzeResearchTrends(mockPapers);
    expect(result.summary.totalPapers).toBe(mockPapers.length);
    expect(result.summary.yearRange).toEqual({ from: 2020, to: 2023 });
    expect(result.summary.topKeywords.length).toBeGreaterThan(0);
    expect(result.summary.clusterCount).toBeGreaterThan(0);
  });

  it('should handle empty papers', () => {
    const result = analyzeResearchTrends([]);
    expect(result.summary.totalPapers).toBe(0);
    expect(result.summary.yearRange).toBeNull();
  });
});
