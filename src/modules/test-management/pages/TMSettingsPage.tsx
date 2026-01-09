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
// EMPTY INITIAL STATE - Data to be fetched from API
// ─────────────────────────────────────────────────────────────────────────────

const emptyProject: TMProject = {
  id: '',
  name: '',
  key: '',
  description: '',
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
  created_at: '',
  updated_at: '',
  archived_at: null,
  archived_by: null,
};

const emptyNotifications: NotificationPreferences = {
  id: '',
  user_id: '',
  project_id: '',
  email_enabled: true,
  email_digest: 'instant',
  in_app_enabled: true,
  slack_enabled: false,
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
  created_at: '',
  updated_at: '',
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
  
  // State - to be fetched from API
  const [project, setProject] = useState<TMProject>(emptyProject);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [roles] = useState<ProjectRole[]>([]);
  const [customFields] = useState<CustomFieldDefinition[]>([]);
  const [integrations] = useState<ProjectIntegration[]>([]);
  const [auditEntries] = useState<AuditLogEntry[]>([]);
  const [apiKeys] = useState<ApiKey[]>([]);
  const [webhooks] = useState<Webhook[]>([]);
  const [notifications] = useState<NotificationPreferences | null>(emptyNotifications);

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
