
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface)' }}>{children}</div></Providers>;
}

import { StatusTransitionDropdown } from '@/components/workflow/StatusTransitionDropdown';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';

export default { title: 'Audit Grade/04 — Status Transition' };

export const StoryDefault: StoryObj = {
  render: () => <Frame width={300}><StatusTransitionDropdown issueType="Story" currentStateId="in_development" onTransition={fn()} /></Frame>,
};
export const StoryToDo: StoryObj = {
  render: () => <Frame width={300}><StatusTransitionDropdown issueType="Story" currentStateId="new_request" onTransition={fn()} /></Frame>,
};
export const EpicStatus: StoryObj = {
  render: () => <Frame width={300}><StatusTransitionDropdown issueType="Epic" currentStateId="in_progress" onTransition={fn()} /></Frame>,
};
export const Compact: StoryObj = {
  render: () => <Frame width={200}><StatusTransitionDropdown issueType="Story" currentStateId="in_development" onTransition={fn()} size="compact" /></Frame>,
};
export const Disabled: StoryObj = {
  render: () => <Frame width={300}><StatusTransitionDropdown issueType="Story" currentStateId="done" onTransition={fn()} isDisabled /></Frame>,
};
export const StatusPillInProgress: StoryObj = {
  render: () => <Frame width={200}><CatalystStatusPill status="In Development" statusCategory="indeterminate" onStatusChange={fn()} issueType="Story" /></Frame>,
};
export const StatusPillDone: StoryObj = {
  render: () => <Frame width={200}><CatalystStatusPill status="Done" statusCategory="done" onStatusChange={fn()} issueType="Story" /></Frame>,
};
export const StatusPillToDo: StoryObj = {
  render: () => <Frame width={200}><CatalystStatusPill status="To Do" statusCategory="new" onStatusChange={fn()} issueType="Task" /></Frame>,
};
