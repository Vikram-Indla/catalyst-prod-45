export interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  mentionNotifications: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    includeContext: boolean;
  };
  assignmentNotifications: {
    enabled: boolean;
    cases: boolean;
    executions: boolean;
    cycles: boolean;
    frequency: 'immediate' | 'daily';
    threshold: number;
  };
  automationNotifications: {
    enabled: boolean;
    firstOnly: boolean;
    threshold: number;
    includeLogs: boolean;
    frequency: 'immediate' | 'hourly';
  };
  defectNotifications: {
    enabled: boolean;
    createdCases: boolean;
    executions: boolean;
    followedCases: boolean;
    priorityFilter: 'all' | 'critical_high';
  };
  cycleNotifications: {
    enabled: boolean;
    started: boolean;
    closed: boolean;
    scopeChanges: boolean;
  };
  reportNotifications: {
    enabled: boolean;
    scheduled: boolean;
    subscriptions: boolean;
    failed: boolean;
    format: 'inline' | 'attachment' | 'link';
  };
}

export interface EmailPreferences {
  digestMode: 'immediate' | 'daily' | 'weekly' | 'custom';
  digestTime: string;
  digestDay?: string;
  emailTemplate: 'plain' | 'html';
  includeLogo: boolean;
  includeSummary: boolean;
  includeLinks: boolean;
  signature?: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  dndEnabled: boolean;
  dndStartDate?: string;
  dndEndDate?: string;
  dndAutoReply?: string;
  maxEmailsPerDay: number;
  limitAction: 'stop' | 'summary';
  unsubscribedAll: boolean;
}

export interface ThemePreferences {
  themeMode: 'light' | 'dark' | 'auto';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large' | 'extra_large';
  density: 'compact' | 'comfortable' | 'spacious';
  sidebarDefault: 'collapsed' | 'expanded';
  sidebarAutoCollapse: boolean;
  sidebarWidth: 'narrow' | 'medium' | 'wide';
  animationsEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  reduceMotion: boolean;
}

export interface AppPreferences {
  defaultProjectId?: string;
  defaultFolderView: 'expanded' | 'collapsed' | 'remember';
  tableRowsPerPage: 10 | 25 | 50 | 100;
  tableDefaultSort: 'newest_first' | 'oldest_first' | 'alphabetical';
  tableShowRowNumbers: boolean;
  tableStickyHeaders: boolean;
  tableZebraStriping: boolean;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12-hour' | '24-hour';
  timeZone: string;
  gridDefaultColumns: string[];
  gridCellSize: 'small' | 'medium' | 'large';
  gridShowEvidence: boolean;
  gridShowDefects: boolean;
  gridHighlightFailed: boolean;
  autoSaveEnabled: boolean;
  autoSaveInterval: 30 | 60 | 300;
  warnUnsaved: boolean;
  keyboardShortcutsEnabled: boolean;
  language: string;
  highContrast: boolean;
  screenReaderOptimized: boolean;
  focusIndicators: 'enhanced' | 'normal';
  keyboardNavigation: 'enhanced' | 'normal';
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailNotificationsEnabled: true,
  mentionNotifications: { enabled: true, frequency: 'immediate', includeContext: true },
  assignmentNotifications: { enabled: true, cases: true, executions: true, cycles: true, frequency: 'immediate', threshold: 0 },
  automationNotifications: { enabled: true, firstOnly: true, threshold: 1, includeLogs: true, frequency: 'immediate' },
  defectNotifications: { enabled: true, createdCases: true, executions: true, followedCases: true, priorityFilter: 'all' },
  cycleNotifications: { enabled: true, started: true, closed: true, scopeChanges: true },
  reportNotifications: { enabled: true, scheduled: true, subscriptions: true, failed: true, format: 'attachment' },
};

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  digestMode: 'immediate',
  digestTime: '09:00',
  emailTemplate: 'html',
  includeLogo: true,
  includeSummary: true,
  includeLinks: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  dndEnabled: false,
  maxEmailsPerDay: 20,
  limitAction: 'stop',
  unsubscribedAll: false,
};

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  themeMode: 'light',
  accentColor: '#c69c6d',
  fontSize: 'medium',
  density: 'comfortable',
  sidebarDefault: 'expanded',
  sidebarAutoCollapse: false,
  sidebarWidth: 'medium',
  animationsEnabled: true,
  animationSpeed: 'normal',
  reduceMotion: false,
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  defaultFolderView: 'expanded',
  tableRowsPerPage: 25,
  tableDefaultSort: 'newest_first',
  tableShowRowNumbers: false,
  tableStickyHeaders: true,
  tableZebraStriping: true,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12-hour',
  timeZone: 'UTC',
  gridDefaultColumns: ['testers'],
  gridCellSize: 'medium',
  gridShowEvidence: true,
  gridShowDefects: true,
  gridHighlightFailed: true,
  autoSaveEnabled: true,
  autoSaveInterval: 60,
  warnUnsaved: true,
  keyboardShortcutsEnabled: true,
  language: 'en-US',
  highContrast: false,
  screenReaderOptimized: false,
  focusIndicators: 'normal',
  keyboardNavigation: 'normal',
};

export const ACCENT_COLOR_PRESETS = [
  { name: 'Catalyst Gold', value: '#c69c6d' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
];

export const TIME_ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];
