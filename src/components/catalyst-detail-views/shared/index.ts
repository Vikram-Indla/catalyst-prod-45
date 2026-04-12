export { CatalystViewBase } from './CatalystViewBase';
export type { CatalystViewBaseLayoutProps } from './CatalystViewBase';
export type * from './types';

// Canonical hooks
export {
  useCatalystIssue,
  useCatalystComments,
  useCatalystActivity,
  useCatalystAvatarProfile,
  useCatalystIssueMutations,
} from './hooks';

// Canonical sections
export {
  CatalystTitleEditor,
  CatalystDescriptionSection,
  CatalystAcceptanceCriteria,
  CatalystPriorityField,
  CatalystActivitySection,
  CatalystSidebarDetails,
} from './sections';
