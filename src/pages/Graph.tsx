
import { motion } from 'framer-motion';
import { Network, Info, BookOpen, Tag, Users } from 'lucide-react';
import { KnowledgeGraph } from '../components/features/KnowledgeGraph';
import { useAppStore } from '../store/useAppStore';
import ParticleAnimation from '../components/features/ParticleAnimation';

export default function Graph() {
  const { graphData, papers } = useAppStore();

  const handleNodeClick = (node) => {
    console.log('Node clicked:', node);
  };

  // 计算论文之间的相似关系
  const getSimilarPapers = (paperId) => {
    const similarLinks = graphData.links.filter(link => 
      link.type === 'similar' && 
      (link.source === paperId || link.target === paperId)
    );
    
    return similarLinks.map(link => {
      const targetId = link.source === paperId ? link.target : link.source;
      return {
        paper: papers.find(p => p.id === targetId),
        commonKeywords: link.value
      };
    }).filter(item => item.paper);
  };

  // 计算论文的关键词
  const getKeywords = (paperId) => {
    const keywordLinks = graphData.links.filter(link => 
      link.type === 'has-keyword' && link.source === paperId
    );
    
    return keywordLinks.map(link => {
      const keywordNode = graphData.nodes.find(node => node.id === link.target);
      return keywordNode?.label;
    }).filter(Boolean);
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center space-x-3">
                <Network className="w-8 h-8 text-blue-600" />
                <span>知识图谱</span>
              </h1>
              <p className="text-lg text-slate-600">
                探索论文之间的关联关系
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-500">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>论文节点: {graphData.nodes.filter(n => n.type === 'paper').length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span>关键词节点: {graphData.nodes.filter(n => n.type === 'keyword').length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span>关系连接: {graphData.links.length}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-600">
                <p className="mb-1"><strong>操作提示：</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>拖拽节点可以调整位置</li>
                  <li>鼠标滚轮可以缩放视图</li>
                  <li>悬停节点可以高亮关联关系</li>
                </ul>
              </div>
            </div>
          </div>

          <KnowledgeGraph onNodeClick={handleNodeClick} />
        </motion.div>

        {/* 论文卡片展示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>论文关系分析</span>
          </h2>
          
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-6 min-w-max">
              {papers.map((paper, index) => {
                const keywords = getKeywords(paper.id);
                const similarPapers = getSimilarPapers(paper.id);
                
                return (
                  <motion.div
                    key={paper.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow w-80"
                  >
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 line-clamp-2">
                      {paper.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      {paper.authors}
                    </p>
                    
                    {/* 关键词 */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Tag className="w-4 h-4 text-cyan-600" />
                        <h4 className="text-sm font-medium text-slate-700">关键词</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-cyan-50 text-cyan-700 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* 相似论文 */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-medium text-slate-700">相似论文</h4>
                      </div>
                      <div className="space-y-2">
                        {similarPapers.length > 0 ? (
                          similarPapers.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-sm">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-slate-600 line-clamp-1">
                                {item.paper?.title}
                              </span>
                              <span className="text-xs text-blue-600 ml-auto">
                                {item.commonKeywords}个共同关键词
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400">暂无相似论文</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

