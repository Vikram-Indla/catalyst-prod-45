import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ArrowLeft, Star, ExternalLink } from '@/lib/atlaskit-icons';
import type { ProjectListItem } from '@/types/projecthub';
import { useProjectTeam } from '@/hooks/useProjectHub';
import { StatusLozenge as ProjectStatusBadge } from '@/components/shared/StatusLozenge';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { DistributionBar } from './DistributionBar';
import { STATUS_CATEGORY_DISPLAY } from '@/types/projecthub';
import { PanelTeamTab } from './PanelTeamTab';
import { PanelOverviewTab } from './PanelOverviewTab';
import { PanelScoreTab } from './PanelScoreTab';
import { useState } from 'react';

interface Props {
  project: ProjectListItem | null;
  open: boolean;
  onClose: () => void;
  isFav: boolean;
  onToggleFav: () => void;
}

const CAT_DOT: Record<string, string> = { todo: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', in_progress: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', done: 'var(--ds-text-success, var(--cp-success))' };

function getAvatarGradient(key: string) {
  const letter = (key[0] || '').toUpperCase();
  const map: Record<string, string> = {
    A: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', B: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', C: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', D: 'var(--cp-purple-60)', E: 'var(--cp-purple-60)', F: 'var(--cp-purple-60)',
    G: 'var(--cp-teal-60)', H: 'var(--cp-teal-60)', I: 'var(--cp-teal-60)', J: 'var(--ds-background-brand-bold-hovered)', K: 'var(--ds-background-brand-bold-hovered)', L: 'var(--ds-background-brand-bold-hovered)',
    M: 'var(--ds-text-warning, var(--cp-amber))', N: 'var(--ds-text-warning, var(--cp-amber))', O: 'var(--ds-text-warning, var(--cp-amber))', P: 'var(--ds-text-danger, var(--cp-danger))', Q: 'var(--ds-text-danger, var(--cp-danger))', R: 'var(--ds-text-danger, var(--cp-danger))',
    S: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', T: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', U: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', V: 'var(--ds-text-success, var(--cp-success))', W: 'var(--ds-text-success, var(--cp-success))', X: 'var(--ds-text-success, var(--cp-success))', Y: 'var(--ds-text-success, var(--cp-success))', Z: 'var(--ds-text-success, var(--cp-success))',
  };
  return map[letter] || 'var(--ds-link)';
}

export function ProjectDetailPanel({ project, open, onClose, isFav, onToggleFav }: Props) {
  const [tab, setTab] = useState<'team' | 'overview' | 'score'>('team');
  const { data: members = [], isLoading: teamLoading } = useProjectTeam(project?.id ?? null);

  if (!project) return null;

  const bg = getAvatarGradient(project.project_key);

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="p-0 w-[540px] max-w-full flex flex-col [&>button:first-child]:hidden" style={{ fontFamily: 'var(--cp-font-body)' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--divider)', padding: '16px 20px' }}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <ArrowLeft size={18} color="var(--fg-3)" />
            </button>
            <div className="flex items-center justify-center rounded-md" style={{ width: 36, height: 50, background: bg, color: 'var(--ds-surface)', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, fontFamily: 'var(--cp-font-mono)', borderRadius: 8 }}>
              {project.project_key}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-heading)' }}>{project.name}</div>
              <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--fg-3)' }}>{project.department || 'No department'} · {project.project_key}</div>
            </div>
            <button onClick={onToggleFav} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Star size={18} fill={isFav ? 'var(--ds-background-warning-bold)' : 'none'} color={isFav ? 'var(--ds-background-warning-bold)' : 'var(--ds-text-disabled)'} />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <ProjectStatusBadge status={project.status} />
            <ProjectHealthBadge health={project.health_status} />
            <span className="inline-flex items-center gap-1.5 rounded-full" style={{ padding: '0px 10px', background: 'var(--bg-1)', fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: 'var(--fg-2)', border: '1px solid var(--divider)' }}>
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
              <div key={i.label} className="text-center rounded" style={{ padding: '4px 0', background: 'var(--bg-1)' }}>
                <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-mono)' }}>{i.val}</div>
                <div style={{ fontSize: 'var(--ds-font-size-50)', color: 'var(--fg-4)' }}>{i.label}</div>
              </div>
            ))}
          </div>

          <DistributionBar todo={project.work_items_todo} inProgress={project.work_items_in_progress} done={project.work_items_done} />

          {/* Tabs */}
          <div className="flex gap-0 mt-3" style={{ borderBottom: '1px solid var(--divider)' }}>
            {(['team', 'overview', 'score'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '8px 16px',
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--fg-3)',
                  borderBottom: tab === t ? '2px solid var(--ds-link)' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  borderBottomWidth: 2,
                  borderBottomStyle: 'solid',
                  borderBottomColor: tab === t ? 'var(--cp-blue)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {t === 'team' ? `Team (${members.length})` : t === 'overview' ? 'Overview' : 'Score'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'team' ? (
            <PanelTeamTab members={members} isLoading={teamLoading} projectId={project?.id ?? null} />
          ) : tab === 'overview' ? (
            <PanelOverviewTab project={project} members={members} />
          ) : (
            <PanelScoreTab projectId={project.id} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4" style={{ borderTop: '1px solid var(--divider)' }}>
          <button onClick={onClose} className="flex-1 rounded-md transition-colors" style={{ height: 50, background: 'var(--ds-surface)', border: '1px solid var(--divider)', fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer' }}>
            Close
          </button>
          <button
            onClick={() => window.open(`/project-hub/${project.project_key}/dashboard`, '_blank')}
            className="flex items-center justify-center gap-2 flex-1 rounded-md transition-colors"
            style={{ height: 50, background: 'var(--cp-blue)', border: 'none', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-surface)', cursor: 'pointer' }}
          >
            <ExternalLink size={14} /> Open Project
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
