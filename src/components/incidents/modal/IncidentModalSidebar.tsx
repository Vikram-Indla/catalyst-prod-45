import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import type { Incident } from '@/types/release';

interface IncidentModalSidebarProps {
  incident: Incident;
  onFieldChange: (field: keyof Incident, value: unknown) => void;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'OPEN' },
  { value: 'in-progress', label: 'IN PROGRESS' },
  { value: 'pending', label: 'PENDING' },
  { value: 'resolved', label: 'RESOLVED' },
  { value: 'closed', label: 'CLOSED' },
];

export function IncidentModalSidebar({ incident, onFieldChange }: IncidentModalSidebarProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === incident.status)?.label || 'IN BETA';

  return (
    <div 
      className="w-[280px] border-l border-[#DFE1E6] overflow-y-auto shrink-0"
      style={{ fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif' }}
    >
      <div className="p-4">
        {/* Status Button */}
        <div className="relative mb-4">
          <button 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold uppercase border border-[#DFE1E6] bg-white text-[#172B4D] hover:bg-[#F4F5F7]"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
          >
            {currentStatus}
            <ChevronDown className="w-4 h-4" />
          </button>

          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#DFE1E6] rounded shadow-lg z-10 min-w-[160px]">
              {STATUS_OPTIONS.map((status) => (
                <div
                  key={status.value}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-[#F4F5F7] ${
                    incident.status === status.value ? 'bg-[#DEEBFF] text-[#0052CC]' : 'text-[#172B4D]'
                  }`}
                  onClick={() => {
                    onFieldChange('status', status.value);
                    setIsStatusOpen(false);
                  }}
                >
                  {status.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div 
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#42526E] cursor-pointer hover:text-[#172B4D] mt-2 mb-3"
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
        >
          {isDetailsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          Details
        </div>

        {isDetailsExpanded && (
          <div className="space-y-4">
            {/* Release Version */}
            <div>
              <div className="text-[11px] text-[#42526E] mb-1">Release version</div>
              <div 
                className="text-sm text-[#172B4D] p-1.5 -mx-1.5 rounded border-2 border-transparent hover:bg-[#F4F5F7] hover:border-[#DFE1E6] cursor-text focus-within:border-[#C69C6D] focus-within:shadow-[0_0_0_2px_#C69C6D] focus-within:bg-white"
                contentEditable
                suppressContentEditableWarning
              >
                {incident.releaseVersion || 'Release 2 - Sectorial'}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <div className="text-[11px] text-[#42526E] mb-1">Assignee</div>
              <div className="flex items-center gap-2 p-1.5 -mx-1.5 rounded border-2 border-transparent hover:bg-[#F4F5F7] hover:border-[#DFE1E6] cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-[10px] font-medium flex items-center justify-center">
                  {incident.assignee?.initials || 'RA'}
                </div>
                <span className="text-sm text-[#172B4D]">{incident.assignee?.name || 'Rahaf Alhejaili'}</span>
              </div>
              <a className="text-sm text-[#0052CC] hover:underline cursor-pointer mt-1 inline-block">
                Assign to me
              </a>
            </div>

            {/* Reporter */}
            <div>
              <div className="text-[11px] text-[#42526E] mb-1">Reporter</div>
              <div className="flex items-center gap-2 p-1.5 -mx-1.5 rounded border-2 border-transparent hover:bg-[#F4F5F7] hover:border-[#DFE1E6] cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-[10px] font-medium flex items-center justify-center">
                  {incident.reporter?.initials || 'VI'}
                </div>
                <span className="text-sm text-[#172B4D]">{incident.reporter?.name || 'vikram indla'}</span>
              </div>
            </div>

            {/* Labels */}
            <div>
              <div className="text-[11px] text-[#42526E] mb-1">Labels</div>
              <div className="text-sm text-[#172B4D] p-1.5 -mx-1.5 rounded border-2 border-transparent hover:bg-[#F4F5F7] hover:border-[#DFE1E6] cursor-pointer">
                {incident.labels?.length ? incident.labels.join(', ') : 'None'}
              </div>
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="mt-6 text-[11px] text-[#42526E] space-y-1">
          <p>Created {formatDate(incident.createdAt)}</p>
          <p>Updated {formatDate(incident.updatedAt)}</p>
        </div>

        {/* Configure Link */}
        <a className="flex items-center gap-1 text-[11px] text-[#42526E] hover:text-[#0052CC] mt-4 cursor-pointer">
          <Settings className="w-3 h-3" />
          Configure
        </a>
      </div>
    </div>
  );
}
