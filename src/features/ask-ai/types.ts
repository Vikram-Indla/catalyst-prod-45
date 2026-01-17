/**
 * Ask AI Module Types
 * Catalyst Platform | v9.8 Build
 */

// Message types
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: MessageContent;
  thinking?: string | null;
  confidence?: number | null;
  sources?: DataSource[];
  actions?: MessageAction[];
  createdAt: string;
}

export interface MessageContent {
  type: 'text' | 'rich';
  text?: string;
  components?: ResponseComponent[];
}

export interface DataSource {
  type: 'test_case' | 'defect' | 'requirement' | 'cycle' | 'release';
  id: string;
  name: string;
  link?: string;
}

// Response components
export type ResponseComponent =
  | TextComponent
  | MetricsCardComponent
  | ChartComponent
  | TableComponent
  | ActionButtonsComponent
  | AlertComponent;

export interface TextComponent {
  type: 'text';
  content: string;
  badge?: {
    label: string;
    variant: 'analysis' | 'insight' | 'recommendation' | 'warning' | 'action';
  };
}

export interface MetricsCardComponent {
  type: 'metrics_card';
  title: string;
  icon?: string;
  metrics: {
    value: string | number;
    label: string;
    variant?: 'default' | 'teal' | 'primary' | 'danger' | 'warning';
  }[];
}

export interface ChartComponent {
  type: 'chart';
  chartType: 'bar' | 'pie' | 'line' | 'donut';
  title: string;
  data: {
    labels: string[];
    values: number[];
    colors?: string[];
  };
}

export interface TableComponent {
  type: 'table';
  title?: string;
  columns: { key: string; label: string; align?: 'left' | 'center' | 'right' }[];
  rows: Record<string, any>[];
  maxRows?: number;
}

export interface ActionButtonsComponent {
  type: 'action_buttons';
  layout: 'vertical' | 'horizontal';
  buttons: {
    id: string;
    label: string;
    icon?: string;
    variant?: 'primary' | 'secondary';
    action: ActionDefinition;
  }[];
}

export interface AlertComponent {
  type: 'alert';
  variant: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
}

// Action types
export interface MessageAction {
  id: string;
  type: 'navigate' | 'create' | 'update' | 'execute' | 'export';
  label: string;
  icon?: string;
  definition: ActionDefinition;
}

export type ActionDefinition =
  | { type: 'navigate'; path: string; params?: Record<string, string> }
  | { type: 'create_test'; data: Record<string, any> }
  | { type: 'create_defect'; data: Record<string, any> }
  | { type: 'export_report'; format: 'pdf' | 'xlsx' | 'csv'; reportType: string }
  | { type: 'execute_query'; query: string };

// Conversation types
export interface Conversation {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  summary: string | null;
  context: ConversationContext;
  messageCount: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  preview?: string;
}

export interface ConversationContext {
  releaseId: string | null;
  cycleIds: string[];
  folderIds: string[];
  releaseName: string | null;
  cycleNames: string[];
  folderNames: string[];
}

// Context panel types
export interface ContextPanelData {
  activeRelease: {
    id: string;
    name: string;
    version: string;
    status: string;
    isSelected: boolean;
  } | null;
  
  testCycles: {
    id: string;
    name: string;
    progress: number;
    testCount: number;
    isSelected: boolean;
  }[];
  
  testFolders: {
    id: string;
    name: string;
    testCount: number;
    isSelected: boolean;
  }[];
}

// Quick action types
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

// Suggested question types
export interface SuggestedQuestion {
  id: string;
  text: string;
  category: string;
}
