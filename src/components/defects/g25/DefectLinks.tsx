import { FileText, Play, Bug, Link, RefreshCw, BookOpen, GitBranch, Tag, AlertCircle, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { useDefectLinksG25, useDeleteDefectLinkG25 } from '@/hooks/useDefectsG25';
import { Skeleton } from '@/components/ui/skeleton';
import { DefectLink } from '@/types/defects';
import type { LucideIcon } from 'lucide-react';

const LINK_TYPE_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  test_case:      { icon: FileText,    label: 'Test Case',       color: 'text-blue-500' },
  test_run:       { icon: Play,        label: 'Test Run',        color: 'text-green-500' },
  step_result:    { icon: AlertCircle, label: 'Step Result',     color: 'text-orange-500' },
  test_cycle:     { icon: RefreshCw,   label: 'Test Cycle',      color: 'text-violet-500' },
  test_plan:      { icon: BookOpen,    label: 'Test Plan',       color: 'text-indigo-500' },
  requirement:    { icon: GitBranch,   label: 'Requirement',     color: 'text-teal-500' },
  release:        { icon: Tag,         label: 'Release',         color: 'text-pink-500' },
  story:          { icon: FileText,    label: 'Story',           color: 'text-yellow-500' },
  related_defect: { icon: Bug,         label: 'Related Defect',  color: 'text-destructive' },
};

const NAVIGABLE: Record<string, (l: DefectLink) => string> = {
  test_case:  (l) => `/testhub/repository?case=${l.linked_id}`,
  test_run:   (l) => `/testhub/execution/${l.linked_id}`,
  test_cycle: (l) => `/testhub/cycles/${l.linked_id}`,
  test_plan:  (l) => `/testhub/test-plans/${l.linked_id}`,
};

function getDisplayLabel(link: DefectLink): string {
  if (link.entity_label) return link.entity_label;
  if (link.test_case) return link.test_case.case_key;
  return link.linked_id.slice(0, 8);
}

function getDisplayTitle(link: DefectLink): string {
  if (link.test_case?.title) return link.test_case.title;
  return '';
}

export function DefectLinks({ defectId, onAddLink }: { defectId: string; onAddLink?: () => void }) {
  const { data: links, isLoading } = useDefectLinksG25(defectId);
  const del = useDeleteDefectLinkG25();
  const navigate = useNavigate();

  if (isLoading) return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Linked Items ({links?.length || 0})</h4>
        {onAddLink && (
          <Button size="sm" variant="outline" onClick={onAddLink}>
            <Plus className="h-4 w-4 mr-1" />Add Link
          </Button>
        )}
      </div>

      {!links?.length ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No linked items</p>
      ) : (
        <div className="space-y-2">
          {links.map(link => {
            const config = LINK_TYPE_CONFIG[link.link_type] ?? { icon: Link, label: link.link_type, color: 'text-muted-foreground' };
            const Icon = config.icon;
            const route = NAVIGABLE[link.link_type]?.(link);
            const isAuto = link.link_source !== 'manual';

            return (
              <div
                key={link.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors${route ? ' cursor-pointer hover:bg-muted/50' : ''}`}
                onClick={route ? () => navigate(route) : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary">{getDisplayLabel(link)}</span>
                      <Lozenge appearance="default">{config.label}</Lozenge>
                      {isAuto && (
                        <Lozenge appearance="inprogress">Auto</Lozenge>
                      )}
                    </div>
                    {getDisplayTitle(link) && (
                      <p className="text-sm text-muted-foreground truncate max-w-md">{getDisplayTitle(link)}</p>
                    )}
                  </div>
                </div>

                {!isAuto && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive" onClick={(e) => { e.stopPropagation(); del.mutate({ linkId: link.id, defectId }); }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
