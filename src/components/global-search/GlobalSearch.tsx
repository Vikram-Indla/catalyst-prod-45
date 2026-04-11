import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Search, Settings2, ChevronDown, X, Clock } from "lucide-react";
import { useGlobalSearchStore } from "@/store/globalSearchStore";
import {
  useRecentItems,
  useSearchResults,
  useTrackView,
  useSaveSearch,
} from "@/hooks/useGlobalSearch";

import type { SearchResult, ActiveFilters, SearchHub, WorkItemType } from "@/types/global-search";
import { useProfileAvatarsByName } from "@/hooks/useProfileAvatars";
import { useThemeMode } from "@/providers/ThemeProvider";

/* ─── CANONICAL WORK ITEM SVG ICONS (16×14 inline) ─── */
const WORK_ICONS: Record<string, { label: string; svg: string }> = {
  bug: {
    label: "Bug",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#E5493A" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M12,17 C14.761,17 17,14.761 17,12 C17,9.239 14.761,7 12,7 C9.239,7 7,9.239 7,12 C7,14.761 9.239,17 12,17 Z"/></svg>`,
  },
  task: {
    label: "Task",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#4BADE8" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M6,4 C4.895,4 4,4.895 4,6 L4,18 C4,19.105 4.895,20 6,20 L18,20 C19.105,20 20,19.105 20,18 L20,6 C20,4.895 19.105,4 18,4 L6,4 Z M6,6 L18,6 L18,18 L6,18 Z"/></svg>`,
  },
  story: {
    label: "Story",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#63BA3C" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M15.647,19.515 L16.937,17.987 L12,13.82 L7.061,17.987 L7,18.153 L7,6.688 C7,6.348 7.412,6 8,6 L16,6 C16.587,6 17,6.349 17,6.688 L17,18.153 Z"/></svg>`,
  },
  epic: {
    label: "Epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#904EE2" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M18.188,9.4 L15.125,9.4 L15.125,4.8 C15.125,3.803 14.31,3 13.313,3 L5,12.8 C5,13.81 5.819,14.399 6.77,14.56 L9.875,14.574 L9.875,19.2 C9.875,20.197 10.69,21 11.688,21 L20,11.2 C20,10.203 19.185,9.4 18.188,9.4 Z"/></svg>`,
  },
  subtask: {
    label: "Subtask",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#4BADE8" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M6,4 C4.895,4 4,4.895 4,6 L4,18 C4,19.105 4.895,20 6,20 L18,20 C19.105,20 20,19.105 20,18 L20,6 C20,4.895 19.105,4 18,4 L6,4 Z M6,6 L18,6 L18,18 L6,18 Z"/></svg>`,
  },
  incident: {
    label: "Incident",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#E5493A" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M12,4 C11.448,4 11,4.448 11,5 L11,14 C11,14.552 11.448,15 12,15 C12.552,15 13,14.552 13,14 L13,5 C13,4.448 12.552,4 12,4 Z M12,17 C11.448,17 11,17.448 11,18 C11,18.552 11.448,19 12,19 C12.552,19 13,18.552 13,18 C13,17.448 12.552,17 12,17 Z"/></svg>`,
  },
  new_feature: {
    label: "New Feature",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#63BA3C" fill-rule="evenodd" d="M13,11 L13,5 C13,4.448 12.552,4 12,4 C11.448,4 11,4.448 11,5 L11,11 L5,11 C4.448,11 4,11.448 4,12 C4,12.552 4.448,13 5,13 L11,13 L11,19 C11,19.552 11.448,20 12,20 C12.552,20 13,19.552 13,19 L13,13 L19,13 C19.552,13 20,12.552 20,12 C20,11.448 19.552,11 19,11 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
  },
  improvement: {
    label: "Improvement",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#4BADE8" fill-rule="evenodd" d="M13,7.422 L16.284,10.707 C16.674,11.098 17.307,11.098 17.698,10.707 C18.088,10.317 18.088,9.684 17.698,9.293 L12.7,4.293 C12.31,3.902 11.676,3.902 11.286,4.293 L6.288,9.293 C5.897,9.684 5.897,10.317 6.288,10.707 C6.679,11.098 7.312,11.098 7.702,10.707 L11,7.408 L11,19 C11,19.552 11.448,20 12,20 C12.552,20 13,19.552 13,19 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
  },
};

const HUB_COLORS: Record<string, string> = {
  StrategyHub: "#15803D", ProductHub: "#3F3F46", ProjectHub: "#2563EB",
  ReleaseHub: "#7C3AED", TestHub: "#0D9488", IncidentHub: "#DC2626",
  TaskHub: "#525252", PlanHub: "#0284C7",
};

const HUB_ROUTES: Record<string, string> = {
  StrategyHub: "/strategy-hub", ProductHub: "/product-hub", ProjectHub: "/project-hub",
  ReleaseHub: "/release-hub", TestHub: "/test-hub", IncidentHub: "/incident-hub",
  TaskHub: "/task-hub", PlanHub: "/plan-hub",
};

const ALL_TYPES: { key: string; label: string }[] = Object.entries(WORK_ICONS).map(([k, v]) => ({ key: k, label: v.label }));

function mapType(raw: string | null | undefined): string {
  if (!raw) return "task";
  const v = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (v.includes("bug") || v.includes("qa")) return "bug";
  if (v.includes("story")) return "story";
  if (v.includes("epic")) return "epic";
  if (v.includes("incident")) return "incident";
  if (v.includes("feature")) return "new_feature";
  if (v.includes("improve")) return "improvement";
  if (v.includes("subtask")) return "subtask";
  return "task";
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type DateGroup = "Today" | "Yesterday" | "This Week" | "Earlier";

function getDateGroup(dateStr: string): DateGroup {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1 && now.getDate() === then.getDate()) return "Today";
  if (diffDays < 2) return "Yesterday";
  if (diffDays < 7) return "This Week";
  return "Earlier";
}

function groupRecentItems(items: SearchResult[]): { group: DateGroup; items: SearchResult[] }[] {
  const ORDER: DateGroup[] = ["Today", "Yesterday", "This Week", "Earlier"];
  const map: Record<string, SearchResult[]> = {};
  for (const item of items) {
    const g = getDateGroup(item.viewed_at);
    if (!map[g]) map[g] = [];
    map[g].push(item);
  }
  return ORDER.filter(g => map[g]?.length > 0).map(g => ({ group: g, items: map[g] }));
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = ["#2563EB","#7C3AED","#0D9488","#DC2626","#D97706","#059669"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ── ResultRow (breathable 50px) ── */
function ResultRow({ item, isSelected, onHover, onClick, avatarMap }: {
  item: SearchResult; isSelected: boolean; onHover: () => void; onClick: () => void;
  avatarMap: Map<string, string>;
}) {
  const typeKey = mapType(item.item_type);
  const icon = WORK_ICONS[typeKey] ?? WORK_ICONS.task;
  const hubColor = HUB_COLORS[item.hub] || "#525252";
  const hubShort = item.hub.replace("Hub", "");

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      style={{
        display: "flex", alignItems: "center", minHeight: 50,
        padding: "8px 20px", gap: 12, cursor: "pointer",
        backgroundColor: isSelected ? "var(--gs-selected)" : "transparent",
        borderBottom: "0.75px solid var(--gs-border-subtle)",
        transition: "background 80ms ease",
      }}
    >
      <span
        style={{ flexShrink: 0, width: 16, height: 16 }}
        dangerouslySetInnerHTML={{ __html: icon.svg }}
      />
      <span style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: 11.5,
        color: "var(--gs-key)", fontWeight: 600, flexShrink: 0, minWidth: 80,
      }}>
        {item.item_key}
      </span>
      <span style={{
        flex: 1, fontSize: 13.5, color: "var(--gs-text)", fontFamily: "Inter, sans-serif",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        fontWeight: 450, lineHeight: 1.4,
      }}>
        {item.title}
      </span>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        fontSize: 11.5, color: "var(--gs-text-secondary)", fontFamily: "Inter, sans-serif",
      }}>
        {item.project_name && (
          <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.project_name}
          </span>
        )}
        {item.project_name && <span style={{ color: "var(--gs-text-muted)" }}>·</span>}
        {item.assignee_name && (
          <>
            {(() => {
              const avatarUrl = avatarMap.get(item.assignee_name!.toLowerCase());
              const ini = getInitials(item.assignee_name!);
              const clr = getAvatarColor(item.assignee_name!);
              return avatarUrl ? (
                <img src={avatarUrl} alt={item.assignee_name!}
                  style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <span style={{
                  width: 24, height: 24, borderRadius: "50%", fontSize: 9, fontWeight: 600,
                  color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: clr, flexShrink: 0,
                }}>
                  {ini}
                </span>
              );
            })()}
            <span style={{ color: "var(--gs-text-muted)" }}>·</span>
          </>
        )}
        <span>{timeAgo(item.viewed_at)}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: "#fff", backgroundColor: hubColor,
          borderRadius: 4, padding: "2px 7px", letterSpacing: "0.02em",
        }}>
          {hubShort}
        </span>
      </div>
    </div>
  );
}

/* ── FilterChip with dropdown ── */
function FilterChip({ label, items, selected, onSelect, avatarMap }: {
  label: string;
  items: { value: string; display: string; svg?: string; color?: string }[];
  selected: string | null;
  onSelect: (v: string | null) => void;
  avatarMap?: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLabel = selected
    ? items.find(i => i.value === selected)?.display || selected
    : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 5, height: 30,
          padding: "0 10px", fontSize: 12, fontFamily: "Inter, sans-serif",
          color: selected ? "var(--gs-chip-active-text)" : "var(--gs-chip-text)", fontWeight: selected ? 500 : 400,
          backgroundColor: selected ? "var(--gs-chip-active-bg)" : "var(--gs-chip-bg)",
          border: `1px solid ${selected ? "var(--gs-chip-active-border)" : "var(--gs-chip-border)"}`,
          borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        {activeLabel || label}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: 34, left: 0, zIndex: 100,
          backgroundColor: "var(--gs-dropdown-bg)", border: "1px solid var(--gs-chip-border)",
          borderRadius: 6, boxShadow: "var(--gs-dropdown-shadow)",
          minWidth: 220, maxHeight: 300, overflowY: "auto",
        }}>
          {selected && (
            <div
              onClick={() => { onSelect(null); setOpen(false); }}
              style={{
                padding: "10px 14px", display: "flex", alignItems: "center",
                fontSize: 12, color: "var(--gs-danger)", cursor: "pointer",
                borderBottom: "0.75px solid var(--gs-border-subtle)",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--gs-danger-hover)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              Clear filter
            </div>
          )}
          {items.map(item => (
            <div
              key={item.value}
              onClick={() => { onSelect(item.value); setOpen(false); }}
              style={{
                padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
                fontSize: 13, color: selected === item.value ? "var(--gs-chip-active-text)" : "var(--gs-text)",
                fontFamily: "Inter, sans-serif", cursor: "pointer",
                backgroundColor: selected === item.value ? "var(--gs-chip-active-bg)" : "transparent",
                fontWeight: selected === item.value ? 500 : 400,
              }}
              onMouseEnter={e => {
                if (selected !== item.value) e.currentTarget.style.backgroundColor = "var(--gs-hover)";
              }}
              onMouseLeave={e => {
                if (selected !== item.value) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {item.svg && (
                <span style={{ flexShrink: 0, width: 14, height: 14 }}
                  dangerouslySetInnerHTML={{ __html: item.svg }} />
              )}
              {item.color && !item.svg && (() => {
                const photoUrl = avatarMap?.get(item.display.toLowerCase());
                if (photoUrl) {
                  return <img src={photoUrl} alt={item.display} style={{
                    width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                  }} />;
                }
                return (
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 26, height: 26, borderRadius: "50%",
                    backgroundColor: item.color, color: "#FFFFFF",
                    fontSize: 10, fontWeight: 600, fontFamily: "Inter, sans-serif",
                    flexShrink: 0, lineHeight: 1,
                  }}>
                    {item.display.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </span>
                );
              })()}
              {item.display}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Searchable Filter Chip (for Assignee) ── */
function SearchableFilterChip({ label, items, selected, onSelect, avatarMap }: {
  label: string;
  items: { value: string; display: string; color?: string }[];
  selected: string | null;
  onSelect: (v: string | null) => void;
  avatarMap?: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  const filtered = items.filter(i =>
    i.display.toLowerCase().includes(search.toLowerCase())
  );

  const activeLabel = selected
    ? items.find(i => i.value === selected)?.display || selected
    : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 5, height: 30,
          padding: "0 10px", fontSize: 12, fontFamily: "Inter, sans-serif",
          color: selected ? "var(--gs-chip-active-text)" : "var(--gs-chip-text)", fontWeight: selected ? 500 : 400,
          backgroundColor: selected ? "var(--gs-chip-active-bg)" : "var(--gs-chip-bg)",
          border: `1px solid ${selected ? "var(--gs-chip-active-border)" : "var(--gs-chip-border)"}`,
          borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        {activeLabel || label}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: 34, left: 0, zIndex: 100,
          backgroundColor: "var(--gs-dropdown-bg)", border: "1px solid var(--gs-chip-border)",
          borderRadius: 6, boxShadow: "var(--gs-dropdown-shadow)",
          minWidth: 240, maxHeight: 320, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "8px 10px",
            borderBottom: "0.75px solid var(--gs-border-subtle)",
          }}>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search assignees..."
              style={{
                width: "100%", height: 32, padding: "0 10px",
                fontSize: 12, fontFamily: "Inter, sans-serif",
                color: "var(--gs-text)", backgroundColor: "var(--gs-chip-bg)",
                border: `1px solid var(--gs-chip-border)`, borderRadius: 4,
                outline: "none", appearance: "none",
                WebkitAppearance: "none", boxShadow: "none",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--gs-chip-active-border)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--gs-chip-border)")}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 260 }}>
            {selected && (
              <div
                onClick={() => { onSelect(null); setOpen(false); }}
                style={{
                  padding: "10px 14px", display: "flex", alignItems: "center",
                  fontSize: 12, color: "var(--gs-danger)", cursor: "pointer",
                  borderBottom: "0.75px solid var(--gs-border-subtle)",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--gs-danger-hover)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                Clear filter
              </div>
            )}
            {filtered.length === 0 ? (
              <div style={{
                padding: "16px 14px", textAlign: "center",
                fontSize: 12, color: "var(--gs-text-muted)", fontFamily: "Inter, sans-serif",
              }}>
                No assignees found
              </div>
            ) : filtered.map(item => {
              const photoUrl = avatarMap?.get(item.display.toLowerCase());
              return (
                <div
                  key={item.value}
                  onClick={() => { onSelect(item.value); setOpen(false); }}
                  style={{
                    padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, color: selected === item.value ? "var(--gs-chip-active-text)" : "var(--gs-text)",
                    fontFamily: "Inter, sans-serif", cursor: "pointer",
                    backgroundColor: selected === item.value ? "var(--gs-chip-active-bg)" : "transparent",
                    fontWeight: selected === item.value ? 500 : 400,
                  }}
                  onMouseEnter={e => {
                    if (selected !== item.value) e.currentTarget.style.backgroundColor = "var(--gs-hover)";
                  }}
                  onMouseLeave={e => {
                    if (selected !== item.value) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt={item.display} style={{
                      width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                    }} />
                  ) : (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 26, height: 26, borderRadius: "50%",
                      backgroundColor: item.color || "#525252", color: "#FFFFFF",
                      fontSize: 10, fontWeight: 600, fontFamily: "Inter, sans-serif",
                      flexShrink: 0,
                    }}>
                      {item.display.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  )}
                  {item.display}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── KBD shortcut display ── */
function Kbd({ children }: { children: string }) {
  return (
    <kbd style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      height: 20, minWidth: 20, padding: "0 5px",
      fontSize: 11, fontFamily: "JetBrains Mono, monospace",
      color: "var(--gs-kbd-text)", backgroundColor: "var(--gs-kbd-bg)",
      border: "1px solid var(--gs-kbd-border)", borderRadius: 4,
    }}>
      {children}
    </kbd>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN — GlobalSearch
   ═══════════════════════════════════════════════════════════ */

export function GlobalSearch() {
  const { isOpen, close } = useGlobalSearchStore();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme } = useThemeMode();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filters, setFilters] = useState<ActiveFilters>({
    hub: null, project: null, assignee: null, type: null,
  });

  const debRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: recents = [] } = useRecentItems();
  const { data: results = [], isLoading } = useSearchResults(debouncedQuery, filters);
  const trackView = useTrackView();
  const saveSearch = useSaveSearch();
  const nameAvatarMap = useProfileAvatarsByName();

  // Derive unique assignees from recents
  const assigneeOptions = Array.from(
    new Set(recents.filter(r => r.assignee_name).map(r => r.assignee_name!))
  ).map(name => ({ value: name, display: name, color: getAvatarColor(name) }));

  // Derive unique projects from recents
  const projectOptions = Array.from(
    new Set(recents.filter(r => r.project_name).map(r => r.project_name!))
  ).map(name => ({ value: name, display: name }));

  // Type options with SVG icons
  const typeOptions = ALL_TYPES.map(t => ({
    value: t.key, display: t.label, svg: WORK_ICONS[t.key]?.svg,
  }));

  const [visibleCount, setVisibleCount] = useState(8);

  const showSearch = debouncedQuery.length >= 2;
  const isDark = resolvedTheme === "dark" || (typeof document !== "undefined" && (
    document.documentElement.classList.contains("dark") ||
    document.documentElement.getAttribute("data-theme") === "dark"
  ));
  const portalTheme = (isDark ? {
    "--gs-backdrop": "rgba(10,10,10,0.58)",
    "--gs-bg": "#1A1A1A",
    "--gs-bar-bg": "#0A0A0A",
    "--gs-footer-bg": "#1F1F1F",
    "--gs-section-bg": "#1F1F1F",
    "--gs-dropdown-bg": "#1A1A1A",
    "--gs-shadow": "0 20px 60px rgba(0,0,0,0.5)",
    "--gs-dropdown-shadow": "0 12px 32px rgba(0,0,0,0.4)",
    "--gs-border": "#2E2E2E",
    "--gs-border-subtle": "#292929",
    "--gs-text": "rgba(255,255,255,0.92)",
    "--gs-text-secondary": "rgba(255,255,255,0.55)",
    "--gs-text-muted": "rgba(255,255,255,0.30)",
    "--gs-section-text": "rgba(255,255,255,0.30)",
    "--gs-placeholder": "rgba(255,255,255,0.30)",
    "--gs-icon": "rgba(255,255,255,0.55)",
    "--gs-key": "#60A5FA",
    "--gs-hover": "#1F1F1F",
    "--gs-selected": "rgba(59,130,246,0.10)",
    "--gs-chip-bg": "#292929",
    "--gs-chip-border": "#2E2E2E",
    "--gs-chip-text": "rgba(255,255,255,0.55)",
    "--gs-chip-active-bg": "rgba(59,130,246,0.10)",
    "--gs-chip-active-border": "rgba(96,165,250,0.25)",
    "--gs-chip-active-text": "#60A5FA",
    "--gs-kbd-bg": "#0A0A0A",
    "--gs-kbd-border": "#2E2E2E",
    "--gs-kbd-text": "rgba(255,255,255,0.55)",
    "--gs-skeleton": "#292929",
    "--gs-danger": "#F87171",
    "--gs-danger-hover": "rgba(248,113,113,0.12)",
  } : {
    "--gs-backdrop": "rgba(0,0,0,0.4)",
    "--gs-bg": "#FFFFFF",
    "--gs-bar-bg": "#FAFBFC",
    "--gs-footer-bg": "#F8FAFC",
    "--gs-section-bg": "#FAFAFA",
    "--gs-dropdown-bg": "#FFFFFF",
    "--gs-shadow": "0 20px 60px rgba(0,0,0,0.20)",
    "--gs-dropdown-shadow": "0 8px 24px rgba(0,0,0,0.12)",
    "--gs-border": "rgba(15,23,42,0.08)",
    "--gs-border-subtle": "rgba(15,23,42,0.06)",
    "--gs-text": "#171717",
    "--gs-text-secondary": "#6B778C",
    "--gs-text-muted": "#A3A3A3",
    "--gs-section-text": "#A3A3A3",
    "--gs-placeholder": "#97A0AF",
    "--gs-icon": "#97A0AF",
    "--gs-key": "#2563EB",
    "--gs-hover": "rgba(15,23,42,0.04)",
    "--gs-selected": "rgba(37,99,235,0.06)",
    "--gs-chip-bg": "#F8FAFC",
    "--gs-chip-border": "#E2E8F0",
    "--gs-chip-text": "#525252",
    "--gs-chip-active-bg": "#EFF6FF",
    "--gs-chip-active-border": "#BFDBFE",
    "--gs-chip-active-text": "#2563EB",
    "--gs-kbd-bg": "#F1F5F9",
    "--gs-kbd-border": "#E2E8F0",
    "--gs-kbd-text": "#525252",
    "--gs-skeleton": "#F1F5F9",
    "--gs-danger": "#EF4444",
    "--gs-danger-hover": "rgba(239,68,68,0.06)",
  }) as CSSProperties;

  // Filter recents by active filters
  const filteredRecents = recents.filter(item => {
    if (filters.project && item.project_name !== filters.project) return false;
    if (filters.assignee && item.assignee_name !== filters.assignee) return false;
    if (filters.type && mapType(item.item_type) !== filters.type) return false;
    return true;
  });

  const allResults = showSearch ? results : filteredRecents;
  const visibleResults = allResults.slice(0, visibleCount);
  const hasMore = allResults.length > visibleCount;

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery(""); setDebouncedQuery(""); setSelectedIdx(0); setVisibleCount(8);
      setFilters({ hub: null, project: null, assignee: null, type: null });
    }
  }, [isOpen]);

  // Debounce
  const onInput = useCallback((v: string) => {
    setQuery(v);
    setSelectedIdx(0);
    setVisibleCount(8);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setDebouncedQuery(v), 220);
  }, []);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, visibleResults.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && visibleResults[selectedIdx]) { handleSelect(visibleResults[selectedIdx]); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, visibleResults, selectedIdx]);

  const handleSelect = useCallback((item: SearchResult) => {
    trackView.mutate(item);
    if (debouncedQuery) saveSearch.mutate(debouncedQuery);
    // Open StoryDetailModal directly via store instead of navigating
    const { openDetail } = useGlobalSearchStore.getState();
    openDetail({
      id: item.id,
      projectKey: item.project_key || undefined,
    });
  }, [debouncedQuery, trackView, saveSearch]);

  const setFilter = useCallback(<K extends keyof ActiveFilters>(k: K, v: ActiveFilters[K]) => {
    setFilters(prev => ({ ...prev, [k]: v }));
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="global-search-portal" style={portalTheme}>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          backgroundColor: "var(--gs-backdrop)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div data-gs-dialog style={{
        position: "fixed", top: "12%", left: "50%", transform: "translateX(-50%)",
        zIndex: 9999, width: 720, maxHeight: "76vh",
        backgroundColor: "var(--gs-bg)", borderRadius: 10,
        boxShadow: "var(--gs-shadow)",
        border: "1px solid var(--gs-border)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        colorScheme: isDark ? "dark" : "light",
      }}>

        {/* ── SEARCH BAR (60px) ── */}
        <div style={{
          display: "flex", alignItems: "center", minHeight: 60,
          padding: "0 20px", gap: 12,
          borderBottom: "1px solid var(--gs-border)",
          flexShrink: 0,
        }}>
          <Search size={20} color="var(--gs-icon)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => onInput(e.target.value)}
            placeholder="Search Catalyst..."
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: 16, fontFamily: "Inter, sans-serif",
              color: "var(--gs-text)",
              backgroundColor: "transparent",
              colorScheme: isDark ? "dark" : "light",
              WebkitAppearance: "none",
              appearance: "none",
              WebkitTextFillColor: "var(--gs-text)",
              boxShadow: "none",
              padding: 0,
              margin: 0,
              caretColor: "var(--gs-text)",
              lineHeight: 1.4,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <kbd style={{
              fontSize: 11, fontFamily: "JetBrains Mono, monospace",
              color: "var(--gs-kbd-text)", backgroundColor: "var(--gs-kbd-bg)",
              border: "1px solid var(--gs-kbd-border)", borderRadius: 4,
              padding: "2px 6px",
            }}>⌘K</kbd>
            <button
              onClick={close}
              style={{
                width: 30, height: 30, borderRadius: 5,
                border: "none", backgroundColor: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--gs-icon)",
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--gs-hover)"; e.currentTarget.style.color = "var(--gs-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--gs-icon)"; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── FILTER BAR (44px) ── */}
        <div style={{
          display: "flex", alignItems: "center", minHeight: 44,
          padding: "0 20px", gap: 8,
          borderBottom: "1px solid var(--gs-border)",
          backgroundColor: "var(--gs-bar-bg)",
          flexShrink: 0,
        }}>
          <Settings2 size={14} color="var(--gs-icon)" style={{ flexShrink: 0, marginRight: 4 }} />
          <FilterChip label="Project" items={projectOptions} selected={filters.project} onSelect={v => setFilter("project", v)} />
          <SearchableFilterChip label="Assignee" items={assigneeOptions} selected={filters.assignee} onSelect={v => setFilter("assignee", v)} avatarMap={nameAvatarMap} />
          <FilterChip label="Type" items={typeOptions} selected={filters.type} onSelect={v => setFilter("type", v as any)} />
        </div>

        {/* ── RESULTS BODY ── */}
        <div style={{
          flex: 1, overflowY: "auto",
          minHeight: 0,
        }}>
          {/* Loading skeleton */}
          {showSearch && isLoading && [1,2,3,4].map(i => (
            <div key={i} style={{
              display: "flex", alignItems: "center", height: 50, padding: "0 20px", gap: 12,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "var(--gs-skeleton)" }} />
              <div style={{ width: 70, height: 14, borderRadius: 4, backgroundColor: "var(--gs-skeleton)" }} />
              <div style={{ flex: 1, height: 14, borderRadius: 4, backgroundColor: "var(--gs-skeleton)" }} />
            </div>
          ))}

          {/* ── Recents: date-grouped ── */}
          {!showSearch && (() => {
            const groups = groupRecentItems(filteredRecents);
            if (groups.length === 0) return (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", height: 220, gap: 10,
              }}>
                <Clock size={28} style={{ color: "var(--gs-text-muted)" }} />
                <span style={{ fontSize: 14, color: "var(--gs-text-secondary)", fontFamily: "Inter, sans-serif" }}>
                  No recent items yet
                </span>
                <span style={{ fontSize: 12, color: "var(--gs-text-muted)", fontFamily: "Inter, sans-serif" }}>
                  Items you open across Catalyst hubs will appear here
                </span>
              </div>
            );

            let globalIdx = 0;
            return (
              <>
                {groups.map(({ group, items: groupItems }) => {
                  const startIdx = globalIdx;
                  globalIdx += groupItems.length;
                  const groupVisible = groupItems.slice(0, Math.max(0, visibleCount - startIdx));
                  if (groupVisible.length === 0) return null;
                  return (
                    <div key={group}>
                      <div style={{
                        padding: "12px 20px 6px", fontSize: 11, fontWeight: 600,
                        color: "var(--gs-section-text)", fontFamily: "Inter, sans-serif",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        backgroundColor: "var(--gs-section-bg)",
                        borderBottom: "0.75px solid var(--gs-border-subtle)",
                      }}>
                        {group}
                      </div>
                      {groupVisible.map((item, relIdx) => (
                        <ResultRow
                          key={`${item.id}-${startIdx + relIdx}`}
                          item={item}
                          avatarMap={nameAvatarMap}
                          isSelected={selectedIdx === startIdx + relIdx}
                          onHover={() => setSelectedIdx(startIdx + relIdx)}
                          onClick={() => handleSelect(item)}
                        />
                      ))}
                    </div>
                  );
                })}
                {hasMore && (
                  <div
                    onClick={(e) => { e.stopPropagation(); setVisibleCount(c => c + 10); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      height: 44, fontSize: 12, fontWeight: 500,
                      color: "var(--gs-key)", fontFamily: "Inter, sans-serif",
                      cursor: "pointer", borderTop: "0.75px solid var(--gs-border-subtle)",
                      gap: 6, transition: "background 100ms ease",
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--gs-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    Show {Math.min(filteredRecents.length - visibleCount, 10)} more
                    <span style={{ fontSize: 11, color: "var(--gs-text-muted)" }}>
                      ({filteredRecents.length - visibleCount} remaining)
                    </span>
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Search results: flat list ── */}
          {showSearch && !isLoading && (
            <>
              {results.length === 0 ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: 180, gap: 10,
                }}>
                  <Search size={28} style={{ color: "var(--gs-text-muted)" }} />
                  <span style={{ fontSize: 14, color: "var(--gs-text-secondary)", fontFamily: "Inter, sans-serif" }}>
                    No results for "{debouncedQuery}"
                  </span>
                </div>
              ) : (
                <>
                  <div style={{
                    padding: "12px 20px 6px", fontSize: 11, fontWeight: 600,
                    color: "var(--gs-section-text)", textTransform: "uppercase", letterSpacing: "0.06em",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    Results ({results.length})
                  </div>
                  {visibleResults.map((item, idx) => (
                    <ResultRow
                      key={`${item.id}-${idx}`}
                      item={item}
                      avatarMap={nameAvatarMap}
                      isSelected={selectedIdx === idx}
                      onHover={() => setSelectedIdx(idx)}
                      onClick={() => handleSelect(item)}
                    />
                  ))}
                  {hasMore && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setVisibleCount(c => c + 10); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        height: 44, fontSize: 12, fontWeight: 500,
                        color: "var(--gs-key)", fontFamily: "Inter, sans-serif",
                        cursor: "pointer", borderTop: "0.75px solid var(--gs-border-subtle)",
                        gap: 6, transition: "background 100ms ease",
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--gs-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      Show {Math.min(results.length - visibleCount, 10)} more
                      <span style={{ fontSize: 11, color: "var(--gs-text-muted)" }}>
                        ({results.length - visibleCount} remaining)
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER (44px) ── */}
        <div style={{
          display: "flex", alignItems: "center", minHeight: 44,
          padding: "0 20px", gap: 16,
          borderTop: "1px solid var(--gs-border)",
          backgroundColor: "var(--gs-footer-bg)",
          fontSize: 11, fontFamily: "Inter, sans-serif", color: "var(--gs-text-secondary)",
          flexShrink: 0,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Kbd>↑</Kbd><Kbd>↓</Kbd> <span>Navigate</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Kbd>↵</Kbd> <span>Open</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Kbd>Esc</Kbd> <span>Close</span>
          </span>
          <span style={{ marginLeft: "auto", color: "var(--gs-text-muted)", fontSize: 10 }}>
            Catalyst Search
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════
   TRIGGER — Nav bar button
   ═══════════════════════════════════════════════════════════ */

export function GlobalSearchTrigger() {
  const { open } = useGlobalSearchStore();
  const { resolvedTheme } = useThemeMode();
  const dk = resolvedTheme === "dark";

  useEffect(() => {
    const kb = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); open(); }
    };
    const ce = () => open();
    document.addEventListener("keydown", kb);
    window.addEventListener("open-global-search", ce);
    return () => { document.removeEventListener("keydown", kb); window.removeEventListener("open-global-search", ce); };
  }, [open]);

  return (
    <button
      onClick={open}
      className="hidden sm:flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        gap: 8, height: 36, padding: "0 14px",
        borderRadius: 8,
        border: `1px solid ${dk ? "#2E2E2E" : "rgba(15,23,42,0.08)"}`,
        backgroundColor: dk ? "#1A1A1A" : "#F8FAFC",
        color: dk ? "#878787" : "#97A0AF",
        cursor: "pointer",
        fontSize: 13, fontFamily: "Inter, sans-serif",
        transition: "border-color 100ms ease, background 100ms ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = dk ? "#454545" : "rgba(15,23,42,0.16)";
        e.currentTarget.style.backgroundColor = dk ? "#1F1F1F" : "#F1F5F9";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = dk ? "#2E2E2E" : "rgba(15,23,42,0.08)";
        e.currentTarget.style.backgroundColor = dk ? "#1A1A1A" : "#F8FAFC";
      }}
    >
      <Search size={14} />
      <span>Search Catalyst...</span>
      <kbd style={{
        fontSize: 11, fontFamily: "JetBrains Mono, monospace",
        color: dk ? "rgba(255,255,255,0.35)" : "#97A0AF",
        backgroundColor: dk ? "#292929" : "#F1F5F9",
        border: `1px solid ${dk ? "#2E2E2E" : "#E2E8F0"}`,
        borderRadius: 4, padding: "1px 5px", marginLeft: 8,
      }}>⌘K</kbd>
    </button>
  );
}
