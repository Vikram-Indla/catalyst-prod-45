/**
 * Settings Page - Module 5 Main Entry
 * Route: /tests/settings
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
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
import type { SettingsTab, MemberRole, AuditLogFilters } from '../types/settings';

// Mock project ID - in real app, get from context/route
const MOCK_PROJECT_ID = 'b7d14a3b-67c7-4df4-b56b-b21f68d7b8ce';

export function TMSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('team');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [auditFilters, setAuditFilters] = useState<AuditLogFilters>({});

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

  const getTabTitle = () => {
    const titles: Record<SettingsTab, { title: string; subtitle: string }> = {
      general: { title: 'General Settings', subtitle: 'Configure project details and preferences' },
      team: { title: 'Team Members', subtitle: 'Manage your team and their access permissions' },
      roles: { title: 'Roles & Permissions', subtitle: 'Define what each role can do' },
      'custom-fields': { title: 'Custom Fields', subtitle: 'Add custom data fields to entities' },
      integrations: { title: 'Integrations', subtitle: 'Connect with external tools' },
      notifications: { title: 'Notifications', subtitle: 'Configure notification preferences' },
      'audit-log': { title: 'Audit Log', subtitle: 'Track all changes and actions' },
      api: { title: 'API & Webhooks', subtitle: 'Manage API access and webhooks' },
      danger: { title: 'Danger Zone', subtitle: 'Irreversible and destructive actions' },
    };
    return titles[activeTab];
  };

  const { title, subtitle } = getTabTitle();

  const renderActions = () => {
    if (activeTab === 'team') {
      return (
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
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
            onUpdateMember={(memberId, role) =>
              updateMember.mutate({ memberId, updates: { role }, projectId: MOCK_PROJECT_ID })
            }
            onRemoveMember={(memberId) => removeMember.mutate({ memberId, projectId: MOCK_PROJECT_ID })}
            onResendInvite={() => {}}
            isLoading={membersLoading}
          />
        );
      case 'roles':
        return (
          <RolesPermissions roles={roles} onCreateRole={() => {}} onUpdateRole={() => {}} />
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
      case 'danger':
        return (
          <DangerZone
            projectName={project?.name || 'Project'}
            isArchived={!!project?.archived_at}
            onArchive={() => archiveProject.mutate(MOCK_PROJECT_ID)}
            onRestore={() => {}}
            onDelete={() => deleteProject.mutate(MOCK_PROJECT_ID)}
            onTransfer={() => {}}
          />
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
