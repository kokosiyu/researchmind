import { Link } from 'react-router-dom';
import { Brain, BookOpen, Network, Laptop, Sparkles, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useState, useEffect } from 'react';
import ParticleAnimation from '../components/features/ParticleAnimation';

export default function Home() {
  const { loadSampleData, loadPapers, loadNotes } = useAppStore();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleLoadSampleData = async () => {
    loadSampleData();
    setShowSuccess(true);
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParticleAnimation />
      {showSuccess && (
        <div className="fixed top-24 right-4 z-50 animate-bounce">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">示例数据加载成功！</span>
          </div>
        </div>
      )}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/80 rounded-full mb-6 sm:mb-8">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
              <span className="text-xs sm:text-sm font-medium text-slate-700">
                科研新体验，让研究更高效
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                ResearchMind
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-xl text-slate-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-2">
              智能分析学术论文，构建知识图谱，发现学术研究的无限可能
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-2">
              <Link to="/analyze">
                <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl shadow-lg">
                  开始使用
                </button>
              </Link>
              <Link to="/graph">
                <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-700 text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl shadow-lg border border-slate-200">
                  查看示例
                </button>
              </Link>
              <button 
                id="loadSampleData" 
                onClick={handleLoadSampleData}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-blue-400 text-white text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl shadow-lg hover:bg-blue-500 transition-colors"
              >
                加载示例数据
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-8 sm:mb-12 text-center">核心功能</h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <Link to="/analyze" className="block">
              <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group h-full flex flex-col">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 mb-2 sm:mb-3">智能论文分析</h3>
                <p className="text-xs sm:text-sm text-slate-600">自动解析论文内容，提取关键信息</p>
              </div>
            </Link>
            <Link to="/graph" className="block">
              <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group h-full flex flex-col">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <Network className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 mb-2 sm:mb-3">知识图谱构建</h3>
                <p className="text-xs sm:text-sm text-slate-600">可视化展示论文之间的关联关系</p>
              </div>
            </Link>
            <Link to="/workbench" className="block">
              <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group h-full flex flex-col">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <Laptop className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 mb-2 sm:mb-3">研究工作台</h3>
                <p className="text-xs sm:text-sm text-slate-600">管理你的文献库，添加笔记和标签</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
