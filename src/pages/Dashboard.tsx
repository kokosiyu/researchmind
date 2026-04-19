import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, FileText, Users, TrendingUp, Search, Download, Plus, Calendar, Tag, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import ParticleAnimation from '../components/features/ParticleAnimation';

export default function Dashboard() {
  const { papers, notes, loadPapers, loadNotes } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPapers();
    loadNotes();
  }, [loadPapers, loadNotes]);

  // 统计数据
  const totalPapers = papers.length;
  const totalNotes = notes.length;
  const recentPapers = papers.slice(0, 5);
  const papersByYear = papers.reduce((acc, paper) => {
    if (paper.year) {
      acc[paper.year] = (acc[paper.year] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  // 过滤论文
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

  // 获取所有年份
  const years = Array.from(new Set(papers.filter(p => p.year).map(p => p.year))).sort((a, b) => b - a);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParticleAnimation />
      
      <div className="relative z-10 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-blue-300 mb-2 flex items-center space-x-3">
              <BarChart3 className="w-10 h-10 text-blue-400" />
              <span>智慧文档管理大屏</span>
            </h1>
            <p className="text-lg text-blue-300 font-medium">
              实时监控和管理您的学术文献库
            </p>
          </motion.div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 backdrop-blur-lg rounded-2xl border border-blue-700/50 p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-200">总论文数</h3>
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{totalPapers}</p>
              <div className="mt-2 flex items-center text-green-400 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>较上月增长 12%</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-900/80 to-purple-800/80 backdrop-blur-lg rounded-2xl border border-purple-700/50 p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-200">总笔记数</h3>
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{totalNotes}</p>
              <div className="mt-2 flex items-center text-green-400 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>较上月增长 8%</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-green-900/80 to-green-800/80 backdrop-blur-lg rounded-2xl border border-green-700/50 p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-green-200">论文年份分布</h3>
                <Calendar className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{years.length}</p>
              <div className="mt-2 text-green-200 text-sm">
                <span>涵盖 {Math.min(...years)}-{Math.max(...years)} 年</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-orange-900/80 to-orange-800/80 backdrop-blur-lg rounded-2xl border border-orange-700/50 p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-200">关键词数量</h3>
                <Tag className="w-6 h-6 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {Array.from(new Set(papers.flatMap(p => p.keywords || []))).length}
              </p>
              <div className="mt-2 text-orange-200 text-sm">
                <span>来自 {totalPapers} 篇论文</span>
              </div>
            </motion.div>
          </div>

          {/* 搜索和筛选 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6 shadow-lg mb-8"
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-3 rounded-xl transition-colors ${selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700/50'}`}
                >
                  全部
                </button>
                {years.slice(0, 3).map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedCategory(year.toString())}
                    className={`px-4 py-3 rounded-xl transition-colors ${selectedCategory === year.toString() ? 'bg-blue-600 text-white' : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700/50'}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 论文列表 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>文档列表 ({filteredPapers.length})</span>
              </h2>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-colors w-80"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">{paper.title}</h3>
                      <p className="text-sm text-slate-400 mb-3">{paper.authors} · {paper.year}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {paper.keywords && Array.isArray(paper.keywords) && paper.keywords.slice(0, 3).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-slate-500">{paper.fileName || '无文件'}</span>
                        <div className="flex space-x-2">
                          <button className="p-1.5 bg-slate-700/50 rounded-lg hover:bg-slate-600 transition-colors text-slate-300">
                            <Search className="w-4 h-4" />
                          </button>
                          {paper.filePath && (
                            <button className="p-1.5 bg-slate-700/50 rounded-lg hover:bg-slate-600 transition-colors text-slate-300">
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
                <button className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
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
