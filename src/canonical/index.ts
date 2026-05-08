/**
 * Canonical field system — public barrel.
 *
 * Import from here, not from the sub-files, so internal structure can
 * change without breaking hub consumers.
 *
 *   import { FIELD_ID, FIELD_MANIFESTS } from '@/canonical';
 */
export {
  FIELD_ID,
  FIELD_MANIFESTS,
} from './field-registry';
export type {
  FieldId,
  FieldRenderMode,
  FieldManifest,
  HubSurface,
  AdsComplianceTier,
} from './field-registry';
