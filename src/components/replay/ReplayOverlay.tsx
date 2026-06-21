/**
 * ReplayOverlay — thin wrapper that delegates to ReplayTheatreOverlay with SEED_BR_SCRIPT.
 *
 * The rootKey prop is accepted for API compatibility but the overlay always renders
 * the demo seed script (SEED_BR_SCRIPT). When live Jira changelog data is available,
 * swap SEED_BR_SCRIPT for a dynamically built TheatreScript.
 */
import React from 'react';
import { ReplayTheatreOverlay } from './theatre/ReplayTheatreOverlay';
import { SEED_BR_SCRIPT } from '@/lib/replay/theatre/seedData';

interface ReplayOverlayProps {
  rootKey: string;
  onClose: () => void;
}

export function ReplayOverlay({ onClose }: ReplayOverlayProps) {
  return <ReplayTheatreOverlay script={SEED_BR_SCRIPT} onClose={onClose} />;
}
