/**
 * For You Page Header - Title + subtitle
 * MARAM V3.1 · fy- ring-fenced · Theme-aware
 *
 * Apr 2026: Intelligence button removed — its functionality (department
 * picker → DepartmentIntelligenceOverlay) is now hosted by the top-nav
 * "Ask Caty" pill, scoped to the /for-you route only.
 */

export function ForYouHeader() {
  return (
    <header className="fy-header" style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20,
    }}>
      <div>
        <h1 style={{
          fontFamily: "'Sora', system-ui", fontSize: 22, fontWeight: 700,
          color: 'var(--cp-t1)', letterSpacing: '-0.025em', margin: 0,
        }}>
          For You
        </h1>
        <p style={{ fontSize: 13, color: 'var(--cp-t3)', marginTop: 2 }}>
          Your work across all projects and hubs
        </p>
      </div>
    </header>
  );
}
