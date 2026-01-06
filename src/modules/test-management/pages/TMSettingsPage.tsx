/**
 * Settings Page - Module 5 Main Entry
 * Route: /tests/settings
 * Matches Catalyst V5 reference design
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Search } from 'lucide-react';
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
  InviteMemberDialog,
} from '../components/settings';
import {
  useProjectSettings,
  useUpdateProject,
  useUpdateProjectSettings,
  useArchiveProject,
  useDeleteProject,
  useProjectMembers,
  useInviteMember,
  useUpdateMember,
  useRemoveMember,
  useProjectRoles,
  useCustomFields,
  useProjectIntegrations,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useAuditLog,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useWebhooks,
  useDeleteWebhook,
} from '../hooks/useSettingsData';
import type { SettingsTab, AuditLogFilters } from '../types/settings';

// Mock project ID - in real app, get from context/route
const MOCK_PROJECT_ID = 'b7d14a3b-67c7-4df4-b56b-b21f68d7b8ce';

// Tab metadata
const tabMeta: Record<SettingsTab, { title: string; subtitle: string }> = {
  general: { title: 'General Settings', subtitle: 'Configure project details and preferences' },
  team: { title: 'Team Members', subtitle: 'Manage your team and their access permissions' },
  roles: { title: 'Roles & Permissions', subtitle: 'Define what each role can do' },
  security: { title: 'Security', subtitle: 'Configure security and access policies' },
  'custom-fields': { title: 'Custom Fields', subtitle: 'Add custom data fields to entities' },
  workflows: { title: 'Workflows', subtitle: 'Configure test workflow automations' },
  templates: { title: 'Templates', subtitle: 'Manage test case and report templates' },
  integrations: { title: 'Connected Apps', subtitle: 'Connect with external tools' },
  notifications: { title: 'Notifications', subtitle: 'Configure notification preferences' },
  api: { title: 'API & Webhooks', subtitle: 'Manage API access and webhooks' },
  'audit-log': { title: 'Audit Log', subtitle: 'Track all changes and actions' },
  'usage-billing': { title: 'Usage & Billing', subtitle: 'View usage statistics and billing' },
};

export function TMSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('team');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [auditFilters, setAuditFilters] = useState<AuditLogFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Data hooks
  const { data: project, isLoading: projectLoading } = useProjectSettings(MOCK_PROJECT_ID);
  const { data: members = [], isLoading: membersLoading } = useProjectMembers(MOCK_PROJECT_ID);
  const { data: roles = [] } = useProjectRoles(MOCK_PROJECT_ID);
  const { data: customFields = [] } = useCustomFields(MOCK_PROJECT_ID);
  const { data: integrations = [] } = useProjectIntegrations(MOCK_PROJECT_ID);
  const { data: notificationPrefs } = useNotificationPreferences(MOCK_PROJECT_ID);
  const { data: auditEntries = [] } = useAuditLog(MOCK_PROJECT_ID, auditFilters);
  const { data: apiKeys = [] } = useApiKeys(MOCK_PROJECT_ID);
  const { data: webhooks = [] } = useWebhooks(MOCK_PROJECT_ID);

  // Mutations
  const updateProject = useUpdateProject();
  const updateSettings = useUpdateProjectSettings();
  const archiveProject = useArchiveProject();
  const deleteProject = useDeleteProject();
  const inviteMember = useInviteMember();
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();
  const updateNotifications = useUpdateNotificationPreferences();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const deleteWebhook = useDeleteWebhook();

  const { title, subtitle } = tabMeta[activeTab];

  const renderActions = () => {
    if (activeTab === 'team') {
      return (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-60 h-9 bg-background"
            />
          </div>
          <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettings
            project={project}
            onUpdateProject={(updates) => updateProject.mutate({ projectId: MOCK_PROJECT_ID, updates })}
            onUpdateSettings={(settings) => updateSettings.mutate({ projectId: MOCK_PROJECT_ID, settings })}
            isLoading={updateProject.isPending || updateSettings.isPending}
          />
        );
      case 'team':
        return (
          <TeamMembersSection
            members={members}
            roles={roles}
            onUpdateMember={(memberId, role) =>
              updateMember.mutate({ memberId, updates: { role }, projectId: MOCK_PROJECT_ID })
            }
            onRemoveMember={(memberId) => removeMember.mutate({ memberId, projectId: MOCK_PROJECT_ID })}
            onResendInvite={() => {}}
            onCancelInvite={(memberId) => removeMember.mutate({ memberId, projectId: MOCK_PROJECT_ID })}
            isLoading={membersLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        );
      case 'roles':
        return (
          <RolesPermissions roles={roles} onCreateRole={() => {}} onUpdateRole={() => {}} />
        );
      case 'security':
        return (
          <div className="bg-background border border-border rounded-xl p-8 text-center text-muted-foreground">
            <p>Security settings coming soon...</p>
          </div>
        );
      case 'custom-fields':
        return (
          <CustomFieldsSection
            fields={customFields}
            onCreateField={() => {}}
            onEditField={() => {}}
            onDeleteField={() => {}}
          />
        );
      case 'workflows':
        return (
          <div className="bg-background border border-border rounded-xl p-8 text-center text-muted-foreground">
            <p>Workflow configuration coming soon...</p>
          </div>
        );
      case 'templates':
        return (
          <div className="bg-background border border-border rounded-xl p-8 text-center text-muted-foreground">
            <p>Template management coming soon...</p>
          </div>
        );
      case 'integrations':
        return (
          <IntegrationsSection
            integrations={integrations}
            onConnect={() => {}}
            onDisconnect={() => {}}
            onConfigure={() => {}}
          />
        );
      case 'notifications':
        return (
          <NotificationsSection
            preferences={notificationPrefs}
            onUpdate={(prefs) => updateNotifications.mutate({ preferences: prefs, projectId: MOCK_PROJECT_ID })}
            slackConnected={integrations.some((i) => i.integration_type === 'slack' && i.status === 'connected')}
          />
        );
      case 'audit-log':
        return (
          <AuditLogSection entries={auditEntries} onFilterChange={setAuditFilters} />
        );
      case 'api':
        return (
          <ApiWebhooksSection
            apiKeys={apiKeys}
            webhooks={webhooks}
            onCreateApiKey={() => createApiKey.mutate({ projectId: MOCK_PROJECT_ID, keyData: { name: 'New Key', scopes: ['read'] } })}
            onRevokeApiKey={(keyId) => revokeApiKey.mutate({ keyId, projectId: MOCK_PROJECT_ID })}
            onCreateWebhook={() => {}}
            onEditWebhook={() => {}}
            onDeleteWebhook={(id) => deleteWebhook.mutate({ webhookId: id, projectId: MOCK_PROJECT_ID })}
            onToggleWebhook={() => {}}
          />
        );
      case 'usage-billing':
        return (
          <div className="bg-background border border-border rounded-xl p-8 text-center text-muted-foreground">
            <p>Usage & Billing information coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <SettingsLayout
        sidebar={
          <SettingsSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            memberCount={members.length}
          />
        }
        title={title}
        subtitle={subtitle}
        actions={renderActions()}
      >
        {renderContent()}
      </SettingsLayout>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={(invite) => {
          inviteMember.mutate({ projectId: MOCK_PROJECT_ID, invite });
          setInviteDialogOpen(false);
        }}
        isLoading={inviteMember.isPending}
      />
    </>
  );
}

export default TMSettingsPage;
