/**
 * Enterprise/Description Editor/Core — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { Description } from '@/components/catalyst-detail-views/shared/sections/Description/Description';
import { DisplayView } from '@/components/catalyst-detail-views/shared/sections/Description/_components/DisplayView/DisplayView';
import { EditorView } from '@/components/catalyst-detail-views/shared/sections/Description/_components/EditorView/EditorView';
import { EmojiPicker } from '@/components/catalyst-detail-views/shared/sections/Description/_components/EmojiPicker/EmojiPicker';
import { MentionPicker } from '@/components/catalyst-detail-views/shared/sections/Description/_components/MentionPicker/MentionPicker';
import { MentionSuggestionPill } from '@/components/catalyst-detail-views/shared/sections/Description/_components/MentionSuggestionPill/MentionSuggestionPill';
import { MicRecordingBar } from '@/components/catalyst-detail-views/shared/sections/Description/_components/MicRecordingBar/MicRecordingBar';
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { SelectionTranslate } from '@/components/catalyst-detail-views/shared/sections/Description/_components/SelectionTranslate/SelectionTranslate';
import { SlashMenu } from '@/components/catalyst-detail-views/shared/sections/Description/_components/SlashMenu/SlashMenu';
import { ViewMoreModal } from '@/components/catalyst-detail-views/shared/sections/Description/_components/SlashMenu/ViewMoreModal';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Enterprise/Description Editor/Core' };

export const DescriptionDefault: StoryObj = {
  name: 'Description / Default',
  render: () => <Wrap><Description issue=null /></Wrap>,
}

export const RichTextEditorDefault: StoryObj = {
  name: 'RichTextEditor / Default',
  render: () => <Wrap><RichTextEditor initialAdf=null onSave={fn()} onCancel={fn()} /></Wrap>,
}

export const DisplayViewDefault: StoryObj = {
  name: 'DisplayView / Default',
  render: () => <Wrap><DisplayView adf=null /></Wrap>,
}

export const EditorViewDefault: StoryObj = {
  name: 'EditorView / Default',
  render: () => <Wrap><EditorView editor=null /></Wrap>,
}

export const EmojiPickerDefault: StoryObj = {
  name: 'EmojiPicker / Default',
  render: () => <Wrap><EmojiPicker mode="inline" coords={{{}}} /></Wrap>,
}

export const MentionPickerDefault: StoryObj = {
  name: 'MentionPicker / Default',
  render: () => <Wrap><MentionPicker query="" coords={{{}}} /></Wrap>,
}

export const MentionSuggestionPillDefault: StoryObj = {
  name: 'MentionSuggestionPill / Default',
  render: () => <Wrap><MentionSuggestionPill editor={{{}}} workItemId={{{}}} /></Wrap>,
}

export const SlashMenuDefault: StoryObj = {
  name: 'SlashMenu / Default',
  render: () => <Wrap><SlashMenu mode="inline" query="" coords={{{}}} /></Wrap>,
}

export const ViewMoreModalDefault: StoryObj = {
  name: 'ViewMoreModal / Default',
  render: () => <Wrap><ViewMoreModal isOpen=true onClose={fn()} editor=null /></Wrap>,
}

export const ViewMoreModalOpen: StoryObj = {
  name: 'ViewMoreModal / Open',
  render: () => <Wrap><ViewMoreModal isOpen=true onClose={fn()} editor=null /></Wrap>,
}

export const MicRecordingBarDefault: StoryObj = {
  name: 'MicRecordingBar / Default',
  render: () => <Wrap><MicRecordingBar isRecording=false isPaused=false phase={{{}}} recordedText="test-value" interimText="test-value" onPauseResume={fn()} onStop={fn()} onCancel={fn()} /></Wrap>,
}

export const SelectionTranslateDefault: StoryObj = {
  name: 'SelectionTranslate / Default',
  render: () => <Wrap><SelectionTranslate editor={{{}}} containerRef=null /></Wrap>,
}
