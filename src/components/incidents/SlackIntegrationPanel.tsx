import { MessageSquare, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Incident } from '@/types/release';

interface SlackIntegrationPanelProps {
  incident: Incident;
}

export function SlackIntegrationPanel({ incident }: SlackIntegrationPanelProps) {
  const hasChannel = !!incident.slackChannel;

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-[#8C8C8C]" />
        <h4 className="text-sm font-semibold text-[#172B4D]">Collaboration</h4>
      </div>

      {hasChannel ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#5C5C5C]">{incident.slackChannel}</span>
            <Button variant="ghost" size="sm" className="h-7 text-[#C69C6D] hover:text-[#B8894D]">
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open Slack
            </Button>
          </div>
          <p className="text-xs text-[#8C8C8C]">
            Created 2 hours ago • 5 participants
          </p>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-[#8C8C8C] mb-2">No Slack channel created</p>
          <Button variant="outline" size="sm" className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Channel
          </Button>
        </div>
      )}
    </div>
  );
}
