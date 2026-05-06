import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Loader2, Layers, Network as NetworkIcon, BarChart3, GitBranch, Clock, Tag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { trendsApi } from '../services/api';
import ParticleAnimation from '../components/features/ParticleAnimation';
import { useAppStore } from '../store/useAppStore';

interface TimelineData {
  year: number;
  [key: string]: number;
}

interface ClusterData {
  id: number;
  label: string;
  topTerms: string[];
  members: { id: string; title: string; year?: number }[];
  count: number;
}

interface NetworkNode {
  id: string;
  title: string;
  year?: number;
  keywords: string[];
}

interface NetworkLink {
  source: string;
  target: string;
  similarity: number;
}

interface OverviewData {
  timeline: { timelineData: TimelineData[]; topKeywords: string[]; years: number[] };
  clustering: { clusters: ClusterData[]; k: number; elbowResults: { k: number; inertia: number; iterations: number }[] };
  network: { nodes: NetworkNode[]; links: NetworkLink[] };
  summary: { totalPapers: number; yearRange: { from: number; to: number } | null; topKeywords: string[]; clusterCount: number };
}

const CLUSTER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const LINE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#a855f7', '#e11d48', '#0ea5e9', '#65a30d', '#d946ef', '#0891b2', '#eab308', '#c026d3', '#059669', '#dc2626'];

type Tab = 'timeline' | 'clusters' | 'network';

export default function Trends() {
  const { papers } = useAppStore();
  const [tab, setTab] = useState<Tab>('timeline');
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await trendsApi.getOverview();
      setData(result);
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const tabs: { key: Tab; label: string; icon: typeof TrendingUp }[] = [
    { key: 'timeline', label: '关键词趋势', icon: Clock },
    { key: 'clusters', label: '主题聚类', icon: Layers },
    { key: 'network', label: '研究脉络', icon: NetworkIcon },
  ];

  return (
    <div className="min-h-screen relative">
      <ParticleAnimation />
      <div className="max-w-7xl mx-auto px-4 py-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            研究趋势分析
          </h1>
          <p className="text-gray-500 mt-2">基于 TF-IDF + K-Means 的智能研究脉络分析</p>
        </motion.div>

        {data && data.summary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={BarChart3} label="论文总数" value={data.summary.totalPapers} color="blue" />
            <StatCard icon={Layers} label="聚类数量" value={data.summary.clusterCount} color="purple" />
            <StatCard icon={Tag} label="关键热词" value={data.summary.topKeywords.length} color="green" />
            <StatCard icon={GitBranch} label="关联链接" value={data.network?.links?.length || 0} color="orange" />
          </motion.div>
        )}

        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                tab === t.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </motion.div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-500">正在分析研究趋势...</span>
          </div>
        )}

        {!loading && data && (
          <AnimatePresence mode="wait">
            {tab === 'timeline' && <TimelineSection key="timeline" data={data} />}
            {tab === 'clusters' && <ClustersSection key="clusters" data={data} />}
            {tab === 'network' && <NetworkSection key="network" data={data} />}
          </AnimatePresence>
        )}

        {!loading && !error && (!data || !data.summary || data.summary.totalPapers === 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 text-gray-400">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">论文库为空，请先上传论文</p>
            <p className="text-sm mt-2">上传带有年份信息的论文后，即可查看研究趋势分析</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof TrendingUp; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl p-4 border ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </motion.div>
  );
}

function TimelineSection({ data }: { data: OverviewData }) {
  const { timelineData, topKeywords } = data.timeline;
  if (!timelineData || timelineData.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="text-center py-16 text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>论文缺少年份信息，无法生成时间线</p>
      </motion.div>
    );
  }

  const displayKeywords = topKeywords.slice(0, 8);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          关键词时序趋势
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          展示论文库中 Top-{displayKeywords.length} 关键词在各年份论文中的出现频率
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} label={{ value: '每篇论文出现次数', angle: -90, position: 'insideLeft' }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {displayKeywords.map((kw, i) => (
              <Line key={kw} type="monotone" dataKey={kw} stroke={LINE_COLORS[i]}
                strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-600" />
          高频关键词排行
        </h3>
        <div className="flex flex-wrap gap-2">
          {topKeywords.map((kw, i) => (
            <motion.span key={kw} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="px-4 py-2 rounded-full text-sm font-medium border"
              style={{
                backgroundColor: `${LINE_COLORS[i % LINE_COLORS.length]}15`,
                borderColor: `${LINE_COLORS[i % LINE_COLORS.length]}40`,
                color: LINE_COLORS[i % LINE_COLORS.length]
              }}>
              {kw}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ClustersSection({ data }: { data: OverviewData }) {
  const { clusters, elbowResults } = data.clustering;

  if (!clusters || clusters.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="text-center py-16 text-gray-400">
        <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>论文数量不足，无法进行聚类分析</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {elbowResults && elbowResults.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            肘部法则（Elbow Method）确定最优 K 值
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={elbowResults} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="k" stroke="#9ca3af" fontSize={12} label={{ value: 'K 值', position: 'insideBottom', offset: -5 }} />
              <YAxis stroke="#9ca3af" fontSize={12} label={{ value: '惯性值 (Inertia)', angle: -90, position: 'insideLeft' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
              <Line type="monotone" dataKey="inertia" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {clusters.map((cluster, i) => (
          <motion.div key={cluster.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}>
                {cluster.id + 1}
              </div>
              <div>
                <div className="font-semibold text-gray-800">主题 {cluster.id + 1}</div>
                <div className="text-xs text-gray-500">{cluster.count} 篇论文</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {cluster.topTerms.map(term => (
                <span key={term} className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${CLUSTER_COLORS[i % CLUSTER_COLORS.length]}15`,
                    color: CLUSTER_COLORS[i % CLUSTER_COLORS.length]
                  }}>
                  {term}
                </span>
              ))}
            </div>
            <div className="space-y-1.5">
              {cluster.members.slice(0, 5).map(member => (
                <div key={member.id} className="text-sm text-gray-600 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
                  {member.title}
                  {member.year && <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{member.year}</span>}
                </div>
              ))}
              {cluster.members.length > 5 && (
                <div className="text-xs text-gray-400">还有 {cluster.members.length - 5} 篇...</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {elbowResults && elbowResults.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">肘部法则分析数据</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500">K 值</th>
                  <th className="text-left py-2 px-3 text-gray-500">惯性值</th>
                  <th className="text-left py-2 px-3 text-gray-500">迭代次数</th>
                </tr>
              </thead>
              <tbody>
                {elbowResults.map(r => (
                  <tr key={r.k} className={`border-b border-gray-50 ${r.k === data.clustering.k ? 'bg-blue-50' : ''}`}>
                    <td className="py-2 px-3 font-medium">{r.k}{r.k === data.clustering.k ? ' ✓ (最优)' : ''}</td>
                    <td className="py-2 px-3">{r.inertia.toFixed(4)}</td>
                    <td className="py-2 px-3">{r.iterations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function NetworkSection({ data }: { data: OverviewData }) {
  const { nodes, links } = data.network;

  if (!nodes || nodes.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="text-center py-16 text-gray-400">
        <NetworkIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>论文数量不足，无法构建研究脉络图</p>
      </motion.div>
    );
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const nodeDegree = new Map<string, number>();
  for (const node of nodes) nodeDegree.set(node.id, 0);
  for (const link of links) {
    nodeDegree.set(link.source, (nodeDegree.get(link.source) || 0) + 1);
    nodeDegree.set(link.target, (nodeDegree.get(link.target) || 0) + 1);
  }

  const sortedLinks = [...links].sort((a, b) => b.similarity - a.similarity);
  const topLinks = sortedLinks.slice(0, 30);

  const yearGroups = new Map<number, NetworkNode[]>();
  for (const node of nodes) {
    const y = node.year || 0;
    if (!yearGroups.has(y)) yearGroups.set(y, []);
    yearGroups.get(y)!.push(node);
  }

  const scatterData = nodes.map(node => ({
    x: node.year || 0,
    y: nodeDegree.get(node.id) || 0,
    z: (nodeDegree.get(node.id) || 0) * 200 + 100,
    name: node.title,
    keywords: node.keywords.join(', ')
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <NetworkIcon className="w-5 h-5 text-blue-600" />
          论文关联散点图
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          X轴为年份，Y轴为关联度（关联论文数量），气泡大小表示关联度高低
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="x" type="number" stroke="#9ca3af" fontSize={12} name="年份"
              label={{ value: '年份', position: 'insideBottom', offset: -5 }} />
            <YAxis dataKey="y" type="number" stroke="#9ca3af" fontSize={12} name="关联度"
              label={{ value: '关联论文数', angle: -90, position: 'insideLeft' }} />
            <ZAxis dataKey="z" range={[100, 800]} />
            <Tooltip content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-200 max-w-xs">
                  <p className="font-medium text-gray-800 text-sm mb-1">{d.name}</p>
                  <p className="text-xs text-gray-500">年份: {d.x} | 关联: {d.y} 篇</p>
                  {d.keywords && <p className="text-xs text-blue-600 mt-1">关键词: {d.keywords}</p>}
                </div>
              );
            }} />
            <Scatter data={scatterData}>
              {scatterData.map((_, i) => (
                <Cell key={i} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-purple-600" />
          最强关联 Top-{Math.min(topLinks.length, 10)}
        </h3>
        <div className="space-y-3">
          {topLinks.slice(0, 10).map((link, i) => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);
            return (
              <motion.div key={`${link.source}-${link.target}`}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xs font-mono text-gray-400 w-6">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="truncate text-gray-800 font-medium">{source?.title || 'Unknown'}</span>
                    <span className="text-gray-400 flex-shrink-0">←→</span>
                    <span className="truncate text-gray-800 font-medium">{target?.title || 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(link.similarity * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-blue-600 w-14 text-right">
                    {(link.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-green-600" />
          论文关键词概览
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {nodes.map(node => (
            <div key={node.id} className="p-3 bg-gray-50 rounded-xl">
              <div className="text-sm font-medium text-gray-800 truncate mb-1">{node.title}</div>
              <div className="flex flex-wrap gap-1">
                {node.keywords.slice(0, 3).map(kw => (
                  <span key={kw} className="px-2 py-0.5 bg-white rounded-full text-xs text-gray-600 border border-gray-200">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
