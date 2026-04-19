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
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-slate-700">
                科研新体验，让研究更高效
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ResearchMind
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              智能分析学术论文，构建知识图谱，发现学术研究的无限可能
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/analyze">
                <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-2xl shadow-lg">
                  开始使用
                </button>
              </Link>
              <Link to="/graph">
                <button className="px-8 py-4 bg-white text-slate-700 text-lg font-semibold rounded-2xl shadow-lg border border-slate-200">
                  查看示例
                </button>
              </Link>
              <button 
                id="loadSampleData" 
                onClick={handleLoadSampleData}
                className="px-6 py-3 bg-yellow-500 text-white text-lg font-semibold rounded-xl shadow-md hover:bg-yellow-600 transition-colors"
              >
                加载示例数据
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">核心功能</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">智能论文分析</h3>
              <p className="text-slate-600">自动解析论文内容，提取关键信息</p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Network className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">知识图谱构建</h3>
              <p className="text-slate-600">可视化展示论文之间的关联关系</p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mb-6">
                <Laptop className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">研究工作台</h3>
              <p className="text-slate-600">管理你的文献库，添加笔记和标签</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
