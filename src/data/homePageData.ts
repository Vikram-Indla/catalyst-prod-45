import { WorkItemType } from '@/components/ja/icons/WorkItemTypeIcon';

export interface Project {
  id: string;
  key: string;
  name: string;
  type: string;
  color: string;
  openCount: number;
  doneCount: number;
  boardsCount: number;
}

export interface ActivityItem {
  key: string;
  id: string;
  summary: string;
  project: string;
  projectKey: string;
  updated: string;
  status: string;
  type: WorkItemType;
  assignee: string;
  activityDate: Date;
  activityType: 'Updated' | 'Created';
}

// Projects from catalyst.xlsx - Using Catalyst brand and Golden Hour secondary palette
export const projects: Project[] = [
  { 
    id: '1', 
    key: 'BAU', 
    name: 'Senaei BAU', 
    type: 'Company-managed software', 
    color: '#C69C6D', // Brand Gold
    openCount: 79,
    doneCount: 53,
    boardsCount: 2 
  },
  { 
    id: '2', 
    key: 'ICP', 
    name: 'ICP Project', 
    type: 'Company-managed software', 
    color: '#8b7355', // Golden Hour - Bronze
    openCount: 35,
    doneCount: 14,
    boardsCount: 1 
  },
  { 
    id: '3', 
    key: 'IP', 
    name: 'IP Implementation', 
    type: 'Company-managed software', 
    color: '#5c7c5c', // Golden Hour - Olive Green
    openCount: 56,
    doneCount: 0,
    boardsCount: 1 
  },
];

// Helper to create dates relative to today
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Activity items from catalyst.xlsx with time grouping
export const activityItems: ActivityItem[] = [
  // YESTERDAY (1 day ago)
  { key: 'US-02', id: 'IP-302', summary: 'View Detailed Performance Reviews (Innovator & Partner)', project: 'IP Implementation', projectKey: 'IP', updated: 'Ready for Development', status: 'Ready for Development', type: 'story', assignee: 'vikram indla', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-02', id: 'IP-341', summary: 'Innovator Submits Performance Review', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'vikram indla', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-01', id: 'IP-340', summary: 'Trigger Performance Review Period Automatically', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'Alaa Al-Khayyat', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-03', id: 'IP-303', summary: 'View Evaluation Criteria for Context', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'vikram indla', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-03', id: 'IP-342', summary: 'Partner Submits Performance Review', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'Nada alfassam', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-04', id: 'IP-343', summary: 'Send Reminders for Pending Reviews', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'vikram indla', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-08', id: 'IP-467', summary: 'Configurable Evaluation Period for Selected Contracts', project: 'IP Implementation', projectKey: 'IP', updated: 'Ready for Development', status: 'Ready for Development', type: 'story', assignee: 'vikram indla', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-07', id: 'IP-346', summary: 'Mark Review as Not Submitted (System Auto)', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'Alaa Al-Khayyat', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-06', id: 'IP-345', summary: 'Innovation Management Views Submitted Performance Reviews', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'vikram indla', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-05', id: 'IP-349', summary: 'Audit Logging for All Evaluation Actions', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'vikram indla', activityDate: daysAgo(1), activityType: 'Updated' },
  { key: 'US-04', id: 'IP-348', summary: 'Export Performance Review Reports', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'Nada alfassam', activityDate: daysAgo(1), activityType: 'Updated' },
  
  // IN THE LAST WEEK (2-7 days ago)
  { key: 'ONE-4', id: 'ONE-4', summary: 'sdfvfv', project: 'One Backlog', projectKey: 'ONE', updated: 'Backlog', status: 'Backlog', type: 'story', assignee: 'User', activityDate: daysAgo(4), activityType: 'Created' },
  { key: 'BAU-3653', id: 'BAU-3653', summary: 'Landing Page - Enhancements', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'menna nasser', activityDate: daysAgo(5), activityType: 'Updated' },
  { key: 'BAU-3654', id: 'BAU-3654', summary: 'Industrial Scanning Blocking – Allow Submission with Expired License', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'Nada alfassam', activityDate: daysAgo(6), activityType: 'Updated' },
  
  // IN THE LAST MONTH (8-30 days ago)
  { key: 'BAU-4391', id: 'BAU-4391', summary: 'Users without process permissions are incorrectly receiving the request-submission SMS notification.', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'defect', assignee: 'Yazeed Daraz', activityDate: daysAgo(10), activityType: 'Updated' },
  { key: 'R4', id: 'IP-504', summary: 'Innovation Platform- System display different design between system and figma', project: 'IP Implementation', projectKey: 'IP', updated: 'In UAT', status: 'In UAT', type: 'defect', assignee: 'Yazeed Daraz', activityDate: daysAgo(12), activityType: 'Updated' },
  { key: 'R4', id: 'IP-508', summary: "Innovator Platform - Service Provider - The system isn't display values for Industrial Sector & Innovation Stage", project: 'IP Implementation', projectKey: 'IP', updated: 'In UAT', status: 'In UAT', type: 'defect', assignee: 'Yazeed Daraz', activityDate: daysAgo(14), activityType: 'Updated' },
  { key: 'R2', id: 'IP-512', summary: 'Backoffice - Expert level - The system display assign button when user assign request and take action', project: 'IP Implementation', projectKey: 'IP', updated: 'In UAT', status: 'In UAT', type: 'defect', assignee: 'Yazeed Daraz', activityDate: daysAgo(15), activityType: 'Updated' },
  { key: 'BAU-3728', id: 'BAU-3728', summary: 'Additional revenue and weight related fields for Industrial Scan', project: 'Senaei BAU', projectKey: 'BAU', updated: 'Backlog', status: 'Backlog', type: 'feature', assignee: 'Muhammad Raza Bangi', activityDate: daysAgo(18), activityType: 'Updated' },
  { key: 'BAU-3774', id: 'BAU-3774', summary: 'Industrial License Activities Classification', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In UAT', status: 'In UAT', type: 'feature', assignee: 'Nada alfassam', activityDate: daysAgo(20), activityType: 'Updated' },
  { key: 'BAU-3801', id: 'BAU-3801', summary: 'AI Trigger & Display - Smart License', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'feature', assignee: 'vikram indla', activityDate: daysAgo(22), activityType: 'Updated' },
  { key: 'BAU-3977', id: 'BAU-3977', summary: 'DGA Comments - Landing page', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'task', assignee: 'menna nasser', activityDate: daysAgo(25), activityType: 'Updated' },
  { key: 'ICP-130', id: 'ICP-130', summary: 'Add Invoices to Attachments (Upload Documents) Section', project: 'ICP Project', projectKey: 'ICP', updated: 'In Production', status: 'In Production', type: 'story', assignee: 'Sulaiman Alessa', activityDate: daysAgo(28), activityType: 'Updated' },
  { key: 'ICP-149', id: 'ICP-149', summary: 'Update invoice dispatch date to the SIDF from 15th to 20th', project: 'ICP Project', projectKey: 'ICP', updated: 'Staging/QA', status: 'Staging/QA', type: 'story', assignee: 'Faisal Javed Paracha', activityDate: daysAgo(29), activityType: 'Updated' },
  { key: 'ICP-202', id: 'ICP-202', summary: 'Change Solution Bundles', project: 'ICP Project', projectKey: 'ICP', updated: 'Staging/QA', status: 'Staging/QA', type: 'story', assignee: 'Mohammed Hassan Ali Mohammed', activityDate: daysAgo(30), activityType: 'Updated' },
];

// Helper to group items by time period
export function groupItemsByTimePeriod(items: ActivityItem[]) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const groups: { label: string; items: ActivityItem[] }[] = [];
  
  const yesterdayItems = items.filter(item => {
    const itemDate = new Date(item.activityDate);
    itemDate.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    return itemDate >= yesterday && itemDate < todayStart;
  });
  
  const lastWeekItems = items.filter(item => {
    const itemDate = new Date(item.activityDate);
    return itemDate >= weekAgo && itemDate < yesterday;
  });
  
  const lastMonthItems = items.filter(item => {
    const itemDate = new Date(item.activityDate);
    return itemDate >= monthAgo && itemDate < weekAgo;
  });

  if (yesterdayItems.length > 0) {
    groups.push({ label: 'YESTERDAY', items: yesterdayItems });
  }
  if (lastWeekItems.length > 0) {
    groups.push({ label: 'IN THE LAST WEEK', items: lastWeekItems });
  }
  if (lastMonthItems.length > 0) {
    groups.push({ label: 'IN THE LAST MONTH', items: lastMonthItems });
  }

  return groups;
}
