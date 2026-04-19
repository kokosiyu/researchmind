import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppStore } from '../../store/useAppStore';

interface KnowledgeGraphProps {
  onNodeClick?: (node: any) => void;
}

export const KnowledgeGraph = ({ onNodeClick }: KnowledgeGraphProps) => {
  const svgRef = useRef(null);
  const { graphData, papers } = useAppStore();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredNodes, setFilteredNodes] = useState(graphData.nodes);
  const [filteredLinks, setFilteredLinks] = useState(graphData.links);
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: Math.max(600, clientHeight) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const filtered = graphData.nodes.filter(node => 
        node.label.toLowerCase().includes(lowerSearchTerm)
      );
      const filteredNodeIds = new Set(filtered.map(node => node.id));
      const filteredLinks = graphData.links.filter(link => 
        filteredNodeIds.has((link.source as any).id) && filteredNodeIds.has((link.target as any).id)
      );
      setFilteredNodes(filtered);
      setFilteredLinks(filteredLinks);
    } else {
      setFilteredNodes(graphData.nodes);
      setFilteredLinks(graphData.links);
    }
  }, [graphData, searchTerm]);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || filteredNodes.length === 0) return;

    setIsLoading(true);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // 根据节点数量调整力导向参数
    const nodeCount = filteredNodes.length;
    const linkDistance = nodeCount > 50 ? 120 : 150;
    const chargeStrength = nodeCount > 50 ? -1200 : -800;
    const collisionRadius = (d) => d.type === 'paper' ? 90 : 35;

    const simulation = d3.forceSimulation(filteredNodes)
      .force('link', d3.forceLink(filteredLinks).id((d) => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius(collisionRadius).iterations(2));

    // 增加布局稳定性
    simulation.alpha(1).alphaTarget(0).restart();
    
    // 运行更多的迭代以获得更好的布局
    const iterations = nodeCount > 100 ? 500 : 300;
    for (let i = 0; i < iterations; i++) {
      simulation.tick();
    }

    // 为大量节点优化渲染
    const linkOpacity = nodeCount > 100 ? 0.4 : 0.6;

    const link = g.append('g')
      .selectAll('line')
      .data(filteredLinks)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', '#718096')
      .attr('stroke-width', (d) => Math.sqrt(d.value) * 2)
      .attr('stroke-opacity', linkOpacity);

    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(filteredNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // 为论文节点创建更大的框
    nodeGroup.filter((d) => d.type === 'paper')
      .append('rect')
      .attr('width', (d) => Math.max(120, d.label.length * 8))
      .attr('height', 60)
      .attr('x', (d) => -Math.max(60, d.label.length * 4))
      .attr('y', -30)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', '#2c5282')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 2);

    // 为关键词节点保持圆形
    nodeGroup.filter((d) => d.type !== 'paper')
      .append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => {
        if (d.type === 'keyword') return '#3182ce';
        if (d.type === 'author') return '#553c9a';
        return '#4a5568';
      })
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 2);

    // 论文节点的文本
    nodeGroup.filter((d) => d.type === 'paper')
      .append('text')
      .text((d) => d.label)
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f7fafc')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('textLength', (d) => Math.min(100, d.label.length * 8))
      .attr('lengthAdjust', 'spacingAndGlyphs');

    // 其他节点的文本
    nodeGroup.filter((d) => d.type !== 'paper')
      .append('text')
      .text((d) => d.label)
      .attr('dy', (d) => d.size + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#2d3748')
      .attr('font-size', '11px')
      .attr('font-weight', '500');

    const drag = d3.drag()
      .on('start', (event, d) => {
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
      });

    nodeGroup.call(drag);

    nodeGroup
      .on('mouseover', function(event, d) {
        const connectedLinks = filteredLinks.filter(l => 
          (l.source as any).id === d.id || (l.target as any).id === d.id
        );
        const connectedNodeIds = new Set([d.id]);
        connectedLinks.forEach(l => {
          connectedNodeIds.add((l.source as any).id);
          connectedNodeIds.add((l.target as any).id);
        });

        link.attr('stroke-opacity', (l) => {
          const isConnected = (l.source as any).id === d.id || (l.target as any).id === d.id;
          return isConnected ? 1 : 0.1;
        });

        nodeGroup.style('opacity', (n) => {
          return connectedNodeIds.has(n.id) ? 1 : 0.2;
        });

        if (d.type === 'paper') {
          d3.select(this).select('rect')
            .transition()
            .duration(200)
            .attr('width', (d) => Math.max(130, d.label.length * 8.5))
            .attr('height', 65)
            .attr('x', (d) => -Math.max(65, d.label.length * 4.25))
            .attr('y', -32.5)
            .attr('fill', '#1a365d');
        } else {
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', (d) => d.size * 1.3);
        }
      })
      .on('mouseout', function(event, d) {
        link.attr('stroke-opacity', linkOpacity);
        nodeGroup.style('opacity', 1);
        
        if (d.type === 'paper') {
          d3.select(this).select('rect')
            .transition()
            .duration(200)
            .attr('width', (d) => Math.max(120, d.label.length * 8))
            .attr('height', 60)
            .attr('x', (d) => -Math.max(60, d.label.length * 4))
            .attr('y', -30)
            .attr('fill', '#2c5282');
        } else {
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', (d) => d.size);
        }
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        if (onNodeClick) {
          onNodeClick(d);
        }
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    setIsLoading(false);

  }, [filteredNodes, filteredLinks, dimensions, onNodeClick]);

  const handleResetLayout = () => {
    // 重置布局，重新触发渲染
    setFilteredNodes([...filteredNodes]);
  };

  return (
    <div className="w-full space-y-4">
      {/* 控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索节点..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              🔍
            </div>
          </div>
          <button
            onClick={handleResetLayout}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            重置布局
          </button>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            {showLegend ? '隐藏图例' : '显示图例'}
          </button>
        </div>
        <div className="text-sm text-slate-500">
          节点: {filteredNodes.length} | 连接: {filteredLinks.length}
        </div>
      </div>

      {/* 图例 */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-6 p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-blue-900 border-2 border-slate-200"></div>
            <span className="text-sm text-slate-700">论文节点</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-slate-200"></div>
            <span className="text-sm text-slate-700">关键词节点</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-purple-800 border-2 border-slate-200"></div>
            <span className="text-sm text-slate-700">作者节点</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-1 bg-slate-500"></div>
            <span className="text-sm text-slate-700">关联关系</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-slate-700">
              💡 提示: 拖拽节点可调整位置，滚轮可缩放视图
            </div>
          </div>
        </div>
      )}

      {/* 知识图谱 */}
      <div ref={containerRef} className="w-full h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-slate-600">正在渲染知识图谱...</p>
            </div>
          </div>
        )}
        {filteredNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>{searchTerm ? '没有找到匹配的节点' : '暂无数据，请先添加论文'}</p>
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
