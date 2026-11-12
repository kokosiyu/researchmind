import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, FileText, Users, TrendingUp, Calendar, Tag,
  Activity, Layers, GitBranch, Loader2, AlertCircle, Search,
  Download, Plus, ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { trendsApi } from '../services/api';
import ParticleAnimation from '../components/features/ParticleAnimation';
import type { TrendsData, Paper, TimelineData } from '../types';

const COLORS = ['#3b82f6', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#fb923c', '#e879f9'];

function computeLocalTrends(papers: Paper[]): TrendsData {
  const yearPaperCount: Record<number, number> = {};
  const keywordFreq: Record<string, number> = {};
  for (const p of papers) {
    if (p.year) yearPaperCount[p.year] = (yearPaperCount[p.year] || 0) + 1;
    (p.keywords || []).forEach(k => { keywordFreq[k] = (keywordFreq[k] || 0) + 1; });
  }
  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k);
  const years = Object.keys(yearPaperCount).map(Number).sort((a, b) => a - b);
  const timelineData = years.map(year => {
    const entry: TimelineData = { year };
    topKeywords.forEach(kw => { entry[kw] = 0; });
    return entry;
  });
  const clusterMap: Record<string, Paper[]> = {};
  papers.forEach(p => {
    const key = (p.keywords && p.keywords[0]) || '未分类';
    if (!clusterMap[key]) clusterMap[key] = [];
    clusterMap[key].push(p);
  });
  const clusters = Object.entries(clusterMap).map(([label, members], i) => ({
    id: i, label, topTerms: [label],
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
      topKeywords, clusterCount: clusters.length
    }
  };
}

export default function Dashboard() {
  const { papers, notes, loadPapers, loadNotes } = useAppStore();
  const navigate = useNavigate();
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
        const data = await trendsApi.getOverview();
        if (!cancelled) setTrends(data);
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
  }, [papers]);

  const publicationTrend = useMemo(() => {
    if (!trends?.timeline.yearPaperCount) return [];
    return Object.entries(trends.timeline.yearPaperCount)
      .map(([year, count]) => ({ year: Number(year), count }))
      .sort((a, b) => a.year - b.year);
  }, [trends]);

  const keywordFreqData = useMemo(() => {
    if (!trends?.timeline.topKeywords) return [];
    // 优先使用后端返回的 TF-IDF 全局频次（基于全文分析）
    const freq: Record<string, number> = trends.timeline.topKeywordFreq
      ? { ...trends.timeline.topKeywordFreq }
      : {};
    // 若后端未返回频次，降级为本地统计论文作者关键词
    if (Object.keys(freq).length === 0) {
      trends.timeline.topKeywords.forEach(kw => { freq[kw] = 0; });
      papers.forEach(p => (p.keywords || []).forEach(k => { if (freq[k] !== undefined) freq[k]++; }));
    }
    return Object.entries(freq).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [trends, papers]);

  const clusterData = useMemo(() => {
    let clusters = trends?.clustering.clusters || [];
    // 兜底：若 API 返回空聚类但本地有论文，使用本地聚类
    if (clusters.length === 0 && papers.length > 0) {
      const local = computeLocalTrends(papers);
      clusters = local.clustering.clusters;
    }
    return clusters.map(c => ({
      name: c.label.length > 8 ? c.label.slice(0, 8) + '…' : c.label,
      fullName: c.label, value: c.count, topTerms: c.topTerms
    }));
  }, [trends, papers]);

  const heatmapData = useMemo(() => {
    let nodes = trends?.network.nodes || [];
    let links = trends?.network.links || [];
    // 兜底：若 API 返回空网络但本地有 >=2 篇论文，使用本地网络
    if (nodes.length === 0 && papers.length >= 2) {
      const local = computeLocalTrends(papers);
      nodes = local.network.nodes;
      links = local.network.links;
    }
    if (nodes.length === 0) return { matrix: [], labels: [] };
    const labels = nodes.map(n => n.title.length > 12 ? n.title.slice(0, 12) + '…' : n.title);
    const idToIdx: Record<string, number> = {};
    nodes.forEach((nd, i) => { idToIdx[nd.id] = i; });
    const n = nodes.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    links.forEach(l => {
      const i = idToIdx[l.source], j = idToIdx[l.target];
      if (i !== undefined && j !== undefined) { matrix[i][j] = l.similarity; matrix[j][i] = l.similarity; }
    });
    return { matrix, labels };
  }, [trends]);

  const keywordEvolution = useMemo(() => trends?.timeline.timelineData || [], [trends]);
  const evolutionKeywords = useMemo(() => (trends?.timeline.topKeywords || []).slice(0, 6), [trends]);

  const totalPapers = trends?.summary.totalPapers ?? papers.length;
  const totalNotes = notes.length;
  const yearRange = trends?.summary.yearRange;
  const years = Array.from(new Set(papers.filter(p => p.year).map(p => p.year))).sort((a, b) => b - a);

  const filteredPapers = papers.filter(paper => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      paper.title.toLowerCase().includes(term) ||
      paper.authors.toLowerCase().includes(term) ||
      (paper.keywords && paper.keywords.some(k => k.toLowerCase().includes(term)))
    );
  });

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      <ParticleAnimation />

      <div className="relative z-10 pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center space-x-2 sm:space-x-3">
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-blue-500" />
              <span>研究数据可视化大屏</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-500">
              基于 TF-IDF、K-Means 聚类与相似度网络的学术文献数据分析
            </p>
          </motion.div>

          {error && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center space-x-2 text-amber-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-500">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
              <p>正在分析文献数据...</p>
            </div>
          ) : (
            <>
              {/* 统计卡片 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-blue-700">总论文数</h3>
                    <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-900">{totalPapers}</p>
                  <div className="mt-2 text-blue-600 text-xs sm:text-sm">文献库总量</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-sky-50 to-sky-100/60 rounded-xl sm:rounded-2xl border border-sky-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-sky-700">总笔记数</h3>
                    <Users className="w-4 h-4 sm:w-6 sm:h-6 text-sky-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-sky-900">{totalNotes}</p>
                  <div className="mt-2 text-sky-600 text-xs sm:text-sm">阅读批注数量</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-cyan-50 to-cyan-100/60 rounded-xl sm:rounded-2xl border border-cyan-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-cyan-700">年份跨度</h3>
                    <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-cyan-900">
                    {yearRange ? `${yearRange.from}-${yearRange.to}` : '—'}
                  </p>
                  <div className="mt-2 text-cyan-600 text-xs sm:text-sm">发表时间范围</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 rounded-xl sm:rounded-2xl border border-indigo-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-indigo-700">主题聚类</h3>
                    <Layers className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-indigo-900">{trends?.summary.clusterCount || 0}</p>
                  <div className="mt-2 text-indigo-600 text-xs sm:text-sm">K-Means 自动聚类</div>
                </motion.div>
              </div>

              {/* 第一行：发表趋势 + 关键词云 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-cyan-500" />
                    <span>论文发表趋势</span>
                  </h2>
                  <div className="h-64 sm:h-72">
                    {publicationTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={publicationTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="year" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                          <Area type="monotone" dataKey="count" name="论文数" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-400">暂无数据</div>}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                    <Tag className="w-5 h-5 text-fuchsia-500" />
                    <span>研究关键词云</span>
                  </h2>
                  <div className="h-64 sm:h-72 flex flex-wrap items-center justify-center gap-2 sm:gap-3 overflow-hidden">
                    {keywordFreqData.length > 0 ? keywordFreqData.map((kw, i) => {
                      const max = keywordFreqData[0].value || 1;
                      const size = 14 + (kw.value / max) * 26;
                      return (
                        <span key={kw.name} className="font-semibold transition-transform hover:scale-110 cursor-default"
                          style={{ fontSize: `${size}px`, color: COLORS[i % COLORS.length], opacity: 0.6 + (kw.value / max) * 0.4 }}>
                          {kw.name}
                        </span>
                      );
                    }) : <div className="text-slate-400">暂无关键词数据</div>}
                  </div>
                </motion.div>
              </div>

              {/* 第二行：主题聚类分布 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  <span>主题聚类分布（K-Means）</span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="h-64 sm:h-72">
                    {clusterData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={clusterData} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                            {clusterData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                            formatter={(value: number, _name, props) => [`${value} 篇`, props.payload.fullName]} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-400">暂无聚类数据</div>}
                  </div>
                  <div className="space-y-2 sm:space-y-3 overflow-y-auto max-h-64 sm:max-h-72 pr-1 sm:pr-2">
                    {clusterData.map((c, i) => (
                      <div key={i} className="flex items-center space-x-3 p-2 sm:p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{c.fullName}</div>
                          <div className="text-xs text-slate-400">代表词: {c.topTerms.slice(0, 3).join('、')}</div>
                        </div>
                        <span className="text-lg font-bold text-slate-700 flex-shrink-0">{c.value}</span>
                      </div>
                    ))}
                    {clusterData.length === 0 && <div className="text-slate-400 text-sm">暂无聚类数据</div>}
                  </div>
                </div>
              </motion.div>

              {/* 第三行：论文相似度热力图 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <GitBranch className="w-5 h-5 text-rose-500" />
                  <span>论文相似度热力图（余弦相似度）</span>
                </h2>
                {heatmapData.matrix.length > 0 ? (
                  <div className="overflow-auto">
                    <div className="inline-block min-w-full">
                      <div className="flex">
                        <div className="w-28 sm:w-32 flex-shrink-0" />
                        {heatmapData.labels.map((label, i) => (
                          <div key={i} className="w-9 sm:w-10 h-16 flex items-end justify-center flex-shrink-0">
                            <span className="text-[10px] text-slate-500 whitespace-nowrap origin-bottom-left -rotate-45 translate-x-2">{label}</span>
                          </div>
                        ))}
                      </div>
                      {heatmapData.matrix.map((row, i) => (
                        <div key={i} className="flex items-center">
                          <div className="w-28 sm:w-32 text-right pr-2 text-[10px] text-slate-500 truncate flex-shrink-0" title={heatmapData.labels[i]}>
                            {heatmapData.labels[i]}
                          </div>
                          {row.map((val, j) => {
                            const intensity = Math.max(0, Math.min(1, val));
                            const bg = i === j ? 'rgba(99, 102, 241, 0.5)' : `rgba(14, 165, 233, ${intensity})`;
                            return (
                              <div key={j} className="w-9 sm:w-10 h-9 sm:h-10 border border-slate-100 flex items-center justify-center text-[9px] text-white flex-shrink-0"
                                style={{ backgroundColor: bg }}
                                title={`${heatmapData.labels[i]} ↔ ${heatmapData.labels[j]}: ${val.toFixed(2)}`}>
                                {i === j ? '1' : val > 0 ? val.toFixed(1) : ''}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400">暂无足够的论文用于构建相似度网络（至少需要 2 篇）</div>
                )}
              </motion.div>

              {/* 第四行：年度关键词演变 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-amber-500" />
                  <span>年度关键词演变趋势</span>
                </h2>
                <div className="h-72 sm:h-80">
                  {keywordEvolution.length > 0 && evolutionKeywords.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={keywordEvolution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="year" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                        <Legend />
                        {evolutionKeywords.map((kw, i) => (
                          <Line key={kw} type="monotone" dataKey={kw} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-slate-400">暂无关键词演变数据</div>}
                </div>
              </motion.div>

              {/* 近期论文列表 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    <span>文档列表 ({filteredPapers.length})</span>
                  </h2>
                  <button onClick={() => navigate('/analyze')}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" /><span>添加文档</span>
                  </button>
                </div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="text" placeholder="搜索论文标题、作者或关键词..." value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredPapers.slice(0, 6).map((paper, index) => (
                    <motion.div key={paper.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index }}
                      className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-blue-400 hover:shadow-md transition-all">
                      <div className="flex-1">
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1 line-clamp-2">{paper.title}</h3>
                        <p className="text-xs sm:text-sm text-slate-500 mb-2 sm:mb-3">{paper.authors} · {paper.year}</p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          {paper.keywords && paper.keywords.slice(0, 3).map((keyword, idx) => (
                            <span key={idx} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-600 text-xs rounded-full">{keyword}</span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-slate-400">{paper.fileName || '无文件'}</span>
                          <div className="flex space-x-1.5 sm:space-x-2">
                            <button onClick={() => navigate('/search')} className="p-1.5 sm:p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-blue-500">
                              <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            {paper.filePath && (
                              <button onClick={() => {
                                const a = document.createElement('a');
                                a.href = `/uploads/${paper.filePath}`;
                                a.download = paper.fileName || 'paper';
                                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                              }} className="p-1.5 sm:p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-blue-500">
                                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {filteredPapers.length === 0 && (
                    <div className="text-center py-8 sm:py-12 text-slate-400 w-full col-span-full">
                      <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-20" />
                      <p className="text-sm sm:text-lg">暂无文档</p>
                    </div>
                  )}
                </div>
                {filteredPapers.length > 6 && (
                  <div className="mt-4 sm:mt-6 flex justify-center">
                    <button onClick={() => navigate('/search')}
                      className="flex items-center space-x-1.5 sm:space-x-2 text-blue-500 hover:text-blue-600 transition-colors text-sm">
                      <span>查看更多</span><ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
