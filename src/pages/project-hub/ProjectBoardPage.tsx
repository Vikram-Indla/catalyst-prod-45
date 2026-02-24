/**
 * ProjectHub Board View — SDLC Kanban Board Shell
 * Stage A: Skeleton layout with header, stat cards, toolbar, and empty board columns
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Columns3, List, Kanban, GanttChart, AlertTriangle, CheckCircle2, Clock, BarChart3, Sparkles } from 'lucide-react';
import type { ProjectView } from '@/types/project-hub.types';
import { DEFAULT_BOARD_COLUMNS } from '@/types/project-hub.types';

export default function ProjectBoardPage() {
  const { key } = useParams<{ key: string }>();
  const [activeView, setActiveView] = useState<ProjectView>('board');

  // Fetch project info
  const { data: project } = useQuery({
    queryKey: ['ph-project-board', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase
        .from('ph_projects')
        .select('id, key, name, color, status')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      return data;
    },
    enabled: !!key,
  });

  // Fetch work items count
  const { data: stats } = useQuery({
    queryKey: ['ph-board-stats', project?.id],
    queryFn: async () => {
      if (!project?.id) return null;
      const { data: items } = await supabase
        .from('ph_work_items')
        .select('id, status')
        .eq('project_id', project.id);

      const all = items ?? [];
      return {
        total: all.length,
        completed: all.filter(i => i.status === 'done' || i.status === 'closed').length,
        inProgress: all.filter(i => i.status === 'in_progress' || i.status === 'in_dev').length,
        overdue: 0, // Placeholder — needs due_date logic
        aiFeatures: 0,
      };
    },
    enabled: !!project?.id,
  });

  const projectName = project?.name ?? key?.toUpperCase() ?? 'Project';

  const statCards = [
    { label: 'Total Issues', value: stats?.total ?? 0, icon: BarChart3, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Completed', value: stats?.completed ?? 0, icon: CheckCircle2, color: '#16A34A', bg: '#DCFCE7' },
    { label: 'In Progress', value: stats?.inProgress ?? 0, icon: Clock, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Overdue', value: stats?.overdue ?? 0, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
    { label: 'AI Features', value: `${stats?.aiFeatures ?? 0}%`, icon: Sparkles, color: '#7C3AED', bg: '#F5F3FF' },
  ];

  const views: { key: ProjectView; label: string; icon: typeof Columns3 }[] = [
    { key: 'backlog', label: 'Backlog', icon: Kanban },
    { key: 'board', label: 'Board', icon: Columns3 },
    { key: 'list', label: 'List', icon: List },
    { key: 'timeline', label: 'Timeline', icon: GanttChart },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '24px 24px 16px' }}>
      {/* ─── PAGE HEADER ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 14, fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {(key ?? 'PH').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: '#0F172A',
              fontFamily: "'Sora', sans-serif", letterSpacing: '-0.4px', margin: 0,
            }}>
              {projectName}
            </h1>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
              background: '#DCFCE7', color: '#16A34A',
            }}>
              ON TRACK
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: '2px 0 0', fontWeight: 500 }}>
            Sprint 14 · Mar 10 – Mar 24, 2026 · 8 days remaining
          </p>
        </div>
      </div>

      {/* ─── STAT CARDS ─── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12,
        margin: '20px 0 16px',
      }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: '#FFFFFF', borderRadius: 12, padding: '14px 16px',
            border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <s.icon size={18} color={s.color} strokeWidth={1.75} />
            </div>
            <div>
              <div style={{
                fontSize: 20, fontWeight: 700, color: '#0F172A',
                fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1,
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#64748B', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── VIEW TOOLBAR ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px', background: '#F1F5F9', borderRadius: 8,
        marginBottom: 16, width: 'fit-content',
      }}>
        {views.map(v => {
          const isActive = activeView === v.key;
          return (
            <button
              key={v.key}
              onClick={() => setActiveView(v.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', fontSize: 12, fontWeight: isActive ? 600 : 500,
                borderRadius: 6, cursor: 'pointer', border: 'none',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#2563EB' : '#64748B',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                transition: 'all .12s',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <v.icon size={14} strokeWidth={1.75} />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* ─── BOARD CONTENT ─── */}
      {activeView === 'board' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${DEFAULT_BOARD_COLUMNS.length}, minmax(180px, 1fr))`,
          gap: 12,
          overflowX: 'auto',
        }}>
          {DEFAULT_BOARD_COLUMNS.map(col => (
            <div key={col.name} style={{
              background: '#F8FAFC', borderRadius: 10, padding: '10px 12px',
              minHeight: 400, border: '1px solid #E2E8F0',
            }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12, padding: '4px 0',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: col.color, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#0F172A',
                  textTransform: 'uppercase', letterSpacing: '0.4px',
                  fontFamily: "'Sora', sans-serif",
                }}>
                  {col.name}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#94A3B8',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginLeft: 'auto',
                }}>
                  0
                </span>
                {col.wip_limit > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 600, color: '#94A3B8',
                    background: '#F1F5F9', padding: '1px 6px', borderRadius: 4,
                  }}>
                    WIP {col.wip_limit}
                  </span>
                )}
              </div>

              {/* Empty column placeholder */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '40px 16px',
                border: '2px dashed #E2E8F0', borderRadius: 8,
                color: '#94A3B8', fontSize: 12, fontWeight: 500,
              }}>
                No items
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Placeholder for other views */}
      {activeView !== 'board' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '80px 40px',
          background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
            {views.find(v => v.key === activeView)?.label} View
          </span>
          <span style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Coming in Phase 2
          </span>
        </div>
      )}
    </div>
  );
}
