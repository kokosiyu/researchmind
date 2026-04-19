// AI服务 - 论文总结和分析
// 这里可以集成真实的大模型API，如OpenAI、Claude等

class AIService {
  constructor() {
    // 配置真实的大模型API
    this.useRealAI = true; // 启用真实大模型
    // DeepSeek API配置
    this.apiKey = process.env.DEEPSEEK_API_KEY || ''; // 从环境变量读取API密钥
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  }

  // 模拟的大模型总结
  async summarizePaper(text, filename) {
    // 如果启用了真实AI，调用真实API
    if (this.useRealAI && this.apiKey) {
      try {
        return await this.callRealAI(text, filename);
      } catch (error) {
        console.error('真实AI调用失败，回退到模拟模式:', error);
      }
    }

    // 模拟的大模型总结（演示用）
    return this.simulateAISummary(text, filename);
  }

  // 模拟的AI总结
  simulateAISummary(text, filename) {
    const title = filename.replace(/\.[^/.]+$/, '');
    
    // 从文本中提取关键信息
    const keywords = this.extractKeywords(text);
    const hasIntroduction = text.includes('引言') || text.includes('Introduction');
    const hasMethod = text.includes('方法') || text.includes('Method') || text.includes('方法');
    const hasResults = text.includes('结果') || text.includes('Results');
    const hasConclusion = text.includes('结论') || text.includes('Conclusion');

    // 生成模拟的AI摘要
    const summary = `## 论文总结

### 研究背景
这篇论文《${title}》研究了${title}相关的领域。
${hasIntroduction ? '论文首先介绍了相关的研究背景和现状。' : ''}

### 核心贡献
本文的主要贡献包括：
- 提出了新的方法和技术
- 设计了创新的实验方案
- 验证了方法的有效性

### 研究方法
${hasMethod ? '论文采用了严谨的研究方法，包括理论分析和实验验证。' : '论文采用了科学的研究方法。'}

### 实验结果
${hasResults ? '实验结果表明，所提出的方法在多个指标上都取得了显著的性能提升。' : '通过实验验证了方法的有效性。'}

### 结论
${hasConclusion ? '论文最后总结了研究成果，并展望了未来的研究方向。' : '论文对研究成果进行了总结。'}

---
*注：此总结由模拟AI生成，实际使用时需要集成真实的大模型API。*`;

    console.log('模拟AI总结，提取的关键词:', keywords);

    return {
      title: title,
      authors: this.extractAuthors(text),
      abstract: summary,
      keywords: keywords,
      year: this.extractYear(text, filename),
      summary: summary,
      content: text
    };
  }

  // 调用DeepSeek API
  async callRealAI(text, filename) {
    console.log('调用DeepSeek API...');
    
    try {
      // 截断论文内容，确保DeepSeek API响应更快
      // 为了更快的响应，我们限制在20000字符以内（约15000 tokens）
      const maxCharacters = 20000;
      let truncatedText = text;
      if (text.length > maxCharacters) {
        // 优先保留论文的开头（摘要、引言）和结尾（结论）部分
        const firstPart = text.substring(0, Math.floor(maxCharacters * 0.7));
        const lastPart = text.substring(text.length - Math.floor(maxCharacters * 0.3));
        truncatedText = firstPart + '\n\n...[中间内容已截断]...\n\n' + lastPart;
        console.log('论文内容过长，已截断至', maxCharacters, '字符（首尾各保留70%和30%）');
      }
      
      // 构建请求数据
      const requestData = {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: `请你作为一个专业的学术论文分析专家，帮我分析以下论文内容。

论文内容：
${truncatedText}

请按照以下JSON格式输出分析结果，严格遵守格式：
{
  "title": "[论文标题]",
  "authors": "[作者列表]",
  "abstract": "[论文摘要]",
  "summary": "## 论文总结\\n\\n### 研究背景\\n[研究背景内容]\\n\\n### 核心贡献\\n[核心贡献内容，使用列表形式]\\n\\n### 研究方法\\n[研究方法内容]\\n\\n### 实验结果\\n[实验结果内容]\\n\\n### 结论\\n[结论内容]",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]
}

请确保：
1. 关键词提取5-10个最核心的技术术语和研究主题
2. 标题尽量从论文中提取准确
3. 摘要简洁概括论文内容
4. 所有字段都是字符串或字符串数组
5. 只输出JSON，不要有其他文本说明`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      };
      
      // 创建带超时的AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 480000); // 8分钟超时
      
      // 发送请求
      console.log('发送请求到:', this.apiUrl);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      // 清除超时
      clearTimeout(timeoutId);
      
      // 检查响应状态
      console.log('响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API返回错误:', response.status, errorText);
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      // 读取响应内容
      const responseText = await response.text();
      console.log('响应内容预览:', responseText.substring(0, 500));
      
      // 尝试解析JSON响应
      const data = JSON.parse(responseText);
      
      if (data.error) {
        console.error('DeepSeek API错误:', data.error);
        throw new Error(data.error.message || 'API错误');
      }
      
      // 提取总结内容
      const aiContent = data.choices?.[0]?.message?.content;
      if (!aiContent) {
        throw new Error('API返回内容为空');
      }
      
      // 尝试解析AI返回的JSON
      let aiResponse;
      try {
        aiResponse = JSON.parse(aiContent);
      } catch (parseError) {
        console.warn('DeepSeek返回非标准JSON，尝试清理:', parseError.message);
        
        // 尝试清理并提取JSON
        const cleanContent = aiContent.replace(/```json|```/g, '').trim();
        try {
          aiResponse = JSON.parse(cleanContent);
        } catch {
          console.error('JSON解析失败，回退到模拟模式');
          return this.simulateAISummary(text, filename);
        }
      }
      
      const title = aiResponse.title || filename.replace(/\.[^/.]+$/, '');
      
      // 确保keywords是数组
      let keywords = aiResponse.keywords || [];
      if (typeof keywords === 'string') {
        // 如果关键词是字符串，尝试分割
        keywords = keywords.split(/[、，,;；\s]+/).filter(k => k.trim());
      }
      
      // 如果关键词不够，使用提取方法补充
      if (keywords.length < 5) {
        const extractedKeywords = this.extractKeywords(text);
        keywords = [...new Set([...keywords, ...extractedKeywords])].slice(0, 10);
      }
      
      console.log('提取的关键词:', keywords);
      
      return {
        title: title,
        authors: aiResponse.authors || this.extractAuthors(text),
        abstract: aiResponse.abstract || aiResponse.summary,
        keywords: keywords,
        year: this.extractYear(text, filename),
        summary: aiResponse.summary,
        content: text
      };
      
    } catch (error) {
      console.error('调用DeepSeek API失败:', error);
      console.error('错误详情:', error.stack);
      
      // 超时或其他错误，回退到模拟模式
      return this.simulateAISummary(text, filename);
    }
  }

  // 提取关键词
  extractKeywords(text) {
    const keywordLibrary = [
      '人工智能', '机器学习', '深度学习', '神经网络', '自然语言处理',
      '计算机视觉', '数据挖掘', '知识图谱', '图神经网络', '强化学习',
      '卷积神经网络', '循环神经网络', 'Transformer', 'BERT',
      '大数据', '云计算', '物联网', '区块链', '量子计算',
      '计算机科学', '软件工程', '算法', '数据结构', '操作系统',
      '网络安全', '密码学', '分布式系统', '并行计算', '高性能计算',
      '数据库', '信息检索', '推荐系统', '搜索引擎', 'Web技术',
      '移动计算', '普适计算', '虚拟现实', '增强现实', '人机交互',
      '科学计算', '数值分析', '优化算法', '近似算法', '随机算法'
    ];

    const keywords = [];
    const lowerText = text.toLowerCase();

    for (const keyword of keywordLibrary) {
      if (lowerText.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    }

    if (keywords.length < 5) {
      keywords.push('学术研究', '自动分析', '数据提取');
    }

    return keywords.slice(0, 10);
  }

  // 提取作者
  extractAuthors(text) {
    const authorPatterns = [
      /作者[：:]\s*(.+)/,
      /Author[s]*[：:]\s*(.+)/,
      /(.+?)\s*[，,]\s*(.+?)\s*[，,]\s*(.+)/
    ];

    for (const pattern of authorPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '研究团队';
  }

  // 提取年份
  extractYear(text, filename) {
    const yearMatch = text.match(/(?:20|19)\d{2}/);
    if (yearMatch) {
      return parseInt(yearMatch[0]);
    }

    const filenameYearMatch = filename.match(/(?:20|19)\d{2}/);
    if (filenameYearMatch) {
      return parseInt(filenameYearMatch[0]);
    }

    return new Date().getFullYear();
  }
}

export const aiService = new AIService();
