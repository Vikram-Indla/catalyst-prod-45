import { ArrowLeft, Edit, MoreVertical, Save, X, Check, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    <div className="border-b border-[#E8E8E8] bg-white">
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
            <Button size="sm" onClick={onSave} className="h-8 bg-[#C69C6D] hover:bg-[#B8894D] text-white">
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#F0F0F0]">
        <Link to="/release/incidents" className="flex items-center gap-1.5 text-[#8C8C8C] hover:text-[#C69C6D] text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Incidents
        </Link>
        <div className="flex-1" />
        
        {!isEditMode ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-[#E8E8E8]">
                  <MoreVertical className="w-4 h-4 mr-1.5" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white">
                <DropdownMenuItem>
                  <Check className="w-4 h-4 mr-2" />
                  Resolve Incident
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Escalate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Cancel Incident
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              size="sm" 
              onClick={onToggleEditMode}
              className="h-9 bg-[#C69C6D] hover:bg-[#B8894D] text-white"
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
          </>
        ) : null}
      </div>

      {/* Incident Title */}
      <div className="px-6 py-4">
        <div className="flex items-start gap-3 mb-3">
          <Badge className="bg-[#C69C6D]/10 text-[#C69C6D] border-0 font-semibold">
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
            className="text-xl font-semibold h-auto py-2 border-[#C69C6D] focus:ring-[#C69C6D]"
            placeholder="Incident summary..."
          />
        ) : (
          <h1 className="text-[22px] font-semibold text-[#172B4D]">{incident.summary}</h1>
        )}
      </div>
    </div>
  );
}
