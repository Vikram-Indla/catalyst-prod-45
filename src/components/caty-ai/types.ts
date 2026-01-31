// ============================================================================
// CATY AI TYPES
// Type definitions for the Caty AI chatbot widget
// Target: Capacity Planner integration
// ============================================================================

export interface CatyMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isHtml?: boolean;
}

export interface CatySession {
  id: string;
  created: string;
  updated: string;
  context: CatyContext;
  messages: CatyMessage[];
}

export interface CatyContext {
  department: string;
  period: string;
  view: string;
}
