export interface JiraIdentityMap {
  id: string;
  jiraConnectionId: string | null;
  jiraAccountId: string | null;
  catalystUserId: string | null;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  jiraGroups: string[];
  jiraProjectKeys: string[];
  isActiveInJira: boolean;
  isActiveInCatalyst: boolean;
  authMode: 'jira_proxy' | 'local' | 'sso';
  catalystOnly: boolean;
  lastJiraLoginAt: string | null;
  lastCatalystLoginAt: string | null;
  lastSyncedAt: string | null;
  syncVersion: number;
  conflictFields: string[];
  resourceRoleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JiraUserProjectPerm {
  id: string;
  identityMapId: string;
  projectId: string;
  projectName: string;
  projectKey: string;
  permissionLevel: 'full' | 'edit' | 'view' | 'none';
  syncedFromJira: boolean;
}

export interface JiraSyncRun {
  id: string;
  runType: 'scheduled' | 'manual' | 'webhook' | 'initial';
  direction: 'jira_to_catalyst' | 'catalyst_to_jira' | 'both';
  status: 'running' | 'completed' | 'partial' | 'failed';
  usersCreated: number;
  usersUpdated: number;
  usersDeactivated: number;
  usersFailed: number;
  conflictsDetected: number;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface JiraSyncUserView extends JiraIdentityMap {
  projects: JiraUserProjectPerm[];
}

export interface CreateCatalystUserPayload {
  displayName: string;
  email: string;
  password: string;
  resourceRoleId: string | null;
  catalystOnly: true;
}

export type SyncFilter = 'all' | 'jira' | 'local' | 'conflict' | 'inactive';

export type PermissionLevel = 'full' | 'edit' | 'view' | 'none';
