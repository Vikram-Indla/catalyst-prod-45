/**
 * DockMoreTab — Slack-mobile "More" tab (bottom nav). Entry: "Assigned to you"
 * → opens a full-screen detail listing the current user's assigned work items
 * (real ph_work_items data), each row deep-links to the work item.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { JiraIssueTypeIcon } from "@/lib/jira-issue-type-icons";
import { StatusLozenge } from "@/components/shared/StatusLozenge/StatusLozenge";
import { browseRoutes } from "@/lib/routes";
import { useMyAssignedWork } from "@/hooks/chat/useMyAssignedWork";

const S = (path: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

function AssignedDetail({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { items, isLoading } = useMyAssignedWork();

  return (
    <div className="cc-cardv" role="region" aria-label="Assigned to you">
      <div className="cc-cardv__hdr">
        <button type="button" className="cc-cvh__back" onClick={onBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="cc-cardv__title">Assigned to you</span>
      </div>

      <div className="cc-cardv__body">
        {isLoading ? (
          <div className="cc-catys__empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="cc-catys__empty">Nothing assigned to you</div>
        ) : (
          <div className="cc-cardsheet__list">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                className="cc-assign__row"
                onClick={() => navigate(browseRoutes.issue(it.itemKey))}
              >
                <span className="cc-assign__icon" aria-hidden>
                  <JiraIssueTypeIcon type={it.typeName} size={16} />
                </span>
                <span className="cc-assign__body">
                  <span className="cc-assign__title">
                    <span className="cc-assign__key">{it.itemKey}</span> {it.title}
                  </span>
                  {it.statusName && (
                    <span className="cc-assign__meta">
                      <StatusLozenge status={it.statusName} statusCategory={it.statusCategory ?? undefined} size="sm" />
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DockMoreTab() {
  const [assignedOpen, setAssignedOpen] = useState(false);

  if (assignedOpen) return <AssignedDetail onBack={() => setAssignedOpen(false)} />;

  return (
    <div className="cc-more">
      <div className="cc-tab-hdr">More</div>
      <button type="button" className="cc-more__entry" onClick={() => setAssignedOpen(true)}>
        <span className="cc-more__entry-icon" aria-hidden>
          {S(<><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></>)}
        </span>
        <span className="cc-more__entry-body">
          <span className="cc-more__entry-label">Assigned to you</span>
          <span className="cc-more__entry-sub">Tick off your tasks</span>
        </span>
      </button>
    </div>
  );
}

export default DockMoreTab;
