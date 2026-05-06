import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, GitCompare, Loader2, AlertTriangle, Tag } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { similarityApi } from '../services/api';
import ParticleAnimation from '../components/features/ParticleAnimation';

interface CompareResult {
  similarity: number;
  level: string;
  keywordsA: { term: string; score: number }[];
  keywordsB: { term: string; score: number }[];
}

interface CheckResult {
  overallSimilarity: number;
  level: string;
  totalPapersChecked: number;
  details: {
    paperId: string;
    title: string;
    overallSimilarity: number;
    maxParagraphSimilarity: number;
    matchedParagraphs: { paragraphIndex: number; similarity: number; text: string }[];
  }[];
}

interface KeywordResult {
  keywords: { term: string; score: number }[];
  tokenCount: number;
  uniqueTokenCount: number;
}

type Tab = 'compare' | 'check' | 'keywords';

const levelColor: Record<string, string> = {
  '高度相似': 'text-red-600 bg-red-50 border-red-200',
  '中度相似': 'text-orange-600 bg-orange-50 border-orange-200',
  '低度相似': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  '基本不相似': 'text-green-600 bg-green-50 border-green-200',
};

export default function Similarity() {
  const { papers } = useAppStore();
  const [tab, setTab] = useState<Tab>('compare');
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [checkText, setCheckText] = useState('');
  const [keywordText, setKeywordText] = useState('');
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [keywordResult, setKeywordResult] = useState<KeywordResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    if (!textA.trim() || !textB.trim()) { setError('请输入两段文本'); return; }
    setLoading(true); setError(''); setCompareResult(null);
    try {
      const data = await similarityApi.compare(textA, textB);
      setCompareResult(data);
    } catch (e: any) { setError(e.response?.data?.message || '分析失败'); }
    finally { setLoading(false); }
  };

  const handleCheck = async () => {
    if (!checkText.trim()) { setError('请输入待检测文本'); return; }
    if (papers.length === 0) { setError('论文库为空，请先上传论文'); return; }
    setLoading(true); setError(''); setCheckResult(null);
    try {
      const data = await similarityApi.check(checkText, papers.map(p => ({
        id: p.id, title: p.title, content: p.content, abstract: p.abstract
      })));
      setCheckResult(data);
    } catch (e: any) { setError(e.response?.data?.message || '查重失败'); }
    finally { setLoading(false); }
  };

  const handleKeywords = async () => {
    if (!keywordText.trim()) { setError('请输入文本'); return; }
    setLoading(true); setError(''); setKeywordResult(null);
    try {
      const data = await similarityApi.extractKeywords(keywordText, 15);
      setKeywordResult(data);
    } catch (e: any) { setError(e.response?.data?.message || '提取失败'); }
    finally { setLoading(false); }
  };

  const tabs: { key: Tab; label: string; icon: typeof GitCompare }[] = [
    { key: 'compare', label: '文本对比', icon: GitCompare },
    { key: 'check', label: '论文查重', icon: FileText },
    { key: 'keywords', label: '关键词提取', icon: Tag },
  ];

  return (
    <div className="min-h-screen relative">
      <ParticleAnimation />
      <div className="max-w-6xl mx-auto px-4 py-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600" />
            论文查重与相似度分析
          </h1>
          <p className="text-gray-500 mt-2">基于 TF-IDF 算法与余弦相似度的文本分析工具</p>
        </motion.div>

        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                tab === t.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />{error}
          </motion.div>
        )}

        {tab === 'compare' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">文本 A</label>
              <textarea value={textA} onChange={e => setTextA(e.target.value)}
                className="w-full h-60 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="粘贴第一段论文文本..." />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">文本 B</label>
              <textarea value={textB} onChange={e => setTextB(e.target.value)}
                className="w-full h-60 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="粘贴第二段论文文本..." />
            </div>
            <div className="md:col-span-2 flex justify-center">
              <button onClick={handleCompare} disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />分析中...</> : <><GitCompare className="w-5 h-5" />开始对比</>}
              </button>
            </div>
            {compareResult && (
              <div className="md:col-span-2">
                <CompareResultCard result={compareResult} />
              </div>
            )}
          </motion.div>
        )}

        {tab === 'check' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">待检测文本</label>
              <textarea value={checkText} onChange={e => setCheckText(e.target.value)}
                className="w-full h-48 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="粘贴需要查重的论文文本..." />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">将与论文库中 {papers.length} 篇论文进行对比</span>
                <button onClick={handleCheck} disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" />检测中...</> : <><Search className="w-5 h-5" />开始查重</>}
                </button>
              </div>
            </div>
            {checkResult && <CheckResultCard result={checkResult} />}
          </motion.div>
        )}

        {tab === 'keywords' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">文本内容</label>
              <textarea value={keywordText} onChange={e => setKeywordText(e.target.value)}
                className="w-full h-48 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="粘贴论文文本以提取关键词..." />
              <div className="mt-4 flex justify-end">
                <button onClick={handleKeywords} disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" />提取中...</> : <><Tag className="w-5 h-5" />提取关键词</>}
                </button>
              </div>
            </div>
            {keywordResult && <KeywordResultCard result={keywordResult} />}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SimilarityBar({ value, label }: { value: number; label?: string }) {
  const color = value >= 80 ? 'bg-red-500' : value >= 50 ? 'bg-orange-500' : value >= 20 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="w-full">
      {label && <div className="text-xs text-gray-500 mb-1">{label}</div>}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(value, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }} className={`h-full rounded-full ${color}`} />
        </div>
        <span className="text-sm font-semibold text-gray-700 w-16 text-right">{value}%</span>
      </div>
    </div>
  );
}

function CompareResultCard({ result }: { result: CompareResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className={`px-4 py-2 rounded-full text-sm font-medium border ${levelColor[result.level] || ''}`}>
          {result.level}
        </div>
        <div className="text-3xl font-bold text-gray-800">{result.similarity}%</div>
        <span className="text-gray-500">相似度</span>
      </div>
      <SimilarityBar value={result.similarity} />
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">文本 A 关键词</h4>
          <div className="flex flex-wrap gap-2">
            {result.keywordsA.map((k, i) => (
              <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{k.term}</span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">文本 B 关键词</h4>
          <div className="flex flex-wrap gap-2">
            {result.keywordsB.map((k, i) => (
              <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">{k.term}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CheckResultCard({ result }: { result: CheckResult }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`px-4 py-2 rounded-full text-sm font-medium border ${levelColor[result.level] || ''}`}>
            {result.level}
          </div>
          <div className="text-3xl font-bold text-gray-800">{result.overallSimilarity}%</div>
          <span className="text-gray-500">最高相似度 · 共检测 {result.totalPapersChecked} 篇</span>
        </div>
        <SimilarityBar value={result.overallSimilarity} />
      </div>
      {result.details.map((d, i) => (
        <motion.div key={d.paperId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-800">{d.title}</span>
            </div>
            <span className={`text-lg font-bold ${d.overallSimilarity >= 50 ? 'text-red-600' : d.overallSimilarity >= 20 ? 'text-orange-600' : 'text-green-600'}`}>
              {d.overallSimilarity}%
            </span>
          </div>
          <SimilarityBar value={d.overallSimilarity} label="整体相似度" />
          <div className="mt-2">
            <SimilarityBar value={d.maxParagraphSimilarity} label="最大段落相似度" />
          </div>
          {d.matchedParagraphs.length > 0 && (
            <div className="mt-4">
              <button onClick={() => setExpanded(expanded === i ? null : i)}
                className="text-sm text-blue-600 hover:text-blue-800">
                {expanded === i ? '收起匹配详情' : `查看 ${d.matchedParagraphs.length} 个相似段落`}
              </button>
              {expanded === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 space-y-2">
                  {d.matchedParagraphs.map((p, j) => (
                    <div key={j} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">段落 #{p.paragraphIndex + 1}</span>
                        <span className={`text-xs font-medium ${p.similarity >= 50 ? 'text-red-600' : 'text-orange-600'}`}>
                          {p.similarity}% 相似
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{p.text}...</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

function KeywordResultCard({ result }: { result: KeywordResult }) {
  const maxScore = result.keywords.length > 0 ? result.keywords[0].score : 1;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{result.tokenCount}</div>
          <div className="text-xs text-gray-500">总词数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{result.uniqueTokenCount}</div>
          <div className="text-xs text-gray-500">不重复词</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{result.keywords.length}</div>
          <div className="text-xs text-gray-500">关键词</div>
        </div>
      </div>
      <div className="space-y-3">
        {result.keywords.map((k, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 w-24 text-right truncate">{k.term}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <motion.div initial={{ width: 0 }}
                animate={{ width: `${(k.score / maxScore) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            </div>
            <span className="text-xs text-gray-500 w-14 text-right">{k.score.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
