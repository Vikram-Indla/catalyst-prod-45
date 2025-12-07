import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/release/UserAvatar';
import { PriorityBadge } from '@/components/release/PriorityBadge';
import { Pause, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Incident, Assignee } from '@/types/release';

interface IncidentDetailsPanelProps {
  incident: Incident;
  isEditMode: boolean;
  editedData: Partial<Incident>;
  onFieldChange: (field: keyof Incident, value: any) => void;
  onStatusChange: (status: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: '#5E9CD3' },
  { value: 'in-progress', label: 'In Progress', color: '#FFA500' },
  { value: 'pending', label: 'Pending', color: '#FFD700' },
  { value: 'resolved', label: 'Resolved', color: '#4CAF50' },
  { value: 'closed', label: 'Closed', color: '#808080' },
  { value: 'reopened', label: 'Reopened', color: '#FF6347' },
  { value: 'cancelled', label: 'Cancelled', color: '#696969' },
];

const IMPACT_OPTIONS = ['high', 'medium', 'low'];
const URGENCY_OPTIONS = ['high', 'medium', 'low'];

const USERS: Assignee[] = [
  { id: 'u1', name: 'Ahmed Al-Rashid', initials: 'AA', email: 'ahmed@moi.gov.sa' },
  { id: 'u2', name: 'Sara Al-Fahad', initials: 'SF', email: 'sara@moi.gov.sa' },
  { id: 'u3', name: 'Mohammed Al-Hassan', initials: 'MH', email: 'm.hassan@moi.gov.sa' },
  { id: 'u4', name: 'Fatima Al-Zahra', initials: 'FZ', email: 'f.zahra@moi.gov.sa' },
  { id: 'u5', name: 'Omar Al-Qahtani', initials: 'OQ', email: 'o.qahtani@moi.gov.sa' },
];

const LABEL_SUGGESTIONS = ['critical', 'production', 'database', 'api', 'frontend', 'auth', 'performance', 'security'];

export function IncidentDetailsPanel({
  incident,
  isEditMode,
  editedData,
  onFieldChange,
  onStatusChange,
}: IncidentDetailsPanelProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const calculatePriority = (impact: string, urgency: string): 'critical' | 'high' | 'medium' | 'low' => {
    const matrix: Record<string, Record<string, 'critical' | 'high' | 'medium' | 'low'>> = {
      'high': { 'high': 'critical', 'medium': 'high', 'low': 'medium' },
      'medium': { 'high': 'high', 'medium': 'medium', 'low': 'low' },
      'low': { 'high': 'medium', 'medium': 'low', 'low': 'low' },
    };
    return matrix[impact]?.[urgency] || 'medium';
  };

  const currentStatus = editedData.status || incident.status;
  const currentImpact = editedData.impact || incident.impact;
  const currentUrgency = editedData.urgency || incident.urgency;
  const currentAssignee = editedData.assignee || incident.assignee;
  const currentLabels = editedData.labels || incident.labels || [];
  const calculatedPriority = calculatePriority(currentImpact, currentUrgency);

  const handleRemoveLabel = (label: string) => {
    onFieldChange('labels', currentLabels.filter(l => l !== label));
  };

  const handleAddLabel = (label: string) => {
    if (!currentLabels.includes(label)) {
      onFieldChange('labels', [...currentLabels, label]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Panel */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg p-4">
        <h4 className="text-[11px] font-semibold uppercase text-[#8C8C8C] mb-3">Status</h4>
        {isEditMode ? (
          <Select value={currentStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: opt.color }}
                    />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-3">
            <Badge 
              className={cn(
                "capitalize font-medium",
                currentStatus === 'open' && "bg-blue-100 text-blue-700",
                currentStatus === 'in-progress' && "bg-orange-100 text-orange-700",
                currentStatus === 'pending' && "bg-yellow-100 text-yellow-700",
                currentStatus === 'resolved' && "bg-green-100 text-green-700",
                currentStatus === 'closed' && "bg-gray-100 text-gray-700",
              )}
            >
              {currentStatus.replace('-', ' ')}
            </Badge>
            
            {/* Status Transition Buttons */}
            <div className="flex gap-2 mt-2">
              {currentStatus !== 'pending' && currentStatus !== 'resolved' && currentStatus !== 'closed' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => onStatusChange('pending')}
                >
                  <Pause className="w-3 h-3 mr-1" />
                  Pending
                </Button>
              )}
              {currentStatus !== 'resolved' && currentStatus !== 'closed' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  onClick={() => onStatusChange('resolved')}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Details Panel */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg p-4">
        <h4 className="text-[11px] font-semibold uppercase text-[#8C8C8C] mb-3">Details</h4>
        <div className="space-y-0">
          {/* Priority (calculated, read-only) */}
          <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]">
            <span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Priority</span>
            <PriorityBadge priority={calculatedPriority} />
          </div>

          {/* Impact */}
          <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]">
            <span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Impact</span>
            {isEditMode ? (
              <Select value={currentImpact} onValueChange={(v) => onFieldChange('impact', v)}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {IMPACT_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[13px] font-medium capitalize">{currentImpact}</span>
            )}
          </div>

          {/* Urgency */}
          <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]">
            <span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Urgency</span>
            {isEditMode ? (
              <Select value={currentUrgency} onValueChange={(v) => onFieldChange('urgency', v)}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {URGENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[13px] font-medium capitalize">{currentUrgency}</span>
            )}
          </div>

          {/* Assignee */}
          <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]">
            <span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Assignee</span>
            {isEditMode ? (
              <Select 
                value={currentAssignee?.id} 
                onValueChange={(v) => {
                  const user = USERS.find(u => u.id === v);
                  if (user) onFieldChange('assignee', user);
                }}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {USERS.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <UserAvatar initials={user.initials} size="sm" />
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <UserAvatar initials={currentAssignee.initials} size="sm" />
                <span className="text-[13px] font-medium">{currentAssignee.name}</span>
              </div>
            )}
          </div>

          {/* Reporter (read-only) */}
          <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]">
            <span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Reporter</span>
            <div className="flex items-center gap-2">
              <UserAvatar initials={incident.reporter.initials} size="sm" />
              <span className="text-[13px] font-medium">{incident.reporter.name}</span>
            </div>
          </div>

          {/* Component */}
          <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]">
            <span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Component</span>
            <span className="text-[13px] font-medium">{incident.component}</span>
          </div>

          {/* Created */}
          <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]">
            <span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Created</span>
            <span className="text-[13px] font-medium">{formatDate(incident.createdAt)}</span>
          </div>

          {/* Updated */}
          <div className="flex justify-between items-center py-2.5">
            <span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Updated</span>
            <span className="text-[13px] font-medium">{formatDate(incident.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg p-4">
        <h4 className="text-[11px] font-semibold uppercase text-[#8C8C8C] mb-3">Labels</h4>
        <div className="flex flex-wrap gap-1.5">
          {currentLabels.map(label => (
            <Badge 
              key={label} 
              variant="secondary" 
              className="bg-[#F0F0F0] text-[#5C5C5C] text-xs font-medium"
            >
              {label}
              {isEditMode && (
                <button
                  onClick={() => handleRemoveLabel(label)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
          {currentLabels.length === 0 && !isEditMode && (
            <span className="text-[13px] text-[#8C8C8C]">No labels</span>
          )}
        </div>
        {isEditMode && (
          <div className="mt-2 flex flex-wrap gap-1">
            {LABEL_SUGGESTIONS.filter(l => !currentLabels.includes(l)).slice(0, 4).map(label => (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-[#8C8C8C] hover:text-[#C69C6D]"
                onClick={() => handleAddLabel(label)}
              >
                + {label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
