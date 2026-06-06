/**
 * Components/Shared/Rich Text — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import EpicDescriptionRenderer from '@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer';
import { AdfDescriptionField } from '@/components/shared/rich-text/atlaskit/AdfDescriptionField';
import { AtlaskitBoundary } from '@/components/shared/rich-text/atlaskit/AtlaskitBoundary';
import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField/CanonicalDescriptionField';
import { CatalystRichTextEditor } from '@/components/shared/rich-text/CatalystRichTextEditor';
import { DescriptionEditMode } from '@/components/shared/CanonicalDescriptionField/DescriptionEditMode';
import { DescriptionViewMode } from '@/components/shared/CanonicalDescriptionField/DescriptionViewMode';
import { EpicDescriptionEditor } from '@/components/shared/rich-text/atlaskit/EpicDescriptionEditor';
import { ImageBubbleMenu } from '@/components/shared/rich-text/ImageBubbleMenu';
import { ImageToolbar } from '@/components/shared/rich-text/atlaskit/imageToolbar/ImageToolbar';
import { JiraDescriptionEditor } from '@/components/shared/jira-description-editor/JiraDescriptionEditor';
import { StoryRichTextEditor } from '@/components/shared/rich-text/StoryRichTextEditor';
import { Toolbar } from '@/components/shared/jira-description-editor/Toolbar';
import { adfLightRenderer } from '@/components/shared/rich-text/atlaskit/adfLightRenderer';
import { atlaskitMediaOverrides } from '@/components/shared/rich-text/atlaskit/atlaskitMediaOverrides';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</QueryClientProvider></div>);
}

export default { title: 'Components/Shared/Rich Text' };

export const CatalystRichTextEditorDefault: StoryObj = {
  name: 'CatalystRichTextEditor / Default',
  render: () => <Wrap><CatalystRichTextEditor  /></Wrap>,
}

export const ImageBubbleMenuDefault: StoryObj = {
  name: 'ImageBubbleMenu / Default',
  render: () => <Wrap><ImageBubbleMenu  /></Wrap>,
}

export const StoryRichTextEditorDefault: StoryObj = {
  name: 'StoryRichTextEditor / Default',
  render: () => <Wrap><StoryRichTextEditor  /></Wrap>,
}

export const AdfDescriptionFieldDefault: StoryObj = {
  name: 'AdfDescriptionField / Default',
  render: () => <Wrap><AdfDescriptionField  /></Wrap>,
}

export const AtlaskitBoundaryDefault: StoryObj = {
  name: 'AtlaskitBoundary / Default',
  render: () => <Wrap><AtlaskitBoundary fallback={{<span>Content</span>}} /></Wrap>,
}

export const EpicDescriptionEditorDefault: StoryObj = {
  name: 'EpicDescriptionEditor / Default',
  render: () => <Wrap><EpicDescriptionEditor initialContent={{{}}} onSave={fn()} onCancel={fn()} workItemId="item-1" /></Wrap>,
}

export const EpicDescriptionRendererDefault: StoryObj = {
  name: 'EpicDescriptionRenderer / Default',
  render: () => <Wrap><EpicDescriptionRenderer content={{{}}} /></Wrap>,
}

export const adfLightRendererDefault: StoryObj = {
  name: 'adfLightRenderer / Default',
  render: () => <Wrap><adfLightRenderer adf={{{}}} /></Wrap>,
}

export const atlaskitMediaOverridesDefault: StoryObj = {
  name: 'atlaskitMediaOverrides / Default',
  render: () => <Wrap><atlaskitMediaOverrides  /></Wrap>,
}

export const ImageToolbarDefault: StoryObj = {
  name: 'ImageToolbar / Default',
  render: () => <Wrap><ImageToolbar selection=null getEditorView=null onDismiss={fn()} /></Wrap>,
}

export const JiraDescriptionEditorDefault: StoryObj = {
  name: 'JiraDescriptionEditor / Default',
  render: () => <Wrap><JiraDescriptionEditor  /></Wrap>,
}

export const ToolbarDefault: StoryObj = {
  name: 'Toolbar / Default',
  render: () => <Wrap><Toolbar title="Sample item title" onClick={fn()} /></Wrap>,
}

export const CanonicalDescriptionFieldDefault: StoryObj = {
  name: 'CanonicalDescriptionField / Default',
  render: () => <Wrap><CanonicalDescriptionField  /></Wrap>,
}

export const DescriptionEditModeDefault: StoryObj = {
  name: 'DescriptionEditMode / Default',
  render: () => <Wrap><DescriptionEditMode value="test-value" onChange={fn()} placeholder="test-value" maxLength=42 charCount=5 isNearLimit=false isLoading=false mentions=[] onSave={fn()} onCancel={fn()} /></Wrap>,
}

export const DescriptionEditModeLoading: StoryObj = {
  name: 'DescriptionEditMode / Loading',
  render: () => <Wrap><DescriptionEditMode value="test-value" onChange={fn()} placeholder="test-value" maxLength=42 charCount=5 isNearLimit=false isLoading=false mentions=[] onSave={fn()} onCancel={fn()} /></Wrap>,
}

export const DescriptionViewModeDefault: StoryObj = {
  name: 'DescriptionViewMode / Default',
  render: () => <Wrap><DescriptionViewMode value="test-value" mentions=[] /></Wrap>,
}
