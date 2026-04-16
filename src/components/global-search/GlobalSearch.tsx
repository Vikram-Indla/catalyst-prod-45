import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Clock, Check, CornerDownLeft, FolderKanban, User } from "lucide-react";
import { useGlobalSearchStore } from "@/store/globalSearchStore";
import {
  useRecentItems,
  useSearchResults,
  useTrackView,
  useSaveSearch,
} from "@/hooks/useGlobalSearch";
import type { SearchResult, ActiveFilters } from "@/types/global-search";

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
  if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "1d ago";
  return `${diffD}d ago`;
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

function HighlightTitle({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? <strong key={i} style={{ fontWeight: 650, color: "#172B4D", background: "transparent" }}>{part}</strong> : part
      )}
    </>
  );
}

/* ── Result Row — Enterprise high-density (42px) ── */
function ResultRow({ item, isSelected, onHover, onClick, query, isLoading: rowLoading }: {
  item: SearchResult; isSelected: boolean; onHover: () => void; onClick: () => void;
  query: string; isLoading?: boolean;
}) {
  const typeKey = mapType(item.item_type);
  const icon = WORK_ICONS[typeKey] ?? WORK_ICONS.task;

  return (
    <div
      onClick={rowLoading ? undefined : onClick}
      onMouseEnter={onHover}
      role="option"
      aria-selected={isSelected}
      style={{
        display: "flex", alignItems: "center",
        margin: "0 8px", padding: "0 10px", height: 42,
        borderRadius: 6, cursor: rowLoading ? "wait" : "pointer",
        backgroundColor: rowLoading ? "#E9F2FF" : isSelected ? "#F4F5F7" : "transparent",
        opacity: rowLoading ? 0.85 : 1,
        transition: "background 60ms ease",
      }}
      onMouseLeave={e => { if (!isSelected && !rowLoading) e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      {/* Icon */}
      <span
        style={{ flexShrink: 0, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
        dangerouslySetInnerHTML={{ __html: icon.svg }}
      />

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, marginLeft: 10, gap: 1 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 13.5, lineHeight: "18px", color: "#172B4D",
          fontFamily: "Inter, system-ui, sans-serif", fontWeight: 400,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          <span style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#42526E", flexShrink: 0 }}>
            {item.item_key}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#172B4D" }}>
            <HighlightTitle text={item.title} query={query} />
          </span>
        </div>
        <div style={{
          display: "flex", alignItems: "center",
          fontSize: 11.5, color: "#6B778C", fontFamily: "Inter, system-ui, sans-serif",
          lineHeight: "14px", gap: 4,
        }}>
          <span>{icon.label}</span>
          {item.project_name && (
            <>
              <span style={{ color: "#94A3B8" }}>·</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                {item.project_name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Timestamp or spinner */}
      <div style={{
        flexShrink: 0, marginLeft: 12,
        fontSize: 11, fontWeight: 500, color: rowLoading ? "#0052CC" : "#94A3B8",
        fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap",
        display: "flex", alignItems: "center",
      }}>
        {rowLoading ? (
          <Loader2 size={14} className="animate-spin" style={{ color: "#0052CC" }} />
        ) : (
          formatViewedDate(item.viewed_at)
        )}
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

  const triggerRect = triggerRef.current?.getBoundingClientRect();
  const top = (triggerRect?.bottom ?? 0) + 4;
  const left = triggerRect?.left ?? 0;

  return (
    <div
      ref={popupRef}
      style={{
        position: "fixed", top, left,
        width: 280, zIndex: 510,
        backgroundColor: "#FFFFFF", borderRadius: 8,
        boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "8px 8px 4px" }}>
        <div style={{
          display: "flex", alignItems: "center",
          height: 36, borderRadius: 6,
          border: "1.5px solid #0052CC",
          padding: "0 10px",
          backgroundColor: "#FAFBFC",
        }}>
          <Search size={14} color="#6B778C" style={{ flexShrink: 0, marginRight: 8 }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={label === "Projects" ? "Find projects..." : "Find people..."}
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: 13, fontFamily: "Inter, system-ui, sans-serif",
              color: "#172B4D", backgroundColor: "transparent",
            }}
          />
        </div>
      </div>

      <div style={{
        padding: "8px 14px 4px", fontSize: 11, fontWeight: 700,
        color: "#6B778C", fontFamily: "Inter, system-ui, sans-serif",
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}>
        Suggested
      </div>

      <div role="listbox" style={{ overflowY: "auto", maxHeight: 240, padding: "2px 0" }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "16px 14px", textAlign: "center",
            fontSize: 13, color: "#6B778C", fontFamily: "Inter, system-ui, sans-serif",
          }}>
            No results found
          </div>
        ) : filtered.map((item) => {
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
                height: 34, padding: "0 14px",
                cursor: "pointer", gap: 8,
                backgroundColor: isActive ? "#F4F5F7" : "transparent",
                borderLeft: isActive ? "2px solid #0052CC" : "2px solid transparent",
                fontSize: 13, color: "#172B4D", fontFamily: "Inter, system-ui, sans-serif",
                transition: "background 60ms ease",
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = "#F4F5F7";
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {label === "Assignee" ? (
                photoUrl ? (
                  <img src={photoUrl} alt={item.display} style={{
                    width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                  }} />
                ) : (
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", display: "inline-flex",
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: item.color || "#525252", color: "#FFFFFF",
                    fontSize: 9, fontWeight: 600, flexShrink: 0,
                  }}>
                    {getInitials(item.display)}
                  </span>
                )
              ) : null}
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.display}
              </span>
              {isActive && <Check size={14} color="#0052CC" style={{ flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div
          onClick={() => onSelect([])}
          style={{
            padding: "0 14px", height: 34, cursor: "pointer",
            color: "#6B778C", fontSize: 13, fontFamily: "Inter, system-ui, sans-serif",
            borderTop: "1px solid #EBECF0",
            display: "flex", alignItems: "center",
            transition: "background 60ms ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F4F5F7")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          Clear filter
        </div>
      )}
    </div>
  );
}

/* ── Filter Button ── */
function FilterButton({ label, icon, isActive, isOpen, onClick, buttonRef }: {
  label: string; icon: React.ReactNode; isActive: boolean; isOpen: boolean;
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
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "0 10px", height: 30, borderRadius: 6,
        border: `1px solid ${active ? "#0052CC" : "#DFE1E6"}`,
        backgroundColor: active ? "#E9F2FF" : "transparent",
        color: active ? "#0052CC" : "#42526E",
        fontSize: 13, fontWeight: 500, cursor: "pointer",
        fontFamily: "Inter, system-ui, sans-serif",
        lineHeight: "20px", whiteSpace: "nowrap",
        transition: "all 80ms ease",
      }}
    >
      {icon}
      {label}
      <ChevronDown size={12} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN — GlobalSearch (Enterprise)
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
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const projectBtnRef = useRef<HTMLButtonElement>(null);
  const assigneeBtnRef = useRef<HTMLButtonElement>(null);

  const debRef = useRef<ReturnType<typeof setTimeout>>();
  const { data: recents = [] } = useRecentItems();
  const { data: results = [], isLoading } = useSearchResults(debouncedQuery, filters);
  const trackView = useTrackView();
  const saveSearch = useSaveSearch();

  const { data: dbProjects = [] } = useQuery({
    queryKey: ['gs-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_jira_projects')
        .select('id, project_key, name')
        .eq('is_active', true)
        .order('project_key');
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        value: p.name as string,
        display: `${p.name} (${p.project_key})` as string,
      }));
    },
    staleTime: 60_000,
  });

  const { data: dbAssignees = [] } = useQuery({
    queryKey: ['gs-assignees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .not('full_name', 'is', null)
        .order('full_name');
      if (error) throw error;
      return (data ?? []).filter((p: any) => p.full_name).map((p: any) => ({
        value: p.full_name as string,
        display: p.full_name as string,
        color: getAvatarColor(p.full_name),
        avatarUrl: p.avatar_url as string | null,
      }));
    },
    staleTime: 60_000,
  });

  const assigneeAvatarMap = new Map<string, string>();
  for (const a of dbAssignees) {
    if (a.avatarUrl) assigneeAvatarMap.set(a.display.toLowerCase(), a.avatarUrl);
  }

  const showSearch = debouncedQuery.length >= 2;

  const filteredRecents = recents.filter(item => {
    if (selectedProjects.length > 0 && !selectedProjects.includes(item.project_name || "")) return false;
    if (selectedAssignees.length > 0 && !selectedAssignees.includes(item.assignee_name || "")) return false;
    return true;
  });

  const displayItems = showSearch ? results.slice(0, 10) : filteredRecents.slice(0, 10);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery(""); setDebouncedQuery(""); setSelectedIdx(0);
      setFilters({ hub: null, project: null, assignee: null, type: null });
      setOpenFilter(null); setSelectedProjects([]); setSelectedAssignees([]);
      setLoadingItemId(null);
    }
  }, [isOpen]);

  const onInput = useCallback((v: string) => {
    setQuery(v);
    setSelectedIdx(0);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setDebouncedQuery(v), 150);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (openFilter) { setOpenFilter(null); } else { close(); } return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, displayItems.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && displayItems[selectedIdx]) { handleSelect(displayItems[selectedIdx]); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, displayItems, selectedIdx, openFilter]);

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
    if (loadingItemId) return; // prevent double-click
    setLoadingItemId(item.id);
    trackView.mutate(item);
    if (debouncedQuery) saveSearch.mutate(debouncedQuery);
    // Brief delay so user sees the loading indicator before modal closes search
    setTimeout(() => {
      const { openDetail } = useGlobalSearchStore.getState();
      openDetail({
        id: item.id,
        projectKey: item.project_key || undefined,
        itemType: item.item_type,
      });
    }, 300);
  }, [debouncedQuery, trackView, saveSearch, loadingItemId]);

  if (!isOpen) return null;

  return createPortal(
    <div className="global-search-portal">
      {/* Backdrop */}
      <div
        onClick={() => { setOpenFilter(null); close(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          backgroundColor: "rgba(9,30,66,0.54)",
        }}
      />

      {/* Main container */}
      <div
        ref={containerRef}
        style={{
          position: "fixed", top: 56, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, width: 780,
          display: "flex", flexDirection: "column",
          maxHeight: "calc(100vh - 72px)",
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: "flex", alignItems: "center",
          backgroundColor: "#FFFFFF", borderRadius: 8,
          boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
          height: 48, padding: "0 4px 0 16px",
        }}>
          <Search size={18} color="#6B778C" style={{ flexShrink: 0, marginRight: 12 }} />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={true}
            aria-controls="gs-results-listbox"
            value={query}
            onChange={e => onInput(e.target.value)}
            placeholder="Search Catalyst..."
            style={{
              flex: 1, height: 28, border: "none", outline: "none",
              fontSize: 15, fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 400, letterSpacing: "-0.01em",
              color: "#172B4D", backgroundColor: "transparent", caretColor: "#0052CC",
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setDebouncedQuery(""); }}
              style={{
                width: 28, height: 28, marginRight: 4, flexShrink: 0,
                border: "none", backgroundColor: "#F4F5F7", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#6B778C", borderRadius: 6,
                transition: "background 80ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#EBECF0")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#F4F5F7")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Panel */}
        <div style={{
          width: 780, marginTop: 6,
          backgroundColor: "#FFFFFF", borderRadius: 8,
          boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Filter Bar */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "10px 14px", gap: 8,
            borderBottom: "1px solid #F4F5F7",
          }}>
            <FilterButton
              label={selectedProjects.length > 0 ? `Projects (${selectedProjects.length})` : "Projects"}
              icon={<FolderKanban size={14} />}
              isActive={selectedProjects.length > 0}
              isOpen={openFilter === "project"}
              onClick={() => setOpenFilter(openFilter === "project" ? null : "project")}
              buttonRef={projectBtnRef}
            />
            <FilterButton
              label={selectedAssignees.length > 0 ? `Assignee (${selectedAssignees.length})` : "Assignee"}
              icon={<User size={14} />}
              isActive={selectedAssignees.length > 0}
              isOpen={openFilter === "assignee"}
              onClick={() => setOpenFilter(openFilter === "assignee" ? null : "assignee")}
              buttonRef={assigneeBtnRef}
            />
          </div>

          {/* Results */}
          <div role="listbox" id="gs-results-listbox" style={{
            display: "flex", flexDirection: "column",
            padding: "4px 0", overflowY: "auto", maxHeight: 540,
          }}>
            {/* Loading */}
            {showSearch && isLoading && [1,2,3,4].map(i => (
              <div key={i} style={{
                display: "flex", alignItems: "center", height: 42, padding: "0 18px", gap: 10,
              }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: "#F4F5F7" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: "55%", height: 12, borderRadius: 3, backgroundColor: "#F4F5F7", marginBottom: 4 }} />
                  <div style={{ width: "35%", height: 10, borderRadius: 3, backgroundColor: "#F4F5F7" }} />
                </div>
              </div>
            ))}

            {/* Recent state */}
            {!showSearch && (() => {
              if (filteredRecents.length === 0) return (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: 160, gap: 8,
                }}>
                  <Clock size={24} color="#94A3B8" />
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#42526E", fontFamily: "Inter, system-ui, sans-serif" }}>
                    No recent items
                  </span>
                  <span style={{ fontSize: 12.5, color: "#94A3B8", fontFamily: "Inter, system-ui, sans-serif" }}>
                    Items you view across Catalyst will appear here
                  </span>
                </div>
              );

              return (
                <>
                  <div style={{
                    padding: "6px 18px 4px", display: "flex", alignItems: "center",
                    fontSize: 11, fontWeight: 700, color: "#6B778C",
                    fontFamily: "Inter, system-ui, sans-serif",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>
                    Recent
                  </div>
                  {displayItems.map((item, idx) => (
                    <ResultRow
                      key={`${item.id}-${idx}`}
                      item={item}
                      query=""
                      isSelected={selectedIdx === idx}
                      onHover={() => setSelectedIdx(idx)}
                      onClick={() => handleSelect(item)}
                    />
                  ))}
                </>
              );
            })()}

            {/* Search Results */}
            {showSearch && !isLoading && (
              <>
                {results.length === 0 ? (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", height: 160, gap: 8,
                  }}>
                    <Search size={24} color="#94A3B8" />
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#42526E", fontFamily: "Inter, system-ui, sans-serif" }}>
                      No results for "{debouncedQuery}"
                    </span>
                  </div>
                ) : (
                  <>
                    <div style={{
                      padding: "6px 18px 4px", display: "flex", alignItems: "center",
                      fontSize: 11, fontWeight: 700, color: "#6B778C",
                      fontFamily: "Inter, system-ui, sans-serif",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>
                      Results
                      <span style={{
                        marginLeft: 6, fontSize: 10, fontWeight: 600, color: "#94A3B8",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {results.length}
                      </span>
                    </div>
                    {displayItems.map((item, idx) => (
                      <ResultRow
                        key={`${item.id}-${idx}`}
                        item={item}
                        query={debouncedQuery}
                        isSelected={selectedIdx === idx}
                        onHover={() => setSelectedIdx(idx)}
                        onClick={() => handleSelect(item)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div
            onClick={() => { /* full search page */ }}
            style={{
              display: "flex", alignItems: "center",
              height: 40, padding: "0 16px", gap: 10,
              borderTop: "1px solid #F4F5F7",
              cursor: "pointer",
              transition: "background 60ms ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAFBFC")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Search size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
            <span style={{
              flex: 1, fontSize: 13, fontWeight: 450, color: "#42526E",
              fontFamily: "Inter, system-ui, sans-serif",
            }}>
              Search Catalyst for work items
            </span>
            <kbd style={{
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              color: "#94A3B8", backgroundColor: "#F4F5F7",
              border: "1px solid #EBECF0",
              borderRadius: 4, padding: "1px 6px",
            }}>↵</kbd>
          </div>
        </div>
      </div>

      {/* PopupSelect overlays */}
      {openFilter === "project" && (
        <PopupSelect
          label="Projects"
          items={dbProjects}
          selected={selectedProjects}
          onSelect={setSelectedProjects}
          triggerRef={projectBtnRef}
        />
      )}
      {openFilter === "assignee" && (
        <PopupSelect
          label="Assignee"
          items={dbAssignees}
          selected={selectedAssignees}
          onSelect={setSelectedAssignees}
          triggerRef={assigneeBtnRef}
          avatarMap={assigneeAvatarMap}
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
