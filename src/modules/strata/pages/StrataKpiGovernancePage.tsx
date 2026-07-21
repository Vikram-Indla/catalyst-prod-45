/**
 * /strata/kpi-governance — preserved deep link (CAT-STRATA-KPIGOV-ENTRY-20260721-001).
 *
 * The governed KPI Assignment / classification / project-objective-alignment capability now
 * lives inside the KPIs & OKRs tabbed surface (discoverable from the STRATA nav). This route
 * redirects there so existing bookmarks and links keep resolving, while no longer being the
 * ONLY way to reach the capability. The reusable sections live in
 * components/kpiGovernanceSections.tsx and are mounted by the tab shell and by the KPI /
 * Strategic Objective / Project Card journeys.
 */
import { Navigate } from 'react-router-dom';
import { Routes } from '@/lib/routes';

export default function StrataKpiGovernancePage() {
  return <Navigate to={`${Routes.strata.kpis()}?tab=governance`} replace />;
}
