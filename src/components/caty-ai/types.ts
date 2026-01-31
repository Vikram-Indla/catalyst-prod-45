/**
 * Caty AI V7 — Types
 */

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
  location?: string; // "On-Site" | "Off-Shore" | "All"
}
