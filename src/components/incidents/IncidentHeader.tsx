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

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'SEV1': return 'bg-red-500';
    case 'SEV2': return 'bg-orange-500';
    case 'SEV3': return 'bg-yellow-500';
    default: return 'bg-gray-400';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return { bg: 'bg-blue-100', text: 'text-blue-700' };
    case 'in-progress': return { bg: 'bg-orange-100', text: 'text-orange-700' };
    case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    case 'resolved': return { bg: 'bg-green-100', text: 'text-green-700' };
    case 'closed': return { bg: 'bg-gray-100', text: 'text-gray-700' };
    case 'reopened': return { bg: 'bg-red-100', text: 'text-red-700' };
    case 'cancelled': return { bg: 'bg-gray-200', text: 'text-gray-600' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
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
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <Edit className="w-4 h-4" />
            <span className="text-sm font-medium">You are in edit mode. Changes are not saved until you click Save.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-8">
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} className="h-8 bg-brand-gold hover:bg-brand-gold-hover text-white">
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Incident Title */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Badge className="bg-brand-gold/10 text-brand-gold border-0 font-semibold">
            {incident.id}
          </Badge>
          <Badge className={cn(getSeverityColor(incident.severity || 'SEV3'), 'text-white border-0 font-semibold')}>
            {incident.severity || 'SEV3'}
          </Badge>
          <Badge className={cn(statusColors.bg, statusColors.text, 'border-0 font-medium capitalize')}>
            {incident.status.replace('-', ' ')}
          </Badge>
          {incident.isMajorIncident && (
            <Badge className="bg-red-500 text-white border-0 font-semibold">
              🚨 Major Incident
            </Badge>
          )}
        </div>
        
        {isEditMode ? (
          <Input
            value={editedSummary}
            onChange={(e) => onSummaryChange(e.target.value)}
            className="text-xl font-semibold h-auto py-2 border-brand-gold focus:ring-brand-gold"
            placeholder="Incident summary..."
          />
        ) : (
          <h1 className="text-[22px] font-semibold text-foreground">{incident.summary}</h1>
        )}
      </div>
    </div>
  );
}
