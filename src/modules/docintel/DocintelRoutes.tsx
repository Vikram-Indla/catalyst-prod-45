/**
 * DocintelRoutes — routing shell for the Arabic Document Intelligence hub.
 * Mounted at /doc-intelligence/* inside CatalystShell (FullAppRoutes).
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { lazy, Suspense } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const DocumentsPage = lazy(() => import("./pages/DocintelDocumentsPage"));
const UploadPage = lazy(() => import("./pages/DocintelUploadPage"));
const WorkspacePage = lazy(() => import("./pages/DocintelWorkspacePage"));

function DocintelNotFound() {
  const location = useLocation();
  return (
    <div style={{ padding: 32, color: "var(--ds-text-subtle)" }}>
      <p style={{ color: "var(--ds-text)", fontWeight: 600, marginBottom: 8 }}>
        This Document Intelligence page doesn't exist
      </p>
      <p style={{ marginBottom: 16 }}>
        No route matches <code>{location.pathname}</code>.
      </p>
      <Link to="/doc-intelligence" style={{ color: "var(--ds-text-brand)" }}>
        Back to Documents
      </Link>
    </div>
  );
}

const S = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense
      fallback={
        <div style={{ padding: 32, color: "var(--ds-text-subtle)" }}>
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
      <Route path="" element={<S><DocumentsPage /></S>} />
      <Route path="upload" element={<S><UploadPage /></S>} />
      <Route path=":slug" element={<S><WorkspacePage /></S>} />
      <Route path="*" element={<S><DocintelNotFound /></S>} />
    </Routes>
  );
}

export default DocintelRoutes;
