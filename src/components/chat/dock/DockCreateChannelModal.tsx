/**
 * DockCreateChannelModal — Slack "Create a Channel" screen. X + Next header,
 * a name field and an info banner. Next inserts a custom channel and opens it.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { catalystToast } from "@/lib/catalystToast";

interface DockCreateChannelModalProps {
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function DockCreateChannelModal({ onClose, onSelect }: DockCreateChannelModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const canNext = name.trim().length > 0 && !submitting;

  const create = async () => {
    const title = name.trim();
    if (!title || !user) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ kind: "custom_channel", title, project_key: null, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) {
      catalystToast.error(error?.message ?? "Failed to create channel");
      setSubmitting(false);
      return;
    }
    qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    qc.invalidateQueries({ queryKey: ["chat-list"] });
    qc.invalidateQueries({ queryKey: ["chat", "custom-channel-count"] });
    onSelect((data as { id: string }).id);
    onClose();
  };

  return (
    <div className="cc-nm" role="dialog" aria-modal="true" aria-label="Create a channel">
      <div className="cc-nm__head">
        <button type="button" className="cc-nm__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <span className="cc-nm__title">Create a Channel</span>
        <button
          type="button"
          className="cc-nm__next"
          onClick={create}
          disabled={!canNext}
        >
          Next
        </button>
      </div>

      <div className="cc-cc__field">
        <div className="cc-cc__label">Name</div>
        <div className="cc-cc__input-wrap">
          <span className="cc-cc__hash" aria-hidden>#</span>
          <input
            ref={inputRef}
            className="cc-cc__input"
            value={name}
            onChange={(e) => setName(e.target.value.replace(/\s+/g, "-").toLowerCase())}
            onKeyDown={(e) => { if (e.key === "Enter" && canNext) create(); }}
            placeholder="project-pigeon"
            aria-label="Channel name"
          />
        </div>
      </div>

      <div className="cc-cc__banner">
        <span className="cc-cc__banner-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
          </svg>
        </span>
        <span className="cc-cc__banner-text">Channels are where conversations happen around a topic. Use a name that's easy to find and understand.</span>
      </div>
    </div>
  );
}

export default DockCreateChannelModal;
