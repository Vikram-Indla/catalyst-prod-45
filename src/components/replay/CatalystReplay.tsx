import React from "react";
import { createPortal } from "react-dom";

/**
 * CatalystReplay — drop-in, pixel-perfect lifecycle replay overlay.
 *
 * This is the APPROVED design, shipped exactly as built. It renders the
 * self-contained replay app (public/catalyst-replay/index.html) inside an
 * isolated iframe, so:
 *   • it looks 100% identical to the approved prototype (same code, same pixels)
 *   • Catalyst's global CSS cannot leak in and distort it, and its styles
 *     cannot leak out and affect Catalyst (full style isolation)
 *   • there are zero dependency / version conflicts
 *
 * Public API is intentionally tiny and matches the existing mount points:
 *   <CatalystReplay rootKey="BR-204" onClose={() => setShowReplay(false)} />
 *
 * NOTE (v1): the replay runs on the built-in sample journey (BR-204). Wiring it
 * to live data is a later, additive step — see README. `rootKey` is forwarded
 * to the app now so that wiring requires no signature change.
 */
export interface CatalystReplayProps {
  /** Work-item key to replay (e.g. a Business Request key). Forwarded to the app. */
  rootKey?: string;
  /** Called when the user closes the replay (✕ inside the overlay, or Esc). */
  onClose?: () => void;
}

// public/ is served at the site root by Vite, so this path is stable on every route.
const REPLAY_APP_URL = "/catalyst-replay/index.html";

export function CatalystReplay({ rootKey, onClose }: CatalystReplayProps) {
  // Listen for the close signal the embedded app posts when ✕ / Esc is used.
  React.useEffect(() => {
    function handle(e: MessageEvent) {
      if (e?.data && e.data.type === "catalyst-replay-close") onClose?.();
    }
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [onClose]);

  const src =
    `${REPLAY_APP_URL}?embed=1` +
    (rootKey ? `&rootKey=${encodeURIComponent(rootKey)}` : "");

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Catalyst Replay"
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "#fff" }}
    >
      <iframe
        src={src}
        title="Catalyst Replay"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </div>,
    document.body
  );
}

export default CatalystReplay;
