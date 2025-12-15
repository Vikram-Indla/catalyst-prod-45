/**
 * Enterprise-grade Empty State for Strategic Backlog
 * Actionable, not just decorative
 */
import { Button } from '@/components/ui/button';
import { Plus, Link as LinkIcon, Palette, Target, Boxes, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type EntityType = 'theme' | 'objective' | 'epic';

interface EmptyStateProps {
  type: EntityType;
  hasSnapshot: boolean;
  hasThemes: boolean;
  isArchived: boolean;
  onCreate?: () => void;
  onLink?: () => void;
}

const CONFIG: Record<EntityType, {
  icon: React.ElementType;
  title: string;
  description: string;
  noSnapshotMessage: string;
  noThemesMessage: string;
}> = {
  theme: {
    icon: Palette,
    title: 'No themes in this snapshot yet',
    description: 'Strategic themes organize your objectives and epics into meaningful business outcomes.',
    noSnapshotMessage: 'Select a Strategic Snapshot to manage themes.',
    noThemesMessage: '', // Not applicable for themes
  },
  objective: {
    icon: Target,
    title: 'No objectives linked to themes yet',
    description: 'Objectives define measurable goals that drive progress toward strategic themes.',
    noSnapshotMessage: 'Select a Strategic Snapshot to manage objectives.',
    noThemesMessage: 'Create or link themes first to add objectives.',
  },
  epic: {
    icon: Boxes,
    title: 'No epics aligned to themes yet',
    description: 'Aligning epics to themes enables leadership to trace delivery to strategy.',
    noSnapshotMessage: 'Select a Strategic Snapshot to manage epics.',
    noThemesMessage: 'Create or link themes first to align epics.',
  },
};

export function StrategicBacklogEmptyState({
  type,
  hasSnapshot,
  hasThemes,
  isArchived,
  onCreate,
  onLink,
}: EmptyStateProps) {
  const config = CONFIG[type];
  const Icon = config.icon;

  // No snapshot selected
  if (!hasSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground max-w-sm">
          {config.noSnapshotMessage}
        </p>
      </div>
    );
  }

  // No themes (for objectives/epics)
  if (type !== 'theme' && !hasThemes) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <Palette className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Themes required
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {config.noThemesMessage}
        </p>
      </div>
    );
  }

  // Standard empty state with CTAs
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-border rounded-lg bg-surface">
      <div className={cn(
        "p-4 rounded-full mb-4",
        "bg-brand-gold/10"
      )}>
        <Icon className="h-8 w-8 text-brand-gold/70" />
      </div>
      
      <h3 className="text-base font-semibold text-foreground mb-2">
        {config.title}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {config.description}
      </p>

      {!isArchived && (
        <div className="flex items-center gap-3">
          {onLink && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLink}
              className="gap-1.5"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Link existing {type}
            </Button>
          )}
          {onCreate && (
            <Button 
              size="sm" 
              onClick={onCreate}
              className="gap-1.5 bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Create {type}
            </Button>
          )}
        </div>
      )}

      {isArchived && (
        <p className="text-xs text-muted-foreground italic">
          This snapshot is archived and cannot be modified.
        </p>
      )}
    </div>
  );
}
