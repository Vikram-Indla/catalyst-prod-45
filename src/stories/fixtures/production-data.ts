/**
 * Storybook fixtures - real production data from Catalyst Supabase.
 * Pulled from ph_issues + profiles on 2026-06-06.
 */

export const ISSUES = {
  story: {
    issue_key: 'IN-61', summary: 'Export task list', issue_type: 'Story',
    status: 'Backlog', status_category: 'To Do', priority: 'Medium',
    assignee_display_name: 'Syed Habib', reporter_display_name: 'Ali Alshaya',
    parent_key: 'IN-5', parent_summary: 'Request Management',
    labels: [] as string[], severity: null, due_date: null,
    jira_created_at: '2026-04-18T12:10:17.781Z', jira_updated_at: '2026-06-01T11:51:19.818Z',
    description_text: 'As an authorized user, I want to export my task list.',
  },
  epic: {
    issue_key: 'BAU-5963', summary: 'Raw Material Challenges', issue_type: 'Epic',
    status: 'Backlog', status_category: 'To Do', priority: 'Medium',
    assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Nada Alfassam',
    parent_key: null, parent_summary: null, labels: [] as string[],
    severity: null, due_date: null,
    jira_created_at: '2026-05-29T14:52:02.186Z', jira_updated_at: '2026-05-29T15:49:07.766Z',
    description_text: null,
  },
  task: {
    issue_key: 'IRP-1240', summary: 'IRIS AI Agent Enhancements - Task Mode', issue_type: 'Task',
    status: 'Resolved', status_category: 'Done', priority: 'Medium',
    assignee_display_name: 'Dreni Gjini', reporter_display_name: 'Faisal Javed Paracha',
    parent_key: 'IRP-984', parent_summary: 'AI - Implementation - Phase 2',
    labels: [] as string[], severity: null, due_date: null,
    jira_created_at: '2026-05-24T11:27:54.040Z', jira_updated_at: '2026-06-01T07:36:21.475Z',
    description_text: 'As a business user, I want to create a new task through the IRIS Task Mode AI Agent.',
  },
  qaBug: {
    issue_key: 'BAU-5972', summary: 'Industrial Capabilities: Add Item - Incorrect title text',
    issue_type: 'QA Bug', status: 'ToDo', status_category: 'To Do', priority: 'Medium',
    assignee_display_name: 'Yazeed Daraz', reporter_display_name: 'Raghad Alfrdan',
    parent_key: 'BAU-4466', parent_summary: 'Senaei App - Revamp (UI)',
    labels: [] as string[], severity: null, due_date: null,
    jira_created_at: '2026-06-02T11:22:25.207Z', jira_updated_at: '2026-06-02T12:20:52.595Z',
    description_text: 'The current title text is incorrect.',
  },
  incident: {
    issue_key: 'BAU-5968', summary: 'No field to edit Contact Officer info during license amendment',
    issue_type: 'Production Incident', status: 'ToDo', status_category: 'To Do', priority: 'Medium',
    assignee_display_name: 'Waqas Ali', reporter_display_name: 'Abdulmjeed Aljabbari',
    parent_key: null, parent_summary: null, labels: [] as string[],
    severity: null, due_date: null,
    jira_created_at: '2026-06-02T04:36:06.208Z', jira_updated_at: '2026-06-02T04:36:07.395Z',
    description_text: 'No field available to edit the Contact Officer information.',
  },
  changeRequest: {
    issue_key: 'BAU-5610', summary: 'Individual dashboard - Side bar enhancements',
    issue_type: 'Change Request', status: 'Prioritized Backlog', status_category: 'To Do',
    priority: 'Medium', assignee_display_name: 'Vikram Indla',
    reporter_display_name: 'Nada Alfassam', parent_key: null, parent_summary: null,
    labels: [] as string[], severity: null, due_date: null,
    jira_created_at: '2026-04-22T14:20:36.564Z', jira_updated_at: '2026-04-22T14:20:47.658Z',
    description_text: null,
  },
  businessRequest: {
    issue_key: 'MDT-771', summary: 'Innovation Factories', issue_type: 'Business Request',
    status: 'On Hold', status_category: 'In Progress', priority: 'Medium',
    assignee_display_name: 'Nada Alfassam', reporter_display_name: null,
    parent_key: null, parent_summary: null, labels: [] as string[],
    severity: null, due_date: null,
    jira_created_at: '2026-04-27T14:26:34.000Z', jira_updated_at: '2026-05-14T14:31:42.000Z',
    description_text: null,
  },
  businessGap: {
    issue_key: 'BAU-4623', summary: 'Landing Page - Missing Sections in Figma Arabic Page',
    issue_type: 'Business Gap', status: 'Resolved', status_category: 'Done', priority: 'Medium',
    assignee_display_name: 'Hadeel Alrdaddi', reporter_display_name: 'Hadeel Alrdaddi',
    parent_key: null, parent_summary: null, labels: [] as string[],
    severity: null, due_date: null,
    jira_created_at: '2026-01-28T11:35:54.166Z', jira_updated_at: '2026-02-03T11:22:47.199Z',
    description_text: 'English page has sections missing in the Arabic page.',
  },
};

export const TEAM = [
  { id: 'aaefee21', name: 'Eid Mahmoud', country: 'Egypt' },
  { id: '01011a42', name: 'Kawther Mansour', country: 'Saudi Arabia' },
  { id: '8023b428', name: 'Sulaiman Alessa', country: 'Saudi Arabia' },
  { id: '92c834be', name: 'Izza Ali', country: 'Pakistan' },
  { id: 'cdbc7c77', name: 'Maali Alanazi', country: 'Saudi Arabia' },
  { id: '2ffa4008', name: 'Mohamed Tammam', country: 'Egypt' },
  { id: '3fbe684f', name: 'Abdulmjeed Aljabbari', country: 'Saudi Arabia' },
  { id: '7d8f8474', name: 'Alouf Aldrees', country: 'Saudi Arabia' },
] as const;

export const STATUSES = [
  { name: 'ToDo', category: 'To Do' },
  { name: 'Backlog', category: 'To Do' },
  { name: 'Prioritized Backlog', category: 'To Do' },
  { name: 'On Hold', category: 'In Progress' },
  { name: 'In Progress', category: 'In Progress' },
  { name: 'In Review', category: 'In Progress' },
  { name: 'Internal QA', category: 'In Progress' },
  { name: 'Ready for QA', category: 'In Progress' },
  { name: 'BETA READY', category: 'Done' },
  { name: 'Resolved', category: 'Done' },
  { name: 'Done', category: 'Done' },
] as const;

export const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;
