// Seeded data for Global Search Command Palette
// 40+ work items across types and scopes

export type GlobalSearchWorkItemType = 
  | 'business-request' 
  | 'epic' 
  | 'feature' 
  | 'story' 
  | 'incident' 
  | 'task'
  | 'defect';

export type ScopeType = 'project' | 'program' | 'product' | 'department';

export type LastActionType = 'viewed' | 'worked' | 'updated';

export interface GlobalSearchItem {
  id: string;
  key: string;
  summary: string;
  type: GlobalSearchWorkItemType;
  scopeType: ScopeType;
  scopeName: string;
  lastActionType: LastActionType;
  lastActionAt: Date;
}

// Helper to create dates relative to now
const hoursAgo = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Seeded work items - 45 items across types and scopes
export const globalSearchItems: GlobalSearchItem[] = [
  // Business Requests (10 items)
  { id: '1', key: 'BR-1001', summary: 'Industrial License Renewal Process Optimization', type: 'business-request', scopeType: 'department', scopeName: 'License Dept', lastActionType: 'viewed', lastActionAt: hoursAgo(2) },
  { id: '2', key: 'BR-1002', summary: 'Digital Transformation Initiative Phase 2', type: 'business-request', scopeType: 'department', scopeName: 'Digital Transformation', lastActionType: 'worked', lastActionAt: hoursAgo(6) },
  { id: '3', key: 'BR-1003', summary: 'Customs Integration Enhancement', type: 'business-request', scopeType: 'department', scopeName: 'Customs', lastActionType: 'updated', lastActionAt: hoursAgo(12) },
  { id: '4', key: 'BR-1004', summary: 'Strategy Dashboard Requirements', type: 'business-request', scopeType: 'department', scopeName: 'Strategy', lastActionType: 'viewed', lastActionAt: daysAgo(1) },
  { id: '5', key: 'BR-1005', summary: 'Compliance Reporting Automation', type: 'business-request', scopeType: 'department', scopeName: 'License Dept', lastActionType: 'worked', lastActionAt: daysAgo(2) },
  { id: '6', key: 'BR-1006', summary: 'Mobile App Feature Request - Notifications', type: 'business-request', scopeType: 'product', scopeName: 'Industry', lastActionType: 'updated', lastActionAt: daysAgo(3) },
  { id: '7', key: 'BR-1007', summary: 'API Gateway Performance Improvement', type: 'business-request', scopeType: 'department', scopeName: 'Digital Transformation', lastActionType: 'viewed', lastActionAt: daysAgo(5) },
  { id: '8', key: 'BR-1008', summary: 'User Authentication Enhancement', type: 'business-request', scopeType: 'department', scopeName: 'Strategy', lastActionType: 'worked', lastActionAt: daysAgo(7) },
  { id: '9', key: 'BR-1009', summary: 'Report Generation Speed Optimization', type: 'business-request', scopeType: 'product', scopeName: 'Industry', lastActionType: 'updated', lastActionAt: daysAgo(10) },
  { id: '10', key: 'BR-1010', summary: 'Data Migration from Legacy System', type: 'business-request', scopeType: 'department', scopeName: 'Customs', lastActionType: 'viewed', lastActionAt: daysAgo(14) },

  // Epics (8 items)
  { id: '11', key: 'E-101', summary: 'Performance Review Module', type: 'epic', scopeType: 'program', scopeName: 'Innovation Platform', lastActionType: 'worked', lastActionAt: hoursAgo(1) },
  { id: '12', key: 'E-102', summary: 'Industrial Scanning Enhancements', type: 'epic', scopeType: 'program', scopeName: 'Senaei Program', lastActionType: 'viewed', lastActionAt: hoursAgo(4) },
  { id: '13', key: 'E-103', summary: 'Contract Management System', type: 'epic', scopeType: 'program', scopeName: 'Innovation Platform', lastActionType: 'updated', lastActionAt: daysAgo(1) },
  { id: '14', key: 'E-104', summary: 'Investor Portal Redesign', type: 'epic', scopeType: 'program', scopeName: 'ICP Program', lastActionType: 'worked', lastActionAt: daysAgo(2) },
  { id: '15', key: 'E-105', summary: 'Notification Service Upgrade', type: 'epic', scopeType: 'program', scopeName: 'Senaei Program', lastActionType: 'viewed', lastActionAt: daysAgo(4) },
  { id: '16', key: 'E-106', summary: 'Analytics Dashboard v2', type: 'epic', scopeType: 'program', scopeName: 'Innovation Platform', lastActionType: 'updated', lastActionAt: daysAgo(6) },
  { id: '17', key: 'E-107', summary: 'Multi-language Support', type: 'epic', scopeType: 'program', scopeName: 'ICP Program', lastActionType: 'worked', lastActionAt: daysAgo(8) },
  { id: '18', key: 'E-108', summary: 'Security Audit Implementation', type: 'epic', scopeType: 'program', scopeName: 'Senaei Program', lastActionType: 'viewed', lastActionAt: daysAgo(12) },

  // Features (8 items)
  { id: '19', key: 'F-201', summary: 'Auto-save Draft Functionality', type: 'feature', scopeType: 'project', scopeName: 'IP Implementation', lastActionType: 'viewed', lastActionAt: hoursAgo(3) },
  { id: '20', key: 'F-202', summary: 'Bulk Export to Excel', type: 'feature', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: hoursAgo(8) },
  { id: '21', key: 'F-203', summary: 'Advanced Search Filters', type: 'feature', scopeType: 'project', scopeName: 'ICP Project', lastActionType: 'updated', lastActionAt: daysAgo(1) },
  { id: '22', key: 'F-204', summary: 'Real-time Collaboration', type: 'feature', scopeType: 'project', scopeName: 'IP Implementation', lastActionType: 'viewed', lastActionAt: daysAgo(3) },
  { id: '23', key: 'F-205', summary: 'Custom Report Builder', type: 'feature', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: daysAgo(5) },
  { id: '24', key: 'F-206', summary: 'Email Template Editor', type: 'feature', scopeType: 'project', scopeName: 'ICP Project', lastActionType: 'updated', lastActionAt: daysAgo(7) },
  { id: '25', key: 'F-207', summary: 'Role-based Access Control', type: 'feature', scopeType: 'project', scopeName: 'IP Implementation', lastActionType: 'viewed', lastActionAt: daysAgo(9) },
  { id: '26', key: 'F-208', summary: 'Audit Trail Enhancement', type: 'feature', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: daysAgo(11) },

  // Stories (10 items)
  { id: '27', key: 'BAU-4408', summary: 'Update landing page hero section', type: 'story', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: hoursAgo(1) },
  { id: '28', key: 'IP-527', summary: 'Innovator profile completion flow', type: 'story', scopeType: 'project', scopeName: 'IP Implementation', lastActionType: 'viewed', lastActionAt: hoursAgo(5) },
  { id: '29', key: 'ICP-301', summary: 'Invoice attachment upload validation', type: 'story', scopeType: 'project', scopeName: 'ICP Project', lastActionType: 'updated', lastActionAt: hoursAgo(10) },
  { id: '30', key: 'BAU-4409', summary: 'Fix date picker timezone issue', type: 'story', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: daysAgo(1) },
  { id: '31', key: 'IP-528', summary: 'Partner dashboard metrics cards', type: 'story', scopeType: 'project', scopeName: 'IP Implementation', lastActionType: 'viewed', lastActionAt: daysAgo(2) },
  { id: '32', key: 'ICP-302', summary: 'Solution bundle pricing display', type: 'story', scopeType: 'project', scopeName: 'ICP Project', lastActionType: 'updated', lastActionAt: daysAgo(4) },
  { id: '33', key: 'BAU-4410', summary: 'Industrial scan form validation', type: 'story', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: daysAgo(6) },
  { id: '34', key: 'IP-529', summary: 'Evaluation criteria tooltips', type: 'story', scopeType: 'project', scopeName: 'IP Implementation', lastActionType: 'viewed', lastActionAt: daysAgo(8) },
  { id: '35', key: 'ICP-303', summary: 'Contract status badge component', type: 'story', scopeType: 'project', scopeName: 'ICP Project', lastActionType: 'updated', lastActionAt: daysAgo(10) },
  { id: '36', key: 'BAU-4411', summary: 'SMS notification template update', type: 'story', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: daysAgo(15) },

  // Incidents (5 items)
  { id: '37', key: 'INC-001', summary: 'Production API Gateway Down', type: 'incident', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: hoursAgo(0.5) },
  { id: '38', key: 'INC-002', summary: 'Login Service Degradation', type: 'incident', scopeType: 'project', scopeName: 'IP Implementation', lastActionType: 'viewed', lastActionAt: hoursAgo(3) },
  { id: '39', key: 'INC-003', summary: 'Database Connection Pool Exhausted', type: 'incident', scopeType: 'project', scopeName: 'ICP Project', lastActionType: 'updated', lastActionAt: daysAgo(2) },
  { id: '40', key: 'INC-004', summary: 'Email Delivery Failure', type: 'incident', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: daysAgo(5) },
  { id: '41', key: 'INC-005', summary: 'SSL Certificate Expiry Warning', type: 'incident', scopeType: 'project', scopeName: 'IP Implementation', lastActionType: 'viewed', lastActionAt: daysAgo(7) },

  // Tasks (4 items)
  { id: '42', key: 'CAT-001', summary: 'Update API documentation', type: 'task', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: hoursAgo(2) },
  { id: '43', key: 'CAT-002', summary: 'Review PR for feature branch', type: 'task', scopeType: 'project', scopeName: 'IP Implementation', lastActionType: 'viewed', lastActionAt: daysAgo(1) },
  { id: '44', key: 'CAT-003', summary: 'Setup staging environment', type: 'task', scopeType: 'project', scopeName: 'ICP Project', lastActionType: 'updated', lastActionAt: daysAgo(3) },
  { id: '45', key: 'CAT-004', summary: 'Database backup verification', type: 'task', scopeType: 'project', scopeName: 'Senaei BAU', lastActionType: 'worked', lastActionAt: daysAgo(6) },
];

// Get recent items sorted by lastActionAt
export function getRecentSearchItems(limit: number = 8): GlobalSearchItem[] {
  return [...globalSearchItems]
    .sort((a, b) => b.lastActionAt.getTime() - a.lastActionAt.getTime())
    .slice(0, limit);
}

// Search items with prioritized matching
export function searchGlobalItems(query: string): GlobalSearchItem[] {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  // Separate results by match type for prioritization
  const exactKeyMatches: GlobalSearchItem[] = [];
  const prefixKeyMatches: GlobalSearchItem[] = [];
  const summaryMatches: GlobalSearchItem[] = [];
  const scopeMatches: GlobalSearchItem[] = [];
  
  globalSearchItems.forEach(item => {
    const key = item.key.toLowerCase();
    const summary = item.summary.toLowerCase();
    const scope = item.scopeName.toLowerCase();
    
    // Exact key match (highest priority)
    if (key === normalizedQuery) {
      exactKeyMatches.push(item);
    }
    // Partial key match (e.g., "4408" matches "BAU-4408", "BAU-44" matches "BAU-4408")
    else if (key.startsWith(normalizedQuery) || key.includes(normalizedQuery)) {
      prefixKeyMatches.push(item);
    }
    // Summary match
    else if (summary.includes(normalizedQuery)) {
      summaryMatches.push(item);
    }
    // Scope/project name match
    else if (scope.includes(normalizedQuery)) {
      scopeMatches.push(item);
    }
  });
  
  // Combine results in priority order
  return [
    ...exactKeyMatches,
    ...prefixKeyMatches,
    ...summaryMatches,
    ...scopeMatches,
  ].slice(0, 20);
}

// Format elapsed time for display
export function formatElapsedTime(date: Date, actionType: LastActionType): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const actionVerb = actionType === 'viewed' ? 'viewed' 
    : actionType === 'worked' ? 'worked on' 
    : 'updated';
  
  if (diffMins < 60) {
    return `You ${actionVerb} ${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `You ${actionVerb} ${diffHours}h ago`;
  } else if (diffDays === 1) {
    return `You ${actionVerb} yesterday`;
  } else {
    return `You ${actionVerb} ${diffDays}d ago`;
  }
}

// Get work item type label
export function getSearchItemTypeLabel(type: GlobalSearchWorkItemType): string {
  const labels: Record<GlobalSearchWorkItemType, string> = {
    'business-request': 'Business Request',
    'epic': 'Epic',
    'feature': 'Feature',
    'story': 'Story',
    'incident': 'Incident',
    'task': 'Task',
    'defect': 'Defect',
  };
  return labels[type];
}
