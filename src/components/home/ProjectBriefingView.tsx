/**
 * ProjectBriefingView — Hierarchy-driven, project-grouped, freshness-gated landing page.
 * Replaces the old flat list + stat cards.
 */
import { useState, useMemo } from 'react';
import { Loader2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { UserContext } from './hooks/useUserContext';
import type { ProjectGroup, CollapsedGroup, BriefingItem, WeekNarrative } from './hooks/useProjectBriefing';
import { useProjectBriefing } from './hooks/useProjectBriefing';
import { useUserContext } from './hooks/useUserContext';
import { getPresetsForRole } from './PersonalizedQueryProcessor';
import { Skeleton } from '@/components/ui/skeleton';

const F = {
  inter: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sora: "'Sora', sans-serif",
};

const PROJECT_COLORS: Record<string, string> = {
  BAU: '#4C6EF5', SIMP: '#FA8C16', MDT: '#52C41A', MWR: '#13C2C2',
  IRP: '#EB2F96', ICP: '#722ED1', IP: '#36CFC9', TAH: '#2F54EB',
};

// ═══ GREETING ═══
function Greeting({ userCtx }: { userCtx: UserContext }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = userCtx.displayName.split(' ')[0];
  const topProjects = userCtx.projectKeys.slice(0, 4);
  const effectiveRole = (userCtx.role === 'admin' || userCtx.role === 'authenticated') ? 'Team Member' : userCtx.role;

  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.02em', margin: 0, fontFamily: F.sora }}>
        {greeting}, {firstName}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', fontFamily: F.inter }}>
          {effectiveRole}
        </span>
        <span style={{ width: 1, height: 12, background: 'var(--divider)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {topProjects.map(pk => (
            <span key={pk} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', fontFamily: F.inter }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: PROJECT_COLORS[pk] || 'var(--fg-3)', flexShrink: 0 }} />
              {pk}
            </span>
          ))}
          {userCtx.projectKeys.length > 4 && (
            <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: F.inter }}>
              +{userCtx.projectKeys.length - 4} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ PROJECT CARD ═══
function ProjectCard({ project, onItemClick }: { project: ProjectGroup; onItemClick: (key: string) => void }) {
  const totalItems = project.individualItems.length + project.collapsedGroups.reduce((s, g) => s + g.count, 0);

  return (
    <div style={{
      border: '1px solid var(--divider)', borderRadius: 12, background: 'var(--cp-float)',
      borderLeft: `3px solid ${project.projectColor}`, marginBottom: 10,
      overflow: 'hidden',
    }}>
      {/* Project header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: '1px solid var(--bg-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: project.projectColor, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--fg-1)', fontFamily: F.inter }}>
            {project.projectKey}
          </span>
          {project.hasIncident && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--sem-danger)',
              background: 'var(--sem-danger-bg)', border: '1px solid var(--sem-danger-light)',
              padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
              letterSpacing: '0.04em', fontFamily: F.inter,
            }}>
              INCIDENT
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: F.mono }}>
          {totalItems} item{totalItems !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items */}
      <div>
        {project.individualItems.map((item, idx) => (
          <IndividualItemRow key={item.itemKey} item={item} isFirst={idx === 0} onClick={onItemClick} />
        ))}
        {project.collapsedGroups.map(group => (
          <CollapsedGroupRow key={group.tierLabel} group={group} onItemClick={onItemClick} />
        ))}
      </div>
    </div>
  );
}

// ═══ INDIVIDUAL ITEM ROW (Tier 1-4) ═══
function IndividualItemRow({ item, isFirst, onClick }: { item: BriefingItem; isFirst: boolean; onClick: (key: string) => void }) {
  const dayColor = item.daysSinceUpdate <= 1 ? 'var(--sem-success)' : item.daysSinceUpdate <= 3 ? 'var(--fg-2)' : item.daysSinceUpdate <= 7 ? 'var(--sem-warning)' : 'var(--sem-danger)';

  // Items in backlog/to-do that surfaced in the current week = "moved to current week"
  const statusLower = (item.status || '').toLowerCase();
  const isBacklogItem = statusLower === 'to do' || statusLower === 'backlog' || statusLower === 'open' || statusLower === 'ready';
  const isCurrentWeek = item.daysSinceUpdate <= 7;
  const showMovedTag = isBacklogItem && isCurrentWeek;

  return (
    <button
      onClick={() => onClick(item.itemKey)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4, width: '100%',
        padding: '10px 14px', background: 'transparent',
        borderBottom: '1px solid var(--bg-2)', border: 'none',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 80ms',
        position: 'relative',
        zIndex: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-1)'; e.currentTarget.style.zIndex = '10'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.zIndex = '0'; }}
    >
      {/* Type label + key + day counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: item.tierColor,
          textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: F.inter,
        }}>
          {item.tierLabel}
        </span>
        <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 650, color: 'var(--cp-blue)' }}>
          {item.itemKey}
        </span>
        {showMovedTag && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: 'var(--ds-surface, #FFFFFF)',
            background: 'var(--cp-blue)', padding: '1px 6px', borderRadius: 4,
            textTransform: 'uppercase', letterSpacing: '0.03em', fontFamily: F.inter,
            whiteSpace: 'nowrap',
          }}>
            Moved to current week
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: dayColor }}>
          {item.daysSinceUpdate <= 0 ? 'today' : item.daysSinceUpdate === 1 ? '1d' : `${item.daysSinceUpdate}d`}
        </span>
      </div>

      {/* Title */}
      <span style={{
        fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', fontFamily: F.inter,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.title}
      </span>

      {/* Metadata line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-3)', fontFamily: F.inter }}>
        <span>{item.involvement}</span>
        {item.assignee && (
          <>
            <span>·</span>
            <span>→ {item.assignee}</span>
          </>
        )}
        {item.status && (
          <>
            <span>·</span>
            <span style={{
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
              padding: '1px 5px', borderRadius: 4,
              background: 'var(--cp-lz-gy-bg)', color: 'var(--cp-lz-gy-t)',
            }}>
              {item.status}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

// ═══ COLLAPSED GROUP ROW (Tier 5-6) ═══
function CollapsedGroupRow({ group, onItemClick }: { group: CollapsedGroup; onItemClick: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 14px', background: 'transparent',
          borderBottom: '1px solid var(--bg-2)', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          transition: 'background 80ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: group.tierColor, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: F.inter }}>
          {group.tierLabel}
        </span>
        <span style={{
          fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: 'var(--fg-1)',
          background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4, minWidth: 20, textAlign: 'center',
        }}>
          {group.count}
        </span>
        <span style={{
          fontSize: 12, color: 'var(--fg-2)', fontFamily: F.inter, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {group.titleSummary}
        </span>
        <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: F.inter, flexShrink: 0 }}>
          {group.assignees.length > 0 ? group.assignees[0] : 'Unassigned'}
          {group.assignees.length > 1 ? ` +${group.assignees.length - 1}` : ''}
        </span>
        {expanded
          ? <ChevronDown size={14} color="var(--fg-3)" />
          : <ChevronRight size={14} color="var(--fg-3)" />
        }
      </button>

      {expanded && (
        <div style={{ background: 'var(--bg-1)' }}>
          {group.items.map(item => (
            <button
              key={item.itemKey}
              onClick={() => onItemClick(item.itemKey)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '6px 14px 6px 32px', background: 'transparent',
                borderBottom: '1px solid var(--bg-2)', border: 'none',
                cursor: 'pointer', textAlign: 'left', transition: 'background 80ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', minWidth: 70 }}>
                {item.itemKey}
              </span>
              <span style={{
                fontSize: 12, color: 'var(--fg-2)', fontFamily: F.inter, flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.title}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', flexShrink: 0 }}>
                {item.daysSinceUpdate}d
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ WEEK NARRATIVE ═══
function WeekNarrativeCard({ narrative, userCtx }: { narrative: WeekNarrative; userCtx: UserContext }) {
  const typeOrder = ['INITIATIVE', 'BUSINESS REQUEST', 'EPIC', 'STORY', 'PRODUCTION INCIDENT', 'DEFECT'];
  const parts: string[] = [];
  typeOrder.forEach(type => {
    const count = narrative.byType[type];
    if (count && count > 0) {
      parts.push(`${count} ${type.toLowerCase()}${count > 1 ? 's' : ''}`);
    }
  });

  const closedNarrative = parts.length > 0 ? parts.join(', ') : 'no significant items';

  return (
    <div style={{
      padding: '14px 16px', border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--cp-float)',
    }}>
      {narrative.myTotal > 0 ? (
        <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: '20px', margin: '0 0 8px', fontFamily: F.inter }}>
          You closed <strong style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{narrative.myTotal} items</strong> this week.
        </p>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: '20px', margin: '0 0 8px', fontFamily: F.inter }}>
          No items closed by you this week yet.
        </p>
      )}

      {narrative.teamTotal > 0 && (
        <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: '20px', margin: 0, fontFamily: F.inter }}>
          Your team delivered{' '}
          <strong style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{closedNarrative}</strong>
          {' '}across{' '}
          {Object.entries(narrative.projectBreakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([proj, count], i, arr) => (
              <span key={proj}>
                {i > 0 && i < arr.length - 1 ? ', ' : ''}
                {i > 0 && i === arr.length - 1 ? ' and ' : ''}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: PROJECT_COLORS[proj] || 'var(--fg-3)', display: 'inline-block' }} />
                  <strong style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{proj}</strong>
                </span>
                {' '}({count})
              </span>
            ))
          }.
        </p>
      )}
    </div>
  );
}

// ═══ EMPTY STATE ═══
function EmptyState({ userCtx }: { userCtx: UserContext }) {
  return (
    <div style={{
      padding: '32px 20px', textAlign: 'center',
      border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--cp-float)',
    }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: '0 0 6px', fontFamily: F.inter }}>
        All clear across your projects
      </p>
      <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: 0, fontFamily: F.inter }}>
        No items with recent activity in {userCtx.projectKeys.slice(0, 4).join(', ')}.
        Try asking me about specific items or projects below.
      </p>
    </div>
  );
}

// ═══ LOADING SKELETON ═══
function BriefingSkeleton() {
  return (
    <div style={{ padding: '24px 24px 16px' }}>
      <Skeleton className="h-7 w-56 mb-2 rounded" />
      <Skeleton className="h-4 w-40 mb-6 rounded" />
      <Skeleton className="h-4 w-28 mb-3 rounded" />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ border: '1px solid var(--divider)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <Skeleton className="h-4 w-24 mb-3 rounded" />
          <Skeleton className="h-3.5 w-full mb-2 rounded" />
          <Skeleton className="h-3.5 w-3/4 mb-2 rounded" />
          <Skeleton className="h-3 w-48 rounded" />
        </div>
      ))}
    </div>
  );
}

// ═══ QUICK ACTIONS ═══
function QuickActionsBar({ role, onPresetClick }: { role: string; onPresetClick: (query: string) => void }) {
  const effectiveRole = (role === 'admin' || role === 'authenticated') ? 'Team Member' : role;
  const presets = getPresetsForRole(effectiveRole);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {presets.map(preset => (
        <button
          key={preset.query}
          onClick={() => onPresetClick(preset.query)}
          style={{
            fontSize: 12, fontWeight: 500, color: 'var(--fg-1)',
            background: 'var(--cp-float)', border: '1px solid var(--divider)',
            padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
            transition: 'all 0.15s', fontFamily: F.inter, whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--cp-blue-wash)';
            e.currentTarget.style.borderColor = 'var(--cp-blue)';
            e.currentTarget.style.color = 'var(--cp-blue)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--cp-float)';
            e.currentTarget.style.borderColor = 'var(--divider)';
            e.currentTarget.style.color = 'var(--fg-1)';
          }}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

// ═══ SECTION LABEL ═══
function SectionLabel({ text }: { text: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: 'var(--fg-3)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      fontFamily: F.inter, display: 'block', marginBottom: 10,
    }}>
      {text}
    </span>
  );
}

// ═══ MAIN EXPORT ═══
export interface ProjectBriefingViewProps {
  onItemClick: (key: string) => void;
  onPresetClick: (query: string) => void;
}

export function ProjectBriefingView({ onItemClick, onPresetClick }: ProjectBriefingViewProps) {
  const { data: userCtx, isLoading: userLoading } = useUserContext();
  const { data: briefing, isLoading: briefingLoading } = useProjectBriefing(userCtx);

  if (userLoading || briefingLoading) return <BriefingSkeleton />;
  if (!userCtx || !briefing) return <BriefingSkeleton />;

  const { projects, weekNarrative } = briefing;

  return (
    <div style={{ padding: '24px 24px 16px' }}>
      <Greeting userCtx={userCtx} />

      {/* RECENT ACTIVITY — grouped by project */}
      {projects.length > 0 ? (
        <>
          <SectionLabel text="Recent activity" />
          {projects.map(project => (
            <ProjectCard key={project.projectKey} project={project} onItemClick={onItemClick} />
          ))}
        </>
      ) : (
        <>
          <SectionLabel text="Recent activity" />
          <EmptyState userCtx={userCtx} />
        </>
      )}

      {/* YOUR WEEK */}
      <div style={{ marginTop: 20 }}>
        <SectionLabel text="Your week" />
        <WeekNarrativeCard narrative={weekNarrative} userCtx={userCtx} />
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ marginTop: 20, marginBottom: 4 }}>
        <SectionLabel text="Quick actions" />
        <QuickActionsBar role={userCtx.role} onPresetClick={onPresetClick} />
      </div>
    </div>
  );
}
