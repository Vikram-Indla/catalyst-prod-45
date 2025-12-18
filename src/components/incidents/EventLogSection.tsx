import { useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRightCircle, 
  User, 
  Layers,
  Timer,
  Activity,
  FileText,
  Edit
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Incident, IncidentHistory, SlaRecord } from '@/types/incident';

type EventType = 
  | 'created' 
  | 'status_change' 
  | 'support_level_change'
  | 'testing_status_change'
  | 'sla_start' 
  | 'sla_breach_response'
  | 'sla_breach_resolution'
  | 'sla_met_response'
  | 'sla_met_resolution'
  | 'converted'
  | 'approval_action'
  | 'field_update';

interface EventLogEntry {
  id: string;
  type: EventType;
  timestamp: string;
  description: string;
  actor?: string;
  metadata?: Record<string, string>;
  isBreach?: boolean;
}

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  created: <Activity className="h-3.5 w-3.5" />,
  status_change: <Layers className="h-3.5 w-3.5" />,
  support_level_change: <User className="h-3.5 w-3.5" />,
  testing_status_change: <CheckCircle className="h-3.5 w-3.5" />,
  sla_start: <Timer className="h-3.5 w-3.5" />,
  sla_breach_response: <AlertTriangle className="h-3.5 w-3.5" />,
  sla_breach_resolution: <AlertTriangle className="h-3.5 w-3.5" />,
  sla_met_response: <CheckCircle className="h-3.5 w-3.5" />,
  sla_met_resolution: <CheckCircle className="h-3.5 w-3.5" />,
  converted: <ArrowRightCircle className="h-3.5 w-3.5" />,
  approval_action: <FileText className="h-3.5 w-3.5" />,
  field_update: <Edit className="h-3.5 w-3.5" />,
};

const EVENT_COLORS: Record<EventType, string> = {
  created: 'text-blue-600 bg-blue-100',
  status_change: 'text-purple-600 bg-purple-100',
  support_level_change: 'text-indigo-600 bg-indigo-100',
  testing_status_change: 'text-teal-600 bg-teal-100',
  sla_start: 'text-gray-600 bg-gray-100',
  sla_breach_response: 'text-red-600 bg-red-100',
  sla_breach_resolution: 'text-red-600 bg-red-100',
  sla_met_response: 'text-green-600 bg-green-100',
  sla_met_resolution: 'text-green-600 bg-green-100',
  converted: 'text-teal-600 bg-teal-100',
  approval_action: 'text-orange-600 bg-orange-100',
  field_update: 'text-gray-600 bg-gray-100',
};

function buildEventLog(incident: Incident): EventLogEntry[] {
  const events: EventLogEntry[] = [];

  // Created event
  events.push({
    id: 'created',
    type: 'created',
    timestamp: incident.created_at,
    description: `Incident created`,
    actor: incident.reporter?.full_name || incident.reporter_name,
  });

  // SLA events from sla record
  if (incident.sla) {
    const sla = incident.sla;
    
    // Response SLA met
    if (sla.response_met_at) {
      events.push({
        id: 'sla_response_met',
        type: 'sla_met_response',
        timestamp: sla.response_met_at,
        description: 'Response SLA met',
      });
    } else if (sla.response_breached) {
      events.push({
        id: 'sla_response_breach',
        type: 'sla_breach_response',
        timestamp: sla.response_due_at,
        description: 'Response SLA breached',
        isBreach: true,
      });
    }

    // Resolution SLA met
    if (sla.resolution_met_at) {
      events.push({
        id: 'sla_resolution_met',
        type: 'sla_met_resolution',
        timestamp: sla.resolution_met_at,
        description: 'Resolution SLA met',
      });
    } else if (sla.resolution_breached) {
      events.push({
        id: 'sla_resolution_breach',
        type: 'sla_breach_resolution',
        timestamp: sla.resolution_due_at,
        description: 'Resolution SLA breached',
        isBreach: true,
      });
    }
  }

  // History events - filter to key fields
  const importantFields = ['status', 'support_level', 'testing_status', 'severity', 'priority', 'assignee_id'];
  
  if (incident.history) {
    incident.history.forEach((h) => {
      if (importantFields.includes(h.field_name)) {
        let type: EventType = 'field_update';
        if (h.field_name === 'status') type = 'status_change';
        if (h.field_name === 'support_level') type = 'support_level_change';
        if (h.field_name === 'testing_status') type = 'testing_status_change';

        events.push({
          id: h.id,
          type,
          timestamp: h.changed_at,
          description: `${formatFieldName(h.field_name)}: ${h.old_value || '(empty)'} → ${h.new_value}`,
          actor: h.changer?.full_name,
        });
      }
    });
  }

  // Conversion event
  if (incident.converted_at) {
    events.push({
      id: 'converted',
      type: 'converted',
      timestamp: incident.converted_at,
      description: `Converted to ${incident.converted_to_type?.replace('_', ' ')}`,
    });
  }

  // Committee votes
  if (incident.committee?.members) {
    incident.committee.members.forEach((m) => {
      if (m.vote?.voted_at) {
        events.push({
          id: `vote_${m.id}`,
          type: 'approval_action',
          timestamp: m.vote.voted_at,
          description: `${m.user?.full_name} ${m.vote.vote}`,
          actor: m.user?.full_name,
          metadata: { vote: m.vote.vote },
        });
      }
    });
  }

  // Sort by timestamp descending
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function formatFieldName(field: string): string {
  return field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

interface EventLogSectionProps {
  incident: Incident;
  maxHeight?: string;
}

export function EventLogSection({ incident, maxHeight = '300px' }: EventLogSectionProps) {
  const events = useMemo(() => buildEventLog(incident), [incident]);

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-4 text-center">
        No events recorded
      </p>
    );
  }

  return (
    <div className="space-y-1" style={{ maxHeight, overflowY: 'auto' }}>
      {events.map((event) => (
        <div 
          key={event.id}
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded text-xs",
            event.isBreach && "bg-red-50"
          )}
        >
          <div className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
            EVENT_COLORS[event.type]
          )}>
            {EVENT_ICONS[event.type]}
          </div>
          <span className="flex-1 text-foreground truncate">
            {event.description}
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
            {format(new Date(event.timestamp), 'MMM d, HH:mm')}
          </span>
        </div>
      ))}
    </div>
  );
}
