import { Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Incident } from '@/types/release';

interface IncidentHeaderProps {
  incident: Incident;
  isEditMode: boolean;
  editedSummary: string;
  onToggleEditMode: () => void;
  onSave: () => void;
  onCancel: () => void;
  onSummaryChange: (value: string) => void;
}

/**
 * Severity colors using Catalyst V5 semantic tokens
 */
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'SEV1': return 'bg-[var(--sem-danger)] text-[var(--text-inverse)]';
    case 'SEV2': return 'bg-[var(--sem-warning)] text-[var(--text-inverse)]';
    case 'SEV3': return 'bg-[var(--sem-high)] text-[var(--text-inverse)]';
    default: return 'bg-muted text-muted-foreground';
  }
};

/**
 * Status colors using Catalyst V5 semantic tokens
 */
const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return { bg: 'bg-[var(--sem-info-bg)]', text: 'text-[var(--sem-info)]' };
    case 'in-progress': return { bg: 'bg-[var(--sem-warning-bg)]', text: 'text-[var(--sem-warning)]' };
    case 'pending': return { bg: 'bg-[var(--sem-high-bg)]', text: 'text-[var(--sem-high)]' };
    case 'resolved': return { bg: 'bg-[var(--sem-success-bg)]', text: 'text-[var(--sem-success)]' };
    case 'closed': return { bg: 'bg-[var(--sem-medium-bg)]', text: 'text-[var(--sem-medium)]' };
    case 'reopened': return { bg: 'bg-[var(--sem-danger-bg)]', text: 'text-[var(--sem-danger)]' };
    case 'cancelled': return { bg: 'bg-[var(--sem-low-bg)]', text: 'text-[var(--sem-low)]' };
    default: return { bg: 'bg-muted', text: 'text-muted-foreground' };
  }
};

export function IncidentHeader({
  incident,
  isEditMode,
  editedSummary,
  onToggleEditMode,
  onSave,
  onCancel,
  onSummaryChange,
}: IncidentHeaderProps) {
  const statusColors = getStatusColor(incident.status);

  return (
    <div className="border-b border-border bg-card">
      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="bg-[var(--sem-warning-bg)] border-b border-[var(--sem-warning-border)] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--sem-warning)]">
            <Edit className="w-4 h-4" />
            <span className="text-sm font-medium">You are in edit mode. Changes are not saved until you click Save.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-8">
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Incident Title - Fixed height for alignment */}
      <div className="h-[72px] px-6 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-1">
          <Badge className="bg-primary/10 text-primary border-0 font-semibold text-xs">
            {incident.id}
          </Badge>
          <Badge className={cn(getSeverityColor(incident.severity || 'SEV3'), 'border-0 font-semibold text-xs')}>
            {incident.severity || 'SEV3'}
          </Badge>
          <Badge className={cn(statusColors.bg, statusColors.text, 'border-0 font-medium capitalize text-xs')}>
            {incident.status.replace('-', ' ')}
          </Badge>
          {incident.isMajorIncident && (
            <Badge className="bg-[var(--sem-danger)] text-[var(--text-inverse)] border-0 font-semibold text-xs">
              🚨 Major Incident
            </Badge>
          )}
        </div>
        
        {isEditMode ? (
          <Input
            value={editedSummary}
            onChange={(e) => onSummaryChange(e.target.value)}
            className="text-lg font-semibold h-8 py-1 border-primary focus:ring-primary"
            placeholder="Incident summary..."
          />
        ) : (
          <h1 className="text-lg font-semibold text-foreground truncate">{incident.summary}</h1>
        )}
      </div>
    </div>
  );
}
