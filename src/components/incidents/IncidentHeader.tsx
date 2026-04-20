import { Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Input } from '@/components/ui/input';
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
 * Severity → Lozenge appearance
 */
const getSeverityAppearance = (severity: string): LozengeAppearance => {
  switch (severity) {
    case 'SEV1': return 'removed';
    case 'SEV2': return 'moved';
    case 'SEV3': return 'default';
    default: return 'default';
  }
};

/**
 * Status → Lozenge appearance
 */
const getStatusAppearance = (status: string): LozengeAppearance => {
  switch (status) {
    case 'open': return 'removed';
    case 'in-progress': return 'inprogress';
    case 'pending': return 'moved';
    case 'resolved': return 'success';
    case 'closed': return 'default';
    case 'reopened': return 'removed';
    case 'cancelled': return 'default';
    default: return 'default';
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
          <Lozenge appearance="inprogress">
            {incident.id}
          </Lozenge>
          <Lozenge appearance={getSeverityAppearance(incident.severity || 'SEV3')}>
            {incident.severity || 'SEV3'}
          </Lozenge>
          <Lozenge appearance={getStatusAppearance(incident.status)}>
            {incident.status.replace('-', ' ')}
          </Lozenge>
          {incident.isMajorIncident && (
            <Lozenge appearance="removed">
              Major Incident
            </Lozenge>
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
