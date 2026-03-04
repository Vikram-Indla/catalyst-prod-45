/**
 * Edge Function references for Req Assist™ pipeline.
 * These functions are registered here for invocation from the frontend.
 * Implementations are deployed separately.
 */
export const BRD_EDGE_FUNCTIONS = {
  upload: 'brd-upload',
  process: 'brd-process',
  webhook: 'brd-webhook',
  harvest: 'brd-harvest',
  kbSync: 'kb-sync',
} as const;
