/**
 * Defect Configuration - Enterprise-grade defect tracking options
 */

export const DEFECT_TYPES = [
  { value: 'bug', label: 'Bug', icon: 'Bug', color: 'red' },
  { value: 'ui_issue', label: 'UI Issue', icon: 'Layout', color: 'orange' },
  { value: 'performance', label: 'Performance', icon: 'Zap', color: 'yellow' },
  { value: 'security', label: 'Security', icon: 'Shield', color: 'purple' },
  { value: 'data_issue', label: 'Data Issue', icon: 'Database', color: 'blue' },
  { value: 'integration', label: 'Integration', icon: 'Link', color: 'cyan' },
  { value: 'crash', label: 'Crash/Hang', icon: 'AlertTriangle', color: 'red' },
  { value: 'usability', label: 'Usability', icon: 'Users', color: 'green' },
] as const;

export const SEVERITY_LEVELS = [
  { value: 'blocker', label: 'Blocker', color: 'bg-red-700', description: 'System down, data loss' },
  { value: 'critical', label: 'Critical', color: 'bg-red-600', description: 'Major feature broken' },
  { value: 'major', label: 'Major', color: 'bg-orange-500', description: 'Feature impaired' },
  { value: 'minor', label: 'Minor', color: 'bg-blue-500', description: 'Minor inconvenience' },
  { value: 'trivial', label: 'Trivial', color: 'bg-gray-400', description: 'Cosmetic issue' },
] as const;

export const PRIORITY_LEVELS = [
  { value: 'blocker', label: 'P0 - Blocker', color: 'bg-red-700', description: 'Must fix immediately' },
  { value: 'critical', label: 'P1 - Critical', color: 'bg-red-500', description: 'Fix in current sprint' },
  { value: 'high', label: 'P2 - High', color: 'bg-orange-500', description: 'Fix soon' },
  { value: 'medium', label: 'P3 - Medium', color: 'bg-yellow-500', description: 'Normal priority' },
  { value: 'low', label: 'P4 - Low', color: 'bg-gray-400', description: 'Fix when possible' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-gray-500' },
  { value: 'open', label: 'Open', color: 'bg-blue-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'in_review', label: 'In Review', color: 'bg-purple-500' },
  { value: 'ready_for_test', label: 'Ready for Test', color: 'bg-cyan-500' },
  { value: 'in_testing', label: 'In Testing', color: 'bg-indigo-500' },
  { value: 'verified', label: 'Verified', color: 'bg-green-500' },
  { value: 'closed', label: 'Closed', color: 'bg-green-700' },
  { value: 'reopened', label: 'Reopened', color: 'bg-orange-600' },
  { value: 'deferred', label: 'Deferred', color: 'bg-gray-400' },
  { value: 'wont_fix', label: "Won't Fix", color: 'bg-gray-600' },
  { value: 'duplicate', label: 'Duplicate', color: 'bg-gray-500' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'always', label: 'Always (100%)' },
  { value: 'often', label: 'Often (>50%)' },
  { value: 'sometimes', label: 'Sometimes (25-50%)' },
  { value: 'rarely', label: 'Rarely (<25%)' },
  { value: 'once', label: 'Once' },
  { value: 'unknown', label: 'Unknown' },
] as const;

export const FOUND_DURING_OPTIONS = [
  { value: 'unit_testing', label: 'Unit Testing' },
  { value: 'integration_testing', label: 'Integration Testing' },
  { value: 'system_testing', label: 'System Testing' },
  { value: 'regression_testing', label: 'Regression Testing' },
  { value: 'smoke_testing', label: 'Smoke Testing' },
  { value: 'uat', label: 'User Acceptance Testing' },
  { value: 'exploratory', label: 'Exploratory Testing' },
  { value: 'production', label: 'Production' },
  { value: 'customer_report', label: 'Customer Report' },
  { value: 'code_review', label: 'Code Review' },
  { value: 'automation', label: 'Automated Testing' },
] as const;

export const OS_OPTIONS = [
  { value: 'windows_11', label: 'Windows 11' },
  { value: 'windows_10', label: 'Windows 10' },
  { value: 'macos_sonoma', label: 'macOS Sonoma' },
  { value: 'macos_ventura', label: 'macOS Ventura' },
  { value: 'ubuntu', label: 'Ubuntu Linux' },
  { value: 'ios_17', label: 'iOS 17' },
  { value: 'ios_16', label: 'iOS 16' },
  { value: 'android_14', label: 'Android 14' },
  { value: 'android_13', label: 'Android 13' },
] as const;

export const BROWSER_OPTIONS = [
  { value: 'chrome', label: 'Google Chrome' },
  { value: 'firefox', label: 'Mozilla Firefox' },
  { value: 'safari', label: 'Safari' },
  { value: 'edge', label: 'Microsoft Edge' },
  { value: 'opera', label: 'Opera' },
] as const;

export const DEVICE_OPTIONS = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile Phone' },
] as const;

export const ENVIRONMENT_OPTIONS = [
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: 'Production' },
] as const;

export const COMPONENTS = [
  'Authentication',
  'Dashboard',
  'Test Cases',
  'Test Cycles',
  'Test Execution',
  'Defects',
  'Reports',
  'Requirements',
  'Traceability',
  'Settings',
  'API',
  'Database',
  'Integration',
  'Notifications',
  'User Management',
] as const;

// Type exports
export type DefectType = typeof DEFECT_TYPES[number]['value'];
export type SeverityLevel = typeof SEVERITY_LEVELS[number]['value'];
export type PriorityLevel = typeof PRIORITY_LEVELS[number]['value'];
export type DefectStatus = typeof STATUS_OPTIONS[number]['value'];
export type Frequency = typeof FREQUENCY_OPTIONS[number]['value'];
export type FoundDuring = typeof FOUND_DURING_OPTIONS[number]['value'];
export type OperatingSystem = typeof OS_OPTIONS[number]['value'];
export type Browser = typeof BROWSER_OPTIONS[number]['value'];
export type DeviceType = typeof DEVICE_OPTIONS[number]['value'];
export type Environment = typeof ENVIRONMENT_OPTIONS[number]['value'];
