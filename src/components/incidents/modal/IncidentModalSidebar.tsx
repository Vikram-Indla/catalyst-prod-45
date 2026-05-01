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
      className="w-[280px] border-l border-border overflow-y-auto shrink-0 bg-card"
    >
      <div className="p-4">
        {/* Status Button */}
        <div className="relative mb-4">
          <button 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold uppercase border border-border bg-card text-foreground hover:bg-muted"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
          >
            {currentStatus}
            <ChevronDown className="w-4 h-4" />
          </button>

          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded shadow-lg z-10 min-w-[160px]">
              {STATUS_OPTIONS.map((status) => (
                <div
                  key={status.value}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                    incident.status === status.value ? 'bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]/10 text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]' : 'text-foreground'
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
          className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground mt-2 mb-3"
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
        >
          {isDetailsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          Details
        </div>

        {isDetailsExpanded && (
          <div className="space-y-4">
            {/* Release Version */}
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Release version</div>
              <div 
                className="text-sm text-foreground p-1.5 -mx-1.5 rounded border-2 border-transparent hover:bg-muted hover:border-border cursor-text focus-within:border-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] focus-within:shadow-[0_0_0_2px_rgba(37,99,235,0.3)] focus-within:bg-card"
                contentEditable
                suppressContentEditableWarning
              >
                {incident.releaseVersion || 'Release 2 - Sectorial'}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Assignee</div>
              <div className="flex items-center gap-2 p-1.5 -mx-1.5 rounded border-2 border-transparent hover:bg-muted hover:border-border cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-gray-500 dark:bg-gray-600 text-white text-[10px] font-medium flex items-center justify-center">
                  {incident.assignee?.initials || 'RA'}
                </div>
                <span className="text-sm text-foreground">{incident.assignee?.name || 'Rahaf Alhejaili'}</span>
              </div>
              <a className="text-sm text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] dark:text-[var(--ds-text-brand,var(--ds-text-brand, #60a5fa))] hover:underline cursor-pointer mt-1 inline-block">
                Assign to me
              </a>
            </div>

            {/* Reporter */}
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Reporter</div>
              <div className="flex items-center gap-2 p-1.5 -mx-1.5 rounded border-2 border-transparent hover:bg-muted hover:border-border cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-gray-500 dark:bg-gray-600 text-white text-[10px] font-medium flex items-center justify-center">
                  {incident.reporter?.initials || 'VI'}
                </div>
                <span className="text-sm text-foreground">{incident.reporter?.name || 'vikram indla'}</span>
              </div>
            </div>

            {/* Labels */}
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Labels</div>
              <div className="text-sm text-foreground p-1.5 -mx-1.5 rounded border-2 border-transparent hover:bg-muted hover:border-border cursor-pointer">
                {incident.labels?.length ? incident.labels.join(', ') : 'None'}
              </div>
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="mt-6 text-[11px] text-muted-foreground space-y-1">
          <p>Created {formatDate(incident.createdAt)}</p>
          <p>Updated {formatDate(incident.updatedAt)}</p>
        </div>

        {/* Configure Link */}
        <a className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] mt-4 cursor-pointer">
          <Settings className="w-3 h-3" />
          Configure
        </a>
      </div>
    </div>
  );
}
