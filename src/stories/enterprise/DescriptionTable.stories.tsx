/**
 * Enterprise/Description Editor/Table — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { BackgroundPickerItem } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableInteractions/BackgroundPickerItem';
import { BlockDragHandle } from '@/components/catalyst-detail-views/shared/sections/Description/_components/BlockDragHandle/BlockDragHandle';
import { CellChevronHandles } from '@/components/catalyst-detail-views/shared/sections/Description/_components/CellChevronHandles/CellChevronHandles';
import { CellMenu } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableInteractions/CellMenu';
import { CellMultiSelect } from '@/components/catalyst-detail-views/shared/sections/Description/_components/CellMultiSelect/CellMultiSelect';
import { CodeBlockToolbar } from '@/components/catalyst-detail-views/shared/sections/Description/_components/CodeBlockToolbar/CodeBlockToolbar';
import { ColumnMenu } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableInteractions/ColumnMenu';
import { ColumnResizeHandles } from '@/components/catalyst-detail-views/shared/sections/Description/_components/ColumnResizeHandles/ColumnResizeHandles';
import { ImageResizeHandles } from '@/components/catalyst-detail-views/shared/sections/Description/_components/ImageToolbar/ImageResizeHandles';
import { ImageToolbar } from '@/components/catalyst-detail-views/shared/sections/Description/_components/ImageToolbar/ImageToolbar';
import { MenuShared } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableInteractions/MenuShared';
import { PreferencesThinIcon } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableToolbar/PreferencesThinIcon';
import { RowMenu } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableInteractions/RowMenu';
import { SmartCardView } from '@/components/catalyst-detail-views/shared/sections/Description/extensions/SmartCardView';
import { TableInsertHandles } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableInsertHandles/TableInsertHandles';
import { TableInteractions } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableInteractions/TableInteractions';
import { TableResizeBar } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableResizeBar/TableResizeBar';
import { TableToolbar } from '@/components/catalyst-detail-views/shared/sections/Description/_components/TableToolbar/TableToolbar';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Enterprise/Description Editor/Table' };

export const BlockDragHandleDefault: StoryObj = {
  name: 'BlockDragHandle / Default',
  render: () => <Wrap><BlockDragHandle editor={{{}}} containerRef=null /></Wrap>,
}

export const CellChevronHandlesDefault: StoryObj = {
  name: 'CellChevronHandles / Default',
  render: () => <Wrap><CellChevronHandles editor={{{}}} containerRef=null /></Wrap>,
}

export const CellMultiSelectDefault: StoryObj = {
  name: 'CellMultiSelect / Default',
  render: () => <Wrap><CellMultiSelect editor={{{}}} containerRef=null /></Wrap>,
}

export const CodeBlockToolbarDefault: StoryObj = {
  name: 'CodeBlockToolbar / Default',
  render: () => <Wrap><CodeBlockToolbar editor={{{}}} containerRef=null /></Wrap>,
}

export const ColumnResizeHandlesDefault: StoryObj = {
  name: 'ColumnResizeHandles / Default',
  render: () => <Wrap><ColumnResizeHandles editor={{{}}} containerRef=null /></Wrap>,
}

export const ImageResizeHandlesDefault: StoryObj = {
  name: 'ImageResizeHandles / Default',
  render: () => <Wrap><ImageResizeHandles editor={{{}}} imagePos=42 /></Wrap>,
}

export const ImageToolbarDefault: StoryObj = {
  name: 'ImageToolbar / Default',
  render: () => <Wrap><ImageToolbar editor={{{}}} imagePos=42 alignment={{{}}} borderColor=null borderSize={{{}}} src="test-value" /></Wrap>,
}

export const TableInsertHandlesDefault: StoryObj = {
  name: 'TableInsertHandles / Default',
  render: () => <Wrap><TableInsertHandles editor={{{}}} containerRef=null /></Wrap>,
}

export const BackgroundPickerItemDefault: StoryObj = {
  name: 'BackgroundPickerItem / Default',
  render: () => <Wrap><BackgroundPickerItem currentColor="test-value" onSelect={fn()} /></Wrap>,
}

export const CellMenuDefault: StoryObj = {
  name: 'CellMenu / Default',
  render: () => <Wrap><CellMenu editor={{{}}} tablePos=42 row=42 col=42 anchorRect={{{}}} onClose={fn()} /></Wrap>,
}

export const ColumnMenuDefault: StoryObj = {
  name: 'ColumnMenu / Default',
  render: () => <Wrap><ColumnMenu editor={{{}}} tablePos=42 col=42 anchorRect={{{}}} onClose={fn()} /></Wrap>,
}

export const MenuSharedDefault: StoryObj = {
  name: 'MenuShared / Default',
  render: () => <Wrap><MenuShared anchorRect={{{}}} /></Wrap>,
}

export const RowMenuDefault: StoryObj = {
  name: 'RowMenu / Default',
  render: () => <Wrap><RowMenu editor={{{}}} tablePos=42 row=42 anchorRect={{{}}} onClose={fn()} /></Wrap>,
}

export const TableInteractionsDefault: StoryObj = {
  name: 'TableInteractions / Default',
  render: () => <Wrap><TableInteractions editor={{{}}} containerRef=null /></Wrap>,
}

export const TableResizeBarDefault: StoryObj = {
  name: 'TableResizeBar / Default',
  render: () => <Wrap><TableResizeBar editor={{{}}} containerRef=null /></Wrap>,
}

export const PreferencesThinIconDefault: StoryObj = {
  name: 'PreferencesThinIcon / Default',
  render: () => <Wrap><PreferencesThinIcon  /></Wrap>,
}

export const TableToolbarDefault: StoryObj = {
  name: 'TableToolbar / Default',
  render: () => <Wrap><TableToolbar editor={{{}}} containerRef=null /></Wrap>,
}

export const SmartCardViewDefault: StoryObj = {
  name: 'SmartCardView / Default',
  render: () => <Wrap><SmartCardView  /></Wrap>,
}
