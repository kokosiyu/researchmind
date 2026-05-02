import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppStore } from '../../store/useAppStore';
import type { Paper } from '../../types';

interface KnowledgeGraphProps {
  paper?: Paper | null;
  onNodeClick?: (node: any) => void;
  onKeywordClick?: (keyword: string, paper: Paper) => void;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'paper' | 'keyword' | 'related';
  size: number;
  data: any;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'has-keyword' | 'similar';
  value: number;
}

let _measureCanvas: HTMLCanvasElement | null = null;
function measureTextWidth(text: string, fontSize: number, fontWeight: number): number {
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
  const ctx = _measureCanvas.getContext('2d');
  if (!ctx) return text.length * fontSize * 0.7;
  ctx.font = `${fontWeight} ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  return ctx.measureText(text).width * 1.35;
}

function wrapText(text: string, maxWidth: number, fontSize: number, fontWeight: number): string[] {
  const lines: string[] = [];
  let currentLine = '';
  for (const char of text) {
    const testLine = currentLine + char;
    const w = measureTextWidth(testLine, fontSize, fontWeight);
    if (w > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export const KnowledgeGraph = ({ paper, onNodeClick, onKeywordClick }: KnowledgeGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { graphData, papers } = useAppStore();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const callbacksRef = useRef({ onNodeClick, onKeywordClick, paper });
  callbacksRef.current = { onNodeClick, onKeywordClick, paper };

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: Math.max(500, clientHeight) });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const buildSinglePaperGraph = (p: Paper): { nodes: GraphNode[]; links: GraphLink[] } => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    nodes.push({
      id: p.id,
      label: p.title,
      type: 'paper',
      size: 28,
      data: p
    });

    const keywords = Array.isArray(p.keywords) ? p.keywords : [];
    keywords.forEach((kw) => {
      const kwId = 'kw-' + kw;
      nodes.push({ id: kwId, label: kw, type: 'keyword', size: 22, data: null });
      links.push({ source: p.id, target: kwId, type: 'has-keyword', value: 2 });
    });

    const relatedPaperIds = new Set<string>();
    papers.forEach((other) => {
      if (other.id === p.id) return;
      const otherKw = Array.isArray(other.keywords) ? other.keywords : [];
      const common = keywords.filter((k) => otherKw.includes(k));
      if (common.length > 0 && !relatedPaperIds.has(other.id)) {
        relatedPaperIds.add(other.id);
        const shortTitle = other.title.length > 16 ? other.title.substring(0, 16) + '...' : other.title;
        nodes.push({
          id: 'rel-' + other.id,
          label: shortTitle,
          type: 'related',
          size: 14,
          data: other
        });
        links.push({ source: p.id, target: 'rel-' + other.id, type: 'similar', value: common.length });

        common.forEach((kw) => {
          const kwId = 'kw-' + kw;
          const existingKw = nodes.find((n) => n.id === kwId);
          if (existingKw) {
            links.push({ source: 'rel-' + other.id, target: kwId, type: 'has-keyword', value: 1 });
          }
        });
      }
    });

    return { nodes, links };
  };

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    let nodes: GraphNode[];
    let links: GraphLink[];

    if (paper) {
      const g = buildSinglePaperGraph(paper);
      nodes = g.nodes;
      links = g.links;
    } else {
      nodes = graphData.nodes as GraphNode[];
      links = graphData.links as GraphLink[];
    }

    if (nodes.length === 0) return;

    setIsLoading(true);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'paperGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#fef9c3');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#fde68a');

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const nodeCount = nodes.length;
    const linkDistance = paper ? 200 : (nodeCount > 50 ? 160 : 200);
    const chargeStrength = paper ? -1200 : (nodeCount > 50 ? -1800 : -1400);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => {
        if (d.type === 'paper') return 130;
        if (d.type === 'related') return 70;
        return 55;
      }).iterations(3));

    simulation.alpha(1).alphaTarget(0).restart();
    const iterations = paper ? 200 : (nodeCount > 100 ? 500 : 300);
    for (let i = 0; i < iterations; i++) {
      simulation.tick();
    }

    const linkOpacity = paper ? 0.5 : (nodeCount > 100 ? 0.4 : 0.6);

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => d.type === 'similar' ? '#fbbf24' : '#fde68a')
      .attr('stroke-width', (d: any) => d.type === 'similar' ? Math.max(2, d.value) : 1.5)
      .attr('stroke-opacity', linkOpacity)
      .attr('stroke-dasharray', (d: any) => d.type === 'similar' ? '6,3' : 'none');

    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer');

    nodeGroup.filter((d: any) => d.type === 'paper')
      .each(function (d: any) {
        const el = d3.select(this);
        const fontSize = 14;
        const fontWeight = 700;
        const maxTextWidth = 280;
        const paddingX = 40;
        const lineHeight = 22;

        const lines = wrapText(d.label, maxTextWidth, fontSize, fontWeight);
        const maxLineWidth = Math.min(maxTextWidth, Math.max(...lines.map(l => measureTextWidth(l, fontSize, fontWeight))));
        const w = maxLineWidth + paddingX * 2;
        const h = Math.max(60, lines.length * lineHeight + 28);
        const cornerR = 16;

        el.append('rect')
          .attr('width', w)
          .attr('height', h)
          .attr('x', -w / 2)
          .attr('y', -h / 2)
          .attr('rx', cornerR)
          .attr('ry', cornerR)
          .attr('fill', 'url(#paperGradient)')
          .attr('stroke', '#facc15')
          .attr('stroke-width', 2)
          .attr('filter', 'drop-shadow(0 4px 12px rgba(250,204,21,0.25))');

        const startY = -h / 2 + (h - lines.length * lineHeight) / 2 + fontSize;
        lines.forEach((line, i) => {
          el.append('text')
            .text(line)
            .attr('y', startY + i * lineHeight)
            .attr('text-anchor', 'middle')
            .attr('fill', '#92400e')
            .attr('font-size', fontSize + 'px')
            .attr('font-weight', fontWeight)
            .attr('dominant-baseline', 'auto');
        });
      });

    nodeGroup.filter((d: any) => d.type === 'keyword')
      .each(function (d: any) {
        const el = d3.select(this);
        const kwFontSize = 12;
        const kwFontWeight = 700;
        const textW = measureTextWidth(d.label, kwFontSize, kwFontWeight);
        const circleR = Math.max(d.size, textW / 2 + 8);

        el.append('circle')
          .attr('r', circleR)
          .attr('fill', '#fde68a')
          .attr('stroke', '#fbbf24')
          .attr('stroke-width', 1.5)
          .attr('filter', 'drop-shadow(0 2px 6px rgba(251,191,36,0.2))');
        el.append('circle')
          .attr('r', circleR + 10)
          .attr('fill', 'transparent')
          .attr('stroke', 'none')
          .attr('class', 'hit-area');
        el.append('text')
          .text(d.label)
          .attr('dy', 4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#78350f')
          .attr('font-size', kwFontSize + 'px')
          .attr('font-weight', kwFontWeight);
      });

    nodeGroup.filter((d: any) => d.type === 'related')
      .each(function (d: any) {
        const el = d3.select(this);
        const fontSize = 11;
        const fontWeight = 500;
        const maxTextWidth = 160;
        const paddingX = 28;
        const lineHeight = 16;

        const lines = wrapText(d.label, maxTextWidth, fontSize, fontWeight);
        const maxLineWidth = Math.min(maxTextWidth, Math.max(...lines.map(l => measureTextWidth(l, fontSize, fontWeight))));
        const w = Math.max(80, maxLineWidth + paddingX * 2);
        const h = Math.max(40, lines.length * lineHeight + 20);

        el.append('rect')
          .attr('width', w)
          .attr('height', h)
          .attr('x', -w / 2)
          .attr('y', -h / 2)
          .attr('rx', 10)
          .attr('ry', 10)
          .attr('fill', '#fefce8')
          .attr('stroke', '#fde68a')
          .attr('stroke-width', 1);

        const startY = -h / 2 + (h - lines.length * lineHeight) / 2 + fontSize;
        lines.forEach((line, i) => {
          el.append('text')
            .text(line)
            .attr('y', startY + i * lineHeight)
            .attr('text-anchor', 'middle')
            .attr('fill', '#92400e')
            .attr('font-size', fontSize + 'px')
            .attr('font-weight', fontWeight);
        });
      });

    let dragStartPos: { x: number; y: number } | null = null;

    const drag = d3.drag<any, any>()
      .on('start', (event, d) => {
        dragStartPos = { x: event.x, y: event.y };
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);

        const startPos = dragStartPos;
        dragStartPos = null;

        if (startPos) {
          const dx = event.x - startPos.x;
          const dy = event.y - startPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 5) {
            d.fx = null;
            d.fy = null;
            const { onNodeClick, onKeywordClick, paper: currentPaper } = callbacksRef.current;
            if (d.type === 'keyword' && onKeywordClick && currentPaper) {
              onKeywordClick(d.label, currentPaper);
            } else if (onNodeClick) {
              onNodeClick(d);
            }
          }
        }
      });
    nodeGroup.call(drag);

    nodeGroup
      .on('mouseover', function (event: any, d: any) {
        const connectedIds = new Set([d.id]);
        links.forEach((l: any) => {
          const sid = typeof l.source === 'object' ? l.source.id : l.source;
          const tid = typeof l.target === 'object' ? l.target.id : l.target;
          if (sid === d.id) connectedIds.add(tid);
          if (tid === d.id) connectedIds.add(sid);
        });

        link.attr('stroke-opacity', (l: any) => {
          const sid = typeof l.source === 'object' ? l.source.id : l.source;
          const tid = typeof l.target === 'object' ? l.target.id : l.target;
          return (sid === d.id || tid === d.id) ? 0.9 : 0.08;
        });
        nodeGroup.style('opacity', (n: any) => connectedIds.has(n.id) ? 1 : 0.15);

        if (d.type === 'keyword') {
          d3.select(this).select('circle:not(.hit-area)')
            .transition().duration(150)
            .attr('fill', '#fbbf24');
        }
      })
      .on('mouseout', function (event: any, d: any) {
        link.attr('stroke-opacity', linkOpacity);
        nodeGroup.style('opacity', 1);

        if (d.type === 'keyword') {
          d3.select(this).select('circle:not(.hit-area)')
            .transition().duration(150)
            .attr('fill', '#fde68a');
        }
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    setIsLoading(false);
  }, [paper, graphData, dimensions, papers]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            {showLegend ? '隐藏图例' : '显示图例'}
          </button>
        </div>
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center gap-6 p-3 bg-white/80 backdrop-blur rounded-xl border border-slate-200 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-yellow-100 to-yellow-300 border border-yellow-300"></div>
            <span className="text-slate-700">当前论文</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-yellow-200 border border-yellow-300"></div>
            <span className="text-slate-700">关键词（点击查看段落）</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-3 rounded bg-yellow-50 border border-yellow-300"></div>
            <span className="text-slate-700">关联论文</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-0 border-t-2 border-dashed border-yellow-400"></div>
            <span className="text-slate-700">相似关系</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-0 border-t-2 border-yellow-200"></div>
            <span className="text-slate-700">关键词关联</span>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-[550px] bg-gradient-to-br from-yellow-50/50 via-white to-amber-50/20 rounded-2xl border border-slate-200 overflow-hidden relative"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 border-4 border-yellow-200 border-t-yellow-400 rounded-full animate-spin"></div>
              <p className="text-slate-600 text-sm">渲染知识图谱...</p>
            </div>
          </div>
        )}
        {(!paper && graphData.nodes.length === 0) ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>暂无数据，请先添加论文</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
};
