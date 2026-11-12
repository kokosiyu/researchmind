import * as webllm from '@mlc-ai/web-llm';

export const AVAILABLE_MODELS = [
  {
    name: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    displayName: 'Llama 3.2 1B (推荐)',
    description: '轻量级，速度快，适合移动端',
    size: '~700MB',
    recommended: true
  },
  {
    name: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    displayName: 'Llama 3.2 3B',
    description: '更高质量，需要更多内存',
    size: '~1.8GB',
    recommended: false
  },
  {
    name: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    displayName: 'Qwen 2.5 0.5B',
    description: '超轻量，极速加载',
    size: '~400MB',
    recommended: false
  },
  {
    name: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    displayName: 'Qwen 2.5 1.5B',
    description: '中文友好，适合中文论文',
    size: '~1GB',
    recommended: false
  }
];

class LocalLLMService {
  constructor() {
    this.engine = null;
    this.currentModel = null;
    this.isLoading = false;
  }

  async loadModel(modelName, onProgress) {
    if (this.isLoading) {
      throw new Error('模型正在加载中，请稍候');
    }

    if (this.currentModel === modelName && this.engine) {
      console.log('[LocalLLM] 模型已加载');
      return;
    }

    this.isLoading = true;

    try {
      console.log(`[LocalLLM] 开始加载模型: ${modelName}`);

      const initProgressCallback = (progress) => {
        if (onProgress) {
          onProgress({
            progress: progress.progress,
            text: progress.text
          });
        }
        console.log(`[LocalLLM] 加载进度: ${(progress.progress * 100).toFixed(1)}% - ${progress.text}`);
      };

      this.engine = await webllm.CreateMLCEngine(modelName, {
        initProgressCallback,
        logLevel: 'WARN'
      });
      this.currentModel = modelName;

      console.log(`[LocalLLM] 模型加载完成: ${modelName}`);
    } catch (error) {
      console.error('[LocalLLM] 模型加载失败:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async analyzePaper(text, filename) {
    if (!this.engine) {
      throw new Error('模型未加载，请先加载模型');
    }

    const maxCharacters = 8000;
    let truncatedText = text;
    if (text.length > maxCharacters) {
      const firstPart = text.substring(0, Math.floor(maxCharacters * 0.7));
      const lastPart = text.substring(text.length - Math.floor(maxCharacters * 0.3));
      truncatedText = firstPart + '\n\n...[中间内容已截断]...\n\n' + lastPart;
      console.log('[LocalLLM] 论文内容已截断至', maxCharacters, '字符');
    }

    const systemPrompt = `你是一个专业的学术论文分析专家。请分析以下论文内容并严格按照JSON格式输出结果。

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
  "summary": "## 论文总结\n\n### 研究背景\\n[2-3句话描述研究背景和动机]\n\n### 核心贡献\\n- [贡献1]\\n- [贡献2]\\n- [贡献3]\\n\\n### 研究方法\\n[描述主要方法和技术路线]\n\n### 实验结果\\n[描述关键实验结果和数据]\n\n### 结论\\n[总结主要结论和未来方向]",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]
}

要求：
1. keywords 提取5-10个核心术语，中英文均可
2. title 必须从论文内容中提取，不能编造
3. year 必须是数字类型
4. 只输出JSON，不要包含其他文本
5. 使用中文输出所有内容`;

    const request = {
      messages: [
        {
          role: 'user',
          content: systemPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    };

    console.log('[LocalLLM] 开始分析论文...');
    const startTime = Date.now();

    const response = await this.engine.chat.completions.create(request);
    const aiContent = response.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('模型返回内容为空');
    }

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`[LocalLLM] 分析完成，耗时: ${elapsed.toFixed(2)}秒`);

    const result = this.parseAIResponse(aiContent);

    return {
      title: result.title || filename.replace(/\.[^/.]+$/, ''),
      authors: result.authors || '研究团队',
      abstract: result.abstract || '文档摘要',
      journal: result.journal || '',
      year: result.year || this.extractYear(text, filename),
      doi: result.doi || '',
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
      summary: result.summary || '文档总结',
      content: truncatedText,
      filename: filename,
      processing: false,
      isLocal: true
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

  extractYear(text, filename) {
    const yearPatterns = [/(20|19)\d{2}(?=[^\d])/];

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

  getLoadedModel() {
    return this.currentModel;
  }

  isModelLoaded() {
    return this.engine !== null && this.currentModel !== null;
  }

  async unloadModel() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.currentModel = null;
      console.log('[LocalLLM] 模型已卸载');
    }
  }
}

export const localLLM = new LocalLLMService();
