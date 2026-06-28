import { MessageSquare, ExternalLink, Plus } from '@/lib/atlaskit-icons';
import { Button } from '@/components/ui/button';
import type { Incident } from '@/types/release';

interface SlackIntegrationPanelProps {
  incident: Incident;
}

export function SlackIntegrationPanel({ incident }: SlackIntegrationPanelProps) {
  const hasChannel = !!incident.slackChannel;

  return (
    <div className="bg-white border border-[var(--ds-border)] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-[var(--ds-text-subtlest)]" />
        <h4 className="text-sm font-semibold text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse)))]">Collaboration</h4>
      </div>

      {hasChannel ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--ds-text-subtlest)]">{incident.slackChannel}</span>
            <Button variant="ghost" size="sm" className="h-7 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] hover:text-[var(--ds-background-brand-bold-hovered)]">
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open Slack
            </Button>
          </div>
          <p className="text-xs text-[var(--ds-text-subtlest)]">
            Created 2 hours ago • 5 participants
          </p>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-[var(--ds-text-subtlest)] mb-2">No Slack channel created</p>
          <Button variant="outline" size="sm" className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Channel
          </Button>
        </div>
      )}
    </div>
  );
}
