import {
  TFIDFCalculator,
  cosineSimilarity,
  calculateDocumentSimilarity,
  batchSimilarity
} from '../services/tfidf.js';

describe('TF-IDF 计算器', () => {
  describe('TFIDFCalculator', () => {
    it('should add documents and build model', () => {
      const calc = new TFIDFCalculator();
      calc.addDocument('doc1', '深度学习是人工智能的核心技术');
      calc.addDocument('doc2', '自然语言处理是人工智能的重要方向');
      calc.build();

      expect(calc.documents.length).toBe(2);
      expect(calc.vocabulary.length).toBeGreaterThan(0);
    });

    it('should compute TF-IDF vectors', () => {
      const calc = new TFIDFCalculator();
      calc.addDocument('doc1', '深度学习用于图像识别');
      calc.addDocument('doc2', '自然语言处理用于文本分类');
      calc.build();

      const vec1 = calc.getVector('doc1');
      const vec2 = calc.getVector('doc2');

      expect(vec1).toBeDefined();
      expect(vec2).toBeDefined();
      expect(vec1.length).toBe(calc.vocabulary.length);
      expect(vec2.length).toBe(calc.vocabulary.length);
    });

    it('should return null for non-existent document', () => {
      const calc = new TFIDFCalculator();
      calc.addDocument('doc1', '测试文本');
      calc.build();

      expect(calc.getVector('nonexistent')).toBeNull();
    });

    it('should extract top terms for a document', () => {
      const calc = new TFIDFCalculator();
      calc.addDocument('doc1', '深度学习神经网络卷积网络图像分类目标检测');
      calc.addDocument('doc2', '自然语言处理文本分类机器翻译情感分析');
      calc.build();

      const topTerms = calc.getTopTerms('doc1', 5);
      expect(topTerms.length).toBeLessThanOrEqual(5);
      expect(topTerms.length).toBeGreaterThan(0);
      expect(topTerms[0].score).toBeGreaterThanOrEqual(topTerms[1]?.score || 0);
    });

    it('should return empty for non-existent document top terms', () => {
      const calc = new TFIDFCalculator();
      calc.addDocument('doc1', '测试');
      calc.build();

      expect(calc.getTopTerms('nonexistent', 5)).toEqual([]);
    });

    it('should assign higher IDF to rare terms', () => {
      const calc = new TFIDFCalculator();
      calc.addDocument('doc1', '深度学习是机器学习的子领域');
      calc.addDocument('doc2', '自然语言处理是人工智能的分支');
      calc.addDocument('doc3', '深度学习广泛用于自然语言处理');
      calc.build();

      const rareTerm = '子领域';
      const commonTerm = '深度';

      if (calc.idf[rareTerm] !== undefined && calc.idf[commonTerm] !== undefined) {
        expect(calc.idf[rareTerm]).toBeGreaterThan(calc.idf[commonTerm]);
      }
    });
  });
});

describe('余弦相似度 cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBe(1);
  });

  it('should return 0 for orthogonal vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    expect(cosineSimilarity(vecA, vecB)).toBe(0);
  });

  it('should return 0 for zero vectors', () => {
    const vecA = [0, 0, 0];
    const vecB = [1, 2, 3];
    expect(cosineSimilarity(vecA, vecB)).toBe(0);
  });

  it('should return 0 for null or undefined input', () => {
    expect(cosineSimilarity(null, [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], null)).toBe(0);
    expect(cosineSimilarity(undefined, [1, 2])).toBe(0);
  });

  it('should return 0 for vectors of different lengths', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it('should compute correct similarity for known vectors', () => {
    const vecA = [1, 1, 0];
    const vecB = [1, 0, 1];
    const expected = 1 / (Math.sqrt(2) * Math.sqrt(2));
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(expected, 10);
  });

  it('should be symmetric', () => {
    const vecA = [3, 4, 5];
    const vecB = [1, 2, 6];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(cosineSimilarity(vecB, vecA), 10);
  });

  it('should return value between 0 and 1 for positive vectors', () => {
    const vecA = [1, 2, 3, 4];
    const vecB = [4, 3, 2, 1];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(1);
  });
});

describe('文档相似度 calculateDocumentSimilarity', () => {
  it('should return high similarity for identical texts', () => {
    const text = '深度学习是人工智能领域的核心技术之一';
    const sim = calculateDocumentSimilarity(text, text);
    expect(sim).toBeGreaterThan(0.9);
  });

  it('should return high similarity for similar texts', () => {
    const textA = '深度学习在图像识别领域取得了重大突破';
    const textB = '深度学习在图像分类任务中表现出色';
    const sim = calculateDocumentSimilarity(textA, textB);
    expect(sim).toBeGreaterThan(0.1);
  });

  it('should return low similarity for unrelated texts', () => {
    const textA = '深度学习用于图像识别和目标检测';
    const textB = '经济全球化对发展中国家的影响';
    const sim = calculateDocumentSimilarity(textA, textB);
    expect(sim).toBeLessThan(0.5);
  });

  it('should return 0 for empty texts', () => {
    expect(calculateDocumentSimilarity('', '')).toBe(0);
    expect(calculateDocumentSimilarity('测试', '')).toBe(0);
  });

  it('should handle Chinese academic texts', () => {
    const textA = '本文提出了一种基于卷积神经网络的图像分类方法在多个基准数据集上取得了最先进的性能';
    const textB = '本文提出了基于深度卷积网络的图像识别方案在多个标准数据集上达到了领先水平';
    const textC = '量子计算利用量子力学原理进行信息处理有望解决经典计算机难以处理的问题';
    const simAB = calculateDocumentSimilarity(textA, textB);
    const simAC = calculateDocumentSimilarity(textA, textC);
    expect(simAB).toBeGreaterThan(simAC);
  });

  it('should handle English academic texts', () => {
    const textA = 'We propose a novel deep learning model for image classification achieving state of the art results';
    const textB = 'We present a new deep learning architecture for image recognition that achieves top performance';
    const textC = 'Quantum computing leverages quantum mechanical phenomena for information processing';
    const simAB = calculateDocumentSimilarity(textA, textB);
    const simAC = calculateDocumentSimilarity(textA, textC);
    expect(simAB).toBeGreaterThan(simAC);
  });
});

describe('批量相似度 batchSimilarity', () => {
  it('should return similarity scores for all candidates', () => {
    const target = '深度学习在自然语言处理中的应用';
    const candidates = [
      '深度学习用于图像识别',
      '自然语言处理是人工智能的核心方向',
      '量子计算的基本原理与应用',
    ];

    const results = batchSimilarity(target, candidates);
    expect(results.length).toBe(3);
    results.forEach(r => {
      expect(r.index).toBeDefined();
      expect(r.similarity).toBeDefined();
      expect(typeof r.similarity).toBe('number');
    });
  });

  it('should sort results by similarity descending', () => {
    const target = '深度学习神经网络';
    const candidates = [
      '经济学理论',
      '深度学习与神经网络技术',
      '烹饪美食教程',
    ];

    const results = batchSimilarity(target, candidates);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
  });

  it('should return empty for empty candidates', () => {
    const results = batchSimilarity('test', []);
    expect(results).toEqual([]);
  });

  it('should identify most similar document correctly', () => {
    const target = '卷积神经网络在计算机视觉中的广泛应用';
    const candidates = [
      '自然语言处理技术的发展历程',
      '卷积网络图像分类深度学习视觉',
      '经济全球化背景下的贸易政策',
    ];

    const results = batchSimilarity(target, candidates);
    expect(results[0].index).toBe(1);
  });
});