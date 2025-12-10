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
}

// Projects from catalyst.xlsx
export const projects: Project[] = [
  { 
    id: '1', 
    key: 'BAU', 
    name: 'Senaei BAU', 
    type: 'Company-managed software', 
    color: '#0052CC', 
    openCount: 79, // Items not in "In Production" 
    doneCount: 53, // Items in "In Production"
    boardsCount: 2 
  },
  { 
    id: '2', 
    key: 'ICP', 
    name: 'ICP Project', 
    type: 'Company-managed software', 
    color: '#6554C0', 
    openCount: 35, // Items not in "In Production" 
    doneCount: 14, // Items in "In Production"
    boardsCount: 1 
  },
  { 
    id: '3', 
    key: 'IP', 
    name: 'IP Implementation', 
    type: 'Company-managed software', 
    color: '#FF5630', 
    openCount: 56, // Items not in "In Production"
    doneCount: 0, // No items in "In Production"
    boardsCount: 1 
  },
];

// Activity items from catalyst.xlsx - 25 recent items
export const activityItems: ActivityItem[] = [
  // BAU Project Items
  { key: 'BAU-3653', id: 'BAU-3653', summary: 'Landing Page - Enhancements', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'menna nasser' },
  { key: 'BAU-3654', id: 'BAU-3654', summary: 'Industrial Scanning Blocking – Allow Submission with Expired License', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'Nada alfassam' },
  { key: 'BAU-3728', id: 'BAU-3728', summary: 'Additional revenue and weight related fields for Industrial Scan', project: 'Senaei BAU', projectKey: 'BAU', updated: 'Backlog', status: 'Backlog', type: 'feature', assignee: 'Muhammad Raza Bangi' },
  { key: 'BAU-3774', id: 'BAU-3774', summary: 'Industrial License Activities Classification', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In UAT', status: 'In UAT', type: 'feature', assignee: 'Nada alfassam' },
  { key: 'BAU-3801', id: 'BAU-3801', summary: 'AI Trigger & Display - Smart License', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'feature', assignee: 'vikram indla' },
  { key: 'BAU-3977', id: 'BAU-3977', summary: 'DGA Comments - Landing page', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'task', assignee: 'menna nasser' },
  { key: 'BAU-4027', id: 'BAU-4027', summary: 'Factory Management - License UI', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'task', assignee: 'vikram indla' },
  { key: 'BAU-4055', id: 'BAU-4055', summary: 'Push Industrial License Data to HRSD', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'task', assignee: 'waqas ali' },
  { key: 'BAU-4135', id: 'BAU-4135', summary: 'Manual License Entry', project: 'Senaei BAU', projectKey: 'BAU', updated: 'On Hold', status: 'On Hold', type: 'defect', assignee: 'vikram indla' },
  { key: 'BAU-4140', id: 'BAU-4140', summary: 'Arabic Notification Update', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In Production', status: 'In Production', type: 'defect', assignee: 'Nada alfassam' },
  { key: 'BAU-4143', id: 'BAU-4143', summary: 'Investor License Selection via RCJY Integration', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'defect', assignee: 'Yazeed Daraz' },
  { key: 'BAU-4306', id: 'BAU-4306', summary: 'Industrial Scan - Return Requests (3)', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'Nada alfassam' },
  { key: 'BAU-4350', id: 'BAU-4350', summary: 'Develop investor application form for Iron & Cement Export License', project: 'Senaei BAU', projectKey: 'BAU', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'Nada alfassam' },
  
  // ICP Project Items
  { key: 'ICP-130', id: 'ICP-130', summary: 'Add Invoices to Attachments (Upload Documents) Section', project: 'ICP Project', projectKey: 'ICP', updated: 'In Production', status: 'In Production', type: 'story', assignee: 'Sulaiman Alessa' },
  { key: 'ICP-149', id: 'ICP-149', summary: 'Update invoice dispatch date to the SIDF from 15th to 20th', project: 'ICP Project', projectKey: 'ICP', updated: 'Staging/QA', status: 'Staging/QA', type: 'story', assignee: 'Faisal Javed Paracha' },
  { key: 'ICP-202', id: 'ICP-202', summary: 'Change Solution Bundles', project: 'ICP Project', projectKey: 'ICP', updated: 'Staging/QA', status: 'Staging/QA', type: 'story', assignee: 'Mohammed Hassan Ali Mohammed' },
  { key: 'ICP-295', id: 'ICP-295', summary: 'Recommend rejection when the financial statements are not passed', project: 'ICP Project', projectKey: 'ICP', updated: 'Staging/QA', status: 'Staging/QA', type: 'story', assignee: 'Mohammed Hassan Ali Mohammed' },
  { key: 'ICP-316', id: 'ICP-316', summary: 'Manage Impact Measurement Data Settings by program manager', project: 'ICP Project', projectKey: 'ICP', updated: 'In Requirements', status: 'In Requirements', type: 'story', assignee: 'eid mahmoud' },
  { key: 'ICP-345', id: 'ICP-345', summary: 'The verification officer(operations team L1) enter and process financial data', project: 'ICP Project', projectKey: 'ICP', updated: 'In Requirements', status: 'In Requirements', type: 'story', assignee: 'Mohammed Hassan Ali Mohammed' },
  
  // IP Implementation Items
  { key: 'IP-219', id: 'IP-219', summary: 'Request Status Notification', project: 'IP Implementation', projectKey: 'IP', updated: 'In UAT', status: 'In UAT', type: 'story', assignee: 'Nada alfassam' },
  { key: 'IP-245', id: 'IP-245', summary: 'Auto-Generate Unique Codes for Standards and Sub-Standards', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'vikram indla' },
  { key: 'IP-255', id: 'IP-255', summary: 'Implement dynamic Level 2 user assignment and response aggregation', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'vikram indla' },
  { key: 'IP-293', id: 'IP-293', summary: 'Access Sectoral Challenges Service', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'vikram indla' },
  { key: 'IP-306', id: 'IP-306', summary: 'UR-001 Become a Partner', project: 'IP Implementation', projectKey: 'IP', updated: 'In QA', status: 'In QA', type: 'story', assignee: 'Alaa Al-Khayyat' },
  { key: 'IP-302', id: 'IP-302', summary: 'View Detailed Performance Reviews (Innovator & Partner)', project: 'IP Implementation', projectKey: 'IP', updated: 'Ready for Development', status: 'Ready for Development', type: 'story', assignee: 'vikram indla' },
];
