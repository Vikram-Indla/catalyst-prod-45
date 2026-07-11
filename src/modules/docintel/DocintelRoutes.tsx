/**
 * DocintelRoutes — routing shell for the Arabic Document Intelligence hub.
 * Mounted at /doc-intelligence/* inside CatalystShell (FullAppRoutes).
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { lazy, Suspense } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const HomePage = lazy(() => import("./pages/DocintelHomePage"));
const ReviewStartPage = lazy(() => import("./pages/DocintelReviewStartPage"));
const ThemesPendingPage = lazy(() =>
  import("./pages/DocintelHomePage").then((module) => ({
    default: module.DocintelThemesPendingPage,
  })),
);
const DeliverablesPage = lazy(() => import("./pages/DocintelDeliverablesPage"));
const LibraryPage = lazy(() => import("./pages/DocintelLibraryPage"));
const UploadPage = lazy(() => import("./pages/DocintelUploadPage"));
const HealthPage = lazy(() => import("./pages/DocintelHealthPage"));
const WorkspacePage = lazy(() => import("./pages/DocintelWorkspacePage"));

function DocintelNotFound() {
  const location = useLocation();
  return (
    <div style={{ padding: "var(--ds-space-400)", color: "var(--ds-text-subtle)" }}>
      <p style={{ color: "var(--ds-text)", font: "var(--ds-font-heading-small)", marginBottom: "var(--ds-space-100)" }}>
        This Document Intelligence page doesn't exist
      </p>
      <p style={{ marginBottom: "var(--ds-space-200)" }}>
        No route matches <code>{location.pathname}</code>.
      </p>
      <Link to="/doc-intelligence" style={{ color: "var(--ds-text-brand)" }}>
        Back to Document Intelligence
      </Link>
    </div>
  );
}

const S = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense
      fallback={
        <div style={{ padding: "var(--ds-space-400)", color: "var(--ds-text-subtle)" }}>
          Loading Document Intelligence…
        </div>
      }
    >
      {children}
    </Suspense>
  </ErrorBoundary>
);

export function DocintelRoutes() {
  return (
    <Routes>
      <Route path="" element={<S><HomePage /></S>} />
      <Route path="views/library" element={<S><LibraryPage /></S>} />
      <Route path="views/themes" element={<S><ThemesPendingPage /></S>} />
      <Route path="views/deliverables" element={<S><DeliverablesPage /></S>} />
      <Route path="actions/review" element={<S><ReviewStartPage /></S>} />
      <Route path="upload" element={<S><UploadPage /></S>} />
      <Route path="health" element={<S><HealthPage /></S>} />
      <Route path="source/:slug" element={<S><WorkspacePage /></S>} />
      {/* Legacy one-segment document URLs remain valid during the canonical source-path migration. */}
      <Route path=":slug" element={<S><WorkspacePage /></S>} />
      <Route path="*" element={<S><DocintelNotFound /></S>} />
    </Routes>
  );
}

export default DocintelRoutes;
