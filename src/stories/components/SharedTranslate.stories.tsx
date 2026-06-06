/**
 * Components/Shared/Translate — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { BizArabicTranslateLink } from '@/components/shared/title-translate/BizArabicTranslateLink';
import { DescriptionTranslateBar } from '@/components/shared/title-translate/DescriptionTranslateBar';
import { TitleTranslateWrapper } from '@/components/shared/title-translate/TitleTranslateWrapper';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/Shared/Translate' };

export const BizArabicTranslateLinkDefault: StoryObj = {
  name: 'BizArabicTranslateLink / Default',
  render: () => <Wrap><BizArabicTranslateLink issueKey="test-value" original="test-value" /></Wrap>,
}

export const DescriptionTranslateBarDefault: StoryObj = {
  name: 'DescriptionTranslateBar / Default',
  render: () => <Wrap><DescriptionTranslateBar plainText="test-value" issueKey="BAU-5972" isTranslated=false onTranslated={fn()} onRevert={fn()} /></Wrap>,
}

export const TitleTranslateWrapperDefault: StoryObj = {
  name: 'TitleTranslateWrapper / Default',
  render: () => <Wrap><TitleTranslateWrapper value="test-value" onValueChange={fn()} /></Wrap>,
}
