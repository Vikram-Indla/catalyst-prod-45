import React from "react";
import { createPortal } from "react-dom";
import type { ReplayJourney } from "@/lib/replay/liveReplayTypes";

/**
 * CatalystReplay — drop-in, pixel-perfect lifecycle replay overlay.
 *
 * Renders public/catalyst-replay/index.html inside an isolated iframe.
 * Full style isolation — Catalyst CSS cannot leak in, iframe CSS cannot leak out.
 *
 * v2: supports `mode` + `journey` props for live-data path.
 *   mode="demo"  → iframe runs its built-in sample journey (original behaviour)
 *   mode="live"  → iframe receives a ReplayJourney via postMessage after load
 */
export interface CatalystReplayProps {
  mode?: "demo" | "live";
  /** Work-item key forwarded in the iframe URL (used by demo mode). */
  rootKey?: string;
  /** Live journey to post into the iframe after load. Required when mode="live". */
  journey?: ReplayJourney;
  /** Called when the user closes the replay (✕ inside the overlay, or Esc). */
  onClose?: () => void;
}

const REPLAY_APP_URL = "/catalyst-replay/index.html";

export function CatalystReplay({
  mode = "demo",
  rootKey,
  journey,
  onClose,
}: CatalystReplayProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Listen for close signal from embedded app
  React.useEffect(() => {
    function handle(e: MessageEvent) {
      if (e?.data && e.data.type === "catalyst-replay-close") onClose?.();
    }
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [onClose]);

  // Post live journey after iframe loads
  function handleLoad() {
    if (mode === "live" && journey && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "catalyst-replay-journey", journey },
        window.location.origin,
      );
    }
  }

  const src =
    `${REPLAY_APP_URL}?embed=1` +
    (rootKey ? `&rootKey=${encodeURIComponent(rootKey)}` : "");

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Catalyst Replay"
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "var(--ds-surface)" }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title="Catalyst Replay"
        onLoad={handleLoad}
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </div>,
    document.body,
  );
}

export default CatalystReplay;
