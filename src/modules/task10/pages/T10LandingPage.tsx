// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: T10LandingPage
// Purpose: Entry point used by the app router for /taskhub/task10
// NOTE: This now delegates to the V3 landing implementation (tabs: This Week / Completed / Archived)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { T10LandingPageV3 } from '../components/landing/T10LandingPageV3';

export function T10LandingPage() {
  return <T10LandingPageV3 />;
}

export default T10LandingPage;
