import { tokenize, removeStopWords, processText, STOP_WORDS } from '../services/tokenizer.js';

describe('Tokenizer - 中文分词模块', () => {
  describe('tokenize', () => {
    it('should return empty array for empty input', () => {
      expect(tokenize('')).toEqual([]);
      expect(tokenize(null)).toEqual([]);
      expect(tokenize(undefined)).toEqual([]);
    });

    it('should tokenize Chinese text into unigrams and bigrams', () => {
      const tokens = tokenize('深度学习');
      expect(tokens).toContain('深');
      expect(tokens).toContain('深度');
      expect(tokens).toContain('度');
      expect(tokens).toContain('学习');
      expect(tokens).toContain('学');
    });

    it('should handle single Chinese character', () => {
      const tokens = tokenize('我');
      expect(tokens).toContain('我');
    });

    it('should tokenize English words', () => {
      const tokens = tokenize('machine learning algorithm');
      expect(tokens).toContain('machine');
      expect(tokens).toContain('learning');
      expect(tokens).toContain('algorithm');
    });

    it('should filter out short English tokens (length < 2)', () => {
      const tokens = tokenize('I am a student');
      expect(tokens).not.toContain('I');
      expect(tokens).not.toContain('a');
    });

    it('should handle mixed Chinese and English text', () => {
      const tokens = tokenize('深度学习 deep learning 方法');
      expect(tokens).toContain('深度');
      expect(tokens).toContain('学习');
      expect(tokens).toContain('deep');
      expect(tokens).toContain('learning');
      expect(tokens).toContain('方法');
    });

    it('should handle numbers as part of words', () => {
      const tokens = tokenize('GPT-4 model');
      expect(tokens).toContain('gpt-4');
      expect(tokens).toContain('model');
    });

    it('should normalize to lowercase', () => {
      const tokens = tokenize('Deep Learning');
      expect(tokens).toContain('deep');
      expect(tokens).toContain('learning');
    });

    it('should handle newlines and multiple spaces', () => {
      const tokens = tokenize('深度   学习\n\n自然语言');
      expect(tokens).toContain('深度');
      expect(tokens).toContain('学习');
      expect(tokens).toContain('自然');
      expect(tokens).toContain('语言');
    });

    it('should produce overlapping tokens for Chinese text', () => {
      const tokens = tokenize('深度学习方法');
      expect(tokens).toContain('深度');
      expect(tokens).toContain('学习');
      expect(tokens).toContain('方法');
      expect(tokens).toContain('习方');
      expect(tokens).toContain('度学');
    });

    it('should produce more tokens than non-overlapping approach', () => {
      const text = '本文提出了一种基于transformer的方法用于自然语言处理任务';
      const tokens = tokenize(text);
      expect(tokens.length).toBeGreaterThan(10);
      expect(tokens).toContain('transformer');
    });
  });

  describe('removeStopWords', () => {
    it('should remove common Chinese stop words', () => {
      const tokens = ['的', '了', '是', '在', '深', '深度', '度学', '学习'];
      const filtered = removeStopWords(tokens);
      expect(filtered).not.toContain('的');
      expect(filtered).not.toContain('了');
      expect(filtered).not.toContain('是');
      expect(filtered).not.toContain('在');
      expect(filtered).toContain('深');
      expect(filtered).toContain('深度');
      expect(filtered).toContain('学习');
    });

    it('should remove common English stop words', () => {
      const tokens = ['the', 'method', 'is', 'based', 'on', 'transformer'];
      const filtered = removeStopWords(tokens);
      expect(filtered).not.toContain('the');
      expect(filtered).not.toContain('is');
      expect(filtered).not.toContain('on');
      expect(filtered).toContain('method');
      expect(filtered).toContain('transformer');
    });

    it('should return empty array if all are stop words', () => {
      const tokens = ['的', '了', '是', '在'];
      const filtered = removeStopWords(tokens);
      expect(filtered).toEqual([]);
    });

    it('should preserve academic terms that are not stop words', () => {
      const tokens = ['深度', '卷积', '神经', '网络', '注意力', '机制'];
      const filtered = removeStopWords(tokens);
      expect(filtered).toContain('深度');
      expect(filtered).toContain('卷积');
      expect(filtered).toContain('神经');
      expect(filtered).toContain('网络');
      expect(filtered).toContain('注意力');
      expect(filtered).toContain('机制');
    });
  });

  describe('processText', () => {
    it('should tokenize and remove stop words together', () => {
      const result = processText('深度学习在图像识别中的应用');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('深度');
      expect(result).toContain('图像');
      expect(result).toContain('识别');
      expect(result).toContain('应用');
      expect(result).not.toContain('在');
      expect(result).not.toContain('的');
      expect(result).not.toContain('中');
    });

    it('should handle English academic text', () => {
      const result = processText('neural network architecture');
      expect(result).toContain('neural');
      expect(result).toContain('network');
      expect(result).toContain('architecture');
    });
  });

  describe('STOP_WORDS set', () => {
    it('should contain common function words', () => {
      expect(STOP_WORDS.has('的')).toBe(true);
      expect(STOP_WORDS.has('了')).toBe(true);
      expect(STOP_WORDS.has('the')).toBe(true);
    });

    it('should not contain academic terms', () => {
      expect(STOP_WORDS.has('深度')).toBe(false);
      expect(STOP_WORDS.has('卷积')).toBe(false);
      expect(STOP_WORDS.has('图像')).toBe(false);
      expect(STOP_WORDS.has('识别')).toBe(false);
      expect(STOP_WORDS.has('transformer')).toBe(false);
    });
  });
});
