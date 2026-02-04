// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES: T10Routes
// Purpose: Route configuration for Task¹⁰ module
// Prompt 9 of 9 Complete Rebuild
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { T10LandingPageV3 } from '../components/landing/T10LandingPageV3';
import { T10CompletedPage } from '../pages/T10CompletedPage';
import { T10WeekViewNew } from '../components/week/T10WeekViewNew';

export function T10Routes() {
  return (
    <Routes>
      {/* Landing page - List of all T10 lists */}
      <Route index element={<T10LandingPageV3 />} />

      {/* Completed weeks verification view */}
      <Route path="completed" element={<T10CompletedPage />} />

      {/* List detail - redirects to current week */}
      <Route path="list/:listId" element={<T10WeekViewNew />} />

      {/* Week view - specific week */}
      <Route path="list/:listId/week/:weekId" element={<T10WeekViewNew />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/taskhub/task10" replace />} />
    </Routes>
  );
}

export default T10Routes;
