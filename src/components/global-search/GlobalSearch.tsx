import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Clock, Check } from "lucide-react";
import { useGlobalSearchStore } from "@/store/globalSearchStore";
import {
  useRecentItems,
  useSearchResults,
  useTrackView,
  useSaveSearch,
} from "@/hooks/useGlobalSearch";
import type { SearchResult, ActiveFilters } from "@/types/global-search";
import { useProfileAvatarsByName } from "@/hooks/useProfileAvatars";
import { useThemeMode } from "@/providers/ThemeProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ─── CANONICAL WORK ITEM SVG ICONS ─── */
const WORK_ICONS: Record<string, { label: string; svg: string }> = {
  bug: {
    label: "Bug",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M12,17 C14.761,17 17,14.761 17,12 C17,9.239 14.761,7 12,7 C9.239,7 7,9.239 7,12 C7,14.761 9.239,17 12,17 Z"/></svg>`,
  },
  task: {
    label: "Task",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#4BADE8" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M10.5,16.793 L6.854,13.146 C6.658,12.951 6.342,12.951 6.146,13.146 C5.951,13.342 5.951,13.658 6.146,13.854 L10.146,17.854 C10.342,18.049 10.658,18.049 10.854,17.854 L18.854,9.854 C19.049,9.658 19.049,9.342 18.854,9.146 C18.658,8.951 18.342,8.951 18.146,9.146 Z"/></svg>`,
  },
  story: {
    label: "Story",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M15.647,19.515 L16.937,17.987 L12,13.82 L7.061,17.987 L7,18.153 L7,6.688 C7,6.348 7.412,6 8,6 L16,6 C16.587,6 17,6.349 17,6.688 L17,18.153 Z"/></svg>`,
  },
  epic: {
    label: "Epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#6554C0" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M18.188,9.4 L15.125,9.4 L15.125,4.8 C15.125,3.803 14.31,3 13.313,3 L5,12.8 C5,13.81 5.819,14.399 6.77,14.56 L9.875,14.574 L9.875,19.2 C9.875,20.197 10.69,21 11.688,21 L20,11.2 C20,10.203 19.185,9.4 18.188,9.4 Z"/></svg>`,
  },
  subtask: {
    label: "Sub-task",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M6,4 C4.895,4 4,4.895 4,6 L4,18 C4,19.105 4.895,20 6,20 L18,20 C19.105,20 20,19.105 20,18 L20,6 C20,4.895 19.105,4 18,4 L6,4 Z M6,6 L18,6 L18,18 L6,18 Z"/></svg>`,
  },
  incident: {
    label: "Incident",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M12,4 C11.448,4 11,4.448 11,5 L11,14 C11,14.552 11.448,15 12,15 C12.552,15 13,14.552 13,14 L13,5 C13,4.448 12.552,4 12,4 Z M12,17 C11.448,17 11,17.448 11,18 C11,18.552 11.448,19 12,19 C12.552,19 13,18.552 13,18 C13,17.448 12.552,17 12,17 Z"/></svg>`,
  },
  new_feature: {
    label: "New Feature",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M13,11 L13,5 C13,4.448 12.552,4 12,4 C11.448,4 11,4.448 11,5 L11,11 L5,11 C4.448,11 4,11.448 4,12 C4,12.552 4.448,13 5,13 L11,13 L11,19 C11,19.552 11.448,20 12,20 C12.552,20 13,19.552 13,19 L13,13 L19,13 C19.552,13 20,12.552 20,12 C20,11.448 19.552,11 19,11 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
  },
  improvement: {
    label: "Improvement",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#4BADE8" fill-rule="evenodd" d="M13,7.422 L16.284,10.707 C16.674,11.098 17.307,11.098 17.698,10.707 C18.088,10.317 18.088,9.684 17.698,9.293 L12.7,4.293 C12.31,3.902 11.676,3.902 11.286,4.293 L6.288,9.293 C5.897,9.684 5.897,10.317 6.288,10.707 C6.679,11.098 7.312,11.098 7.702,10.707 L11,7.408 L11,19 C11,19.552 11.448,20 12,20 C12.552,20 13,19.552 13,19 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
  },
  frontend: {
    label: "Frontend",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M6,4 C4.895,4 4,4.895 4,6 L4,18 C4,19.105 4.895,20 6,20 L18,20 C19.105,20 20,19.105 20,18 L20,6 C20,4.895 19.105,4 18,4 L6,4 Z M6,6 L18,6 L18,18 L6,18 Z"/></svg>`,
  },
};

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
  if (v.includes("frontend")) return "frontend";
  return "task";
}

function formatViewedDate(d: string): string {
  const now = new Date();
  const then = new Date(d);
  const diffMs = now.getTime() - then.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return `You viewed ${Math.max(1, Math.floor(diffMs / 60000))} minutes ago`;
  if (diffH < 24) return `You viewed ${diffH} hours ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "You viewed 1 day ago";
  return `You viewed ${diffD} days ago`;
}

type DateGroup = "TODAY" | "YESTERDAY" | "THIS WEEK" | "RECENT";

function getDateGroup(dateStr: string): DateGroup {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1 && now.getDate() === then.getDate()) return "TODAY";
  if (diffDays < 2) return "YESTERDAY";
  if (diffDays < 7) return "THIS WEEK";
  return "RECENT";
}

function groupItems(items: SearchResult[]): { group: DateGroup; items: SearchResult[] }[] {
  const ORDER: DateGroup[] = ["TODAY", "YESTERDAY", "THIS WEEK", "RECENT"];
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
  const colors = ["#2563EB", "#7C3AED", "#0D9488", "#DC2626", "#D97706", "#059669"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** Highlight matched query words with <strong> */
function HighlightTitle({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? <strong key={i} style={{ fontWeight: 700 }}>{part}</strong> : part
      )}
    </>
  );
}

/* ── Jira-style Result Row (two-line: title + subtitle) ── */
function ResultRow({ item, isSelected, onHover, onClick, query }: {
  item: SearchResult; isSelected: boolean; onHover: () => void; onClick: () => void;
  query: string;
}) {
  const typeKey = mapType(item.item_type);
  const icon = WORK_ICONS[typeKey] ?? WORK_ICONS.task;

  return (
    <div style={{ display: "block", padding: "0 8px" }}>
      <div
        onClick={onClick}
        onMouseEnter={onHover}
        role="option"
        aria-selected={isSelected}
        style={{
          display: "flex", flexDirection: "row", alignItems: "center",
          padding: "6px 8px", height: 45,
          borderRadius: 8, cursor: "pointer",
          backgroundColor: isSelected ? "rgba(5,21,36,0.06)" : "transparent",
          transition: "background 60ms ease",
        }}
      >
        {/* Icon */}
        <span
          style={{ flexShrink: 0, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: icon.svg }}
        />

        {/* Content column */}
        <div style={{
          display: "flex", flexDirection: "column", flex: "1 1 0%", minWidth: 0,
          marginLeft: 12, gap: 2,
        }}>
          {/* Title row */}
          <div style={{
            display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 6,
            fontSize: 14, lineHeight: "16px", color: "#292A2E",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "Inter, system-ui, sans-serif",
          }}>
            <span style={{ color: "#292A2E", fontWeight: 400, whiteSpace: "nowrap" }}>
              {item.item_key}:
            </span>
            <span style={{
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <HighlightTitle text={item.title} query={query} />
            </span>
          </div>

          {/* Subtitle row */}
          <div style={{
            display: "flex", alignItems: "center",
            fontSize: 12, color: "#6B6E76", fontFamily: "Inter, system-ui, sans-serif",
          }}>
            <span>Catalyst</span>
            <span style={{ margin: "0 4px" }}>•</span>
            <span>{icon.label}</span>
            {item.project_name && (
              <>
                <span style={{ margin: "0 4px" }}>•</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.project_name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          fontSize: 12, color: "#6B6E76", flexShrink: 0, marginLeft: 12,
          fontFamily: "Inter, system-ui, sans-serif", whiteSpace: "nowrap",
        }}>
          {formatViewedDate(item.viewed_at)}
        </div>
      </div>
    </div>
  );
}

/* ── PopupSelect (Jira-parity filter dropdown) ── */
function PopupSelect({ label, items, selected, onSelect, triggerRef, avatarMap }: {
  label: string;
  items: { value: string; display: string; color?: string }[];
  selected: string[];
  onSelect: (v: string[]) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  avatarMap?: Map<string, string>;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const filtered = items.filter(i =>
    i.display.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onSelect(selected.filter(s => s !== val));
    } else {
      onSelect([...selected, val]);
    }
  };

  // Position below trigger
  const triggerRect = triggerRef.current?.getBoundingClientRect();
  const top = (triggerRect?.bottom ?? 0) + 4;
  const left = triggerRect?.left ?? 0;

  return (
    <div
      ref={popupRef}
      style={{
        position: "fixed", top, left,
        width: 287, zIndex: 510,
        backgroundColor: "#FFFFFF", borderRadius: 4,
        boxShadow: "0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Search input */}
      <div style={{ padding: 8 }}>
        <div style={{
          display: "flex", alignItems: "center",
          height: 40, borderRadius: 3,
          border: "0.56px solid rgb(70,136,236)",
          boxShadow: "rgb(70,136,236) 0 0 0 1px inset",
          padding: "0 8px",
        }}>
          <Search size={16} color="#6B6E76" style={{ flexShrink: 0, marginRight: 8 }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={label === "Project" ? "Find projects" : "Find people"}
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: 14, fontFamily: "Inter, system-ui, sans-serif",
              color: "#292A2E", backgroundColor: "transparent",
            }}
          />
        </div>
      </div>

      {/* Suggested label */}
      <div style={{
        padding: "8px 12px 4px", fontSize: 12, fontWeight: 600,
        color: "#6B6E76", fontFamily: "Inter, system-ui, sans-serif",
      }}>
        Suggested
      </div>

      {/* Options list */}
      <div role="listbox" style={{ overflowY: "auto", maxHeight: 260 }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "16px 12px", textAlign: "center",
            fontSize: 13, color: "#6B6E76", fontFamily: "Inter, system-ui, sans-serif",
          }}>
            No results found
          </div>
        ) : filtered.map((item, idx) => {
          const isActive = selected.includes(item.value);
          const photoUrl = avatarMap?.get(item.display.toLowerCase());
          return (
            <div
              key={item.value}
              role="option"
              aria-selected={isActive}
              onClick={() => toggle(item.value)}
              style={{
                display: "flex", alignItems: "center",
                height: 36, padding: "4px 12px 4px 16px",
                cursor: "pointer", gap: 8,
                backgroundColor: isActive ? "rgba(5,21,36,0.06)" : "transparent",
                boxShadow: isActive ? "rgb(70,136,236) 2px 0 0 0 inset" : "none",
                fontSize: 14, color: "#292A2E", fontFamily: "Inter, system-ui, sans-serif",
                transition: "background 60ms ease",
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = "rgba(5,21,36,0.06)";
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {/* Avatar or icon */}
              {label === "Assignee" ? (
                photoUrl ? (
                  <img src={photoUrl} alt={item.display} style={{
                    width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                  }} />
                ) : (
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%", display: "inline-flex",
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: item.color || "#525252", color: "#FFFFFF",
                    fontSize: 10, fontWeight: 600, flexShrink: 0,
                  }}>
                    {getInitials(item.display)}
                  </span>
                )
              ) : null}
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.display}
              </span>
              {isActive && <Check size={16} color="#1868DB" style={{ flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>

      {/* Clear filter */}
      {selected.length > 0 && (
        <div
          onClick={() => onSelect([])}
          style={{
            padding: "8px 6px 8px 20px", cursor: "pointer",
            color: "#505258", fontSize: 14, fontFamily: "Inter, system-ui, sans-serif",
            borderTop: "0.56px solid rgba(11,18,14,0.14)",
            backgroundColor: "#FFFFFF",
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(5,21,36,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
        >
          Clear filter
        </div>
      )}
    </div>
  );
}

/* ── Jira-style Filter Button ── */
function FilterButton({ label, isActive, isOpen, onClick, buttonRef }: {
  label: string; isActive: boolean; isOpen: boolean;
  onClick: () => void; buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const active = isActive || isOpen;
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      aria-haspopup="true"
      aria-expanded={isOpen}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "4px 12px", height: 32, borderRadius: 4,
        border: `0.56px solid ${active ? "rgb(24,104,219)" : "rgba(11,18,14,0.14)"}`,
        backgroundColor: active ? "rgb(207,225,253)" : "transparent",
        color: active ? "rgb(24,104,219)" : "#505258",
        fontSize: 14, fontWeight: 500, cursor: "pointer",
        fontFamily: "Inter, system-ui, sans-serif",
        transition: "all 80ms ease",
      }}
    >
      {label}
      <ChevronDown size={14} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN — GlobalSearch (Jira Parity)
   ═══════════════════════════════════════════════════════════ */

export function GlobalSearch() {
  const { isOpen, close } = useGlobalSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filters, setFilters] = useState<ActiveFilters>({
    hub: null, project: null, assignee: null, type: null,
  });
  const [openFilter, setOpenFilter] = useState<"project" | "assignee" | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);

  const projectBtnRef = useRef<HTMLButtonElement>(null);
  const assigneeBtnRef = useRef<HTMLButtonElement>(null);

  const debRef = useRef<ReturnType<typeof setTimeout>>();
  const { data: recents = [] } = useRecentItems();
  const { data: results = [], isLoading } = useSearchResults(debouncedQuery, filters);
  const trackView = useTrackView();
  const saveSearch = useSaveSearch();
  const nameAvatarMap = useProfileAvatarsByName();

  const assigneeOptions = Array.from(
    new Set(recents.filter(r => r.assignee_name).map(r => r.assignee_name!))
  ).map(name => ({ value: name, display: name, color: getAvatarColor(name) }));

  const projectOptions = Array.from(
    new Set(recents.filter(r => r.project_name).map(r => r.project_name!))
  ).map(name => ({ value: name, display: name }));

  const showSearch = debouncedQuery.length >= 2;

  // Apply multi-select filters to recents
  const filteredRecents = recents.filter(item => {
    if (selectedProjects.length > 0 && !selectedProjects.includes(item.project_name || "")) return false;
    if (selectedAssignees.length > 0 && !selectedAssignees.includes(item.assignee_name || "")) return false;
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
      setOpenFilter(null); setSelectedProjects([]); setSelectedAssignees([]);
    }
  }, [isOpen]);

  // Debounce
  const onInput = useCallback((v: string) => {
    setQuery(v);
    setSelectedIdx(0);
    setVisibleCount(8);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setDebouncedQuery(v), 150);
  }, []);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (openFilter) { setOpenFilter(null); } else { close(); } return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, visibleResults.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && visibleResults[selectedIdx]) { handleSelect(visibleResults[selectedIdx]); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, visibleResults, selectedIdx, openFilter]);

  // Close popup on outside click
  useEffect(() => {
    if (!openFilter) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (projectBtnRef.current?.contains(target) || assigneeBtnRef.current?.contains(target)) return;
      setOpenFilter(null);
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => document.removeEventListener("mousedown", handler);
  }, [openFilter]);

  const handleSelect = useCallback((item: SearchResult) => {
    trackView.mutate(item);
    if (debouncedQuery) saveSearch.mutate(debouncedQuery);
    const { openDetail } = useGlobalSearchStore.getState();
    openDetail({
      id: item.id,
      projectKey: item.project_key || undefined,
    });
  }, [debouncedQuery, trackView, saveSearch]);

  if (!isOpen) return null;

  return createPortal(
    <div className="global-search-portal">
      {/* Backdrop */}
      <div
        onClick={() => { setOpenFilter(null); close(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      />

      {/* Search Container */}
      <div
        ref={containerRef}
        style={{
          position: "fixed", top: "12%", left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, width: 780,
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: "flex", alignItems: "center",
          height: 40, width: "100%",
          backgroundColor: "#FFFFFF", borderRadius: 4,
          boxShadow: "0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)",
          paddingLeft: 16, paddingRight: 8,
        }}>
          <Search size={24} color="#6B6E76" style={{ flexShrink: 0, marginRight: 12 }} />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={true}
            aria-controls="gs-results-listbox"
            value={query}
            onChange={e => onInput(e.target.value)}
            placeholder="Search Catalyst..."
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: 14, fontFamily: "Inter, system-ui, sans-serif",
              color: "#292A2E", backgroundColor: "transparent",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <kbd style={{
              fontSize: 11, fontFamily: "JetBrains Mono, monospace",
              color: "#6B6E76", backgroundColor: "#F1F5F9",
              border: "1px solid #E2E8F0", borderRadius: 4,
              padding: "2px 6px",
            }}>⌘K</kbd>
            <button
              onClick={close}
              style={{
                width: 28, height: 28, borderRadius: 4,
                border: "none", backgroundColor: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#6B6E76",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(5,21,36,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Dialog (dropdown panel) */}
        <div style={{
          position: "absolute", top: 40, left: 0, width: 780,
          backgroundColor: "#FFFFFF", borderRadius: 4,
          boxShadow: "0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)",
          display: "flex", flexDirection: "column",
          maxHeight: "60vh", marginTop: 2,
        }}>
          {/* Filter Bar */}
          <div style={{
            display: "flex", flexDirection: "row", alignItems: "center",
            justifyContent: "flex-start",
            padding: "2px 16px 6px", height: 40, gap: 8,
            borderBottom: "0.56px solid rgba(11,18,14,0.08)",
          }}>
            <FilterButton
              label={selectedProjects.length > 0 ? `Project (${selectedProjects.length})` : "Project"}
              isActive={selectedProjects.length > 0}
              isOpen={openFilter === "project"}
              onClick={() => setOpenFilter(openFilter === "project" ? null : "project")}
              buttonRef={projectBtnRef}
            />
            <FilterButton
              label={selectedAssignees.length > 0 ? `Assignee (${selectedAssignees.length})` : "Assignee"}
              isActive={selectedAssignees.length > 0}
              isOpen={openFilter === "assignee"}
              onClick={() => setOpenFilter(openFilter === "assignee" ? null : "assignee")}
              buttonRef={assigneeBtnRef}
            />
          </div>

          {/* Scrollable Results */}
          <div role="listbox" id="gs-results-listbox" style={{
            flex: 1, overflowY: "auto", padding: "8px 0",
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            {/* Loading */}
            {showSearch && isLoading && [1,2,3,4].map(i => (
              <div key={i} style={{
                display: "flex", alignItems: "center", height: 45, padding: "0 16px", gap: 12,
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: "#F1F5F9" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: "60%", height: 14, borderRadius: 3, backgroundColor: "#F1F5F9", marginBottom: 4 }} />
                  <div style={{ width: "40%", height: 10, borderRadius: 3, backgroundColor: "#F1F5F9" }} />
                </div>
              </div>
            ))}

            {/* Recents (date-grouped) */}
            {!showSearch && (() => {
              const groups = groupItems(filteredRecents);
              if (groups.length === 0) return (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: 180, gap: 10,
                }}>
                  <Clock size={28} color="#6B6E76" />
                  <span style={{ fontSize: 14, color: "#6B6E76", fontFamily: "Inter, system-ui, sans-serif" }}>
                    No recent items yet
                  </span>
                  <span style={{ fontSize: 12, color: "#A3A3A3", fontFamily: "Inter, system-ui, sans-serif" }}>
                    Items you open across Catalyst will appear here
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
                        {/* Section heading */}
                        <div style={{
                          padding: "8px 16px 4px", fontSize: 11, fontWeight: 700,
                          color: "#6B6E76", fontFamily: "Inter, system-ui, sans-serif",
                          textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>
                          {group}
                        </div>
                        {groupVisible.map((item, relIdx) => (
                          <ResultRow
                            key={`${item.id}-${startIdx + relIdx}`}
                            item={item}
                            query=""
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
                        height: 40, fontSize: 13, fontWeight: 500,
                        color: "#1868DB", fontFamily: "Inter, system-ui, sans-serif",
                        cursor: "pointer", gap: 6, transition: "background 100ms ease",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(5,21,36,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      Show 10 more
                      <span style={{ fontSize: 12, color: "#6B6E76" }}>
                        ({filteredRecents.length - visibleCount} remaining)
                      </span>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Search results */}
            {showSearch && !isLoading && (
              <>
                {results.length === 0 ? (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", height: 180, gap: 10,
                  }}>
                    <Search size={28} color="#6B6E76" />
                    <span style={{ fontSize: 14, color: "#6B6E76", fontFamily: "Inter, system-ui, sans-serif" }}>
                      No results for "{debouncedQuery}"
                    </span>
                  </div>
                ) : (
                  <>
                    <div style={{
                      padding: "4px 16px 4px", fontSize: 11, fontWeight: 700,
                      color: "#6B6E76", textTransform: "uppercase", letterSpacing: "0.06em",
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}>
                      SEARCH RESULTS
                    </div>
                    {visibleResults.map((item, idx) => (
                      <ResultRow
                        key={`${item.id}-${idx}`}
                        item={item}
                        query={debouncedQuery}
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
                          height: 40, fontSize: 13, fontWeight: 500,
                          color: "#1868DB", fontFamily: "Inter, system-ui, sans-serif",
                          cursor: "pointer", gap: 6, transition: "background 100ms ease",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(5,21,36,0.04)")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        Show 10 more
                        <span style={{ fontSize: 12, color: "#6B6E76" }}>
                          ({results.length - visibleCount} remaining)
                        </span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", alignItems: "center", height: 40,
            padding: "0 16px", gap: 16,
            borderTop: "0.56px solid rgba(11,18,14,0.08)",
            backgroundColor: "#FAFBFC",
            fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", color: "#6B6E76",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#6B6E76", backgroundColor: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 4px" }}>↑</kbd>
              <kbd style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#6B6E76", backgroundColor: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 4px" }}>↓</kbd>
              <span style={{ marginLeft: 2 }}>Navigate</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#6B6E76", backgroundColor: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 4px" }}>↵</kbd>
              <span>Open</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#6B6E76", backgroundColor: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 4px" }}>Esc</kbd>
              <span>Close</span>
            </span>
            <span style={{ marginLeft: "auto", color: "#A3A3A3", fontSize: 11 }}>
              Catalyst Search
            </span>
          </div>
        </div>
      </div>

      {/* PopupSelect overlays */}
      {openFilter === "project" && (
        <PopupSelect
          label="Project"
          items={projectOptions}
          selected={selectedProjects}
          onSelect={setSelectedProjects}
          triggerRef={projectBtnRef}
        />
      )}
      {openFilter === "assignee" && (
        <PopupSelect
          label="Assignee"
          items={assigneeOptions}
          selected={selectedAssignees}
          onSelect={setSelectedAssignees}
          triggerRef={assigneeBtnRef}
          avatarMap={nameAvatarMap}
        />
      )}
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
      <span>Search...</span>
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
