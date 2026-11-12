import axios from 'axios';
import type { Paper, Note, GraphData, User, AuthResponse, TrendsData } from '../types';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 用于文件上传的 axios 实例，不设置默认 Content-Type
const apiFile = axios.create({
  baseURL: API_URL,
  timeout: 600000, // 增加到600秒（10分钟），适应DeepSeek API处理长文本
  headers: {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=600'
  },
  // 不设置Content-Type，让axios自动处理multipart/form-data
});

export const paperApi = {
  // 获取所有论文
  getAll: async (): Promise<Paper[]> => {
    const response = await api.get('/papers');
    return response.data;
  },

  // 获取单个论文
  getById: async (id: string): Promise<Paper> => {
    const response = await api.get(`/papers/${id}`);
    return response.data;
  },

  // 创建论文
  create: async (paper: Omit<Paper, 'id' | 'createdAt'>): Promise<Paper> => {
    const response = await api.post('/papers', paper);
    return response.data;
  },

  // 更新论文
  update: async (id: string, paper: Partial<Paper>): Promise<Paper> => {
    const response = await api.put(`/papers/${id}`, paper);
    return response.data;
  },

  // 删除论文
  delete: async (id: string): Promise<void> => {
    await api.delete(`/papers/${id}`);
  }
};

export const noteApi = {
  // 获取所有笔记
  getAll: async (): Promise<Note[]> => {
    const response = await api.get('/notes');
    return response.data;
  },

  // 根据论文ID获取笔记
  getByPaperId: async (paperId: string): Promise<Note[]> => {
    const response = await api.get(`/notes/paper/${paperId}`);
    return response.data;
  },

  // 创建笔记
  create: async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> => {
    const response = await api.post('/notes', note);
    return response.data;
  },

  // 更新笔记
  update: async (id: string, note: Partial<Note>): Promise<Note> => {
    const response = await api.put(`/notes/${id}`, note);
    return response.data;
  },

  // 删除笔记
  delete: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
  }
};

export const analyzeApi = {
  // 分析论文
  analyzePaper: async (file: File): Promise<Omit<Paper, 'id' | 'createdAt'>> => {
    const formData = new FormData();
    formData.append('paper', file);
    
    try {
      const response = await apiFile.post('/analyze/paper', formData);
      return response.data;
    } catch (error) {
      console.error('分析论文失败:', error);
      throw error;
    }
  }
};

export const authApi = {
  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },

  // 登录
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  // 获取当前用户信息
  getCurrentUser: async (token: string): Promise<{ user: User }> => {
    const response = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 更新用户信息
  updateUser: async (token: string, data: Partial<{ username: string; email: string }>): Promise<{ message: string; user: User }> => {
    const response = await api.put('/auth/me', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 删除用户
  deleteUser: async (token: string): Promise<{ message: string }> => {
    const response = await api.delete('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 获取所有用户（仅管理员）
  getAllUsers: async (token: string): Promise<{ users: User[] }> => {
    const response = await api.get('/auth', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export const trendsApi = {
  // 获取研究趋势综合分析（含时序、聚类、网络）
  getOverview: async (token: string): Promise<TrendsData> => {
    const response = await api.get('/trends/overview', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  // 获取关键词时序
  getTimeline: async (token: string) => {
    const response = await api.get('/trends/timeline', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  // 获取主题聚类
  getClusters: async (token: string, k?: number) => {
    const response = await api.get('/trends/clusters', {
      headers: { Authorization: `Bearer ${token}` },
      params: k ? { k } : {}
    });
    return response.data;
  },
  // 获取论文相似度网络
  getNetwork: async (token: string) => {
    const response = await api.get('/trends/network', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export const similarityApi = {
  // 比较两段文本相似度
  compare: async (textA: string, textB: string, token?: string) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post('/similarity/compare', { textA, textB }, { headers });
    return response.data;
  },
  // 检查文本与论文库的相似度
  check: async (text: string, papers: { title: string; abstract?: string }[], token?: string) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post('/similarity/check', { text, papers }, { headers });
    return response.data;
  },
  // 提取关键词
  extractKeywords: async (text: string, count: number = 10, token?: string) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post('/similarity/keywords', { text, count }, { headers });
    return response.data;
  }
};

export const assistantApi = {
  // 发送消息给 AI 助手（流式响应）
  sendMessage: async (message: string, context?: { role: string; content: string; image?: string }[], image?: string, token?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_URL}/assistant/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, context, image })
    });
    return response;
  }
};

export default api;
