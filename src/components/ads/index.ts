/**
 * ADS — Catalyst wrapper layer over @atlaskit/*.
 *
 * Public surface. Consumers:
 *
 *   import { Button, StatusLozenge, InlineEdit } from '@/components/ads';
 *
 * Deep imports (`import Button from '@/components/ads/Button'`) are blocked
 * by ESLint — they couple callers to the wrapper file structure, which is
 * an internal concern. This barrel is the stable contract.
 */

/* Core primitives */
export { Button, IconButton } from './Button';
export type { ButtonProps, IconButtonProps, ButtonAppearance, ButtonSpacing } from './Button';

export { Lozenge, StatusLozenge, LegacyBadge } from './Lozenge';
export type {
  LozengeProps,
  LozengeAppearance,
  StatusLozengeProps,
  StatusCategory,
  LegacyBadgeProps,
  LegacyBadgeVariant,
} from './Lozenge';
export { toStatusCategory } from './internal/status';

export { Avatar, AvatarItem, AvatarGroup } from './Avatar';
export type {
  AvatarProps,
  AvatarItemProps,
  AvatarGroupProps,
  AvatarGroupData,
  AvatarSize,
  AvatarPresence,
  AvatarShape,
} from './Avatar';

export { Tooltip } from './Tooltip';
export type { TooltipProps, TooltipPosition } from './Tooltip';

export { Spinner } from './Spinner';
export type { SpinnerProps, SpinnerSize } from './Spinner';

export { Heading } from './Heading';
export type { HeadingProps, HeadingLevel, HeadingSize } from './Heading';

/* Surface primitives */
export { Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbsProps, BreadcrumbItem, BreadcrumbLinkComponent } from './Breadcrumbs';

export { Popup } from './Popup';
export type { PopupProps, PopupPlacement, PopupTriggerProps } from './Popup';

export { DropdownMenu, DropdownItem, DropdownItemGroup } from './DropdownMenu';
export type {
  DropdownMenuProps,
  DropdownMenuItem,
  DropdownMenuGroup,
} from './DropdownMenu';

export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

export { Textfield } from './Textfield';
export type { TextfieldProps } from './Textfield';

export { InlineEdit } from './InlineEdit';
export type { InlineEditProps, InlineEditFieldProps } from './InlineEdit';

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from './Modal';
export type { ModalProps, ModalWidth } from './Modal';

export { DynamicTable } from './DynamicTable';
export type {
  DynamicTableProps,
  DynamicTableRow,
  DynamicTableHead,
  DynamicTableSortKey,
  DynamicTableSortOrder,
} from './DynamicTable';

export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { SectionMessage } from './SectionMessage';
export type { SectionMessageProps, SectionMessageAppearance } from './SectionMessage';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Flag, FlagGroup } from './Flag';
export type { FlagProps, FlagGroupProps, FlagAppearance } from './Flag';

export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps, ProgressBarAppearance } from './ProgressBar';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { AtlaskitPageShell } from './AtlaskitPageShell';
export type { AtlaskitPageShellProps } from './AtlaskitPageShell';

export { TruncateCell } from './TruncateCell';
export type { TruncateCellProps } from './TruncateCell';
