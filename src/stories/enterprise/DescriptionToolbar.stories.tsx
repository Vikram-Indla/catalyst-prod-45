/**
 * Enterprise/Description Editor/Toolbar — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { BoldButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/BoldButton';
import { BulletListButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/BulletListButton';
import { ChevronDownGlyph } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/ChevronDownGlyph';
import { CodeSnippetButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/CodeSnippetButton';
import { EmojiButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/EmojiButton';
import { HistoryButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/HistoryButton';
import { ImageUploadButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/ImageUploadButton';
import { ImproveButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/ImproveButton';
import { InlineFormattingDropdown } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/InlineFormattingDropdown';
import { InsertElementButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/InsertElementButton';
import { LinkButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/LinkButton';
import { ListsDropdown } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/ListsDropdown';
import { MicButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/MicButton';
import { RedoButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/RedoButton';
import { TextColorPicker } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/TextColorPicker';
import { TextStylesDropdown } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/TextStylesDropdown';
import { Toolbar } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/Toolbar';
import { ToolbarIconButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/ToolbarIconButton';
import { ToolbarPopover } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/ToolbarPopover';
import { UndoButton } from '@/components/catalyst-detail-views/shared/sections/Description/_components/Toolbar/buttons/UndoButton';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Enterprise/Description Editor/Toolbar' };

export const ToolbarDefault: StoryObj = {
  name: 'Toolbar / Default',
  render: () => <Wrap><Toolbar editor=null /></Wrap>,
}

export const ToolbarIconButtonDefault: StoryObj = {
  name: 'ToolbarIconButton / Default',
  render: () => <Wrap><ToolbarIconButton label="Sample item title" /></Wrap>,
}

export const ToolbarPopoverDefault: StoryObj = {
  name: 'ToolbarPopover / Default',
  render: () => <Wrap><ToolbarPopover label="Sample item title" triggerContent={{{}}} /></Wrap>,
}

export const ChevronDownGlyphDefault: StoryObj = {
  name: 'ChevronDownGlyph / Default',
  render: () => <Wrap><ChevronDownGlyph  /></Wrap>,
}

export const BoldButtonDefault: StoryObj = {
  name: 'BoldButton / Default',
  render: () => <Wrap><BoldButton editor={{{}}} /></Wrap>,
}

export const BulletListButtonDefault: StoryObj = {
  name: 'BulletListButton / Default',
  render: () => <Wrap><BulletListButton editor={{{}}} /></Wrap>,
}

export const CodeSnippetButtonDefault: StoryObj = {
  name: 'CodeSnippetButton / Default',
  render: () => <Wrap><CodeSnippetButton editor={{{}}} /></Wrap>,
}

export const EmojiButtonDefault: StoryObj = {
  name: 'EmojiButton / Default',
  render: () => <Wrap><EmojiButton  /></Wrap>,
}

export const HistoryButtonDefault: StoryObj = {
  name: 'HistoryButton / Default',
  render: () => <Wrap><HistoryButton  /></Wrap>,
}

export const ImageUploadButtonDefault: StoryObj = {
  name: 'ImageUploadButton / Default',
  render: () => <Wrap><ImageUploadButton editor={{{}}} /></Wrap>,
}

export const ImproveButtonDefault: StoryObj = {
  name: 'ImproveButton / Default',
  render: () => <Wrap><ImproveButton editor=null /></Wrap>,
}

export const InlineFormattingDropdownDefault: StoryObj = {
  name: 'InlineFormattingDropdown / Default',
  render: () => <Wrap><InlineFormattingDropdown editor={{{}}} /></Wrap>,
}

export const InsertElementButtonDefault: StoryObj = {
  name: 'InsertElementButton / Default',
  render: () => <Wrap><InsertElementButton  /></Wrap>,
}

export const LinkButtonDefault: StoryObj = {
  name: 'LinkButton / Default',
  render: () => <Wrap><LinkButton editor={{{}}} /></Wrap>,
}

export const ListsDropdownDefault: StoryObj = {
  name: 'ListsDropdown / Default',
  render: () => <Wrap><ListsDropdown editor={{{}}} /></Wrap>,
}

export const MicButtonDefault: StoryObj = {
  name: 'MicButton / Default',
  render: () => <Wrap><MicButton  /></Wrap>,
}

export const RedoButtonDefault: StoryObj = {
  name: 'RedoButton / Default',
  render: () => <Wrap><RedoButton editor={{{}}} /></Wrap>,
}

export const TextColorPickerDefault: StoryObj = {
  name: 'TextColorPicker / Default',
  render: () => <Wrap><TextColorPicker editor={{{}}} /></Wrap>,
}

export const TextStylesDropdownDefault: StoryObj = {
  name: 'TextStylesDropdown / Default',
  render: () => <Wrap><TextStylesDropdown editor={{{}}} /></Wrap>,
}

export const UndoButtonDefault: StoryObj = {
  name: 'UndoButton / Default',
  render: () => <Wrap><UndoButton editor={{{}}} /></Wrap>,
}
