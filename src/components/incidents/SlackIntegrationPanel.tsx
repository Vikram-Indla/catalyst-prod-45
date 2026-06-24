import { MessageSquare, ExternalLink, Plus } from '@/lib/atlaskit-icons';
import { Button } from '@/components/ui/button';
import type { Incident } from '@/types/release';

interface SlackIntegrationPanelProps {
  incident: Incident;
}

export function SlackIntegrationPanel({ incident }: SlackIntegrationPanelProps) {
  const hasChannel = !!incident.slackChannel;

  return (
    <div className="bg-white border border-[var(--ds-border, #E8E8E8)] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-[var(--ds-text-subtlest, #626F86)]" />
        <h4 className="text-sm font-semibold text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))]">Collaboration</h4>
      </div>

      {hasChannel ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#5C5C5C]">{incident.slackChannel}</span>
            <Button variant="ghost" size="sm" className="h-7 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))] hover:text-[var(--ds-background-brand-bold-hovered,#1d4ed8)]">
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open Slack
            </Button>
          </div>
          <p className="text-xs text-[var(--ds-text-subtlest, #626F86)]">
            Created 2 hours ago • 5 participants
          </p>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-[var(--ds-text-subtlest, #626F86)] mb-2">No Slack channel created</p>
          <Button variant="outline" size="sm" className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Channel
          </Button>
        </div>
      )}
    </div>
  );
}
