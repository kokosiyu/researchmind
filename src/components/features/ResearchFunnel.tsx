import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Eye, Brain, FileEdit, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const stages = [
  { key: 'search', label: '文献检索', icon: Search, color: 'from-blue-500 to-blue-600' },
  { key: 'collect', label: '文献收集', icon: BookOpen, color: 'from-sky-500 to-sky-600' },
  { key: 'read', label: '深度阅读', icon: Eye, color: 'from-cyan-500 to-cyan-600' },
  { key: 'analyze', label: '分析归纳', icon: Brain, color: 'from-teal-500 to-teal-600' },
  { key: 'write', label: '论文撰写', icon: FileEdit, color: 'from-emerald-500 to-emerald-600' },
];

export default function ResearchFunnel() {
  const { papers, notes } = useAppStore();

  const stageData = useMemo(() => {
    const totalPapers = papers.length;
    const totalNotes = notes.length;
    const papersWithKeywords = papers.filter(p => p.keywords && Array.isArray(p.keywords) && p.keywords.length > 0).length;
    const papersWithSummary = papers.filter(p => p.summary && p.summary.length > 50).length;
    const papersWithNotes = new Set(notes.map(n => n.paperId)).size;

    const values = [
      { count: totalPapers, max: Math.max(totalPapers, 1) },
      { count: totalPapers, max: Math.max(totalPapers, 1) },
      { count: papersWithSummary, max: Math.max(totalPapers, 1) },
      { count: papersWithKeywords, max: Math.max(totalPapers, 1) },
      { count: papersWithNotes, max: Math.max(totalPapers, 1) },
    ];

    return stages.map((stage, i) => ({
      ...stage,
      count: values[i].count,
      percent: values[i].max > 0 ? Math.round((values[i].count / values[i].max) * 100) : 0,
    }));
  }, [papers, notes]);

  const totalPapers = papers.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
    >
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        <span>研究进度</span>
      </h2>

      {totalPapers === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>上传论文后可查看研究进度</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stageData.map((stage, index) => {
            const Icon = stage.icon;
            const widthPercent = Math.max(stage.percent, 15);
            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="relative"
              >
                <div className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-slate-600 flex items-center gap-1.5 flex-shrink-0">
                    <Icon className="w-4 h-4 text-slate-400" />
                    {stage.label}
                  </div>
                  <div className="flex-1 h-10 bg-slate-100 rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPercent}%` }}
                      transition={{ duration: 0.8, delay: 0.15 * index, ease: 'easeOut' }}
                      className={`h-full bg-gradient-to-r ${stage.color} rounded-lg flex items-center justify-end pr-3`}
                    >
                      <span className="text-white text-sm font-bold whitespace-nowrap">
                        {stage.count}
                      </span>
                    </motion.div>
                  </div>
                  <div className="w-12 text-right text-sm font-semibold text-slate-700 flex-shrink-0">
                    {stage.percent}%
                  </div>
                </div>
              </motion.div>
            );
          })}

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>共 {totalPapers} 篇论文 · {notes.length} 条笔记</span>
            <span className="text-blue-500 font-medium">
              完成度 {stageData.length > 0 ? Math.round(stageData.reduce((s, d) => s + d.percent, 0) / stageData.length) : 0}%
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
