/**
 * AstryxProvider — Ring-fenced scope for Astryx design system
 *
 * Astryx CSS variables are NOT installed globally. Instead, this wrapper
 * creates a scoped `.astryx-zone` container where Astryx components render
 * in isolation, with token mappings bridging to Catalyst ADS tokens.
 *
 * Light-mode-first. Dark mode support deferred to Phase 2.
 *
 * Usage:
 *   <AstryxZone>
 *     <StrategyHubPages />
 *   </AstryxZone>
 *
 * Mount points: /strategy/*, /ideas/* routes only.
 * Not mounted: CatalystShell, AdminLayout, global nav.
 */

import React, { ReactNode } from 'react';
import styles from './AstryCSSScope.module.css';

interface AstryxZoneProps {
  children: ReactNode;
}

export function AstryxZone({ children }: AstryxZoneProps) {
  return (
    <div
      className={styles.astryxZone}
      data-astryx-theme="neutral"
      role="region"
      aria-label="Astryx design system zone"
    >
      {children}
    </div>
  );
}

export default AstryxZone;
