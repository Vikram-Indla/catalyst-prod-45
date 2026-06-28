import { Link2, Plus, ExternalLink, X } from '@/lib/atlaskit-icons';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import type { LinkedItem } from '@/types/release';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface LinkedItemsPanelProps {
  linkedItems: LinkedItem[];
  isEditMode: boolean;
  onRemoveItem?: (id: string) => void;
  onAddItem?: () => void;
}

const getTypeIconComponent = (type: string) => {
  return <JiraIssueTypeIcon type={type} size={16} />;
};

export function LinkedItemsPanel({
  linkedItems,
  isEditMode,
  onRemoveItem,
  onAddItem,
}: LinkedItemsPanelProps) {
  return (
    <div className="bg-white dark:bg-card border border-[var(--ds-border)] dark:border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[var(--ds-text-subtlest)] dark:text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Linked Items</h4>
        </div>
        <span className="text-xs text-muted-foreground">{linkedItems.length}</span>
      </div>

      <div className="space-y-2">
        {linkedItems.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No linked items</p>
        ) : (
          linkedItems.map(item => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getTypeIconComponent(item.type)}
                <Lozenge appearance="default">
                  {item.type}
                </Lozenge>
                <span className="text-xs font-medium text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-text-brand)]">{item.id}</span>
                <span className="text-xs text-muted-foreground truncate">{item.summary}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                {isEditMode && onRemoveItem && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:text-red-500"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full mt-2 h-8 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-text-brand)] hover:text-[var(--ds-background-brand-bold-hovered)] dark:hover:text-[var(--ds-background-information)] hover:bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]/10 dark:hover:bg-[var(--ds-text-brand)]/10"
        onClick={onAddItem}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Link work item
      </Button>
    </div>
  );
}
