/**
 * BrBrdUploadSection — DEPRECATED in cycle 3.
 *
 * The BRD-upload affordance has been folded into the unified
 * `BrAttachmentsSection`, which writes to the same
 * `business_request_links` table with `kind='document'`. This file is
 * retained as a no-op stub so the cycle-1 barrel imports keep compiling
 * — the v2 view no longer mounts it, but external consumers (none today)
 * wouldn't break if they did.
 *
 * Slated for full deletion once cycle 4 mount swaps verify nothing
 * downstream references it.
 */
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request?: BusinessRequest | null;
  onUpdate?: (field: string, value: unknown) => Promise<void>;
}

export function BrBrdUploadSection(_: Props) {
  return null;
}

export default BrBrdUploadSection;
