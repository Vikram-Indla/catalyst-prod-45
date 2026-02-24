/**
 * ProjectHub Board View — SDLC Kanban Board Shell
 * Wired to ph_sdlc_issues, ph_sdlc_releases, ph_boards via service layer
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Columns3, List, Kanban, GanttChart, AlertTriangle, CheckCircle2, Clock, BarChart3, Sparkles } from 'lucide-react';
import type { ProjectView } from '@/types/project-hub.types';
import { useProjectIssues, useBoards, useSDLCReleases, getDisplayKey } from '@/services/project-hub.service';

export default function ProjectBoardPage() {
  const { key } = useParams<{ key: string }>();
  const [activeView, setActiveView] = useState<ProjectView>('board');

  const { data: issues = [] } = useProjectIssues();
  const { data: boards = [] } = useBoards();
  const { data: releases = [] } = useSDLCReleases();

  const defaultBoard = useMemo(() => boards.find(b => b.is_default) ?? boards[0], [boards]);
  const boardColumns = defaultBoard?.columns ?? [];

  const stats = useMemo(() => {
    const completed = issues.filter(i => i.status === 'production' || i.status === 'prod_ready').length;
    const inProgress = issues.filter(i => ['in_dev', 'in_qa', 'in_uat', 'in_beta'].includes(i.status)).length;
    const overdue = issues.filter(i => i.overdue_days > 0).length;
    return { total: issues.length, completed, inProgress, overdue };
  }, [issues]);

  const statCards = [
    { label: 'Total Issues', value: stats.total, icon: BarChart3, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: '#16A34A', bg: '#DCFCE7' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
    { label: 'AI Features', value: '0%', icon: Sparkles, color: '#7C3AED', bg: '#F5F3FF' },
  ];

  const views: { key: ProjectView; label: string; icon: typeof Columns3 }[] = [
    { key: 'backlog', label: 'Backlog', icon: Kanban },
    { key: 'board', label: 'Board', icon: Columns3 },
    { key: 'list', label: 'List', icon: List },
    { key: 'timeline', label: 'Timeline', icon: GanttChart },
  ];

  const projectName = key?.toUpperCase() ?? 'Project';

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
          {projectName.slice(0, 2)}
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
      {activeView === 'board' && boardColumns.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${boardColumns.length}, minmax(180px, 1fr))`,
          gap: 12,
          overflowX: 'auto',
        }}>
          {boardColumns.map((col: any) => {
            const colIssues = issues.filter(i => col.statuses?.includes(i.status));
            return (
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
                    textTransform: 'uppercase' as const, letterSpacing: '0.4px',
                    fontFamily: "'Sora', sans-serif",
                  }}>
                    {col.name}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#94A3B8',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginLeft: 'auto',
                  }}>
                    {colIssues.length}
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

                {/* Issue cards or empty */}
                {colIssues.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
                    justifyContent: 'center', padding: '40px 16px',
                    border: '2px dashed #E2E8F0', borderRadius: 8,
                    color: '#94A3B8', fontSize: 12, fontWeight: 500,
                  }}>
                    No items
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                    {colIssues.map(issue => (
                      <div key={issue.id} style={{
                        background: '#FFFFFF', borderRadius: 8, padding: '10px 12px',
                        border: '1px solid #E2E8F0', cursor: 'pointer',
                        transition: 'box-shadow .12s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: '#64748B',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {getDisplayKey(issue)}
                          </span>
                          {issue.source === 'jira' && (
                            <span style={{
                              fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                              background: '#EFF6FF', color: '#2563EB',
                            }}>JIRA</span>
                          )}
                          {issue.overdue_days > 0 && (
                            <span style={{
                              fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                              background: '#FEF2F2', color: '#EF4444', marginLeft: 'auto',
                            }}>+{issue.overdue_days}d</span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 12, fontWeight: 500, color: '#0F172A',
                          lineHeight: 1.3, marginBottom: 6,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                          overflow: 'hidden',
                        }}>
                          {issue.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                            background: issue.priority === 'urgent' ? '#FEF2F2' : issue.priority === 'high' ? '#FFFBEB' : '#F1F5F9',
                            color: issue.priority === 'urgent' ? '#DC2626' : issue.priority === 'high' ? '#D97706' : '#64748B',
                          }}>
                            {issue.priority}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                            background: '#F5F3FF', color: '#7C3AED',
                          }}>
                            {issue.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Placeholder for other views */}
      {activeView !== 'board' && (
        <div style={{
          display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
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
