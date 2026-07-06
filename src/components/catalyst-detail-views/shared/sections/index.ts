export { CatalystTitleEditor } from './CatalystTitleEditor';
export { CatalystQuickActions } from './CatalystQuickActions';
/* CatalystDescriptionSection is the legacy description renderer kept
   here so any remaining ad-hoc consumer that imports it from the
   barrel doesn't break. Every new view MUST use `Description` from
   `./Description` instead — that's the canonical Tiptap surface with
   line-numbered code blocks, Prism syntax highlighting, mentions,
   tables, images, and full Jira-parity toolbar. */
export { CatalystDescriptionSection } from './CatalystDescriptionSection';
export { Description } from './Description';
export { CatalystAcceptanceCriteria } from './CatalystAcceptanceCriteria';
export { CatalystActivitySection } from './CatalystActivitySection';
export { CatalystSidebarDetails } from './CatalystSidebarDetails';
export { CatalystPriorityField } from './CatalystPriorityField';
export { CatalystParentLinker } from './CatalystParentLinker';
export { CatalystKeyDetails, KeyDetailsFieldRow } from './CatalystKeyDetails';
export { StatusLozengeDropdown } from '@/components/shared/StatusLozenge';
export { CatalystAttachmentsPanel } from './CatalystAttachmentsPanel';

export { CatalystPagesSection } from './CatalystPagesSection';
