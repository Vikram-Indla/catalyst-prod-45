/**
 * CatyImproveStrap — the floating "Caty is editing · Esc" pill that
 * sits below the description while the AI stream is in flight. Used by
 * `Description.tsx` instead of the now-deleted CatyStreamingOverlay
 * since the stream is piped directly into the editor.
 *
 * Only renders during `analyzing` / `streaming`. Errored state is
 * surfaced by the consumer (Description) as a small inline error row.
 */
import { useEffect } from "react";
import type { CatyImprovePhase } from "./useCatyImproveStream";
import "./caty-streaming-overlay.css";

const catalystAiLogo = "/caty.svg";

export interface CatyImproveStrapProps {
  phase: CatyImprovePhase;
  /** Called when the user presses Esc or clicks the stop button. */
  onStop: () => void;
}

export function CatyImproveStrap({ phase, onStop }: CatyImproveStrapProps) {
  // Esc → stop, but only while the stream is active. Capture phase so
  // we beat the editor's bubble-phase listener (CLAUDE.md 2026-05-08).
  useEffect(() => {
    if (phase !== "analyzing" && phase !== "streaming") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      onStop();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [phase, onStop]);

  if (phase !== "analyzing" && phase !== "streaming") return null;

  return (
    <div className="caty-improve__strap-anchor">
      <div className="caty-improve__strap caty-pill-enter">
        <img
          src={catalystAiLogo}
          alt=""
          width={20}
          height={20}
          className={
            phase === "analyzing"
              ? "caty-improve__strap-logo caty-pulse"
              : "caty-improve__strap-logo"
          }
        />
        <span className="caty-improve__strap-label">
          {phase === "analyzing" ? "Caty is analyzing" : "Caty is editing"}
        </span>
        <span className="caty-improve__strap-esc">Esc</span>
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop"
          title="Stop"
          className="caty-improve__strap-stop"
        >
          <span className="caty-improve__strap-stop-icon" />
        </button>
      </div>
    </div>
  );
}
