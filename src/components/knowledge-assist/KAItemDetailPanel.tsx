/**
 * KAItemDetailPanel — Slide-in detail panel for work items clicked in KA responses.
 * Fetches from ph_issues by issue_key, shows key fields + description + recent activity.
 */
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ExternalLink, Copy, Zap, Target, Layers, User, Calendar, Clock,
  Tag, GitBranch, MessageSquare, CornerDownLeft,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { StatusLozenge } from '@/components/ui/StatusLozenge';

const T = {
  ink: '#09090B', inkSecondary: '#18181B', inkTertiary: '#3F3F46',
  inkMuted: '#71717A', border: '#E4E4E7', borderStrong: '#D4D4D8',
  surface: '#FFFFFF', surfaceSecondary: '#FAFAFA', surfaceTertiary: '#F4F4F5',
  primary: '#2563EB', primaryBg: '#EFF6FF',
  danger: '#DC2626', warning: '#D97706', teal: '#0D9488',
};

const F = {
  inter: "'Inter', -apple-system, sans-serif",
  sora: "'Sora', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

interface ItemData {
  issue_key: string;
  summary: string;
  status: string;
  priority: string;
  issue_type: string;
  project_key: string;
  project_name: string;
  assignee_display_name: string;
  reporter_display_name: string;
  description: string | null;
  jira_created_at: string;
  jira_updated_at: string;
  labels: string[] | null;
  fix_versions: string | null;
  components: string | null;
  sprint_name: string | null;
  story_points: number | null;
  parent_key: string | null;
  parent_summary: string | null;
}

interface ChangelogEntry {
  id: string;
  author_display_name: string;
  field_name: string;
  from_string: string | null;
  to_string: string | null;
  jira_created_at: string;
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PRI_LEVEL: Record<string, number> = {
  highest: 4, high: 3, medium: 2, low: 1, lowest: 0,
};

function PriorityBars({ label }: { label: string }) {
  const level = PRI_LEVEL[label?.toLowerCase()] ?? 2;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: 5, height: 16, borderRadius: 1,
            background: i <= level ? T.inkMuted : T.border,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.ink, textTransform: 'capitalize' }}>{label || 'Medium'}</span>
    </div>
  );
}

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const ini = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const clr = [T.primary, T.teal, T.warning, T.danger, '#7C3AED'][ini.charCodeAt(0) % 5];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: clr, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>{ini}</div>
  );
}

function FieldRow({ icon, label, children, last }: { icon: React.ReactNode; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '140px 1fr',
      borderBottom: last ? 'none' : `1px solid ${T.border}`, minHeight: 38,
    }}>
      <div style={{
        padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 11, fontWeight: 600, color: T.inkMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        background: T.surfaceSecondary, borderRight: `1px solid ${T.border}`,
      }}>
        <span style={{ display: 'flex', color: T.inkMuted }}>{icon}</span>{label}
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: T.ink }}>
        {children}
      </div>
    </div>
  );
}

/* ── Mock data fallback for hardcoded KA response keys ── */
const MOCK_ITEMS: Record<string, ItemData> = {
  'BAU-5054': { issue_key: 'BAU-5054', summary: 'My Requests missing Search & Filter', status: 'In Progress', priority: 'High', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Wahid Nasri', reporter_display_name: 'Vikram Indla', description: 'The My Requests screen is missing search and filter functionality. Users cannot locate specific requests without scrolling through the entire list.', jira_created_at: '2026-02-20T08:00:00Z', jira_updated_at: '2026-03-02T09:00:00Z', labels: ['frontend', 'ux'], fix_versions: null, components: null, sprint_name: null, story_points: 5, parent_key: 'BAU-5000', parent_summary: 'My Requests Module Enhancements' },
  'BAU-5074': { issue_key: 'BAU-5074', summary: 'Notification Screen Issues', status: 'Re-Open', priority: 'Medium', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Wahid Nasri', reporter_display_name: 'Vikram Indla', description: 'Multiple UI issues on the notification screen including incorrect badge counts and missing notification grouping.', jira_created_at: '2026-02-22T10:00:00Z', jira_updated_at: '2026-03-01T21:00:00Z', labels: ['frontend'], fix_versions: null, components: null, sprint_name: null, story_points: 3, parent_key: null, parent_summary: null },
  'SIMP-3245': { issue_key: 'SIMP-3245', summary: 'Landing Page — Program & Incentives', status: 'In Progress', priority: 'High', issue_type: 'Story', project_key: 'SIMP', project_name: 'SIMP', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Sara Ahmad', description: 'Redesign the landing page for Program & Incentives section with updated content and accessibility improvements.', jira_created_at: '2026-02-18T07:00:00Z', jira_updated_at: '2026-03-01T20:00:00Z', labels: ['frontend', 'design'], fix_versions: null, components: null, sprint_name: null, story_points: 8, parent_key: 'SIMP-3200', parent_summary: 'Landing Page Redesign' },
  'BAU-5070': { issue_key: 'BAU-5070', summary: 'Individual Dashboard Issues', status: 'Re-Open', priority: 'Medium', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Raza Bangi', reporter_display_name: 'Vikram Indla', description: 'Dashboard widgets are not rendering correctly for individual users. Chart data is stale and does not refresh on navigation.', jira_created_at: '2026-02-21T09:00:00Z', jira_updated_at: '2026-03-01T18:00:00Z', labels: ['frontend'], fix_versions: null, components: null, sprint_name: null, story_points: 5, parent_key: null, parent_summary: null },
  'MDT-533': { issue_key: 'MDT-533', summary: 'Request Query Optimization', status: 'Code Review', priority: 'High', issue_type: 'Story', project_key: 'MDT', project_name: 'MDT', assignee_display_name: 'Yousif Al-Harbi', reporter_display_name: 'Yousif Al-Harbi', description: 'Optimize the request query endpoint to reduce response times from 3s to under 500ms by adding proper indexes and query refactoring.', jira_created_at: '2026-02-15T06:00:00Z', jira_updated_at: '2026-03-01T16:00:00Z', labels: ['backend', 'performance'], fix_versions: null, components: null, sprint_name: null, story_points: 8, parent_key: null, parent_summary: null },
  'BAU-5073': { issue_key: 'BAU-5073', summary: 'More Screen Issues', status: 'Re-Open', priority: 'Medium', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Wahid Nasri', reporter_display_name: 'Vikram Indla', description: 'The "More" screen has layout inconsistencies and missing icons for several menu items.', jira_created_at: '2026-02-22T08:00:00Z', jira_updated_at: '2026-03-01T14:00:00Z', labels: ['frontend'], fix_versions: null, components: null, sprint_name: null, story_points: 3, parent_key: null, parent_summary: null },
  'SIMP-3172': { issue_key: 'SIMP-3172', summary: 'Restricted Chemical Imports Permit', status: 'In Progress', priority: 'High', issue_type: 'Story', project_key: 'SIMP', project_name: 'SIMP', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Sara Ahmad', description: 'Implement the restricted chemical imports permit workflow including validation rules, document upload, and approval chain.', jira_created_at: '2026-02-10T07:00:00Z', jira_updated_at: '2026-03-01T12:00:00Z', labels: ['workflow', 'permits'], fix_versions: null, components: null, sprint_name: null, story_points: 13, parent_key: 'SIMP-3100', parent_summary: 'Chemical Permits Module' },
  'BAU-5080': { issue_key: 'BAU-5080', summary: 'New permit application flow', status: 'Open', priority: 'Medium', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Wahid Nasri', reporter_display_name: 'Vikram Indla', description: 'Build the new permit application flow with multi-step form, document attachment, and submission confirmation.', jira_created_at: '2026-03-01T08:00:00Z', jira_updated_at: '2026-03-01T08:00:00Z', labels: ['frontend'], fix_versions: null, components: null, sprint_name: null, story_points: 8, parent_key: null, parent_summary: null },
  'BAU-5078': { issue_key: 'BAU-5078', summary: 'Dashboard widget redesign', status: 'Open', priority: 'Medium', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Imran Aslam', reporter_display_name: 'Vikram Indla', description: 'Redesign dashboard widgets with updated visual style, improved data density, and interactive drill-down.', jira_created_at: '2026-02-28T08:00:00Z', jira_updated_at: '2026-02-28T08:00:00Z', labels: ['frontend', 'design'], fix_versions: null, components: null, sprint_name: null, story_points: 5, parent_key: null, parent_summary: null },
  'SIMP-3290': { issue_key: 'SIMP-3290', summary: 'Chemical import validation rules', status: 'Open', priority: 'High', issue_type: 'Story', project_key: 'SIMP', project_name: 'SIMP', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Sara Ahmad', description: 'Implement business validation rules for chemical import permit applications.', jira_created_at: '2026-02-27T07:00:00Z', jira_updated_at: '2026-02-27T07:00:00Z', labels: ['backend', 'validation'], fix_versions: null, components: null, sprint_name: null, story_points: 8, parent_key: 'SIMP-3100', parent_summary: 'Chemical Permits Module' },
  'BAU-5076': { issue_key: 'BAU-5076', summary: 'Notification preferences page', status: 'Open', priority: 'Low', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Wahid Nasri', reporter_display_name: 'Vikram Indla', description: 'Build the notification preferences page allowing users to configure which notifications they receive.', jira_created_at: '2026-02-26T08:00:00Z', jira_updated_at: '2026-02-26T08:00:00Z', labels: ['frontend'], fix_versions: null, components: null, sprint_name: null, story_points: 3, parent_key: null, parent_summary: null },
  'MDT-560': { issue_key: 'MDT-560', summary: 'Employee profile API v3', status: 'Open', priority: 'High', issue_type: 'Story', project_key: 'MDT', project_name: 'MDT', assignee_display_name: 'Raza Bangi', reporter_display_name: 'Yousif Al-Harbi', description: 'Design and implement v3 of the employee profile API with improved response structure and pagination.', jira_created_at: '2026-02-25T06:00:00Z', jira_updated_at: '2026-02-25T06:00:00Z', labels: ['backend', 'api'], fix_versions: null, components: null, sprint_name: null, story_points: 8, parent_key: null, parent_summary: null },
  'BAU-5075': { issue_key: 'BAU-5075', summary: 'Search filter enhancement', status: 'Open', priority: 'Medium', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Wahid Nasri', reporter_display_name: 'Vikram Indla', description: 'Enhance the global search with advanced filters including date range, assignee, and status.', jira_created_at: '2026-02-24T08:00:00Z', jira_updated_at: '2026-02-24T08:00:00Z', labels: ['frontend', 'search'], fix_versions: null, components: null, sprint_name: null, story_points: 5, parent_key: null, parent_summary: null },
  'SIMP-3285': { issue_key: 'SIMP-3285', summary: 'Landing page restructure', status: 'Open', priority: 'Medium', issue_type: 'Story', project_key: 'SIMP', project_name: 'SIMP', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Vikram Indla', description: 'Restructure the SIMP landing page layout for better information hierarchy.', jira_created_at: '2026-02-22T07:00:00Z', jira_updated_at: '2026-02-22T07:00:00Z', labels: ['frontend'], fix_versions: null, components: null, sprint_name: null, story_points: 5, parent_key: null, parent_summary: null },
  'BAU-5072': { issue_key: 'BAU-5072', summary: 'Entity page refactor', status: 'Open', priority: 'Medium', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Imran Aslam', reporter_display_name: 'Vikram Indla', description: 'Refactor the entity page component for better performance and maintainability.', jira_created_at: '2026-02-20T08:00:00Z', jira_updated_at: '2026-02-20T08:00:00Z', labels: ['frontend', 'refactor'], fix_versions: null, components: null, sprint_name: null, story_points: 8, parent_key: null, parent_summary: null },
  'BAU-5082': { issue_key: 'BAU-5082', summary: 'Login timeout on mobile Safari', status: 'Open', priority: 'Highest', issue_type: 'Bug', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Wahid Nasri', reporter_display_name: 'Vikram Indla', description: 'Users on mobile Safari experience a login timeout after 30 seconds. The auth token refresh fails silently.', jira_created_at: '2026-03-02T04:00:00Z', jira_updated_at: '2026-03-02T04:00:00Z', labels: ['bug', 'mobile'], fix_versions: null, components: null, sprint_name: null, story_points: null, parent_key: null, parent_summary: null },
  'BAU-5081': { issue_key: 'BAU-5081', summary: 'Search returns stale cached results', status: 'Open', priority: 'High', issue_type: 'Bug', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Imran Aslam', reporter_display_name: 'Nada Alfassam', description: 'The search feature returns stale results from cache even after items have been updated or deleted.', jira_created_at: '2026-03-01T22:00:00Z', jira_updated_at: '2026-03-01T22:00:00Z', labels: ['bug', 'search'], fix_versions: null, components: null, sprint_name: null, story_points: null, parent_key: null, parent_summary: null },
  'SIMP-3295': { issue_key: 'SIMP-3295', summary: 'Permit PDF generation fails on Arabic text', status: 'Open', priority: 'Highest', issue_type: 'Bug', project_key: 'SIMP', project_name: 'SIMP', assignee_display_name: 'Raza Bangi', reporter_display_name: 'Sara Ahmad', description: 'PDF generation for permits fails when the content contains Arabic text. The font rendering engine does not support RTL properly.', jira_created_at: '2026-02-28T07:00:00Z', jira_updated_at: '2026-02-28T07:00:00Z', labels: ['bug', 'pdf', 'i18n'], fix_versions: null, components: null, sprint_name: null, story_points: null, parent_key: null, parent_summary: null },
  'BAU-5079': { issue_key: 'BAU-5079', summary: 'Dashboard chart axis misalignment', status: 'Open', priority: 'Low', issue_type: 'Bug', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Imran Aslam', reporter_display_name: 'Wahid Nasri', description: 'The Y-axis labels on dashboard charts are misaligned when values exceed 4 digits.', jira_created_at: '2026-02-28T08:00:00Z', jira_updated_at: '2026-02-28T08:00:00Z', labels: ['bug', 'charts'], fix_versions: null, components: null, sprint_name: null, story_points: null, parent_key: null, parent_summary: null },
  'MDT-558': { issue_key: 'MDT-558', summary: 'Employee data sync 15min delay', status: 'Open', priority: 'High', issue_type: 'Bug', project_key: 'MDT', project_name: 'MDT', assignee_display_name: 'Raza Bangi', reporter_display_name: 'Yousif Al-Harbi', description: 'Employee data synchronization has a 15-minute delay instead of the expected near-real-time sync.', jira_created_at: '2026-02-27T06:00:00Z', jira_updated_at: '2026-02-27T06:00:00Z', labels: ['bug', 'sync'], fix_versions: null, components: null, sprint_name: null, story_points: null, parent_key: null, parent_summary: null },
  'SIMP-3166': { issue_key: 'SIMP-3166', summary: 'Restricted Chemical Imports Permit', status: 'Blocked', priority: 'High', issue_type: 'Story', project_key: 'SIMP', project_name: 'SIMP', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Sara Ahmad', description: 'Blocked due to accessibility score below 100. Requires WCAG AA compliance fixes before proceeding.', jira_created_at: '2026-02-08T07:00:00Z', jira_updated_at: '2026-02-28T07:00:00Z', labels: ['accessibility', 'blocked'], fix_versions: null, components: null, sprint_name: null, story_points: 8, parent_key: 'SIMP-3100', parent_summary: 'Chemical Permits Module' },
  'SIMP-3133': { issue_key: 'SIMP-3133', summary: 'Usage and Disclaimer page', status: 'Blocked', priority: 'Medium', issue_type: 'Story', project_key: 'SIMP', project_name: 'SIMP', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Sara Ahmad', description: 'Usage and disclaimer page blocked on accessibility compliance. Current score is 87/100.', jira_created_at: '2026-02-05T07:00:00Z', jira_updated_at: '2026-02-27T07:00:00Z', labels: ['accessibility', 'blocked'], fix_versions: null, components: null, sprint_name: null, story_points: 5, parent_key: null, parent_summary: null },
  'SIMP-3128': { issue_key: 'SIMP-3128', summary: 'Usage and Disclaimer footer', status: 'Blocked', priority: 'Medium', issue_type: 'Story', project_key: 'SIMP', project_name: 'SIMP', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Sara Ahmad', description: 'Footer section of the usage and disclaimer page blocked on accessibility compliance.', jira_created_at: '2026-02-05T07:00:00Z', jira_updated_at: '2026-02-27T07:00:00Z', labels: ['accessibility', 'blocked'], fix_versions: null, components: null, sprint_name: null, story_points: 3, parent_key: null, parent_summary: null },
  'BAU-4988': { issue_key: 'BAU-4988', summary: 'Operational Safety — Acknowledgement Flag', status: 'Done', priority: 'High', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Imran Aslam', reporter_display_name: 'Vikram Indla', description: 'Implement the operational safety acknowledgement flag that requires users to confirm safety protocols before proceeding.', jira_created_at: '2026-02-10T08:00:00Z', jira_updated_at: '2026-03-01T08:00:00Z', labels: ['safety'], fix_versions: null, components: null, sprint_name: null, story_points: 5, parent_key: null, parent_summary: null },
  'BAU-4986': { issue_key: 'BAU-4986', summary: 'Backoffice Visibility & Access Control', status: 'Done', priority: 'High', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Imran Aslam', reporter_display_name: 'Vikram Indla', description: 'Implement role-based visibility and access control for backoffice screens.', jira_created_at: '2026-02-10T08:00:00Z', jira_updated_at: '2026-03-01T08:00:00Z', labels: ['security', 'rbac'], fix_versions: null, components: null, sprint_name: null, story_points: 8, parent_key: null, parent_summary: null },
  'BAU-4984': { issue_key: 'BAU-4984', summary: 'Request Details Screen (Investor Side)', status: 'Done', priority: 'Medium', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Imran Aslam', reporter_display_name: 'Vikram Indla', description: 'Build the request details screen for the investor-facing portal with all required fields and actions.', jira_created_at: '2026-02-08T08:00:00Z', jira_updated_at: '2026-02-28T08:00:00Z', labels: ['frontend'], fix_versions: null, components: null, sprint_name: null, story_points: 8, parent_key: null, parent_summary: null },
  'SIMP-3260': { issue_key: 'SIMP-3260', summary: 'Chemical permit workflow validation fix', status: 'Done', priority: 'High', issue_type: 'Bug', project_key: 'SIMP', project_name: 'SIMP', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Sara Ahmad', description: 'Fixed validation logic in the chemical permit workflow that was incorrectly rejecting valid applications.', jira_created_at: '2026-02-20T07:00:00Z', jira_updated_at: '2026-02-27T07:00:00Z', labels: ['bug', 'workflow'], fix_versions: null, components: null, sprint_name: null, story_points: null, parent_key: null, parent_summary: null },
  'MDT-550': { issue_key: 'MDT-550', summary: 'Employee search index optimization', status: 'Done', priority: 'High', issue_type: 'Story', project_key: 'MDT', project_name: 'MDT', assignee_display_name: 'Yousif Al-Harbi', reporter_display_name: 'Yousif Al-Harbi', description: 'Optimize the employee search index to improve query performance from 2s to under 200ms.', jira_created_at: '2026-02-18T06:00:00Z', jira_updated_at: '2026-02-27T06:00:00Z', labels: ['backend', 'performance'], fix_versions: null, components: null, sprint_name: null, story_points: 5, parent_key: null, parent_summary: null },
  'BAU-5027': { issue_key: 'BAU-5027', summary: 'Entity Page Issues', status: 'Re-Open', priority: 'Medium', issue_type: 'Story', project_key: 'BAU', project_name: 'Senaei BAU', assignee_display_name: 'Wahid Nasri', reporter_display_name: 'Vikram Indla', description: 'Multiple layout and data issues on the entity page requiring fixes.', jira_created_at: '2026-02-15T08:00:00Z', jira_updated_at: '2026-03-01T09:00:00Z', labels: ['frontend'], fix_versions: null, components: null, sprint_name: null, story_points: 5, parent_key: null, parent_summary: null },
};

interface KAItemDetailPanelProps {
  issueKey: string;
  onClose: () => void;
}

export function KAItemDetailPanel({ issueKey, onClose }: KAItemDetailPanelProps) {
  const [item, setItem] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      setItem(null);

      // Check mock data first (for hardcoded KA response keys)
      const mockItem = MOCK_ITEMS[issueKey.trim()];

      try {
        const { data, error } = await (supabase as any)
          .from('ph_issues')
          .select('issue_key, summary, status, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, description, jira_created_at, jira_updated_at, labels, fix_versions, components, sprint_name, story_points, parent_key, parent_summary')
          .eq('issue_key', issueKey.trim())
          .maybeSingle();
        if (error) {
          console.error('KA detail fetch error:', error);
        }
        if (data) {
          setItem(data);
        } else if (mockItem) {
          // Use mock data as fallback for hardcoded KA tickets
          setItem(mockItem);
        } else {
          // Last resort: ilike match
          const { data: fallback } = await (supabase as any)
            .from('ph_issues')
            .select('issue_key, summary, status, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, description, jira_created_at, jira_updated_at, labels, fix_versions, components, sprint_name, story_points, parent_key, parent_summary')
            .ilike('issue_key', issueKey.trim())
            .maybeSingle();
          if (fallback) setItem(fallback);
          else console.warn('KA detail: item not found for key:', JSON.stringify(issueKey));
        }
      } catch (e) {
        console.error('KA detail fetch error:', e);
        // On fetch error, still try mock data
        if (mockItem) setItem(mockItem);
      }
      finally { setLoading(false); }
    }
    fetchItem();
  }, [issueKey]);

  // Fetch changelog
  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data } = await (supabase as any)
          .from('jira_sync_changelog')
          .select('id, author_display_name, field_name, from_string, to_string, jira_created_at')
          .eq('issue_key', issueKey)
          .order('jira_created_at', { ascending: false })
          .limit(5);
        if (data) setChangelog(data);
      } catch (e) { /* silent */ }
    }
    fetchHistory();
  }, [issueKey]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: T.surface, display: 'flex', flexDirection: 'column',
      animation: 'ka-detail-in 200ms ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', borderBottom: `1px solid ${T.border}`,
        background: T.surfaceSecondary, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: T.inkTertiary,
            display: 'flex', padding: 4, borderRadius: 4,
          }}>
            <ArrowLeft size={18} />
          </button>
          <span style={{
            fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: T.primary,
            background: T.primaryBg, padding: '4px 12px', borderRadius: 4,
          }}>{issueKey}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(issueKey)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, display: 'flex', padding: 2 }}
          >
            <Copy size={13} />
          </button>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: T.primary, background: T.primaryBg,
          padding: '3px 8px', borderRadius: 4, fontFamily: F.mono,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>JIRA SYNC</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: T.primary,
                  animation: 'ka-dot-bounce 1.2s infinite', animationDelay: `${i * 150}ms`,
                }} />
              ))}
            </div>
          </div>
        ) : !item ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>
            Item not found in the database.
          </div>
        ) : (
          <div>
            {/* Title */}
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ marginTop: 3 }}>
                  <JiraIssueTypeIcon issueType={item.issue_type} size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontFamily: F.sora, fontSize: 18, fontWeight: 700,
                    color: T.ink, letterSpacing: '-0.025em', lineHeight: 1.35, margin: 0,
                  }}>{item.summary}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    <StatusLozenge status={item.status} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: T.inkTertiary }}>{item.project_name || item.project_key}</span>
                    <span style={{ color: T.borderStrong }}>·</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: T.inkTertiary }}>
                      Updated {formatTimeAgo(item.jira_updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parent banner */}
            {item.parent_key && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                margin: '16px 24px 0', background: T.surfaceTertiary, borderRadius: 8,
                border: `1px solid ${T.border}`,
              }}>
                <CornerDownLeft size={14} style={{ color: T.inkMuted, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PARENT</span>
                <JiraIssueTypeIcon issueType="epic" size={14} />
                <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: T.primary }}>{item.parent_key}</span>
                {item.parent_summary && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.parent_summary}
                  </span>
                )}
              </div>
            )}

            {/* Field Grid */}
            <div style={{ margin: '16px 24px', border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <FieldRow icon={<Zap size={13} />} label="Status"><StatusLozenge status={item.status} /></FieldRow>
              <FieldRow icon={<Target size={13} />} label="Priority"><PriorityBars label={item.priority} /></FieldRow>
              <FieldRow icon={<Layers size={13} />} label="Project"><span style={{ fontWeight: 600 }}>{item.project_name || item.project_key}</span></FieldRow>
              <FieldRow icon={<Tag size={13} />} label="Type"><JiraIssueTypeIcon issueType={item.issue_type} size={14} /><span>{item.issue_type}</span></FieldRow>
              {item.sprint_name && (
                <FieldRow icon={<GitBranch size={13} />} label="Sprint"><span style={{ fontFamily: F.mono, fontSize: 12 }}>{item.sprint_name}</span></FieldRow>
              )}
              {item.labels && item.labels.length > 0 && (
                <FieldRow icon={<Tag size={13} />} label="Labels">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {item.labels.map(l => (
                      <span key={l} style={{ fontSize: 11, fontWeight: 600, color: T.inkSecondary, background: T.surfaceTertiary, padding: '2px 8px', borderRadius: 4 }}>{l}</span>
                    ))}
                  </div>
                </FieldRow>
              )}
              <div style={{ height: 2, background: T.surfaceTertiary }} />
              <FieldRow icon={<User size={13} />} label="Reporter">
                {item.reporter_display_name ? (<><Avatar name={item.reporter_display_name} size={22} /><span style={{ fontWeight: 500 }}>{item.reporter_display_name}</span></>) : <span style={{ color: T.inkMuted }}>—</span>}
              </FieldRow>
              <FieldRow icon={<User size={13} />} label="Assignee">
                {item.assignee_display_name ? (<><Avatar name={item.assignee_display_name} size={22} /><span style={{ fontWeight: 500 }}>{item.assignee_display_name}</span></>) : <span style={{ color: T.inkMuted }}>—</span>}
              </FieldRow>
              <div style={{ height: 2, background: T.surfaceTertiary }} />
              <FieldRow icon={<Calendar size={13} />} label="Created"><span style={{ fontWeight: 500 }}>{formatTimeAgo(item.jira_created_at)}</span></FieldRow>
              <FieldRow icon={<Clock size={13} />} label="Updated" last><span style={{ fontWeight: 500 }}>{formatTimeAgo(item.jira_updated_at)}</span></FieldRow>
            </div>

            {/* Description */}
            <div style={{ margin: '0 24px 16px' }}>
              <h3 style={{
                fontFamily: F.sora, fontSize: 14, fontWeight: 600, color: T.ink,
                paddingBottom: 8, borderBottom: `1px solid ${T.border}`, marginBottom: 12,
              }}>Description</h3>
              <div style={{ fontSize: 13, color: T.inkSecondary, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {item.description || 'No description provided.'}
              </div>
            </div>

            {/* Recent Activity */}
            {changelog.length > 0 && (
              <div style={{ margin: '0 24px 24px' }}>
                <h3 style={{
                  fontFamily: F.sora, fontSize: 14, fontWeight: 600, color: T.ink,
                  paddingBottom: 8, borderBottom: `1px solid ${T.border}`, marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <MessageSquare size={14} /> Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {changelog.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Avatar name={c.author_display_name || 'Unknown'} size={24} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: T.ink }}>
                          <span style={{ fontWeight: 600 }}>{c.author_display_name}</span>
                          <span style={{ color: T.inkMuted }}> {c.field_name === 'status' ? 'changed status' : `updated ${c.field_name}`}</span>
                          {c.from_string && <span style={{ color: T.inkMuted }}> from </span>}
                          {c.from_string && <span style={{ fontWeight: 500, color: T.inkTertiary }}>{c.from_string}</span>}
                          {c.to_string && <span style={{ color: T.inkMuted }}> → </span>}
                          {c.to_string && (
                            c.field_name === 'status'
                              ? <StatusLozenge status={c.to_string} />
                              : <span style={{ fontWeight: 500, color: T.ink }}>{c.to_string}</span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: T.inkMuted }}>{formatTimeAgo(c.jira_created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ka-detail-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
