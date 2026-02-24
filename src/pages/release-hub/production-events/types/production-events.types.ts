export type PcEventType = 'feature' | 'incident' | 'improvement' | 'security' | 'performance';
export type PcPeriodType = 'weekly' | 'monthly' | 'quarterly';

export interface PcEventTicket {
  ticketKey: string;
  summary: string | null;
  type: string | null;
  fixVersion: string | null;
  changeNumber: string | null;
}

export interface PcEvent {
  id: string;
  event_number: number;
  event_title: string;
  event_description: string | null;
  investor_impact: string | null;
  event_type: PcEventType;
  source_epic_key: string | null;
  source_epic_summary: string | null;
  linked_release_versions: string[];
  linked_change_numbers: string[];
  deployment_date: string;
  period_type: PcPeriodType;
  period_start: string;
  period_end: string;
  status: 'active' | 'rolled_back';
  is_pinned: boolean;
  narrative_version: number;
  ticket_details: PcEventTicket[];
  linked_ticket_count: number;
}

export interface PcPeriodSummary {
  id: string;
  period_type: PcPeriodType;
  period_start: string;
  period_end: string;
  summary_text: string;
  event_count: number;
  feature_count: number;
  incident_count: number;
  improvement_count: number;
  security_count: number;
  performance_count: number;
}
