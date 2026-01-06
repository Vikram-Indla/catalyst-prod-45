/**
 * Settings & Admin Page - Module 5 Complete Implementation
 * Route: /tests/settings
 * Full feature implementation matching Catalyst V5 reference design
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus } from 'lucide-react';
import {
  SettingsLayout,
  SettingsSidebar,
  GeneralSettings,
  TeamMembersSection,
  RolesPermissions,
  CustomFieldsSection,
  IntegrationsSection,
  NotificationsSection,
  AuditLogSection,
  ApiWebhooksSection,
  DangerZone,
  InviteMemberDialog,
} from '../components/settings';
import type {
  SettingsTab,
  TMProject,
  ProjectSettings,
  ProjectMember,
  ProjectRole,
  MemberRole,
  MemberInvite,
  CustomFieldDefinition,
  ProjectIntegration,
  IntegrationType,
  NotificationPreferences,
  AuditLogEntry,
  AuditAction,
  ApiKey,
  Webhook,
  RolePermissions,
} from '../types/settings';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA - In production, replace with real API hooks
// ─────────────────────────────────────────────────────────────────────────────

const mockProject: TMProject = {
  id: '1',
  name: 'Catalyst TM Project',
  key: 'CTM',
  description: 'Enterprise test management platform for Ministry of Industry',
  settings: {
    default_test_case_prefix: 'TC',
    default_defect_prefix: 'DEF',
    default_cycle_prefix: 'CYC',
    timezone: 'Asia/Riyadh',
    date_format: 'DD/MM/YYYY',
    language: 'en',
    require_test_case_review: false,
    auto_close_defects_on_pass: false,
    default_priority: 'medium',
    default_severity: 'major',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  archived_at: null,
  archived_by: null,
};

const mockMembers: ProjectMember[] = [
  {
    id: '1',
    project_id: '1',
    user_id: 'u1',
    role: 'admin',
    email: 'ahmed.alrashid@moind.gov.sa',
    invitation_token: null,
    invited_by: null,
    invited_at: null,
    accepted_at: '2024-01-01T00:00:00Z',
    status: 'active',
    last_active_at: new Date().toISOString(),
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    profile: { id: 'u1', full_name: 'Ahmed Al-Rashid', email: 'ahmed.alrashid@moind.gov.sa', avatar_url: null },
  },
  {
    id: '2',
    project_id: '1',
    user_id: 'u2',
    role: 'lead',
    email: 'sarah.mohammed@moind.gov.sa',
    invitation_token: null,
    invited_by: 'u1',
    invited_at: null,
    accepted_at: '2024-01-02T00:00:00Z',
    status: 'active',
    last_active_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    profile: { id: 'u2', full_name: 'Sarah Mohammed', email: 'sarah.mohammed@moind.gov.sa', avatar_url: null },
  },
  {
    id: '3',
    project_id: '1',
    user_id: 'u3',
    role: 'member',
    email: 'khalid.abdullah@moind.gov.sa',
    invitation_token: null,
    invited_by: 'u1',
    invited_at: null,
    accepted_at: '2024-01-03T00:00:00Z',
    status: 'active',
    last_active_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    profile: { id: 'u3', full_name: 'Khalid Abdullah', email: 'khalid.abdullah@moind.gov.sa', avatar_url: null },
  },
  {
    id: '4',
    project_id: '1',
    user_id: 'u4',
    role: 'member',
    email: 'fatima.nasser@moind.gov.sa',
    invitation_token: null,
    invited_by: 'u2',
    invited_at: null,
    accepted_at: '2024-01-04T00:00:00Z',
    status: 'active',
    last_active_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
    profile: { id: 'u4', full_name: 'Fatima Nasser', email: 'fatima.nasser@moind.gov.sa', avatar_url: null },
  },
  {
    id: '5',
    project_id: '1',
    user_id: 'u5',
    role: 'viewer',
    email: 'layla.qasim@moind.gov.sa',
    invitation_token: null,
    invited_by: 'u1',
    invited_at: null,
    accepted_at: '2024-01-05T00:00:00Z',
    status: 'active',
    last_active_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
    profile: { id: 'u5', full_name: 'Layla Al-Qasim', email: 'layla.qasim@moind.gov.sa', avatar_url: null },
  },
  {
    id: '6',
    project_id: '1',
    user_id: null,
    role: 'member',
    email: 'omar.hassan@moind.gov.sa',
    invitation_token: 'token1',
    invited_by: 'u1',
    invited_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    accepted_at: null,
    status: 'pending',
    last_active_at: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    invited_by_profile: { id: 'u1', full_name: 'Ahmed Al-Rashid' },
  },
  {
    id: '7',
    project_id: '1',
    user_id: null,
    role: 'lead',
    email: 'nadia.saleh@moind.gov.sa',
    invitation_token: 'token2',
    invited_by: 'u2',
    invited_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    accepted_at: null,
    status: 'pending',
    last_active_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    invited_by_profile: { id: 'u2', full_name: 'Sarah Mohammed' },
  },
];

const mockRoles: ProjectRole[] = [
  {
    id: 'r1',
    project_id: '1',
    name: 'admin',
    description: 'Full access to all project features',
    color: '#8b5cf6',
    icon: '👑',
    is_system: true,
    permissions: {
      'project.settings': true,
      'project.members.invite': true,
      'project.members.remove': true,
      'project.members.edit_role': true,
      'project.delete': true,
      'test_cases.create': true,
      'test_cases.edit': true,
      'test_cases.delete': true,
      'test_cases.execute': true,
      'cycles.create': true,
      'cycles.manage': true,
      'defects.create': true,
      'defects.edit': true,
      'defects.resolve': true,
      'defects.delete': true,
      'reports.view': true,
      'reports.export': true,
      'integrations.manage': true,
      'custom_fields.manage': true,
      'audit_log.view': true,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'r2',
    project_id: '1',
    name: 'lead',
    description: 'Can manage test cycles and team',
    color: '#2563eb',
    icon: '⭐',
    is_system: true,
    permissions: {
      'project.settings': false,
      'project.members.invite': true,
      'project.members.remove': false,
      'project.members.edit_role': false,
      'project.delete': false,
      'test_cases.create': true,
      'test_cases.edit': true,
      'test_cases.delete': true,
      'test_cases.execute': true,
      'cycles.create': true,
      'cycles.manage': true,
      'defects.create': true,
      'defects.edit': true,
      'defects.resolve': true,
      'defects.delete': false,
      'reports.view': true,
      'reports.export': true,
      'integrations.manage': false,
      'custom_fields.manage': false,
      'audit_log.view': true,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'r3',
    project_id: '1',
    name: 'member',
    description: 'Can create and execute tests',
    color: '#0d9488',
    icon: '👤',
    is_system: true,
    permissions: {
      'project.settings': false,
      'project.members.invite': false,
      'project.members.remove': false,
      'project.members.edit_role': false,
      'project.delete': false,
      'test_cases.create': true,
      'test_cases.edit': true,
      'test_cases.delete': false,
      'test_cases.execute': true,
      'cycles.create': false,
      'cycles.manage': false,
      'defects.create': true,
      'defects.edit': true,
      'defects.resolve': false,
      'defects.delete': false,
      'reports.view': true,
      'reports.export': false,
      'integrations.manage': false,
      'custom_fields.manage': false,
      'audit_log.view': false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'r4',
    project_id: '1',
    name: 'viewer',
    description: 'Read-only access',
    color: '#737373',
    icon: '👁',
    is_system: true,
    permissions: {
      'project.settings': false,
      'project.members.invite': false,
      'project.members.remove': false,
      'project.members.edit_role': false,
      'project.delete': false,
      'test_cases.create': false,
      'test_cases.edit': false,
      'test_cases.delete': false,
      'test_cases.execute': false,
      'cycles.create': false,
      'cycles.manage': false,
      'defects.create': false,
      'defects.edit': false,
      'defects.resolve': false,
      'defects.delete': false,
      'reports.view': true,
      'reports.export': false,
      'integrations.manage': false,
      'custom_fields.manage': false,
      'audit_log.view': false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockCustomFields: CustomFieldDefinition[] = [
  {
    id: 'cf1',
    project_id: '1',
    name: 'Browser',
    field_key: 'browser',
    description: 'Target browser for testing',
    field_type: 'select',
    entity_type: 'test_case',
    options: [
      { value: 'chrome', label: 'Chrome' },
      { value: 'firefox', label: 'Firefox' },
      { value: 'safari', label: 'Safari' },
      { value: 'edge', label: 'Edge' },
    ],
    is_required: false,
    default_value: 'chrome',
    validation_regex: null,
    min_value: null,
    max_value: null,
    sort_order: 1,
    is_visible: true,
    show_in_list: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1',
  },
  {
    id: 'cf2',
    project_id: '1',
    name: 'Automation Status',
    field_key: 'automation_status',
    description: 'Is this test automated?',
    field_type: 'select',
    entity_type: 'test_case',
    options: [
      { value: 'manual', label: 'Manual' },
      { value: 'automated', label: 'Automated' },
      { value: 'candidate', label: 'Automation Candidate' },
    ],
    is_required: true,
    default_value: 'manual',
    validation_regex: null,
    min_value: null,
    max_value: null,
    sort_order: 2,
    is_visible: true,
    show_in_list: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1',
  },
];

const mockIntegrations: ProjectIntegration[] = [
  {
    id: 'i1',
    project_id: '1',
    integration_type: 'jira',
    name: 'Jira',
    status: 'connected',
    config: {
      base_url: 'https://moind.atlassian.net',
      project_key: 'CTM',
      api_token: '***',
      email: 'ahmed@moind.gov.sa',
      sync_settings: { import_issues: true, sync_defects: true, link_test_cases: true },
    },
    last_sync_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    last_sync_status: 'success',
    last_sync_error: null,
    connected_at: '2024-01-10T00:00:00Z',
    connected_by: 'u1',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
    connected_by_profile: { id: 'u1', full_name: 'Ahmed Al-Rashid' },
  },
  {
    id: 'i2',
    project_id: '1',
    integration_type: 'slack',
    name: 'Slack',
    status: 'connected',
    config: {
      webhook_url: 'https://hooks.slack.com/services/xxx',
      channel: '#testing-alerts',
      notifications: { test_failures: true, cycle_completed: true, defects_created: true },
    },
    last_sync_at: null,
    last_sync_status: null,
    last_sync_error: null,
    connected_at: '2024-01-12T00:00:00Z',
    connected_by: 'u1',
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
    connected_by_profile: { id: 'u1', full_name: 'Ahmed Al-Rashid' },
  },
];

const mockAuditLog: AuditLogEntry[] = [
  {
    id: 'a1',
    project_id: '1',
    user_id: 'u1',
    user_email: 'ahmed.alrashid@moind.gov.sa',
    user_name: 'Ahmed Al-Rashid',
    action: 'create',
    entity_type: 'test_case',
    entity_id: 'tc1',
    entity_name: 'Login Authentication Test',
    changes: null,
    metadata: {},
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a2',
    project_id: '1',
    user_id: 'u2',
    user_email: 'sarah.mohammed@moind.gov.sa',
    user_name: 'Sarah Mohammed',
    action: 'update',
    entity_type: 'test_cycle',
    entity_id: 'cyc1',
    entity_name: 'Sprint 5 Regression',
    changes: [{ field: 'status', old: 'planned', new: 'in_progress' }],
    metadata: {},
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a3',
    project_id: '1',
    user_id: 'u1',
    user_email: 'ahmed.alrashid@moind.gov.sa',
    user_name: 'Ahmed Al-Rashid',
    action: 'invite',
    entity_type: 'member',
    entity_id: null,
    entity_name: 'omar.hassan@moind.gov.sa',
    changes: null,
    metadata: { role: 'member' },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a4',
    project_id: '1',
    user_id: 'u1',
    user_email: 'ahmed.alrashid@moind.gov.sa',
    user_name: 'Ahmed Al-Rashid',
    action: 'connect',
    entity_type: 'integration',
    entity_id: 'i1',
    entity_name: 'Jira',
    changes: null,
    metadata: {},
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockApiKeys: ApiKey[] = [
  {
    id: 'ak1',
    project_id: '1',
    name: 'CI/CD Pipeline',
    key_prefix: 'ctm_abc123',
    scopes: ['read', 'execute'],
    is_active: true,
    last_used_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    usage_count: 1523,
    expires_at: null,
    created_at: '2024-01-15T00:00:00Z',
    created_by: 'u1',
  },
];

const mockWebhooks: Webhook[] = [
  {
    id: 'wh1',
    project_id: '1',
    name: 'Test Results Webhook',
    url: 'https://api.example.com/webhooks/test-results',
    secret: '***',
    events: ['run.completed', 'cycle.completed'],
    is_active: true,
    last_triggered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_response_code: 200,
    failure_count: 0,
    created_at: '2024-01-15T00:00:00Z',
    created_by: 'u1',
  },
];

const mockNotifications: NotificationPreferences = {
  id: 'np1',
  user_id: 'u1',
  project_id: '1',
  email_enabled: true,
  email_digest: 'instant',
  in_app_enabled: true,
  slack_enabled: true,
  slack_dm: false,
  preferences: {
    test_assigned: true,
    test_completed: true,
    test_failed: true,
    cycle_started: true,
    cycle_completed: true,
    defect_assigned: true,
    defect_resolved: true,
    defect_commented: true,
    mentioned: true,
    member_joined: false,
    member_left: false,
    weekly_digest: true,
  },
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB METADATA
// ─────────────────────────────────────────────────────────────────────────────

const tabMeta: Record<SettingsTab, { title: string; subtitle: string; showSearch?: boolean; searchPlaceholder?: string }> = {
  general: { title: 'General Settings', subtitle: 'Configure project information and preferences' },
  team: { title: 'Team Members', subtitle: 'Manage your team and their access permissions', showSearch: true, searchPlaceholder: 'Search members...' },
  roles: { title: 'Roles & Permissions', subtitle: 'Define what each role can do in this project' },
  security: { title: 'Security', subtitle: 'Configure security settings and policies' },
  'custom-fields': { title: 'Custom Fields', subtitle: 'Add custom fields to capture additional data' },
  workflows: { title: 'Workflows', subtitle: 'Configure test case and defect workflows' },
  templates: { title: 'Templates', subtitle: 'Manage test case and cycle templates' },
  integrations: { title: 'Connected Apps', subtitle: 'Connect your favorite tools to streamline your workflow' },
  notifications: { title: 'Notifications', subtitle: 'Choose how and when you want to be notified' },
  api: { title: 'API & Webhooks', subtitle: 'Manage API keys and webhook integrations' },
  'audit-log': { title: 'Audit Log', subtitle: 'Track all changes and actions in this project' },
  'usage-billing': { title: 'Usage & Billing', subtitle: 'View usage statistics and billing information' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function TMSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('team');
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  // Mock state - replace with real API hooks
  const [project, setProject] = useState<TMProject>(mockProject);
  const [members, setMembers] = useState<ProjectMember[]>(mockMembers);
  const [roles] = useState<ProjectRole[]>(mockRoles);
  const [customFields] = useState<CustomFieldDefinition[]>(mockCustomFields);
  const [integrations] = useState<ProjectIntegration[]>(mockIntegrations);
  const [auditEntries] = useState<AuditLogEntry[]>(mockAuditLog);
  const [apiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [webhooks] = useState<Webhook[]>(mockWebhooks);
  const [notifications] = useState<NotificationPreferences | null>(mockNotifications);

  const { title, subtitle, showSearch, searchPlaceholder } = tabMeta[activeTab];
  const memberCount = members.filter((m) => m.status === 'active').length;

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleUpdateProject = (updates: Partial<TMProject>) => {
    setProject((prev) => ({ ...prev, ...updates }));
    toast.success('Project updated');
  };

  const handleUpdateSettings = (settings: Partial<ProjectSettings>) => {
    setProject((prev) => ({ ...prev, settings: { ...prev.settings, ...settings } }));
    toast.success('Settings saved');
  };

  const handleInviteMember = (invite: MemberInvite) => {
    const newMember: ProjectMember = {
      id: `m${Date.now()}`,
      project_id: '1',
      user_id: null,
      role: invite.role,
      email: invite.email,
      invitation_token: `token${Date.now()}`,
      invited_by: 'u1',
      invited_at: new Date().toISOString(),
      accepted_at: null,
      status: 'pending',
      last_active_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      invited_by_profile: { id: 'u1', full_name: 'Ahmed Al-Rashid' },
    };
    setMembers((prev) => [...prev, newMember]);
    setInviteDialogOpen(false);
    toast.success(`Invitation sent to ${invite.email}`);
  };

  const handleUpdateMember = (memberId: string, role: MemberRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m))
    );
    toast.success('Member role updated');
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success('Member removed');
  };

  const handleResendInvite = (memberId: string) => {
    toast.success('Invitation resent');
  };

  const handleConnectIntegration = (type: IntegrationType) => {
    toast.info(`Connect ${type} - Coming soon`);
  };

  const handleDisconnectIntegration = (integrationId: string) => {
    toast.success('Integration disconnected');
  };

  const handleConfigureIntegration = (integration: ProjectIntegration) => {
    toast.info(`Configure ${integration.integration_type} - Coming soon`);
  };

  const handleFilterAuditLog = (filters: { action?: AuditAction; entity_type?: string }) => {
    console.log('Filter audit log:', filters);
  };

  const handleArchive = () => {
    setProject((prev) => ({ ...prev, archived_at: new Date().toISOString(), archived_by: 'u1' }));
    toast.success('Project archived');
  };

  const handleRestore = () => {
    setProject((prev) => ({ ...prev, archived_at: null, archived_by: null }));
    toast.success('Project restored');
  };

  const handleDelete = () => {
    toast.success('Project deleted');
  };

  const handleTransfer = () => {
    toast.info('Transfer ownership - Coming soon');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HEADER ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHeaderActions = () => {
    switch (activeTab) {
      case 'team':
        return (
          <>
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-60"
                />
              </div>
            )}
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CONTENT RENDERER
  // ─────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <>
            <GeneralSettings
              project={project}
              onUpdateProject={handleUpdateProject}
              onUpdateSettings={handleUpdateSettings}
            />
            <div className="mt-6">
              <DangerZone
                projectName={project.name}
                isArchived={!!project.archived_at}
                onArchive={handleArchive}
                onRestore={handleRestore}
                onDelete={handleDelete}
                onTransfer={handleTransfer}
              />
            </div>
          </>
        );
      case 'team':
        return (
          <TeamMembersSection
            members={members}
            roles={roles}
            onUpdateMember={handleUpdateMember}
            onRemoveMember={handleRemoveMember}
            onResendInvite={handleResendInvite}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        );
      case 'roles':
        return (
          <RolesPermissions
            roles={roles}
            onCreateRole={() => toast.info('Create role - Coming soon')}
            onUpdateRole={() => {}}
          />
        );
      case 'security':
        return (
          <div className="bg-background border border-border rounded-xl p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Security Settings</h3>
            <p className="text-muted-foreground">Configure 2FA, session policies, and IP restrictions</p>
            <p className="text-sm text-muted-foreground mt-4">Coming soon...</p>
          </div>
        );
      case 'custom-fields':
        return (
          <CustomFieldsSection
            fields={customFields}
            onCreateField={() => toast.info('Create field - Coming soon')}
            onEditField={() => toast.info('Edit field - Coming soon')}
            onDeleteField={() => toast.info('Delete field - Coming soon')}
          />
        );
      case 'workflows':
        return (
          <div className="bg-background border border-border rounded-xl p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚙️</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Workflows</h3>
            <p className="text-muted-foreground">Configure test case and defect workflows</p>
            <p className="text-sm text-muted-foreground mt-4">Coming soon...</p>
          </div>
        );
      case 'templates':
        return (
          <div className="bg-background border border-border rounded-xl p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Templates</h3>
            <p className="text-muted-foreground">Manage test case and cycle templates</p>
            <p className="text-sm text-muted-foreground mt-4">Coming soon...</p>
          </div>
        );
      case 'integrations':
        return (
          <IntegrationsSection
            integrations={integrations}
            onConnect={handleConnectIntegration}
            onDisconnect={handleDisconnectIntegration}
            onConfigure={handleConfigureIntegration}
          />
        );
      case 'notifications':
        return (
          <NotificationsSection
            preferences={notifications}
            onUpdate={() => toast.success('Preferences saved')}
            slackConnected={integrations.some((i) => i.integration_type === 'slack' && i.status === 'connected')}
          />
        );
      case 'api':
        return (
          <ApiWebhooksSection
            apiKeys={apiKeys}
            webhooks={webhooks}
            onCreateApiKey={() => toast.info('Create API key - Coming soon')}
            onRevokeApiKey={() => toast.success('API key revoked')}
            onCreateWebhook={() => toast.info('Create webhook - Coming soon')}
            onEditWebhook={() => toast.info('Edit webhook - Coming soon')}
            onDeleteWebhook={() => toast.success('Webhook deleted')}
            onToggleWebhook={() => toast.success('Webhook toggled')}
          />
        );
      case 'audit-log':
        return (
          <AuditLogSection
            entries={auditEntries}
            onFilterChange={handleFilterAuditLog}
          />
        );
      case 'usage-billing':
        return (
          <div className="bg-background border border-border rounded-xl p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Usage & Billing</h3>
            <p className="text-muted-foreground">View usage statistics and manage billing</p>
            <p className="text-sm text-muted-foreground mt-4">Coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <SettingsLayout
        sidebar={
          <SettingsSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            memberCount={memberCount}
          />
        }
        title={title}
        subtitle={subtitle}
        actions={renderHeaderActions()}
      >
        {renderContent()}
      </SettingsLayout>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInviteMember}
      />
    </>
  );
}

export default TMSettingsPage;
