import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileText, Users, TrendingUp, Search, Download, Plus, Calendar, Tag, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import ParticleAnimation from '../components/features/ParticleAnimation';

export default function Dashboard() {
  const { papers, notes, loadPapers, loadNotes } = useAppStore();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPapers();
    loadNotes();
  }, [loadPapers, loadNotes]);

  const totalPapers = papers.length;
  const totalNotes = notes.length;
  const recentPapers = papers.slice(0, 5);
  const papersByYear = papers.reduce((acc, paper) => {
    if (paper.year) {
      acc[paper.year] = (acc[paper.year] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthPapers = papers.filter(p => new Date(p.createdAt) >= startOfThisMonth).length;
  const lastMonthPapers = papers.filter(p => {
    const d = new Date(p.createdAt);
    return d >= startOfLastMonth && d < startOfThisMonth;
  }).length;
  const paperGrowth = lastMonthPapers > 0
    ? Math.round(((thisMonthPapers - lastMonthPapers) / lastMonthPapers) * 100)
    : thisMonthPapers > 0 ? 100 : 0;

  const thisMonthNotes = notes.filter(n => new Date(n.createdAt) >= startOfThisMonth).length;
  const lastMonthNotes = notes.filter(n => {
    const d = new Date(n.createdAt);
    return d >= startOfLastMonth && d < startOfThisMonth;
  }).length;
  const noteGrowth = lastMonthNotes > 0
    ? Math.round(((thisMonthNotes - lastMonthNotes) / lastMonthNotes) * 100)
    : thisMonthNotes > 0 ? 100 : 0;

  const filteredPapers = papers.filter(paper => {
    if (selectedCategory !== 'all' && paper.year?.toString() !== selectedCategory) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        paper.title.toLowerCase().includes(term) ||
        paper.authors.toLowerCase().includes(term) ||
        (paper.keywords && Array.isArray(paper.keywords) && paper.keywords.some(keyword => keyword.toLowerCase().includes(term)))
      );
    }
    return true;
  });

  const years = Array.from(new Set(papers.filter(p => p.year).map(p => p.year))).sort((a, b) => b - a);

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      <ParticleAnimation />
      
      <div className="relative z-10 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center space-x-3">
              <BarChart3 className="w-10 h-10 text-blue-500" />
              <span>智慧文档管理大屏</span>
            </h1>
            <p className="text-lg text-slate-500">
              实时监控和管理您的学术文献库
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-2xl border border-blue-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-700">总论文数</h3>
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{totalPapers}</p>
              <div className={`mt-2 flex items-center text-sm ${paperGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <TrendingUp className={`w-4 h-4 mr-1 ${paperGrowth < 0 ? 'rotate-180' : ''}`} />
                <span>较上月{paperGrowth >= 0 ? '增长' : '下降'} {Math.abs(paperGrowth)}%</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-sky-50 to-sky-100/60 rounded-2xl border border-sky-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-sky-700">总笔记数</h3>
                <Users className="w-6 h-6 text-sky-500" />
              </div>
              <p className="text-3xl font-bold text-sky-900">{totalNotes}</p>
              <div className={`mt-2 flex items-center text-sm ${noteGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <TrendingUp className={`w-4 h-4 mr-1 ${noteGrowth < 0 ? 'rotate-180' : ''}`} />
                <span>较上月{noteGrowth >= 0 ? '增长' : '下降'} {Math.abs(noteGrowth)}%</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-cyan-50 to-cyan-100/60 rounded-2xl border border-cyan-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-cyan-700">论文年份分布</h3>
                <Calendar className="w-6 h-6 text-cyan-500" />
              </div>
              <p className="text-3xl font-bold text-cyan-900">{years.length}</p>
              <div className="mt-2 text-cyan-600 text-sm">
                <span>涵盖 {Math.min(...years)}-{Math.max(...years)} 年</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 rounded-2xl border border-indigo-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-indigo-700">关键词数量</h3>
                <Tag className="w-6 h-6 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-indigo-900">
                {Array.from(new Set(papers.flatMap(p => p.keywords || []))).length}
              </p>
              <div className="mt-2 text-indigo-600 text-sm">
                <span>来自 {totalPapers} 篇论文</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="搜索论文标题、作者或关键词..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-3 rounded-xl transition-colors ${selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-blue-50'}`}
                >
                  全部
                </button>
                {years.slice(0, 3).map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedCategory(year.toString())}
                    className={`px-4 py-3 rounded-xl transition-colors ${selectedCategory === year.toString() ? 'bg-blue-500 text-white' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-blue-50'}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span>文档列表 ({filteredPapers.length})</span>
              </h2>
              <button
                onClick={() => navigate('/analyze')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加文档</span>
              </button>
            </div>

            <div className="overflow-x-auto pb-4">
              <div className="flex space-x-4 min-w-max">
                {filteredPapers.slice(0, 6).map((paper, index) => (
                  <motion.div
                    key={paper.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all w-80"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1 line-clamp-2">{paper.title}</h3>
                      <p className="text-sm text-slate-500 mb-3">{paper.authors} · {paper.year}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {paper.keywords && Array.isArray(paper.keywords) && paper.keywords.slice(0, 3).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-slate-400">{paper.fileName || '无文件'}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate('/search')}
                            className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-blue-500"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          {paper.filePath && (
                            <button
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = `/uploads/${paper.filePath}`;
                                a.download = paper.fileName || 'paper';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                              className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-blue-500"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {filteredPapers.length === 0 && (
                  <div className="text-center py-12 text-slate-400 w-full">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">暂无文档</p>
                  </div>
                )}
              </div>
            </div>

            {filteredPapers.length > 6 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => navigate('/search')}
                  className="flex items-center space-x-2 text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <span>查看更多</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
