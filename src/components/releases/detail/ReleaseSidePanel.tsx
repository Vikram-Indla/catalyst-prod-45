/**
 * ReleaseSidePanel — right rail on /release-hub/releases-management/:releaseId.
 *
 * Bordered card containing:
 *   - Status dropdown (Unreleased / Released / Archived).
 *       * released   → menu: Archive
 *       * unreleased → menu: Release, Archive
 *       * archived   → menu: Release, Unreleased
 *     "Release" opens ReleaseConfirmationModal; "Archive" opens ReleaseArchiveDialog
 *     (mirrors the flow on /release-hub/releases-management).
 *   - Start date · Release date row (inline DatePicker, hover grey, click to edit).
 *   - Project · Contributors row (Project = ProductSelect; Contributors read-only avatars).
 *   - Description (click to open textarea with ✓ / ✗ buttons; ✓ disabled when empty).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CheckIcon from '@atlaskit/icon/glyph/check';
import EditorCloseIcon from '@atlaskit/icon/glyph/editor/close';
import { DatePicker } from '@atlaskit/datetime-picker';
import { supabase } from '@/integrations/supabase/client';
import { catalystFlag } from '@/lib/catalystFlag';
import { ReleaseConfirmationModal } from '@/components/releases/ReleaseConfirmationModal';
import { ReleaseArchiveDialog } from '@/components/releases/ReleaseArchiveDialog';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { useCatalystAvatarProfile } from '@/components/catalyst-detail-views/shared/hooks/useCatalystAvatarProfile';
import type { Release, ReleaseStatus } from '@/types/phase3-releases';

const BORDER = 'var(--ds-border, #DFE1E6)';
const BLUE = 'var(--ds-border-selected, #1868DB)';
const BLUE_BG = 'var(--ds-background-selected, #E9F2FE)';
const BLUE_TEXT = 'var(--ds-text-selected, #0C66E4)';
const TEXT = 'var(--ds-text, #292A2E)';
const SUBTLE = 'var(--ds-text-subtle, #505258)';
const SUBTLEST = 'var(--ds-text-subtlest, #6B778C)';
const HOVER_BG = 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)';

type DBStatus = 'planning' | 'in_progress' | 'released' | 'archived';
const fromDBStatus = (s: string | null | undefined): ReleaseStatus => {
  if (s === 'released') return 'released';
  if (s === 'archived') return 'archived';
  return 'unreleased';
};
const statusLabel = (s: ReleaseStatus) =>
  s === 'released' ? 'Released' : s === 'archived' ? 'Archived' : 'Unreleased';

interface Props {
  releaseId: string;
  releaseName: string;
  status: string | null | undefined;
  startDate: string | null | undefined;     // ISO yyyy-mm-dd
  releaseDate: string | null | undefined;   // ISO yyyy-mm-dd
  projectId: string;
  projectKey: string | null;
  description: string | null | undefined;
}

export function ReleaseSidePanel(props: Props) {
  const { releaseId, releaseName, projectId, projectKey } = props;
  const queryClient = useQueryClient();
  const uiStatus = fromDBStatus(props.status);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['ph-release', releaseId] });
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'releases'] });
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
  };

  // Contributors: derive from assignees of items linked to this release
  // (uses same cache key as WorkItemsSection — cache hit, no extra fetch).
  const { data: items = [] } = useQuery({
    queryKey: ['release-work-items', releaseId, releaseName],
    queryFn: async () => {
      // No-op fetch — only consume cache; WorkItemsSection is the producer.
      // If cache miss (rare), do a minimal fetch for assignee fields only.
      const { data } = await supabase
        .from('ph_issues')
        .select('assignee_account_id, assignee_display_name, sprint_release')
        .not('sprint_release', 'is', null)
        .limit(2000);
      return (data ?? []).filter((row: any) => {
        const arr = row.sprint_release;
        return Array.isArray(arr) && arr.some((el: any) => el && el.name === releaseName);
      });
    },
    enabled: !!releaseName,
    staleTime: 30_000,
  });

  const contributors = useMemo(() => {
    const seen = new Set<string>();
    const out: { accountId: string | null; name: string | null }[] = [];
    items.forEach((it: any) => {
      const key = (it.assignee_display_name || it.assignee_account_id || '').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ accountId: it.assignee_account_id ?? null, name: it.assignee_display_name ?? null });
    });
    return out;
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <div
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
          padding: 16,
          background: 'var(--ds-surface, #FFFFFF)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <StatusDropdown
          releaseId={releaseId}
          releaseName={releaseName}
          projectId={projectId}
          projectKey={projectKey}
          uiStatus={uiStatus}
          startDate={props.startDate}
          releaseDate={props.releaseDate}
          description={props.description}
          onChanged={refetch}
        />

        <div style={{ display: 'flex', gap: 16 }}>
          <DateField
            label="Start date"
            value={props.startDate}
            onSave={async (v) => {
              const { error } = await supabase
                .from('ph_releases')
                .update({ start_date: v || null })
                .eq('id', releaseId);
              if (error) throw new Error(error.message);
              refetch();
              catalystFlag.success('Start date updated.');
            }}
          />
          <DateField
            label="Release date"
            value={props.releaseDate}
            onSave={async (v) => {
              const { error } = await supabase
                .from('ph_releases')
                .update({ release_date: v || null, target_date: v || null })
                .eq('id', releaseId);
              if (error) throw new Error(error.message);
              refetch();
              catalystFlag.success('Release date updated.');
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <ProjectField
            projectId={projectId}
            onChange={async (nextId) => {
              if (!nextId || nextId === projectId) return;
              const { error } = await supabase
                .from('ph_releases')
                .update({ project_id: nextId })
                .eq('id', releaseId);
              if (error) {
                catalystFlag.error(error.message);
                return;
              }
              refetch();
              catalystFlag.success('Project updated.');
            }}
          />
          <ContributorsField contributors={contributors} />
        </div>

        <DescriptionField
          value={props.description ?? ''}
          onSave={async (next) => {
            const { error } = await supabase
              .from('ph_releases')
              .update({ description: next || null })
              .eq('id', releaseId);
            if (error) throw new Error(error.message);
            refetch();
            catalystFlag.success('Description updated.');
          }}
        />
      </div>
    </div>
  );
}

// ─── Status dropdown ────────────────────────────────────────────────────────

function StatusDropdown({
  releaseId, releaseName, projectId, projectKey, uiStatus, startDate, releaseDate, description, onChanged,
}: {
  releaseId: string;
  releaseName: string;
  projectId: string;
  projectKey: string | null;
  uiStatus: ReleaseStatus;
  startDate: string | null | undefined;
  releaseDate: string | null | undefined;
  description: string | null | undefined;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const setStatusDirect = async (next: DBStatus) => {
    const { error } = await supabase
      .from('ph_releases')
      .update({ status: next, ...(next === 'released' ? {} : { actual_date: null }) })
      .eq('id', releaseId);
    if (error) {
      catalystFlag.error(error.message);
      return;
    }
    onChanged();
    catalystFlag.success(`Status updated to ${next === 'planning' ? 'Unreleased' : next.replace('_', ' ')}.`);
  };

  // Build menu items per current status
  const menuItems: Array<{ key: string; label: string; onSelect: () => void }> = [];
  if (uiStatus === 'released') {
    menuItems.push({ key: 'archive', label: 'Archive', onSelect: () => { setOpen(false); setShowArchiveModal(true); } });
  } else if (uiStatus === 'unreleased') {
    menuItems.push({ key: 'release', label: 'Release', onSelect: () => { setOpen(false); setShowReleaseModal(true); } });
    menuItems.push({ key: 'archive', label: 'Archive', onSelect: () => { setOpen(false); setShowArchiveModal(true); } });
  } else {
    // archived
    menuItems.push({ key: 'release', label: 'Release', onSelect: () => { setOpen(false); setShowReleaseModal(true); } });
    menuItems.push({ key: 'unreleased', label: 'Unreleased', onSelect: () => { setOpen(false); setStatusDirect('planning'); } });
  }

  const releaseShape: Release = {
    id: releaseId,
    project_id: projectId,
    name: releaseName,
    description: description ?? undefined,
    start_date: startDate ?? undefined,
    release_date: releaseDate ?? undefined,
    status: uiStatus,
    sequence: 0,
    created_at: '',
    updated_at: '',
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 12px',
          border: `1px solid ${open ? BLUE : BORDER}`,
          borderRadius: 3,
          background: 'var(--ds-surface, #FFFFFF)',
          color: open ? BLUE_TEXT : TEXT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 500,
          boxShadow: open ? `0 0 0 1px ${BLUE_BG}` : 'none',
        }}
      >
        <span style={{ flex: 1, textAlign: 'center' }}>{statusLabel(uiStatus)}</span>
        <ChevronDownIcon label="" size="small" />
      </button>

      {open && pos && createPortal(
        <div
          ref={popupRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 10010,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)',
            padding: '4px 0',
          }}
        >
          {menuItems.map((m, i) => (
            <button
              key={m.key}
              type="button"
              role="menuitem"
              onClick={m.onSelect}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 14px',
                fontSize: 14,
                color: TEXT,
                borderLeft: i === 0 ? `2px solid ${BLUE}` : '2px solid transparent',
                background: i === 0 ? BLUE_BG : 'transparent',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = BLUE_BG; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i === 0 ? BLUE_BG : 'transparent'; }}
            >
              {m.label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {showReleaseModal && projectKey && (
        <ReleaseConfirmationModal
          isOpen={showReleaseModal}
          release={releaseShape}
          projectKey={projectKey}
          onClose={() => setShowReleaseModal(false)}
          onSuccess={() => { setShowReleaseModal(false); onChanged(); }}
        />
      )}
      {showArchiveModal && projectKey && (
        <ReleaseArchiveDialog
          isOpen={showArchiveModal}
          release={releaseShape}
          projectKey={projectKey}
          onClose={() => setShowArchiveModal(false)}
          onSuccess={() => { setShowArchiveModal(false); onChanged(); }}
        />
      )}
    </>
  );
}

// ─── Date field (label + inline date picker on hover/click) ─────────────────

function DateField({
  label, value, onSave,
}: { label: string; value: string | null | undefined; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [hover, setHover] = useState(false);
  const display = value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{label}</span>
      {editing ? (
        <DatePicker
          defaultValue={value || undefined}
          autoFocus
          onChange={async (next: string) => {
            try {
              await onSave(next);
            } catch (e: any) {
              catalystFlag.error(e?.message || 'Failed to save');
            }
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '2px 6px',
            margin: '-2px -6px',
            borderRadius: 3,
            fontSize: 14,
            color: value ? TEXT : SUBTLEST,
            background: hover ? HOVER_BG : 'transparent',
            alignSelf: 'flex-start',
          }}
        >
          {display}
        </button>
      )}
    </div>
  );
}

// ─── Project picker (custom portal dropdown — opens immediately on click) ────

function ProjectField({
  projectId, onChange,
}: { projectId: string; onChange: (nextId: string | null) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['ph-projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string; key: string; name: string }>;
    },
    staleTime: 5 * 60_000,
  });

  const current = projects.find((p) => p.id === projectId);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q));
  }, [projects, query]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 240) });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Project</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-expanded={open}
        style={{
          all: 'unset',
          cursor: 'pointer',
          padding: '2px 6px',
          margin: '-2px -6px',
          borderRadius: 3,
          fontSize: 14,
          color: current ? TEXT : SUBTLEST,
          background: hover || open ? HOVER_BG : 'transparent',
          alignSelf: 'flex-start',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {current ? current.name : 'Select project'}
      </button>

      {open && pos && createPortal(
        <div
          ref={popupRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 10010,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 320,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: `1px solid ${BORDER}` }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search projects"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 30,
                padding: '0 8px',
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                outline: 'none',
                fontSize: 13,
                color: TEXT,
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', padding: '4px 0' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: 13, color: SUBTLEST }}>No matches</div>
            )}
            {filtered.map((p) => {
              const isSelected = p.id === projectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onChange(p.id); setOpen(false); setQuery(''); }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 12px',
                    background: isSelected ? BLUE_BG : 'transparent',
                    color: isSelected ? BLUE_TEXT : TEXT,
                    fontSize: 13,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = HOVER_BG; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  <span style={{ color: SUBTLEST, fontSize: 11, fontWeight: 600 }}>{p.key}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Contributors (read-only avatar stack) ──────────────────────────────────

function ContributorsField({
  contributors,
}: { contributors: { accountId: string | null; name: string | null }[] }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Contributors</span>
      {contributors.length === 0 ? (
        <span style={{ fontSize: 14, color: SUBTLEST }}>—</span>
      ) : (
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          {contributors.slice(0, 5).map((c, i) => (
            <span
              key={`${c.accountId || c.name || i}`}
              style={{
                marginLeft: i === 0 ? 0 : -6,
                border: '2px solid var(--ds-surface, #FFFFFF)',
                borderRadius: '50%',
                display: 'inline-flex',
              }}
              title={c.name || ''}
            >
              <ContribAvatar accountId={c.accountId} name={c.name} />
            </span>
          ))}
          {contributors.length > 5 && (
            <span style={{ marginLeft: 6, fontSize: 12, color: SUBTLE }}>+{contributors.length - 5}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ContribAvatar({ accountId, name }: { accountId: string | null; name: string | null }) {
  const { data: profile } = useCatalystAvatarProfile(accountId);
  return (
    <CatalystAvatar
      size="small"
      name={name || undefined}
      src={profile?.avatar_url || undefined}
    />
  );
}

// ─── Description with edit toggle ───────────────────────────────────────────

function DescriptionField({
  value, onSave,
}: { value: string; onSave: (next: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [hover, setHover] = useState(false);
  const [saving, setSaving] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) { setDraft(value); setTimeout(() => taRef.current?.focus(), 0); } }, [editing, value]);

  const canSave = draft.trim().length > 0 && draft !== value && !saving;

  const commit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (e: any) {
      catalystFlag.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Description</span>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            rows={4}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 8,
              border: `2px solid ${BLUE}`,
              borderRadius: 3,
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: 14,
              color: TEXT,
            }}
          />
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button
              type="button"
              aria-label="Save"
              disabled={!canSave}
              onClick={commit}
              style={{
                all: 'unset',
                cursor: canSave ? 'pointer' : 'not-allowed',
                width: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                background: 'var(--ds-surface, #FFFFFF)',
                color: canSave ? TEXT : SUBTLEST,
                opacity: canSave ? 1 : 0.5,
              }}
            >
              <CheckIcon label="" size="small" />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => { setDraft(value); setEditing(false); }}
              style={{
                all: 'unset',
                cursor: 'pointer',
                width: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                background: 'var(--ds-surface, #FFFFFF)',
                color: TEXT,
              }}
            >
              <EditorCloseIcon label="" size="small" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '4px 6px',
            margin: '-4px -6px',
            borderRadius: 3,
            fontSize: 14,
            color: value ? TEXT : SUBTLEST,
            background: hover ? HOVER_BG : 'transparent',
            whiteSpace: 'pre-wrap',
            minHeight: 22,
          }}
        >
          {value || 'No description added yet.'}
        </button>
      )}
    </div>
  );
}
