import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, BookOpen, FileText, ChevronRight, X, Search, ChevronDown, ChevronUp, Highlighter, BookMarked, ExternalLink, Users, Calendar, Building2 } from 'lucide-react';
import { KnowledgeGraph } from '../components/features/KnowledgeGraph';
import { useAppStore } from '../store/useAppStore';
import ParticleAnimation from '../components/features/ParticleAnimation';
import ReactMarkdown from 'react-markdown';
import type { Paper } from '../types';

interface ParagraphMatch {
  index: number;
  text: string;
  keywordPositions: { start: number; end: number }[];
  matchedBy: string;
}

function splitToSegments(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const segments: string[] = [];
  for (const p of paragraphs) {
    const trimmed = p.replace(/\r/g, '').trim();
    if (trimmed.length < 10) continue;
    if (trimmed.length > 400) {
      const sentences = trimmed.split(/(?<=[。！？.!?\n])\s*/);
      let buf = '';
      for (const s of sentences) {
        if (buf.length + s.length > 300 && buf.length > 15) {
          segments.push(buf.replace(/\s+/g, ' ').trim());
          buf = s;
        } else {
          buf += (buf ? ' ' : '') + s;
        }
      }
      if (buf.trim().length > 10) segments.push(buf.replace(/\s+/g, ' ').trim());
    } else {
      segments.push(trimmed.replace(/\s+/g, ' '));
    }
  }
  return segments;
}

function findAllOccurrences(text: string, term: string): { start: number; end: number }[] {
  const positions: { start: number; end: number }[] = [];
  const textLower = text.toLowerCase();
  const termLower = term.toLowerCase();
  let searchFrom = 0;
  while (searchFrom < textLower.length) {
    const found = textLower.indexOf(termLower, searchFrom);
    if (found === -1) break;
    const overlap = positions.some(p => found < p.end && found + term.length > p.start);
    if (!overlap) {
      positions.push({ start: found, end: found + term.length });
    }
    searchFrom = found + 1;
  }
  return positions;
}

function searchInSegments(segments: string[], keyword: string): ParagraphMatch[] {
  const results: ParagraphMatch[] = [];

  segments.forEach((text, idx) => {
    const positions = findAllOccurrences(text, keyword);
    if (positions.length > 0) {
      results.push({ index: idx, text, keywordPositions: positions, matchedBy: keyword });
    }
  });

  return results;
}

function tokenizeKeyword(keyword: string): string[] {
  const tokens: string[] = [];
  if (keyword.includes(' ')) {
    tokens.push(keyword.replace(/\s+/g, '-'));
  }
  if (keyword.includes('-')) {
    tokens.push(keyword.replace(/-/g, ''));
  }
  if (/[\u4e00-\u9fa5]/.test(keyword) && keyword.length > 2) {
    for (let i = 0; i < keyword.length - 1; i++) {
      tokens.push(keyword.substring(i, i + 2));
    }
  }
  if (/^[a-zA-Z\s-]+$/.test(keyword)) {
    keyword.split(/[\s-]+/).forEach(word => {
      if (word.length >= 3) tokens.push(word);
    });
  }
  return [...new Set(tokens)];
}

function deduplicateSegments(segments: string[]): string[] {
  const unique: string[] = [];
  for (const seg of segments) {
    const segNorm = seg.replace(/\s+/g, '');
    const isDup = unique.some(existing => {
      const existNorm = existing.replace(/\s+/g, '');
      if (existNorm === segNorm) return true;
      if (segNorm.length >= 40) {
        const shortSeg = segNorm.substring(0, 60);
        if (existNorm.includes(shortSeg) || segNorm.includes(existNorm.substring(0, 60))) return true;
      }
      return false;
    });
    if (!isDup) unique.push(seg);
  }
  return unique;
}

function extractParagraphs(content: string, keyword: string): ParagraphMatch[] {
  if (!content || !keyword) return [];

  const rawSegments = splitToSegments(content);
  const segments = deduplicateSegments(rawSegments);
  if (segments.length === 0) return [];

  const exactResults = searchInSegments(segments, keyword);
  if (exactResults.length > 0) return deduplicateResults(exactResults);

  const variants = tokenizeKeyword(keyword);
  for (const variant of variants) {
    const results = searchInSegments(segments, variant);
    if (results.length > 0) return deduplicateResults(results);
  }

  return [];
}

function deduplicateResults(results: ParagraphMatch[]): ParagraphMatch[] {
  const unique: ParagraphMatch[] = [];
  for (const r of results) {
    const norm = r.text.replace(/\s+/g, '');
    const isDup = unique.some(u => {
      const uNorm = u.text.replace(/\s+/g, '');
      if (uNorm === norm) return true;
      const shortText = norm.substring(0, 60);
      return uNorm.includes(shortText) || norm.includes(uNorm.substring(0, 60));
    });
    if (!isDup) unique.push(r);
  }
  return unique;
}

function getRelatedContext(paper: Paper, keyword: string): { source: string; text: string }[] {
  const contexts: { source: string; text: string }[] = [];

  if (paper.abstract) {
    const segments = splitToSegments(paper.abstract);
    const positions = findAllOccurrences(paper.abstract, keyword);
    if (positions.length > 0) {
      contexts.push({ source: '摘要', text: paper.abstract });
    }
  }

  if (paper.summary) {
    const plain = paper.summary.replace(/#{1,6}\s*/g, '').replace(/\*\*/g, '').replace(/^\s*[-*]\s/gm, '');
    const sections = plain.split(/\n{2,}/).filter(s => s.trim().length > 20);
    for (const section of sections) {
      const positions = findAllOccurrences(section, keyword);
      if (positions.length > 0) {
        const heading = section.match(/^(.{1,30})/);
        contexts.push({ source: heading ? heading[1].trim() : '总结', text: section.trim() });
      }
    }
  }

  if (contexts.length === 0 && paper.abstract) {
    contexts.push({ source: '摘要', text: paper.abstract });
  }
  if (contexts.length === 0 && paper.summary) {
    const plain = paper.summary.replace(/#{1,6}\s*/g, '').replace(/\*\*/g, '');
    contexts.push({ source: '论文总结', text: plain.substring(0, 500) });
  }

  return contexts;
}

function highlightText(text: string, positions: { start: number; end: number }[]) {
  if (positions.length === 0) return text;

  const parts: { text: string; highlight: boolean }[] = [];
  let last = 0;
  for (const pos of positions) {
    if (pos.start > last) {
      parts.push({ text: text.slice(last, pos.start), highlight: false });
    }
    parts.push({ text: text.slice(pos.start, pos.end), highlight: true });
    last = pos.end;
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), highlight: false });
  }

  return parts.map((p, i) =>
    p.highlight ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-semibold">
        {p.text}
      </mark>
    ) : (
      <span key={i}>{p.text}</span>
    )
  );
}

export default function Graph() {
  const { papers } = useAppStore();
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [keywordPanel, setKeywordPanel] = useState<{
    keyword: string;
    paper: Paper;
    paragraphs: ParagraphMatch[];
    expandedIdx: number | null;
    contexts: { source: string; text: string }[];
  } | null>(null);
  const [relatedPaperPanel, setRelatedPaperPanel] = useState<Paper | null>(null);
  const [paperDetailPanel, setPaperDetailPanel] = useState<Paper | null>(null);

  const handleNodeClick = (node: any) => {
    if (node.type === 'related' && node.data) {
      setRelatedPaperPanel(node.data);
      setPaperDetailPanel(null);
      setKeywordPanel(null);
    } else if (node.type === 'paper' && node.data) {
      setPaperDetailPanel(node.data);
      setRelatedPaperPanel(null);
      setKeywordPanel(null);
    }
  };

  const handleKeywordClick = (keyword: string, paper: Paper) => {
    const contentParts: string[] = [];
    if (paper.content && paper.content.length > 20) contentParts.push(paper.content);
    if (paper.abstract && paper.abstract.length > 20) {
      const abstractNorm = paper.abstract.replace(/\s+/g, '');
      const isOverlap = contentParts.some(c => {
        const cNorm = c.replace(/\s+/g, '');
        return cNorm.includes(abstractNorm.substring(0, 50));
      });
      if (!isOverlap) contentParts.push(paper.abstract);
    }
    if (paper.summary && paper.summary.length > 50) {
      const plainSummary = paper.summary.replace(/#{1,6}\s*/g, '').replace(/\*\*/g, '');
      const summaryNorm = plainSummary.replace(/\s+/g, '');
      const isOverlap = contentParts.some(c => {
        const cNorm = c.replace(/\s+/g, '');
        return cNorm.includes(summaryNorm.substring(0, 50)) || summaryNorm.includes(cNorm.substring(0, 50));
      });
      if (!isOverlap) contentParts.push(plainSummary);
    }
    const fullContent = contentParts.join('\n\n');
    const paragraphs = extractParagraphs(fullContent, keyword);
    const contexts = paragraphs.length === 0 ? getRelatedContext(paper, keyword) : [];

    setKeywordPanel({
      keyword,
      paper,
      paragraphs,
      expandedIdx: null,
      contexts,
    });
  };

  const rightNavItems = [
    { id: 'graph-paper-info', label: '论文信息', icon: BookOpen, show: true },
    { id: 'graph-knowledge', label: '知识图谱', icon: Network, show: true },
    { id: 'graph-keyword', label: '关键词', icon: Search, show: !!keywordPanel },
    { id: 'graph-related', label: '关联论文', icon: ExternalLink, show: !!relatedPaperPanel },
    { id: 'graph-detail', label: '论文详情', icon: FileText, show: !!paperDetailPanel },
  ].filter(item => item.show);

  const [activeNav, setActiveNav] = useState('');

  useEffect(() => {
    if (!selectedPaper) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveNav(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    rightNavItems.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [selectedPaper, keywordPanel, relatedPaperPanel, paperDetailPanel]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleExpand = (idx: number) => {
    if (!keywordPanel) return;
    setKeywordPanel({
      ...keywordPanel,
      expandedIdx: keywordPanel.expandedIdx === idx ? null : idx,
    });
  };

  const closePanel = () => setKeywordPanel(null);

  const getKeywords = (paper: Paper) => {
    return Array.isArray(paper.keywords) ? paper.keywords : [];
  };

  return (
    <div className="min-h-screen pt-24 pb-16 relative overflow-hidden">
      <ParticleAnimation />
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center space-x-3">
                <Network className="w-8 h-8 text-blue-600" />
                <span>知识图谱</span>
              </h1>
              <p className="text-lg text-slate-600">
                选择论文查看知识图谱，点击关键词节点查看论文中的相关段落
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 space-y-3"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-bold text-slate-900 flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>论文列表</span>
                  <span className="ml-auto text-xs text-slate-400 font-normal">{papers.length} 篇</span>
                </h2>
              </div>
              <div className="max-h-[calc(100vh-260px)] overflow-y-auto divide-y divide-slate-100">
                {papers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无论文</p>
                  </div>
                ) : (
                  papers.map((paper) => {
                    const isSelected = selectedPaper?.id === paper.id;
                    const kw = getKeywords(paper);
                    return (
                      <div
                        key={paper.id}
                        onClick={() => {
                          setSelectedPaper(isSelected ? null : paper);
                          setKeywordPanel(null);
                          setRelatedPaperPanel(null);
                          setPaperDetailPanel(null);
                        }}
                        className={`px-5 py-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-semibold leading-snug mb-1.5 line-clamp-2 ${
                              isSelected ? 'text-blue-700' : 'text-slate-800'
                            }`}>
                              {paper.title}
                            </h3>
                            <p className="text-xs text-slate-500 mb-2">
                              {paper.authors} · {paper.year}
                            </p>
                            {kw.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {kw.slice(0, 3).map((k, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded">
                                    {k}
                                  </span>
                                ))}
                                {kw.length > 3 && (
                                  <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">
                                    +{kw.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 transition-colors ${
                            isSelected ? 'text-blue-600' : 'text-slate-300'
                          }`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8"
          >
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-2 space-y-4">
            {selectedPaper ? (
              <>
                {rightNavItems.length > 1 && (
                  <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-1.5 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl px-2 py-3 shadow-lg">
                    {rightNavItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeNav === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => scrollTo(item.id)}
                          title={item.label}
                          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 font-bold'
                              : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap hidden group-hover:inline">{item.label}</span>
                          {isActive && <span className="hidden group-hover:inline w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div id="graph-paper-info"
                  onClick={() => {
                    setPaperDetailPanel(selectedPaper);
                    setRelatedPaperPanel(null);
                    setKeywordPanel(null);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl px-6 py-4 shadow-lg cursor-pointer hover:shadow-xl hover:from-blue-500 hover:to-indigo-500 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-white leading-snug">{selectedPaper.title}</h2>
                      <p className="text-blue-100 text-sm mt-1">{selectedPaper.authors} · {selectedPaper.year}</p>
                      {selectedPaper.abstract && (
                        <p className="text-blue-200/80 text-xs mt-2 line-clamp-2">{selectedPaper.abstract}</p>
                      )}
                      {selectedPaper.journal && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-white/15 text-blue-50 text-[11px] rounded-full">
                          {selectedPaper.journal}
                        </span>
                      )}
                    </div>
                    <span className="text-blue-200 text-xs flex-shrink-0 ml-3 mt-1">点击查看分析 →</span>
                  </div>
                </div>

                <div id="graph-knowledge">
                  <KnowledgeGraph
                    paper={selectedPaper}
                    onNodeClick={handleNodeClick}
                    onKeywordClick={handleKeywordClick}
                  />
                </div>

                <AnimatePresence>
                  {keywordPanel && (
                    <motion.div
                      id="graph-keyword"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
                    >
                      <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Search className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">
                              关键词：<span className="text-amber-700">"{keywordPanel.keyword}"</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {keywordPanel.paragraphs.length > 0
                                ? `在论文中找到 ${keywordPanel.paragraphs.length} 个相关段落`
                                : keywordPanel.contexts.length > 0
                                  ? '以下是该关键词在论文摘要/总结中的相关内容'
                                  : '该关键词为AI提取的语义标签，论文原文中无直接匹配'
                              }
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={closePanel}
                          className="w-8 h-8 rounded-lg hover:bg-amber-100 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>

                      <div className="max-h-[400px] overflow-y-auto">
                        {keywordPanel.paragraphs.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {keywordPanel.paragraphs.map((para, idx) => {
                              const isExpanded = keywordPanel.expandedIdx === idx;
                              const previewText = para.text.length > 150 && !isExpanded
                                ? para.text.slice(0, 150) + '...'
                                : para.text;

                              return (
                                <div key={idx} className="transition-colors hover:bg-slate-50/50">
                                  <button
                                    onClick={() => toggleExpand(idx)}
                                    className="w-full text-left px-6 py-4 flex items-start gap-3"
                                  >
                                    <div className="flex-shrink-0 mt-0.5">
                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        isExpanded
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-slate-100 text-slate-500'
                                      }`}>
                                        {idx + 1}
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm leading-relaxed ${
                                        isExpanded ? 'text-slate-800' : 'text-slate-600'
                                      }`}>
                                        {highlightText(previewText, isExpanded ? para.keywordPositions : para.keywordPositions.filter(p => p.start < 150))}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 mt-1">
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-blue-500" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-6 pb-4 ml-9">
                                          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="text-xs text-amber-600 font-medium">完整段落</span>
                                              <span className="text-xs text-slate-400">
                                                共 {para.text.length} 字，命中 {para.keywordPositions.length} 次
                                              </span>
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                              {highlightText(para.text, para.keywordPositions)}
                                            </p>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        ) : keywordPanel.contexts.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {keywordPanel.contexts.map((ctx, idx) => {
                              const isExpanded = keywordPanel.expandedIdx === idx;
                              const previewText = ctx.text.length > 200 && !isExpanded
                                ? ctx.text.slice(0, 200) + '...'
                                : ctx.text;

                              return (
                                <div key={idx} className="transition-colors hover:bg-slate-50/50">
                                  <button
                                    onClick={() => toggleExpand(idx)}
                                    className="w-full text-left px-6 py-4 flex items-start gap-3"
                                  >
                                    <div className="flex-shrink-0 mt-0.5">
                                      <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                                        <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded mb-1 inline-block">
                                        {ctx.source}
                                      </span>
                                      <p className={`text-sm leading-relaxed mt-1 ${
                                        isExpanded ? 'text-slate-800' : 'text-slate-600'
                                      }`}>
                                        {previewText}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 mt-1">
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-indigo-500" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-6 pb-4 ml-9">
                                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                              {ctx.text}
                                            </p>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                              <Highlighter className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 text-sm mb-1">
                              "{keywordPanel.keyword}" 是 AI 提取的语义关键词
                            </p>
                            <p className="text-slate-400 text-xs">
                              论文内容和摘要中均未出现该术语，建议上传包含完整文本的论文以获得更精确的段落匹配
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {relatedPaperPanel && (
                    <motion.div
                      id="graph-related"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
                    >
                      <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                            <ExternalLink className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">
                              关联论文分析
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              与当前论文存在关键词关联的文献
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setRelatedPaperPanel(null)}
                          className="w-8 h-8 rounded-lg hover:bg-yellow-100 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>

                      <div className="max-h-[500px] overflow-y-auto">
                        <div className="p-6 space-y-5">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 leading-snug mb-2">
                              {relatedPaperPanel.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {relatedPaperPanel.authors}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {relatedPaperPanel.year}
                              </span>
                              {relatedPaperPanel.journal && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5" />
                                  {relatedPaperPanel.journal}
                                </span>
                              )}
                            </div>
                          </div>

                          {Array.isArray(relatedPaperPanel.keywords) && relatedPaperPanel.keywords.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">关键词</h5>
                              <div className="flex flex-wrap gap-2">
                                {relatedPaperPanel.keywords.map((kw, idx) => (
                                  <span key={idx} className="px-2.5 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full border border-yellow-200">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {relatedPaperPanel.abstract && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">摘要</h5>
                              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4">
                                {relatedPaperPanel.abstract}
                              </p>
                            </div>
                          )}

                          {relatedPaperPanel.summary && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">AI 分析总结</h5>
                              <div className="prose prose-sm max-w-none text-slate-700 bg-yellow-50/30 rounded-xl p-4 border border-yellow-100">
                                <ReactMarkdown>{relatedPaperPanel.summary}</ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {!relatedPaperPanel.abstract && !relatedPaperPanel.summary && (
                            <div className="text-center py-6 text-slate-400">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">暂无详细分析内容</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {paperDetailPanel && (
                    <motion.div
                      id="graph-detail"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
                    >
                      <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">
                              论文详细分析
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              点击论文方框查看完整分析内容
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setPaperDetailPanel(null)}
                          className="w-8 h-8 rounded-lg hover:bg-yellow-100 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>

                      <div className="max-h-[500px] overflow-y-auto">
                        <div className="p-6 space-y-5">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 leading-snug mb-2">
                              {paperDetailPanel.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {paperDetailPanel.authors}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {paperDetailPanel.year}
                              </span>
                              {paperDetailPanel.journal && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5" />
                                  {paperDetailPanel.journal}
                                </span>
                              )}
                            </div>
                          </div>

                          {Array.isArray(paperDetailPanel.keywords) && paperDetailPanel.keywords.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">关键词</h5>
                              <div className="flex flex-wrap gap-2">
                                {paperDetailPanel.keywords.map((kw, idx) => (
                                  <span key={idx} className="px-2.5 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full border border-yellow-200">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {paperDetailPanel.abstract && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">摘要</h5>
                              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4">
                                {paperDetailPanel.abstract}
                              </p>
                            </div>
                          )}

                          {paperDetailPanel.summary && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">AI 分析总结</h5>
                              <div className="prose prose-sm max-w-none text-slate-700 bg-yellow-50/30 rounded-xl p-4 border border-yellow-100">
                                <ReactMarkdown>{paperDetailPanel.summary}</ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {paperDetailPanel.content && paperDetailPanel.content.length > 100 && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">论文正文（节选）</h5>
                              <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 max-h-[200px] overflow-y-auto">
                                {paperDetailPanel.content.substring(0, 2000)}
                                {paperDetailPanel.content.length > 2000 && (
                                  <span className="text-slate-400"> ...</span>
                                )}
                              </div>
                            </div>
                          )}

                          {!paperDetailPanel.abstract && !paperDetailPanel.summary && (
                            <div className="text-center py-6 text-slate-400">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">暂无详细分析内容</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 h-[600px] flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                  <Network className="w-10 h-10 text-blue-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">选择一篇论文</h3>
                <p className="text-slate-400 max-w-md">
                  从左侧列表中选择一篇论文，即可查看该论文的知识图谱，点击关键词节点可查看论文中相关段落
                </p>
                {papers.length > 0 && (
                  <button
                    onClick={() => setSelectedPaper(papers[0])}
                    className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    查看第一篇论文
                  </button>
                )}
              </div>
            )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
