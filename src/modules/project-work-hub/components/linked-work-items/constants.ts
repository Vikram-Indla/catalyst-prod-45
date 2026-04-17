/**
 * LinkedWorkItems — constants.
 *
 * The link-type vocabulary is re-exported from the canonical constants file
 * under `story-detail-modules/constants.ts` so we never diverge from the
 * existing Catalyst + Jira-parity list. Any new link type must be added there
 * first.
 */
import { LINK_TYPE_OPTIONS as BASE_LINK_TYPE_OPTIONS } from '../dialogs/story-detail-modules/constants';
import type { LinkTypeOption } from './types';

export const LINK_TYPES: LinkTypeOption[] = BASE_LINK_TYPE_OPTIONS.map((v) => ({
  value: v,
  label: v,
}));

export const DEFAULT_LINK_TYPE = LINK_TYPES[0]?.value ?? 'relates to';

export const ATLASKIT_BOUNDARY_TAG = 'linked-work-items';
