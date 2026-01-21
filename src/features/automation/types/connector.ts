/**
 * Module 5A-1: Automation Framework Connectors - Types
 */

// Connector types
export type ConnectorType = 
  | 'selenium' 
  | 'cypress' 
  | 'playwright' 
  | 'junit' 
  | 'testng' 
  | 'pytest' 
  | 'jest' 
  | 'mocha' 
  | 'custom';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'unknown';

// Connector configuration per type
export interface SeleniumConfig {
  gridUrl?: string;
  browser?: string;
  version?: string;
}

export interface CypressConfig {
  projectPath?: string;
  specPattern?: string;
}

export interface PlaywrightConfig {
  projectPath?: string;
  browser?: 'chromium' | 'firefox' | 'webkit';
}

export interface JUnitConfig {
  reportPath?: string;
  xmlFormat?: 'junit' | 'surefire';
}

export type ConnectorConfig = SeleniumConfig | CypressConfig | PlaywrightConfig | JUnitConfig | Record<string, unknown>;

// Automation connector
export interface AutomationConnector {
  id: string;
  name: string;
  connector_type: ConnectorType;
  config: ConnectorConfig;
  webhook_url: string | null;
  is_active: boolean;
  connection_status: ConnectionStatus;
  last_connected_at: string | null;
  created_at: string;
  stats: {
    total_imports: number;
    last_import: string | null;
  };
}

// Connector type config
export const CONNECTOR_TYPE_CONFIG: Record<ConnectorType, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  selenium: { label: 'Selenium', icon: '🌐', color: 'hsl(var(--teal))', description: 'Browser automation framework' },
  cypress: { label: 'Cypress', icon: '🌲', color: 'hsl(var(--primary))', description: 'Modern E2E testing' },
  playwright: { label: 'Playwright', icon: '🎭', color: 'hsl(var(--primary))', description: 'Cross-browser automation' },
  junit: { label: 'JUnit', icon: '☕', color: 'hsl(var(--warning))', description: 'Java unit testing' },
  testng: { label: 'TestNG', icon: '☕', color: 'hsl(var(--warning))', description: 'Java testing framework' },
  pytest: { label: 'pytest', icon: '🐍', color: 'hsl(var(--teal))', description: 'Python testing' },
  jest: { label: 'Jest', icon: '🃏', color: 'hsl(var(--destructive))', description: 'JavaScript testing' },
  mocha: { label: 'Mocha', icon: '☕', color: 'hsl(var(--accent))', description: 'Node.js testing' },
  custom: { label: 'Custom', icon: '⚙️', color: 'hsl(var(--muted-foreground))', description: 'Custom integration' }
};

// Connection status config
export const CONNECTION_STATUS_CONFIG: Record<ConnectionStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  connected: { label: 'Connected', variant: 'default' },
  disconnected: { label: 'Disconnected', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },
  unknown: { label: 'Unknown', variant: 'outline' }
};
