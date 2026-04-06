import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type * as D3Type from 'd3';

const DOMAIN_COLORS: Record<string, string> = {
  D1: '#2563EB', D2: '#0D9488', D3: '#D97706', D4: '#16A34A',
  D5: '#DC2626', D6: '#0891B2', D7: '#64748B', D8: '#4F46E5', D9: '#CA8A04',
};

interface GNode extends D3Type.SimulationNodeDatum {
  id: string; title: string; slug: string; domain_code: string; view_count: number;
}
interface GLink extends d3.SimulationLinkDatum<GNode> {
  relation_type: string;
}

export default function WikiKnowledgeGraphPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; domain: string; views: number } | null>(null);

  const { data: articles } = useQuery({
    queryKey: ['wiki-graph-nodes'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code, view_count')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as GNode[];
    },
  });

  const { data: relations } = useQuery({
    queryKey: ['wiki-graph-edges'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_page_relations')
        .select('source_page_id, target_page_id, relation_type');
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        source: r.source_page_id,
        target: r.target_page_id,
        relation_type: r.relation_type,
      })) as GLink[];
    },
  });

  useEffect(() => {
    if (!svgRef.current || !articles?.length) return;

    let cancelled = false;
    import('d3').then(d3 => {
    if (cancelled) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const nodeMap = new Set(articles.map(a => a.id));
    const validLinks = (relations ?? []).filter(l =>
      nodeMap.has(l.source as string) && nodeMap.has(l.target as string)
    );

    const nodes: GNode[] = articles.map(a => ({ ...a }));
    const links: GLink[] = validLinks.map(l => ({ ...l }));

    const maxViews = Math.max(1, ...nodes.map(n => n.view_count ?? 1));
    const radiusScale = d3.scaleSqrt().domain([0, maxViews]).range([6, 28]);

    const g = svg.append('g');

    // Zoom
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    const simulation = d3.forceSimulation<GNode>(nodes)
      .force('link', d3.forceLink<GNode, GLink>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GNode>().radius(d => radiusScale(d.view_count ?? 1) + 4));

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5);

    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => radiusScale(d.view_count ?? 1))
      .attr('fill', d => DOMAIN_COLORS[d.domain_code] || '#64748B')
      .attr('stroke', isDark ? '#0A0A0A' : '#FFFFFF')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .on('click', (_, d) => navigate(`/wiki/${d.slug}`))
      .on('mouseenter', (event, d) => {
        setTooltip({ x: event.offsetX, y: event.offsetY, title: d.title, domain: d.domain_code, views: d.view_count ?? 0 });
      })
      .on('mouseleave', () => setTooltip(null))
      .call(d3.drag<SVGCircleElement, GNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Labels for larger nodes
    const labels = g.append('g')
      .selectAll('text')
      .data(nodes.filter(n => (n.view_count ?? 0) > maxViews * 0.3))
      .join('text')
      .text(d => d.title.length > 20 ? d.title.slice(0, 18) + '…' : d.title)
      .attr('font-size', 9)
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', isDark ? '#A1A1A1' : '#334155')
      .attr('text-anchor', 'middle')
      .attr('dy', d => radiusScale(d.view_count ?? 1) + 12)
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GNode).x!)
        .attr('y1', d => (d.source as GNode).y!)
        .attr('x2', d => (d.target as GNode).x!)
        .attr('y2', d => (d.target as GNode).y!);
      node.attr('cx', d => d.x!).attr('cy', d => d.y!);
      labels.attr('x', d => d.x!).attr('y', d => d.y!);
    });

    return () => { simulation.stop(); };
    }); // end import('d3').then

    return () => { cancelled = true; };
  }, [articles, relations, navigate]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#0A0A0A' : '#F8FAFC', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 40px 0' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
          <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
          <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 600 }}>Knowledge Graph</span>
        </nav>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Knowledge Graph</h1>
        <p style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B', marginBottom: 12 }}>
          Visualize article relationships. Node size = view count. Click to open article.
        </p>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {Object.entries(DOMAIN_COLORS).map(([code, color]) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 10, color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 500 }}>{code}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', borderTop: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%', background: isDark ? '#1A1A1A' : '#FFFFFF' }} />
        {tooltip && (
          <div style={{
            position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 8,
            background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', borderRadius: 6,
            padding: '8px 12px', boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
            pointerEvents: 'none', zIndex: 10, fontSize: 12, maxWidth: 200,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 2, color: isDark ? '#EDEDED' : undefined }}>{tooltip.title}</div>
            <div style={{ fontSize: 10, color: isDark ? '#A1A1A1' : '#64748B' }}>{tooltip.domain} · {tooltip.views} views</div>
          </div>
        )}
      </div>
    </div>
  );
}
