import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, Filter, X, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Link } from 'react-router-dom';
import ParticleAnimation from '../components/features/ParticleAnimation';

export default function SearchPage() {
  const { papers } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPapers, setFilteredPapers] = useState(papers);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);

  // 提取所有关键词
  useEffect(() => {
    const keywords = new Set<string>();
    papers.forEach(paper => {
      if (paper.keywords && Array.isArray(paper.keywords)) {
        paper.keywords.forEach(keyword => keywords.add(keyword));
      }
    });
    setAllKeywords(Array.from(keywords));
  }, [papers]);

  // 过滤论文
  useEffect(() => {
    let result = papers;

    // 按搜索词过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(paper => 
        (paper.title || '').toLowerCase().includes(term) ||
        (paper.authors || '').toLowerCase().includes(term) ||
        (paper.abstract || '').toLowerCase().includes(term) ||
        (paper.keywords && Array.isArray(paper.keywords) && paper.keywords.some(keyword => keyword.toLowerCase().includes(term)))
      );
    }

    // 按年份过滤
    if (selectedYear) {
      result = result.filter(paper => paper.year && paper.year.toString() === selectedYear);
    }

    // 按关键词过滤
    if (selectedKeywords.length > 0) {
      result = result.filter(paper => 
        paper.keywords && Array.isArray(paper.keywords) && selectedKeywords.some(keyword => paper.keywords.includes(keyword))
      );
    }

    setFilteredPapers(result);
  }, [papers, searchTerm, selectedYear, selectedKeywords]);

  // 获取所有年份
  const years = Array.from(new Set(papers.filter(p => p.year).map(p => p.year))).sort((a, b) => b - a);

  const handleKeywordToggle = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
    } else {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 relative overflow-hidden">
      <ParticleAnimation />
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center space-x-3">
            <Search className="w-8 h-8 text-blue-600" />
            <span>论文搜索</span>
          </h1>
          <p className="text-lg text-slate-600">
            搜索和筛选你的学术论文
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* 左侧筛选面板 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* 年份筛选 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <span>年份</span>
              </h2>
              <div className="space-y-2">
                {years.map(year => (
                  <div key={year} className="flex items-center">
                    <input
                      type="radio"
                      id={`year-${year}`}
                      name="year"
                      value={year.toString()}
                      checked={selectedYear === year.toString()}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="mr-2"
                    />
                    <label htmlFor={`year-${year}`} className="text-slate-700">
                      {year}
                    </label>
                  </div>
                ))}
                {years.length === 0 && (
                  <p className="text-slate-500 text-sm">暂无数据</p>
                )}
              </div>
            </div>

            {/* 关键词筛选 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <span>关键词</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {allKeywords.map(keyword => (
                  <button
                    key={keyword}
                    onClick={() => handleKeywordToggle(keyword)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedKeywords.includes(keyword)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    {keyword}
                  </button>
                ))}
                {allKeywords.length === 0 && (
                  <p className="text-slate-500 text-sm">暂无数据</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* 右侧搜索结果 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 搜索框 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="搜索论文标题、作者、摘要或关键词..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>

            {/* 搜索结果 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  搜索结果 ({filteredPapers.length})
                </h2>
                {filteredPapers.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedYear('');
                      setSelectedKeywords([]);
                    }}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                  >
                    <X className="w-4 h-4" />
                    <span>清除筛选</span>
                  </button>
                )}
              </div>

              {filteredPapers.length > 0 ? (
                <div className="space-y-4">
                  {filteredPapers.map((paper) => (
                    <Link to={`/analyze`} key={paper.id} className="block">
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all"
                      >
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{paper.title}</h3>
                        <p className="text-slate-600 mb-3">{paper.authors} · {paper.year}</p>
                        <p className="text-slate-700 mb-4 line-clamp-2">{paper.abstract}</p>
                        <div className="flex flex-wrap gap-2">
                          {paper.keywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                  <Search className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {searchTerm || selectedYear || selectedKeywords.length > 0
                      ? '没有找到匹配的论文'
                      : '开始搜索你的论文'}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {searchTerm || selectedYear || selectedKeywords.length > 0
                      ? '尝试调整搜索条件或筛选选项'
                      : '使用上方搜索框或筛选条件来查找论文'}
                  </p>
                  <Link to="/analyze">
                    <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-5 h-5" />
                        <span>添加新论文</span>
                      </div>
                    </button>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
