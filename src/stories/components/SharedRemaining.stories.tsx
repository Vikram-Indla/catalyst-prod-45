/**
 * Components/Shared/Remaining — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import AtlaskitRenderer from '@/components/shared/AtlaskitRenderer';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import WorkItemIcon from '@/components/shared/WorkItemIcon';
import { AtlaskitEditor } from '@/components/shared/AtlaskitEditor';
import { CatalystDueDateField } from '@/components/shared/CatalystDueDateField/CatalystDueDateField';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';
import { UnifiedLinksTab } from '@/components/shared/UnifiedLinksTab';
import { canonicalWorkItemOptions } from '@/components/shared/canonicalWorkItemOptions';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Components/Shared/Remaining' };

export const AtlaskitEditorDefault: StoryObj = {
  name: 'AtlaskitEditor / Default',
  render: () => <Wrap><AtlaskitEditor  /></Wrap>,
}

export const AtlaskitRendererDefault: StoryObj = {
  name: 'AtlaskitRenderer / Default',
  render: () => <Wrap><AtlaskitRenderer document={{} as any} /></Wrap>,
}

export const PermissionGuardDefault: StoryObj = {
  name: 'PermissionGuard / Default',
  render: () => <Wrap><PermissionGuard  /></Wrap>,
}

export const WorkItemIconDefault: StoryObj = {
  name: 'WorkItemIcon / Default',
  render: () => <Wrap><WorkItemIcon type={{} as any} /></Wrap>,
}

export const canonicalWorkItemOptionsDefault: StoryObj = {
  name: 'canonicalWorkItemOptions / Default',
  render: () => <Wrap><canonicalWorkItemOptions  /></Wrap>,
}

export const CatalystAvatarDefault: StoryObj = {
  name: 'CatalystAvatar / Default',
  render: () => <Wrap><CatalystAvatar  /></Wrap>,
}

export const CatalystDueDateFieldDefault: StoryObj = {
  name: 'CatalystDueDateField / Default',
  render: () => <Wrap><CatalystDueDateField value="test-value" onSave={fn()} /></Wrap>,
}

export const UnifiedAuditHistoryTabDefault: StoryObj = {
  name: 'UnifiedAuditHistoryTab / Default',
  render: () => <Wrap><UnifiedAuditHistoryTab entityId="item-1" entityType="business_request" /></Wrap>,
}

export const UnifiedLinksTabDefault: StoryObj = {
  name: 'UnifiedLinksTab / Default',
  render: () => <Wrap><UnifiedLinksTab entityType={{} as any} entityId="item-1" /></Wrap>,
}
