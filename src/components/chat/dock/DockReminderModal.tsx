/**
 * DockReminderModal — dock-native "New reminder" surface (replaces the shared
 * viewport-centred CreateReminderModal inside the dock). Slack-mobile pattern:
 * a "Remind me to…" field + quick-time chips, opened as an in-dock overlay so
 * the user can still move around the dock. Emits the same {reminderText,
 * remindAtIso} contract LaterPanel expects.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React, { useEffect, useRef, useState } from "react";
import Textfield from "@atlaskit/textfield";

interface DockReminderModalProps {
  onCancel: () => void;
  onSave: (input: { reminderText: string; remindAtIso: string }) => void;
}

type PresetKey = "20m" | "1h" | "3h" | "tomorrow" | "nextweek";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "20m", label: "In 20 minutes" },
  { key: "1h", label: "In 1 hour" },
  { key: "3h", label: "In 3 hours" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "nextweek", label: "Next week" },
];

function presetIso(key: PresetKey): string {
  const d = new Date();
  switch (key) {
    case "20m": d.setMinutes(d.getMinutes() + 20); break;
    case "1h": d.setHours(d.getHours() + 1); break;
    case "3h": d.setHours(d.getHours() + 3); break;
    case "tomorrow": d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); break;
    case "nextweek": d.setDate(d.getDate() + (((1 - d.getDay() + 7) % 7) || 7)); d.setHours(9, 0, 0, 0); break;
  }
  return d.toISOString();
}

export function DockReminderModal({ onCancel, onSave }: DockReminderModalProps) {
  const [text, setText] = useState("");
  const [when, setWhen] = useState<PresetKey>("20m");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const canSave = text.trim().length > 0;
  const submit = () => {
    if (!canSave) return;
    onSave({ reminderText: text.trim(), remindAtIso: presetIso(when) });
  };

  return (
    <div className="cc-nm" role="dialog" aria-modal="true" aria-label="New reminder">
      <div className="cc-nm__head">
        <button type="button" className="cc-nm__close" onClick={onCancel} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <span className="cc-nm__title">New reminder</span>
      </div>

      <div className="cc-rem__body">
        <label className="cc-rem__label" htmlFor="cc-rem-text">Remind me to…</label>
        <Textfield
          ref={inputRef}
          id="cc-rem-text"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="e.g. follow up with Vikram"
          aria-label="Reminder text"
        />

        <div className="cc-rem__label">When</div>
        <div className="cc-rem__chips" role="radiogroup" aria-label="When to remind">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={when === p.key}
              className={`cc-dms__chip${when === p.key ? " cc-dms__chip--active" : ""}`}
              onClick={() => setWhen(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cc-rem__footer">
        <button type="button" className="cc-rem__cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="cc-rem__save" onClick={submit} disabled={!canSave}>Create</button>
      </div>
    </div>
  );
}

export default DockReminderModal;
