/**
 * Enterprise/CatalystViewBase — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import CatalystDetailRouter from '@/components/catalyst-detail-views/CatalystDetailRouter';
import CatalystViewBusinessRequestV3 from '@/components/catalyst-detail-views/business-request/CatalystViewBusinessRequest.v3';
import { BrSidebarAdapter } from '@/components/catalyst-detail-views/business-request/sections/BrSidebarAdapter';
import { CatalystViewBase } from '@/components/catalyst-detail-views/shared/CatalystViewBase';
import { KeyboardShortcuts } from '@/components/business-requests/create-form/KeyboardShortcuts';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Enterprise/CatalystViewBase' };

export const CatalystViewBaseDefault: StoryObj = {
  name: 'CatalystViewBase / Default',
  render: () => <Wrap><CatalystViewBase isOpen={true} onClose={fn()} itemType="test-value" itemKey="test-value" /></Wrap>,
}

export const CatalystViewBaseOpen: StoryObj = {
  name: 'CatalystViewBase / Open',
  render: () => <Wrap><CatalystViewBase isOpen={true} onClose={fn()} itemType="test-value" itemKey="test-value" /></Wrap>,
}

export const CatalystDetailRouterDefault: StoryObj = {
  name: 'CatalystDetailRouter / Default',
  render: () => <Wrap><CatalystDetailRouter  /></Wrap>,
}

// CatalystAssessmentFeatureField story removed — CLAUDE.md 2026-05-07:
// Assessment Feature permanently banned from ALL Catalyst views.
// CatalystMdtRefField story removed — CLAUDE.md 2026-05-05: MDT Ref field
// permanently banned (both enforced by the banned-orphans / ads-violations gates).

export const BrSidebarAdapterDefault: StoryObj = {
  name: 'BrSidebarAdapter / Default',
  render: () => <Wrap><BrSidebarAdapter  /></Wrap>,
}

export const CatalystViewBusinessRequestV3Default: StoryObj = {
  name: 'CatalystViewBusinessRequestV3 / Default',
  render: () => <Wrap><CatalystViewBusinessRequestV3  /></Wrap>,
}

export const RichTextEditorDefault: StoryObj = {
  name: 'RichTextEditor / Default',
  render: () => <Wrap><RichTextEditor value="test-value" onChange={fn()} /></Wrap>,
}

export const KeyboardShortcutsDefault: StoryObj = {
  name: 'KeyboardShortcuts / Default',
  render: () => <Wrap><KeyboardShortcuts  /></Wrap>,
}
