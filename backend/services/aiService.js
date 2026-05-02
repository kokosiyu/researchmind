class AIService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (!this.apiKey) {
      console.warn('[AIService] 未配置 DEEPSEEK_API_KEY，AI 分析将使用本地基础提取模式');
    }
  }

  async summarizePaper(text, filename) {
    if (this.apiKey) {
      try {
        return await this.callRealAI(text, filename);
      } catch (error) {
        console.error('[AIService] AI 调用失败，回退到本地提取:', error.message);
      }
    }

    return this.localExtraction(text, filename);
  }

  async callRealAI(text, filename) {
    const maxCharacters = 20000;
    let truncatedText = text;
    if (text.length > maxCharacters) {
      const firstPart = text.substring(0, Math.floor(maxCharacters * 0.7));
      const lastPart = text.substring(text.length - Math.floor(maxCharacters * 0.3));
      truncatedText = firstPart + '\n\n...[中间内容已截断]...\n\n' + lastPart;
      console.log('[AIService] 论文内容已截断至', maxCharacters, '字符');
    }

    const requestData = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: `你是一个专业的学术论文分析专家。请分析以下论文内容并严格按照JSON格式输出结果。

论文内容：
${truncatedText}

输出JSON格式：
{
  "title": "论文标题（从内容中准确提取）",
  "authors": "作者姓名列表",
  "abstract": "论文摘要的简洁概括，200字以内",
  "journal": "发表期刊或会议名称，如无法确定则为空字符串",
  "year": 发表年份的数字，如无法确定则为null,
  "doi": "DOI编号，如无法确定则为空字符串",
  "summary": "## 论文总结\\n\\n### 研究背景\\n[2-3句话描述研究背景和动机]\\n\\n### 核心贡献\\n- [贡献1]\\n- [贡献2]\\n- [贡献3]\\n\\n### 研究方法\\n[描述主要方法和技术路线]\\n\\n### 实验结果\\n[描述关键实验结果和数据]\\n\\n### 结论\\n[总结主要结论和未来方向]",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]
}

要求：
1. keywords 提取5-10个核心术语，中英文均可
2. title 必须从论文内容中提取，不能编造
3. year 必须是数字类型
4. 只输出JSON，不要包含其他文本`
        }
      ],
      temperature: 0.2,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    console.log('[AIService] 发送请求到:', this.apiUrl);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AIService] API 返回错误:', response.status, errorText);
      throw new Error(`API 请求失败 (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`API 错误: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const aiContent = data.choices?.[0]?.message?.content;
    if (!aiContent) {
      throw new Error('API 返回内容为空');
    }

    const aiResponse = this.parseAIResponse(aiContent);
    let keywords = this.normalizeKeywords(aiResponse.keywords);

    if (keywords.length < 3) {
      keywords = this.extractKeywords(text, keywords);
    }

    return {
      title: aiResponse.title || filename.replace(/\.[^/.]+$/, ''),
      authors: aiResponse.authors || this.extractAuthors(text),
      abstract: aiResponse.abstract || '',
      journal: aiResponse.journal || '',
      year: aiResponse.year || this.extractYear(text, filename),
      doi: aiResponse.doi || '',
      keywords: keywords,
      summary: aiResponse.summary || '',
      content: text
    };
  }

  parseAIResponse(content) {
    try {
      return JSON.parse(content);
    } catch {
      const cleaned = content.replace(/```json\s*|```/g, '').trim();
      return JSON.parse(cleaned);
    }
  }

  normalizeKeywords(keywords) {
    if (!keywords) return [];
    if (typeof keywords === 'string') {
      return keywords.split(/[、，,;；\s]+/).map(k => k.trim()).filter(Boolean);
    }
    if (Array.isArray(keywords)) {
      return keywords.map(k => String(k).trim()).filter(Boolean);
    }
    return [];
  }

  localExtraction(text, filename) {
    const title = this.extractTitle(text, filename);
    const authors = this.extractAuthors(text);
    const abstract = this.extractAbstract(text);
    const keywords = this.extractKeywords(text);
    const year = this.extractYear(text, filename);

    return {
      title,
      authors,
      abstract,
      journal: '',
      year,
      doi: '',
      keywords,
      summary: abstract || `本文档《${title}》由 ${authors} 撰写，共包含 ${text.length} 字符的内容。`,
      content: text
    };
  }

  extractTitle(text, filename) {
    const titlePatterns = [
      /^[\s\S]{0,200}(?:题目|标题|Title)[：:]\s*(.+)/im,
      /^[\s\S]{0,200}(?:论文题目)[：:]\s*(.+)/im,
    ];

    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 2) {
        return match[1].trim().substring(0, 200);
      }
    }

    const firstLines = text.split('\n').filter(l => l.trim()).slice(0, 5);
    for (const line of firstLines) {
      const trimmed = line.trim();
      if (trimmed.length >= 5 && trimmed.length <= 200 && !/^\d/.test(trimmed)) {
        return trimmed;
      }
    }

    return filename.replace(/\.[^/.]+$/, '');
  }

  extractAuthors(text) {
    const patterns = [
      /(?:作者|Author[s]?|By)[：:]\s*(.+)/i,
      /\b([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+)*)\b/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 2) {
        return match[1].trim().substring(0, 500);
      }
    }

    return '';
  }

  extractAbstract(text) {
    const patterns = [
      /(?:摘要|Abstract)[：:\s]*([\s\S]{20,500}?)(?:\n\s*(?:关键词|Keywords|Key\s*words|引言|Introduction|1\.|I\.))/i,
      /(?:摘要|Abstract)[：:\s]*([\s\S]{20,500}?)(?:\n\n|\n\s*\n)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].replace(/\s+/g, ' ').trim();
      }
    }

    return '';
  }

  extractKeywords(text, existingKeywords = []) {
    const keywordSet = new Set(existingKeywords);

    const keywordPatterns = [
      /(?:关键词|Keywords|Key\s*words)[：:]\s*(.+)/i,
    ];

    for (const pattern of keywordPatterns) {
      const match = text.match(pattern);
      if (match) {
        const raw = match[1].split(/[、，,;；\n]+/).map(k => k.trim()).filter(k => k.length >= 2 && k.length <= 20);
        raw.forEach(k => keywordSet.add(k));
        if (keywordSet.size >= 5) return [...keywordSet].slice(0, 10);
      }
    }

    const termFrequency = {};
    const candidates = text.match(/[\u4e00-\u9fa5]{2,8}|[A-Z][a-zA-Z]{2,}/g) || [];
    const stopwords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很',
      '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它',
      '们', '我们', '他们', '这些', '那些', '什么', '可以', '但是', '如果', '因为', '所以', '虽然',
      '而且', '或者', '以及', '但是', '然而', '因此', '通过', '进行', '使用', '采用', '提出',
      '本文', '论文', '研究', '方法', '结果', '表明', '问题', '方面', '工作', '系统', '模型',
      'Based', 'Using', 'With', 'This', 'That', 'These', 'Those', 'From', 'Have', 'Been',
      'Were', 'Will', 'Would', 'Could', 'Should', 'Their', 'They', 'Our', 'Also',
    ]);

    for (const term of candidates) {
      if (stopwords.has(term)) continue;
      if (term.length < 3 && !/[\u4e00-\u9fa5]/.test(term)) continue;
      termFrequency[term] = (termFrequency[term] || 0) + 1;
    }

    const sorted = Object.entries(termFrequency)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([term]) => term);

    for (const term of sorted) {
      keywordSet.add(term);
      if (keywordSet.size >= 10) break;
    }

    if (keywordSet.size === 0) {
      return ['学术研究'];
    }

    return [...keywordSet].slice(0, 10);
  }

  extractYear(text, filename) {
    const yearPatterns = [
      /(?:20|19)\d{2}(?=[^\d])/,
    ];

    for (const pattern of yearPatterns) {
      const match = text.match(pattern);
      if (match) {
        const year = parseInt(match[0]);
        if (year >= 1900 && year <= new Date().getFullYear() + 1) {
          return year;
        }
      }
    }

    const filenameYear = filename.match(/(20|19)\d{2}/);
    if (filenameYear) {
      return parseInt(filenameYear[0]);
    }

    return new Date().getFullYear();
  }
}

export const aiService = new AIService();
