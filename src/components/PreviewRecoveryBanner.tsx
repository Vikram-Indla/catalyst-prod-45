import { useEffect, useRef, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

/**
 * PreviewRecoveryBanner
 * ─────────────────────
 * Detects a dead preview proxy / dev server by sending a lightweight HEAD
 * heartbeat against the current origin every 5s. Three consecutive failures
 * (or one offline event) flip the banner on. As soon as a ping succeeds again
 * the banner auto-dismisses.
 *
 * Self-contained, zero deps on app providers — safe to mount at the very top
 * of the tree so it survives provider/render crashes elsewhere.
 */
export function PreviewRecoveryBanner() {
  const [recovering, setRecovering] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const failuresRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (cancelled) return;
      setRetrying(true);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        // Cache-bust against the current origin (HEAD on /favicon.ico is cheap
        // and exists in every Vite/Lovable preview).
        const res = await fetch(`/favicon.ico?_hb=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (res.ok || res.status === 304) {
          failuresRef.current = 0;
          if (!cancelled) setRecovering(false);
        } else if (res.status >= 500) {
          failuresRef.current += 1;
        }
      } catch {
        failuresRef.current += 1;
      } finally {
        if (!cancelled) {
          setRetrying(false);
          if (failuresRef.current >= 3) setRecovering(true);
        }
      }
    }

    const interval = window.setInterval(ping, 5000);
    const onOffline = () => setRecovering(true);
    const onOnline = () => {
      failuresRef.current = 0;
      void ping();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!recovering) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "10px 16px",
        background: "#7C2D12",
        color: "#FFF7ED",
        fontFamily: 'var(--cp-font-body)',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
      }}
    >
      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
      <span>
        Preview recovering, retrying
        {retrying ? "…" : ""} The dev server isn't responding right now.
      </span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginLeft: 8,
          padding: "6px 12px",
          background: "#FFF7ED",
          color: "#7C2D12",
          border: "none",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <RefreshCw size={13} />
        Reload now
      </button>
    </div>
  );
}
