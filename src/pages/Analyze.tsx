
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, FileText, Trash2 } from 'lucide-react';
import { PaperUploader } from '../components/features/PaperUploader';
import { useAppStore } from '../store/useAppStore';
import ParticleAnimation from '../components/features/ParticleAnimation';

export default function Analyze() {
  const { papers, deletePaper } = useAppStore();
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);

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
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span>论文分析</span>
          </h1>
          <p className="text-lg text-slate-600">
            上传和分析学术论文
          </p>
        </motion.div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span>添加新论文</span>
            </h2>
            <PaperUploader />
          </motion.div>

          {papers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>论文列表</span>
                  </h2>
                  {selectedPapers.length > 0 && (
                    <button
                      onClick={async () => {
                        if (window.confirm(`确定要删除选中的 ${selectedPapers.length} 篇论文吗？`)) {
                          for (const paperId of selectedPapers) {
                            await deletePaper(paperId);
                          }
                          setSelectedPapers([]);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>批量删除 ({selectedPapers.length})</span>
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {papers.map((paper) => (
                    <div
                      key={paper.id}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedPaper === paper.id
                          ? 'border-blue-500 bg-blue-50'
                          : selectedPapers.includes(paper.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start mb-1">
                        <input
                          type="checkbox"
                          checked={selectedPapers.includes(paper.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedPapers([...selectedPapers, paper.id]);
                            } else {
                              setSelectedPapers(selectedPapers.filter(id => id !== paper.id));
                            }
                          }}
                          className="mr-3 mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900" onClick={() => setSelectedPaper(selectedPaper === paper.id ? null : paper.id)}>
                            {paper.title}
                          </h3>
                          <p className="text-sm text-slate-600 mb-2" onClick={() => setSelectedPaper(selectedPaper === paper.id ? null : paper.id)}>
                            {paper.authors} · {paper.year}
                          </p>
                          <div className="flex flex-wrap gap-2" onClick={() => setSelectedPaper(selectedPaper === paper.id ? null : paper.id)}>
                            {Array.isArray(paper.keywords) ? paper.keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                              >
                                {keyword}
                              </span>
                            )) : null}
                          </div>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('确定要删除这篇论文吗？')) {
                              await deletePaper(paper.id);
                              setSelectedPapers(selectedPapers.filter(id => id !== paper.id));
                            }
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                          title="删除论文"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

