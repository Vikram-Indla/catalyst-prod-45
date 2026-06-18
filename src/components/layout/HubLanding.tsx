/**
 * HubLanding — smart index-route resolvers for the Project and Product hubs.
 *
 * Mounted at /project-hub and /product-hub (replacing the old dumb
 * <Navigate to=".../projects">). Every entry path — hub-switcher click,
 * ⌘4/⌘5, typed URL, breadcrumb — resolves through here, so the landing
 * rule lives in exactly one place (CLAUDE.md adopt-canonical / single
 * source of truth).
 *
 * Recency (the common case) resolves synchronously on mount → instant
 * redirect, no spinner flash. The membership-by-activity fallback is the
 * only path that awaits the DB, and only that path shows the spinner.
 */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import {
  readMostRecentKey,
  projectLandingPath,
  productLandingPath,
  resolveDefaultProjectPath,
  resolveDefaultProductPath,
  PROJECT_LIST_PATH,
  PRODUCT_LIST_PATH,
} from '@/lib/hubLanding';

function LandingSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%', minHeight: 240,
    }}>
      <Spinner size="large" label="Loading your workspace" />
    </div>
  );
}

export function ProjectHubLanding() {
  // Recency wins instantly; null means we must hit the membership fallback.
  const [target, setTarget] = useState<string | null>(() => {
    const key = readMostRecentKey('project');
    return key ? projectLandingPath(key) : null;
  });

  useEffect(() => {
    if (target) return;
    let active = true;
    resolveDefaultProjectPath()
      .then((path) => { if (active) setTarget(path); })
      .catch(() => { if (active) setTarget(PROJECT_LIST_PATH); });
    return () => { active = false; };
  }, [target]);

  return target ? <Navigate to={target} replace /> : <LandingSpinner />;
}

export function ProductHubLanding() {
  const [target, setTarget] = useState<string | null>(() => {
    const key = readMostRecentKey('product');
    return key ? productLandingPath(key) : null;
  });

  useEffect(() => {
    if (target) return;
    let active = true;
    resolveDefaultProductPath()
      .then((path) => { if (active) setTarget(path); })
      .catch(() => { if (active) setTarget(PRODUCT_LIST_PATH); });
    return () => { active = false; };
  }, [target]);

  return target ? <Navigate to={target} replace /> : <LandingSpinner />;
}
