import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, FileText, Users, TrendingUp, Calendar, Tag,
  Activity, Layers, GitBranch, Loader2, AlertCircle
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { trendsApi } from '../services/api';
import ParticleAnimation from '../components/features/ParticleAnimation';
import type { TrendsData, Paper, TimelineData } from '../types';

// 图表配色
const COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#fb923c', '#e879f9'];

// 从本地论文计算基础可视化数据（后端不可用时的回退方案）
function computeLocalTrends(papers: Paper[]): TrendsData {
  const yearPaperCount: Record<number, number> = {};
  const keywordFreq: Record<string, number> = {};

  for (const p of papers) {
    if (p.year) yearPaperCount[p.year] = (yearPaperCount[p.year] || 0) + 1;
    (p.keywords || []).forEach(k => { keywordFreq[k] = (keywordFreq[k] || 0) + 1; });
  }

  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([k]) => k);

  const years = Object.keys(yearPaperCount).map(Number).sort((a, b) => a - b);
  const timelineData: TimelineData[] = years.map(year => {
    const entry: TimelineData = { year };
    topKeywords.forEach(kw => { entry[kw] = 0; });
    return entry;
  });

  // 简单聚类：按第一关键词分组
  const clusterMap: Record<string, Paper[]> = {};
  papers.forEach(p => {
    const key = (p.keywords && p.keywords[0]) || '未分类';
    if (!clusterMap[key]) clusterMap[key] = [];
    clusterMap[key].push(p);
  });
  const clusters = Object.entries(clusterMap).map(([label, members], i) => ({
    id: i,
    label,
    topTerms: [label],
    members: members.map((m, idx) => ({ id: m.id, title: m.title, year: m.year || 0, index: idx })),
    count: members.length
  }));

  // 基于关键词重叠构建论文相似度网络
  const nodes = papers.map(p => ({
    id: p.id,
    title: p.title,
    year: p.year || 0,
    keywords: (p.keywords || []).slice(0, 5)
  }));
  const links: { source: string; target: string; similarity: number }[] = [];
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const kwA = new Set(papers[i].keywords || []);
      const kwB = new Set(papers[j].keywords || []);
      if (kwA.size === 0 || kwB.size === 0) continue;
      const intersection = [...kwA].filter(k => kwB.has(k)).length;
      const union = new Set([...kwA, ...kwB]).size;
      const similarity = union > 0 ? Math.round((intersection / union) * 10000) / 10000 : 0;
      if (similarity > 0) {
        links.push({ source: papers[i].id, target: papers[j].id, similarity });
      }
    }
  }

  return {
    timeline: { timelineData, topKeywords, years, yearPaperCount },
    clustering: { clusters, k: clusters.length },
    network: { nodes, links },
    summary: {
      totalPapers: papers.length,
      yearRange: years.length ? { from: Math.min(...years), to: Math.max(...years) } : null,
      topKeywords,
      clusterCount: clusters.length
    }
  };
}

export default function Dashboard() {
  const { papers, notes, token, loadPapers, loadNotes } = useAppStore();
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPapers();
    loadNotes();
  }, [loadPapers, loadNotes]);

  useEffect(() => {
    let cancelled = false;
    async function fetchTrends() {
      setLoading(true);
      setError(null);
      try {
        if (token) {
          const data = await trendsApi.getOverview(token);
          if (!cancelled) setTrends(data);
        } else {
          // 未登录时使用本地计算
          if (!cancelled) setTrends(computeLocalTrends(papers));
        }
      } catch (e) {
        console.error('加载趋势数据失败，使用本地计算:', e);
        if (!cancelled) {
          setTrends(computeLocalTrends(papers));
          setError('未能连接到分析服务，已使用本地数据展示');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTrends();
    return () => { cancelled = true; };
  }, [token, papers]);

  // 发表趋势数据
  const publicationTrend = useMemo(() => {
    if (!trends?.timeline.yearPaperCount) return [];
    return Object.entries(trends.timeline.yearPaperCount)
      .map(([year, count]) => ({ year: Number(year), count }))
      .sort((a, b) => a.year - b.year);
  }, [trends]);

  // 关键词频率数据（用于词云和柱状图）
  const keywordFreqData = useMemo(() => {
    if (!trends?.timeline.topKeywords) return [];
    // 优先使用后端返回的 TF-IDF 全局频次（基于全文分析）
    const freq: Record<string, number> = trends.timeline.topKeywordFreq
      ? { ...trends.timeline.topKeywordFreq }
      : {};
    // 若后端未返回频次，降级为本地统计论文作者关键词
    if (Object.keys(freq).length === 0) {
      trends.timeline.topKeywords.forEach(kw => { freq[kw] = 0; });
      papers.forEach(p => (p.keywords || []).forEach(k => {
        if (freq[k] !== undefined) freq[k]++;
      }));
    }
    return Object.entries(freq)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [trends, papers]);

  // 聚类分布数据
  const clusterData = useMemo(() => {
    let clusters = trends?.clustering.clusters || [];
    if (clusters.length === 0 && papers.length > 0) {
      const local = computeLocalTrends(papers);
      clusters = local.clustering.clusters;
    }
    return clusters.map(c => ({
      name: c.label.length > 8 ? c.label.slice(0, 8) + '…' : c.label,
      fullName: c.label,
      value: c.count,
      topTerms: c.topTerms
    }));
  }, [trends, papers]);

  // 论文相似度热力图数据
  const heatmapData = useMemo(() => {
    let nodes = trends?.network.nodes || [];
    let links = trends?.network.links || [];
    if (nodes.length === 0 && papers.length >= 2) {
      const local = computeLocalTrends(papers);
      nodes = local.network.nodes;
      links = local.network.links;
    }
    if (nodes.length === 0) return { matrix: [], labels: [] };
    const labels = nodes.map(n => n.title.length > 12 ? n.title.slice(0, 12) + '…' : n.title);
    const n = nodes.length;
    const idToIdx: Record<string, number> = {};
    nodes.forEach((nd, i) => { idToIdx[nd.id] = i; });
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    links.forEach(l => {
      const i = idToIdx[l.source];
      const j = idToIdx[l.target];
      if (i !== undefined && j !== undefined) {
        matrix[i][j] = l.similarity;
        matrix[j][i] = l.similarity;
      }
    });
    return { matrix, labels };
  }, [trends]);

  // 年度关键词演变数据（取前6个关键词）
  const keywordEvolution = useMemo(() => {
    return trends?.timeline.timelineData || [];
  }, [trends]);
  const evolutionKeywords = useMemo(() => {
    return (trends?.timeline.topKeywords || []).slice(0, 6);
  }, [trends]);

  const totalPapers = trends?.summary.totalPapers ?? papers.length;
  const totalNotes = notes.length;
  const yearRange = trends?.summary.yearRange;
  const keywordCount = trends?.summary.topKeywords?.length || 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParticleAnimation />

      <div className="relative z-10 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          {/* 标题 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-blue-300 mb-2 flex items-center space-x-3">
              <BarChart3 className="w-10 h-10 text-blue-400" />
              <span>研究数据可视化大屏</span>
            </h1>
            <p className="text-lg text-blue-300 font-medium">
              基于 TF-IDF、K-Means 聚类与相似度网络的学术文献数据分析
            </p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 bg-amber-900/40 border border-amber-600/40 rounded-xl px-4 py-3 flex items-center space-x-2 text-amber-200 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-blue-300">
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p>正在分析文献数据...</p>
            </div>
          ) : (
            <>
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
                  <div className="mt-2 text-blue-300 text-sm">文献库总量</div>
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
                  <div className="mt-2 text-purple-300 text-sm">阅读批注数量</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-green-900/80 to-green-800/80 backdrop-blur-lg rounded-2xl border border-green-700/50 p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-green-200">年份跨度</h3>
                    <Calendar className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {yearRange ? `${yearRange.from}-${yearRange.to}` : '—'}
                  </p>
                  <div className="mt-2 text-green-300 text-sm">发表时间范围</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-orange-900/80 to-orange-800/80 backdrop-blur-lg rounded-2xl border border-orange-700/50 p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-orange-200">主题聚类</h3>
                    <Layers className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{trends?.summary.clusterCount || 0}</p>
                  <div className="mt-2 text-orange-300 text-sm">K-Means 自动聚类</div>
                </motion.div>
              </div>

              {/* 第一行：发表趋势 + 关键词云 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6 shadow-lg"
                >
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    <span>论文发表趋势</span>
                  </h2>
                  <div className="h-72">
                    {publicationTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={publicationTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="year" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                            labelStyle={{ color: '#e2e8f0' }}
                          />
                          <Area type="monotone" dataKey="count" name="论文数" stroke="#22d3ee" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500">暂无数据</div>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6 shadow-lg"
                >
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                    <Tag className="w-5 h-5 text-fuchsia-400" />
                    <span>研究关键词云</span>
                  </h2>
                  <div className="h-72 flex flex-wrap items-center justify-center gap-3 overflow-hidden">
                    {keywordFreqData.length > 0 ? (
                      keywordFreqData.map((kw, i) => {
                        const max = keywordFreqData[0].value || 1;
                        const size = 14 + (kw.value / max) * 28;
                        return (
                          <span
                            key={kw.name}
                            className="font-semibold transition-transform hover:scale-110 cursor-default"
                            style={{
                              fontSize: `${size}px`,
                              color: COLORS[i % COLORS.length],
                              opacity: 0.6 + (kw.value / max) * 0.4
                            }}
                          >
                            {kw.name}
                          </span>
                        );
                      })
                    ) : (
                      <div className="text-slate-500">暂无关键词数据</div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* 第二行：主题聚类分布 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6 shadow-lg mb-8"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span>主题聚类分布（K-Means）</span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-72">
                    {clusterData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={clusterData}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={45}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                          >
                            {clusterData.map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                            formatter={(value: number, _name, props) => [`${value} 篇`, props.payload.fullName]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500">暂无聚类数据</div>
                    )}
                  </div>
                  <div className="space-y-3 overflow-y-auto max-h-72 pr-2">
                    {clusterData.map((c, i) => (
                      <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{c.fullName}</div>
                          <div className="text-xs text-slate-400">代表词: {c.topTerms.slice(0, 3).join('、')}</div>
                        </div>
                        <span className="text-lg font-bold text-slate-200 flex-shrink-0">{c.value}</span>
                      </div>
                    ))}
                    {clusterData.length === 0 && (
                      <div className="text-slate-500 text-sm">暂无聚类数据</div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* 第三行：论文相似度热力图 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6 shadow-lg mb-8"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                  <GitBranch className="w-5 h-5 text-rose-400" />
                  <span>论文相似度热力图（余弦相似度）</span>
                </h2>
                {heatmapData.matrix.length > 0 ? (
                  <div className="overflow-auto">
                    <div className="inline-block min-w-full">
                      <div className="flex">
                        <div className="w-32 flex-shrink-0" />
                        {heatmapData.labels.map((label, i) => (
                          <div key={i} className="w-10 h-16 flex items-end justify-center flex-shrink-0">
                            <span className="text-[10px] text-slate-400 whitespace-nowrap origin-bottom-left -rotate-45 translate-x-2">
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                      {heatmapData.matrix.map((row, i) => (
                        <div key={i} className="flex items-center">
                          <div className="w-32 text-right pr-2 text-[10px] text-slate-400 truncate flex-shrink-0" title={heatmapData.labels[i]}>
                            {heatmapData.labels[i]}
                          </div>
                          {row.map((val, j) => {
                            const intensity = Math.max(0, Math.min(1, val));
                            const bg = i === j
                              ? 'rgba(99, 102, 241, 0.6)'
                              : `rgba(56, 189, 248, ${intensity})`;
                            return (
                              <div
                                key={j}
                                className="w-10 h-10 border border-slate-700/50 flex items-center justify-center text-[9px] text-white flex-shrink-0"
                                style={{ backgroundColor: bg }}
                                title={`${heatmapData.labels[i]} ↔ ${heatmapData.labels[j]}: ${val.toFixed(2)}`}
                              >
                                {i === j ? '1' : val > 0 ? val.toFixed(1) : ''}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-500">
                    暂无足够的论文用于构建相似度网络（至少需要 2 篇）
                  </div>
                )}
              </motion.div>

              {/* 第四行：年度关键词演变 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6 shadow-lg"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <span>年度关键词演变趋势</span>
                </h2>
                <div className="h-80">
                  {keywordEvolution.length > 0 && evolutionKeywords.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={keywordEvolution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="year" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                          labelStyle={{ color: '#e2e8f0' }}
                        />
                        <Legend wrapperStyle={{ color: '#94a3b8' }} />
                        {evolutionKeywords.map((kw, i) => (
                          <Line
                            key={kw}
                            type="monotone"
                            dataKey={kw}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">暂无关键词演变数据</div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
