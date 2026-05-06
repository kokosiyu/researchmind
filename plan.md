# RAG 知识库问答系统实施计划

## 一、架构概览

```
用户提问
  ↓
[知识库管理页面] ← 上传PDF/TXT，调用后端接口
  ↓
[后端 /api/knowledge/*]
  ├── POST /upload        → 解析文档 → 文本分块 → 调用 Embedding API → 存入 SQLite
  ├── GET /list            → 返回知识库列表
  ├── DELETE /:id          → 删除知识库条目
  └── POST /query          → 用户问题 → Embedding → 向量检索 Top-K → 拼接上下文 → 调用 LLM → 流式返回
  ↓
[SQLite 数据库]
  └── knowledge_chunks 表（id, source_name, chunk_index, chunk_text, embedding BLOB, created_at）
  ↓
[前端页面]
  ├── 知识库管理页（/knowledge）：上传、列表、删除
  └── AI 对话页（/chat）：选知识库 + 流式问答
```

## 二、新建文件清单

| # | 文件路径 | 说明 |
|---|---------|------|
| 1 | `backend/services/embeddingService.js` | Embedding 服务封装，兼容硅基流动/SiliconFlow 和 DeepSeek |
| 2 | `backend/services/vectorStore.js` | 向量存储与检索服务（SQLite + 内存向量运算） |
| 3 | `backend/routes/knowledge.js` | 知识库 API 路由（上传/列表/删除/查询） |
| 4 | `src/pages/Knowledge.tsx` | 知识库管理页面 |
| 5 | `src/pages/Chat.tsx` | RAG 对话页面 |

## 三、修改文件清单

| # | 文件路径 | 修改内容 |
|---|---------|---------|
| 1 | `backend/server.js` | 创建 `knowledge_chunks` 表；注册 `knowledgeRoutes` |
| 2 | `backend/.env.example` | 添加 `EMBEDDING_API_KEY`、`EMBEDDING_API_URL`、`EMBEDDING_MODEL`、`LLM_API_KEY`、`LLM_API_URL`、`LLM_MODEL`、`TOP_K`、`CHUNK_SIZE`、`CHUNK_OVERLAP` |
| 3 | `backend/package.json` | 添加 `pdf-parse` 和 `@xenova/transformers` 依赖 |
| 4 | `src/App.tsx` | 添加 `/knowledge` 和 `/chat` 路由 |
| 5 | `src/components/layout/Header.tsx` | 添加"知识库"和"AI 对话"导航项 |
| 6 | `src/services/api.ts` | 添加 `knowledgeApi` 接口函数 |

## 四、分步实施步骤

### 步骤 1：安装后端依赖

在 `backend/` 目录下安装：
- `pdf-parse` — PDF 文本提取
- `@xenova/transformers` — 本地 Embedding 备选方案（不依赖外部 API）

### 步骤 2：配置环境变量（backend/.env.example）

```env
# ===== RAG 知识库配置 =====
# Embedding 配置（向量化）
EMBEDDING_API_KEY=your_siliconflow_or_deepseek_key
EMBEDDING_API_URL=https://api.siliconflow.cn/v1/embeddings
EMBEDDING_MODEL=BAAI/bge-large-zh-v1.5

# LLM 配置（问答生成，复用 DEEPSEEK_API_KEY 亦可）
LLM_API_KEY=your_llm_key
LLM_API_URL=https://api.deepseek.com/v1/chat/completions
LLM_MODEL=deepseek-chat

# RAG 参数
TOP_K=5
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

### 步骤 3：创建 Embedding 服务 (`backend/services/embeddingService.js`)

**职责**：将文本转换为向量（浮点数组）。

**设计**：
- `EmbeddingService` 类
- `embed(text)` — 单条文本 Embedding
- `embedBatch(texts)` — 批量 Embedding
- 支持两种后端：
  1. **远程 API**（优先）：调用硅基流动 / OpenAI 兼容接口
  2. **本地降级**（可选）：使用 `@xenova/transformers` 的 `BAAI/bge-small-zh-v1.5` 模型

**关键代码逻辑**：
```js
async embed(text) {
  if (this.apiKey) {
    return await this.remoteEmbed(text);
  }
  return await this.localEmbed(text);
}

async remoteEmbed(text) {
  const res = await fetch(this.apiUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: this.model, input: text })
  });
  const data = await res.json();
  return data.data[0].embedding; // float[]
}
```

### 步骤 4：创建向量存储服务 (`backend/services/vectorStore.js`)

**职责**：文本分块、存储、向量检索。

**设计**：
- `VectorStore` 类，接收 `db`（SQLite 实例）和 `embeddingService` 实例
- `addDocument(sourceName, text)` — 分块 → Embedding → 存入 DB
- `search(query, topK)` — 查询 Embedding → 余弦相似度排序 → 返回 Top-K
- `deleteDocument(id)` — 删除指定文档的所有分块
- `listDocuments()` — 列出所有文档（去重）
- `cosineSimilarity(a, b)` — 余弦相似度计算

**文本分块算法**：
```js
function splitText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }
  return chunks;
}
```

**SQLite 存储**：
- `embedding` 字段类型为 `BLOB`，存储 `Float32Array` 的 Buffer（`Buffer.from(new Float32Array(embedding).buffer)`）
- 读取时：`new Float32Array(row.embedding.buffer)` 还原

**检索流程**：
```
用户问题 → embeddingService.embed(query)
  → 遍历所有 chunk 的 embedding，计算余弦相似度
  → 按相似度降序排列，取 Top-K
  → 返回 [{ chunk_text, source_name, similarity }]
```

> 注：SQLite 不支持原生向量索引，采用全量扫描 + 内存计算。对中小规模数据（< 10万条分块）性能足够。若后续数据量大，可迁移至 Milvus Lite 或 ChromaDB。

### 步骤 5：创建知识库 API 路由 (`backend/routes/knowledge.js`)

**端点**：

| 方法 | 路径 | 功能 | 请求体 |
|------|------|------|--------|
| POST | `/api/knowledge/upload` | 上传并处理文档 | `multipart/form-data`：`file`（PDF/TXT）|
| GET | `/api/knowledge/list` | 获取知识库列表 | - |
| DELETE | `/api/knowledge/:id` | 删除文档及其分块 | - |
| POST | `/api/knowledge/query` | RAG 问答 | `{ question, topK? }` |

**上传处理流程**：
1. 使用 `multer` 接收文件（与现有 `analyze.js` 保持一致的配置）
2. 根据文件类型提取文本：
   - `.pdf` → `pdf-parse`
   - `.txt` → `fs.readFileSync` + `utf-8`
   - `.docx` → 现有 `textExtraction.js` 中的 `extractTextFromDocx`
3. 调用 `vectorStore.addDocument(filename, extractedText)`
4. 返回成功结果（包含分块数量）

**RAG 问答流程**：
1. 接收用户问题
2. `vectorStore.search(question, topK)` 检索相关分块
3. 构建 Prompt：
   ```
   基于以下参考资料回答用户问题。如果参考资料中没有相关内容，请说明并基于你的知识回答。

   【参考资料】
   [1] 来源: xxx.pdf (相似度: 0.85)
   内容: ...

   [2] 来源: yyy.txt (相似度: 0.79)
   内容: ...

   【用户问题】
   用户的问题
   ```
4. 调用 LLM API（流式输出，SSE 格式，与现有 `assistant.js` 一致）
5. 流式返回给前端，附带引用来源信息

### 步骤 6：修改 `backend/server.js`

1. 在数据库初始化函数中添加 `knowledge_chunks` 表：
```sql
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding BLOB,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

2. 创建全局 `embeddingService` 和 `vectorStore` 实例
3. 注册路由：
```js
import { knowledgeRoutes } from './routes/knowledge.js';
// ...
app.use('/api/knowledge', (req, res, next) => {
  req.vectorStore = vectorStore;
  next();
}, knowledgeRoutes);
```

### 步骤 7：创建知识库管理页面 (`src/pages/Knowledge.tsx`)

**UI 布局**：
- **顶部**：标题 + 上传区域（拖拽上传框 + 文件选择按钮）
- **主体**：知识库列表（卡片式布局，每个卡片显示：文件名、上传时间、分块数量、删除按钮）
- **状态**：上传中加载态、空态提示

**技术要点**：
- 使用 `react-router-dom` 的 `useNavigate`
- 使用 `lucide-react` 图标（`Upload`, `FileText`, `Trash2`, `Database`）
- 使用 `framer-motion` 动画
- Tailwind CSS 样式，与现有页面风格一致（蓝/靛色主色调，圆角卡片，毛玻璃效果）
- 支持 PDF 和 TXT 文件上传

### 步骤 8：创建 AI 对话页面 (`src/pages/Chat.tsx`)

**UI 布局**：
- **左侧/顶部**：知识库选择器（下拉框，选择要检索的知识库，可选"全部"）
- **主区域**：对话窗口（消息气泡流式显示，用户消息右侧蓝色，AI 回复左侧白色）
- **底部**：输入框 + 发送按钮
- **引用区域**：AI 回复下方显示引用的知识片段来源

**技术要点**：
- SSE（Server-Sent Events）流式接收 AI 回复，与现有 `AIAssistant.tsx` 的流式处理逻辑一致
- 使用 `EventSource` 或 `fetch` + `ReadableStream` 解析
- 支持 Markdown 渲染（可使用现有的 `renderContent` 方法）
- 每条 AI 回复下方展示引用来源（文件名 + 相似度分数）

**流式响应处理**：
```js
const response = await fetch('/api/knowledge/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question, context: chatHistory })
});
const reader = response.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  // 解析 SSE data: 行
  // 更新 UI
}
```

### 步骤 9：修改 `src/App.tsx` 添加路由

```tsx
import Knowledge from "./pages/Knowledge";
import Chat from "./pages/Chat";

// 在 <Routes> 中添加：
<Route path="/knowledge" element={<Knowledge />} />
<Route path="/chat" element={<Chat />} />
```

### 步骤 10：修改 `src/components/layout/Header.tsx` 添加导航

在 `navItems` 数组中添加：
```ts
{ path: '/knowledge', label: '知识库', icon: Database },
{ path: '/chat', label: 'AI 对话', icon: MessageSquare }
```

### 步骤 11：修改 `src/services/api.ts` 添加 API 接口

```ts
export const knowledgeApi = {
  upload: async (file: File): Promise<{ message: string; id: number; chunks: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiFile.post('/knowledge/upload', formData);
    return response.data;
  },
  list: async (): Promise<{ id: number; source_name: string; chunk_count: number; created_at: string }[]> => {
    const response = await api.get('/knowledge/list');
    return response.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/knowledge/${id}`);
    return response.data;
  },
  query: async (question: string, context?: { role: string; content: string }[]): Promise<Response> => {
    const response = await fetch(`${API_URL}/knowledge/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
    });
    return response;
  },
};
```

## 五、关键设计决策

### 5.1 Embedding 方案选择

| 方案 | 优点 | 缺点 | 推荐 |
|------|------|------|------|
| 硅基流动 API（BAAI/bge-large-zh-v1.5）| 质量高，中文效果好，免费额度 | 依赖外部服务 | ✅ 首选 |
| DeepSeek Embedding API | 与现有 LLM 同一供应商 | 需确认是否支持 Embedding | 备选 |
| 本地 @xenova/transformers | 无需网络，无费用 | 速度慢，模型小，准确度低 | 降级方案 |

**推荐**：硅基流动 API 作为主方案，API Key 不可用时降级到本地模型。

### 5.2 向量数据库方案

| 方案 | 优点 | 缺点 | 推荐 |
|------|------|------|------|
| SQLite + 内存计算 | 零依赖，复用现有 DB | 全量扫描，大数据慢 | ✅ 首选（中小规模）|
| ChromaDB | 原生向量支持 | 需要额外服务/Python | 不推荐 |
| Milvus Lite | 高性能 | 依赖重 | 不推荐 |

**推荐**：SQLite + 内存余弦相似度计算。理由：
- 项目已有 SQLite 基础设施
- 知识库规模通常在几千到几万条分块，全量扫描在 Node.js 中完全可接受
- 零额外依赖，部署简单

### 5.3 LLM 问答方案

**与现有 DeepSeek API 复用**：知识库问答与现有 AI 助手使用相同的 LLM API，区别仅在于 Prompt 中注入了检索到的参考资料上下文。流式输出方式与现有 `assistant.js` 完全一致。

## 六、数据库设计

```sql
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,        -- 原始文件名
  chunk_index INTEGER NOT NULL,     -- 分块序号
  chunk_text TEXT NOT NULL,         -- 分块文本内容
  embedding BLOB,                   -- 向量数据（Float32Array 的 Buffer）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 查询索引
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_chunks(source_name);
```

## 七、Prompt 设计

### RAG 问答 Prompt：
```
你是"智研笔记"的 AI 学术助手。请基于以下参考资料回答用户的问题。

要求：
1. 优先引用参考资料中的内容回答
2. 如果参考资料中没有相关信息，请基于你的知识回答，并说明"以下内容来自通用知识"
3. 回答要准确、有条理、学术化
4. 适当引用参考资料的来源文件名

【参考资料】
{检索到的分块，带来源和相似度}

【对话历史】
{最近的对话记录}

【用户问题】
{当前问题}
```

## 八、文件上传支持格式

| 格式 | 提取方式 | 现有支持 |
|------|---------|---------|
| `.pdf` | `pdf-parse` 库 | 需安装 |
| `.txt` | `fs.readFileSync` + utf-8 | 原生支持 |
| `.docx` | `textExtraction.js` 中的 `extractTextFromDocx` | ✅ 已有 |

## 九、实施顺序

1. **安装依赖**：`npm install pdf-parse`（在 backend 目录）
2. **创建 Embedding 服务**：`backend/services/embeddingService.js`
3. **创建向量存储服务**：`backend/services/vectorStore.js`
4. **创建知识库路由**：`backend/routes/knowledge.js`
5. **修改 server.js**：建表 + 注册路由
6. **更新 .env.example**：添加 RAG 配置项
7. **添加前端 API**：`src/services/api.ts`
8. **创建知识库管理页**：`src/pages/Knowledge.tsx`
9. **创建 AI 对话页**：`src/pages/Chat.tsx`
10. **修改路由和导航**：`App.tsx` + `Header.tsx`
11. **端到端测试**：上传文档 → 建立索引 → 提问验证

## 十、测试验证

### 功能测试：
1. 上传 PDF 文件，验证分块数量和知识库列表
2. 上传 TXT 文件，验证正确解析
3. 删除知识库条目，确认分块一并删除
4. 选择知识库提问，验证流式回复和引用来源
5. 提问不在知识库中的问题，验证 AI 仍能合理回答
6. 验证对话历史上下文保持

### 性能测试：
1. 上传 100 页 PDF，验证处理时间（预期 < 60 秒）
2. 检索响应时间（预期 < 2 秒，含 Embedding 计算）
3. 流式回复首字延迟（预期 < 3 秒）
