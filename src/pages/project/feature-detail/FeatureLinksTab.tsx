/**
 * FeatureLinksTab — Links and dependencies view for Feature detail page
 */

import { Zap, FileText, Link2, ArrowUp, ArrowDown, Ban, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FeatureLinksTabProps {
  feature: {
    id: string;
    epic_id: string;
    epic?: { 
      id: string; 
      epic_key: string; 
      name: string; 
      primary_program_id?: string | null 
    } | null;
  };
}

// Mock linked items data
const MOCK_STORIES = [
  { id: 'sto-1', key: 'STO-551', name: 'Implement compliance rule engine API', status: 'done' },
  { id: 'sto-2', key: 'STO-552', name: 'Create dashboard widget components', status: 'in_progress' },
  { id: 'sto-3', key: 'STO-553', name: 'Exception workflow modal', status: 'todo' },
];

const MOCK_DEPENDENCIES = [
  { id: 'dep-1', type: 'blocks', itemKey: 'FEAT-1025', itemName: 'API Gateway Upgrade', status: 'pending' },
  { id: 'dep-2', type: 'blocked_by', itemKey: 'FEAT-1020', itemName: 'Database Migration', status: 'resolved' },
];

const MOCK_CHANGE_LINKS = [
  { id: 'chg-1', key: 'CHG-12042', name: 'Production deployment for compliance module', status: 'approved' },
];

const STORY_STATUS_APPEARANCE: Record<string, LozengeAppearance> = {
  done: 'success',
  in_progress: 'inprogress',
  todo: 'default',
};

const DEPENDENCY_STATUS_APPEARANCE: Record<string, LozengeAppearance> = {
  resolved: 'success',
  pending: 'moved',
};

export function FeatureLinksTab({ feature }: FeatureLinksTabProps) {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Parent Epic */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Parent Epic
        </h3>
        {feature.epic ? (
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
            <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {feature.epic.epic_key && (
                  <>
                    <span className="font-mono text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
                      {feature.epic.epic_key}
                    </span>
                    <span className="text-muted-foreground">-</span>
                  </>
                )}
                <span className="text-sm text-foreground truncate">{feature.epic.name}</span>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic p-4 border rounded-lg">
            No parent Epic linked.
          </div>
        )}
      </section>

      {/* Child Stories */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Child Stories ({MOCK_STORIES.length})
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => toast.info('Link Story functionality coming soon')}
          >
            <Link2 className="h-4 w-4 mr-1" />
            Link Story
          </Button>
        </div>
        <div className="space-y-2">
          {MOCK_STORIES.map((story) => (
            <div 
              key={story.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <span className="font-mono text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
                {story.key}
              </span>
              <span className="text-sm text-foreground flex-1 truncate">{story.name}</span>
              <Lozenge appearance={STORY_STATUS_APPEARANCE[story.status] ?? 'default'}>
                {story.status === 'done' ? 'Done' : story.status === 'in_progress' ? 'In Progress' : 'To Do'}
              </Lozenge>
            </div>
          ))}
        </div>
      </section>

      {/* Dependencies */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Blocks / Blocked By
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => toast.info('Add Dependency functionality coming soon')}
          >
            <Link2 className="h-4 w-4 mr-1" />
            Add Dependency
          </Button>
        </div>
        <div className="space-y-2">
          {MOCK_DEPENDENCIES.map((dep) => (
            <div 
              key={dep.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className={cn(
                "w-6 h-6 rounded flex items-center justify-center",
                dep.type === 'blocks' ? "bg-red-500/10" : "bg-orange-500/10"
              )}>
                {dep.type === 'blocks' ? (
                  <ArrowUp className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-orange-500" />
                )}
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {dep.type === 'blocks' ? 'Blocks' : 'Blocked by'}
              </span>
              <span className="font-mono text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
                {dep.itemKey}
              </span>
              <span className="text-sm text-foreground flex-1 truncate">{dep.itemName}</span>
              <Lozenge appearance={DEPENDENCY_STATUS_APPEARANCE[dep.status] ?? 'default'}>
                {dep.status === 'resolved' ? 'Resolved' : 'Pending'}
              </Lozenge>
            </div>
          ))}
        </div>
      </section>

      {/* Change Links */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Change Requests
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => toast.info('Link Change functionality coming soon')}
          >
            <Link2 className="h-4 w-4 mr-1" />
            Link Change
          </Button>
        </div>
        <div className="space-y-2">
          {MOCK_CHANGE_LINKS.map((change) => (
            <div 
              key={change.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center">
                <Ban className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span className="font-mono text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
                {change.key}
              </span>
              <span className="text-sm text-foreground flex-1 truncate">{change.name}</span>
              <Lozenge appearance="success">
                Approved
              </Lozenge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
