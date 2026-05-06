import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Paper, Note, GraphData, User } from '../types';
import { paperApi, noteApi, authApi } from '../services/api';

interface AppState {
  papers: Paper[];
  currentPaper: Paper | null;
  notes: Note[];
  graphData: GraphData;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isProcessingPaper: boolean;
  processingPaper: { title: string; status: string } | null;
  addPaper: (paper: Omit<Paper, 'id' | 'createdAt'>) => Promise<void>;
  setCurrentPaper: (paper: Paper | null) => void;
  deletePaper: (paperId: string) => Promise<void>;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  updateGraph: () => void;
  loadSampleData: () => Promise<void>;
  loadPapers: () => Promise<void>;
  loadNotes: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<{ username: string; email: string }>) => Promise<void>;
  deleteUser: () => Promise<void>;
  setProcessingPaper: (isProcessing: boolean, paperData?: { title: string; status: string }) => void;
}

const samplePapers: Omit<Paper, 'id' | 'createdAt'>[] = [
  {
    title: 'Deep Learning for Natural Language Processing',
    authors: 'John Smith, Jane Doe',
    abstract: 'This paper explores the application of deep learning techniques to natural language processing tasks, including text classification, sentiment analysis, and machine translation.',
    journal: 'Journal of Machine Learning Research',
    year: 2023,
    doi: '10.1234/jmlr.2023.001',
    keywords: ['deep learning', 'NLP', 'neural networks', 'transformers'],
    content: ''
  },
  {
    title: 'Knowledge Graph Construction from Scientific Literature',
    authors: 'Alice Johnson, Bob Williams',
    abstract: 'We present a novel approach to automatically construct knowledge graphs from scientific publications, extracting entities and relationships using NLP techniques.',
    journal: 'IEEE Transactions on Knowledge and Data Engineering',
    year: 2024,
    doi: '10.1234/tkde.2024.002',
    keywords: ['knowledge graphs', 'information extraction', 'NLP', 'scientific literature'],
    content: ''
  },
  {
    title: 'Graph Neural Networks for Citation Analysis',
    authors: 'Charlie Brown, Diana Prince',
    abstract: 'This work applies graph neural networks to analyze citation networks, predicting paper impact and identifying influential research.',
    journal: 'Neural Networks',
    year: 2023,
    doi: '10.1234/neunet.2023.003',
    keywords: ['graph neural networks', 'citation analysis', 'network analysis'],
    content: ''
  }
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      papers: [],
      currentPaper: null,
      notes: [],
      graphData: { nodes: [], links: [] },
      user: null,
      token: null,
      isAuthenticated: false,
      isProcessingPaper: false,
      processingPaper: null,

      addPaper: async (paper) => {
        try {
          const newPaper = await paperApi.create(paper);
          set((state) => ({
            papers: [...state.papers, newPaper]
          }));
          get().updateGraph();
        } catch (error) {
          console.error('添加论文失败:', error);
          // 回退到本地创建，保留文件路径信息
          const newPaper: Paper = {
            ...paper,
            id: Date.now().toString(),
            createdAt: new Date()
          };
          set((state) => ({
            papers: [...state.papers, newPaper]
          }));
          get().updateGraph();
        }
      },

      setCurrentPaper: (paper) => {
        set({ currentPaper: paper });
      },

      deletePaper: async (paperId) => {
        try {
          await paperApi.delete(paperId);
          set((state) => ({
            papers: state.papers.filter(p => p.id !== paperId),
            currentPaper: state.currentPaper?.id === paperId ? null : state.currentPaper,
            notes: state.notes.filter(n => n.paperId !== paperId)
          }));
          get().updateGraph();
        } catch (error) {
          console.error('删除论文失败:', error);
          // 回退到本地删除
          set((state) => ({
            papers: state.papers.filter(p => p.id !== paperId),
            currentPaper: state.currentPaper?.id === paperId ? null : state.currentPaper,
            notes: state.notes.filter(n => n.paperId !== paperId)
          }));
          get().updateGraph();
        }
      },

      addNote: async (note) => {
        try {
          const newNote = await noteApi.create(note);
          set((state) => ({
            notes: [...state.notes, newNote]
          }));
        } catch (error) {
          console.error('添加笔记失败:', error);
          // 回退到本地创建
          const newNote: Note = {
            ...note,
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          set((state) => ({
            notes: [...state.notes, newNote]
          }));
        }
      },

      deleteNote: async (noteId) => {
        try {
          await noteApi.delete(noteId);
          set((state) => ({
            notes: state.notes.filter(n => n.id !== noteId)
          }));
        } catch (error) {
          console.error('删除笔记失败:', error);
          // 回退到本地删除
          set((state) => ({
            notes: state.notes.filter(n => n.id !== noteId)
          }));
        }
      },

      loadPapers: async () => {
        try {
          const papers = await paperApi.getAll();
          set({ papers });
          get().updateGraph();
        } catch (error) {
          console.error('加载论文失败:', error);
          // 回退到本地示例数据
          if (get().papers.length === 0) {
            get().loadSampleData();
          }
        }
      },

      loadNotes: async () => {
        try {
          const notes = await noteApi.getAll();
          set({ notes });
        } catch (error) {
          console.error('加载笔记失败:', error);
          // 笔记加载失败时保持空数组
        }
      },

      updateGraph: () => {
        const { papers } = get();
        const nodes: GraphData['nodes'] = [];
        const links: GraphData['links'] = [];

        papers.forEach(paper => {
          nodes.push({
            id: paper.id,
            label: paper.title.length > 30 ? paper.title.substring(0, 30) + '...' : paper.title,
            type: 'paper',
            size: 20,
            data: paper
          });

          if (Array.isArray(paper.keywords)) {
            paper.keywords.forEach((keyword) => {
              const keywordId = 'kw-' + keyword;
              if (!nodes.find(n => n.id === keywordId)) {
                nodes.push({
                  id: keywordId,
                  label: keyword,
                  type: 'keyword',
                  size: 15,
                  data: null
                });
              }
              links.push({
                source: paper.id,
                target: keywordId,
                type: 'has-keyword',
                value: 1
              });
            });
          }
        });

        papers.forEach((paper, i) => {
          papers.slice(i + 1).forEach(otherPaper => {
            if (Array.isArray(paper.keywords) && Array.isArray(otherPaper.keywords)) {
              const commonKeywords = paper.keywords.filter(k => otherPaper.keywords.includes(k));
              if (commonKeywords.length > 0) {
                links.push({
                  source: paper.id,
                  target: otherPaper.id,
                  type: 'similar',
                  value: commonKeywords.length
                });
              }
            }
          });
        });

        set({ graphData: { nodes, links } });
      },

      loadSampleData: async () => {
        for (const paper of samplePapers) {
          await get().addPaper(paper);
        }
      },

      login: async (username, password) => {
        const response = await authApi.login(username, password);
        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          papers: [],
          notes: [],
          currentPaper: null,
          graphData: { nodes: [], links: [] }
        });
        await get().loadPapers();
        await get().loadNotes();
      },

      register: async (username, email, password) => {
        const response = await authApi.register(username, email, password);
        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          papers: [],
          notes: [],
          currentPaper: null,
          graphData: { nodes: [], links: [] }
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          papers: [],
          notes: [],
          currentPaper: null,
          graphData: { nodes: [], links: [] }
        });
      },

      updateUser: async (data) => {
        const { token } = get();
        if (!token) throw new Error('未登录');
        const response = await authApi.updateUser(token, data);
        set({ user: response.user });
      },

      deleteUser: async () => {
        const { token } = get();
        if (!token) throw new Error('未登录');
        await authApi.deleteUser(token);
        get().logout();
      },

      setProcessingPaper: (isProcessing, paperData) => {
        set({
          isProcessingPaper: isProcessing,
          processingPaper: paperData || null
        });
      }
    }),
    {
      name: 'research-platform-storage'
    }
  )
);
