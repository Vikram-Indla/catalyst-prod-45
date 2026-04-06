import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ArrowLeft, Star, ExternalLink } from 'lucide-react';
import type { ProjectListItem } from '@/types/projecthub';
import { useProjectTeam } from '@/hooks/useProjectHub';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { DistributionBar } from './DistributionBar';
import { STATUS_CATEGORY_DISPLAY } from '@/types/projecthub';
import { PanelTeamTab } from './PanelTeamTab';
import { PanelOverviewTab } from './PanelOverviewTab';
import { useState } from 'react';

interface Props {
  project: ProjectListItem | null;
  open: boolean;
  onClose: () => void;
  isFav: boolean;
  onToggleFav: () => void;
}

const CAT_DOT: Record<string, string> = { todo: '#94A3B8', in_progress: '#2563EB', done: '#16A34A' };

function getAvatarGradient(key: string) {
  const letter = (key[0] || '').toUpperCase();
  const map: Record<string, string> = {
    A: '#2563EB', B: '#2563EB', C: '#2563EB', D: '#7C3AED', E: '#7C3AED', F: '#7C3AED',
    G: '#0D9488', H: '#0D9488', I: '#0D9488', J: '#1D4ED8', K: '#1D4ED8', L: '#1D4ED8',
    M: '#F59E0B', N: '#F59E0B', O: '#F59E0B', P: '#DC2626', Q: '#DC2626', R: '#DC2626',
    S: '#2563EB', T: '#2563EB', U: '#2563EB', V: '#16A34A', W: '#16A34A', X: '#16A34A', Y: '#16A34A', Z: '#16A34A',
  };
  return map[letter] || '#0284C7';
}

export function ProjectDetailPanel({ project, open, onClose, isFav, onToggleFav }: Props) {
  const [tab, setTab] = useState<'team' | 'overview'>('team');
  const { data: members = [], isLoading: teamLoading } = useProjectTeam(project?.id ?? null);

  if (!project) return null;

  const bg = getAvatarGradient(project.project_key);

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="p-0 w-[540px] max-w-full flex flex-col [&>button:first-child]:hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--divider)', padding: '16px 20px' }}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <ArrowLeft size={18} color="var(--fg-3)" />
            </button>
            <div className="flex items-center justify-center rounded-md" style={{ width: 36, height: 50, background: bg, color: '#FFF', fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", borderRadius: 8 }}>
              {project.project_key}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', fontFamily: "'Sora', sans-serif" }}>{project.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{project.department || 'No department'} · {project.project_key}</div>
            </div>
            <button onClick={onToggleFav} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Star size={18} fill={isFav ? '#EAB308' : 'none'} color={isFav ? '#EAB308' : '#CBD5E1'} />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <ProjectStatusBadge status={project.status} />
            <ProjectHealthBadge health={project.health_status} />
            <span className="inline-flex items-center gap-1.5 rounded-full" style={{ padding: '2px 10px', background: 'var(--bg-1)', fontSize: 11, fontWeight: 500, color: 'var(--fg-2)', border: '1px solid var(--divider)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_DOT[project.status_category] }} />
              {STATUS_CATEGORY_DISPLAY[project.status_category]}
            </span>
          </div>

          {/* Work items */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Epics', val: project.total_epics },
              { label: 'Stories', val: project.total_stories },
              { label: 'Tasks', val: project.total_tasks },
            ].map(i => (
              <div key={i.label} className="text-center rounded" style={{ padding: '6px 0', background: 'var(--bg-1)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', fontFamily: "'JetBrains Mono', monospace" }}>{i.val}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-4)' }}>{i.label}</div>
              </div>
            ))}
          </div>

          <DistributionBar todo={project.work_items_todo} inProgress={project.work_items_in_progress} done={project.work_items_done} />

          {/* Tabs */}
          <div className="flex gap-0 mt-3" style={{ borderBottom: '1px solid var(--divider)' }}>
            {(['team', 'overview'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? '#2563EB' : 'var(--fg-3)',
                  borderBottom: tab === t ? '2px solid #2563EB' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  borderBottomWidth: 2,
                  borderBottomStyle: 'solid',
                  borderBottomColor: tab === t ? 'var(--cp-blue)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {t === 'team' ? `Team (${members.length})` : 'Overview'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'team' ? (
            <PanelTeamTab members={members} isLoading={teamLoading} projectId={project?.id ?? null} />
          ) : (
            <PanelOverviewTab project={project} members={members} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4" style={{ borderTop: '1px solid var(--divider)' }}>
          <button onClick={onClose} className="flex-1 rounded-md transition-colors" style={{ height: 50, background: '#FFF', border: '1px solid var(--divider)', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer' }}>
            Close
          </button>
          <button
            onClick={() => window.open(`/project-hub/${project.project_key}/dashboard`, '_blank')}
            className="flex items-center justify-center gap-2 flex-1 rounded-md transition-colors"
            style={{ height: 50, background: 'var(--cp-blue)', border: 'none', fontSize: 13, fontWeight: 600, color: '#FFF', cursor: 'pointer' }}
          >
            <ExternalLink size={14} /> Open Project
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
