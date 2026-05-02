/**
 * AdminIconsPage — RESET ICONS runtime override management.
 *
 * Route: /admin/icons (admin-only, gated by AdminGuard wrapping the
 * /admin route group in FullAppRoutes).
 *
 * What this page does:
 *   - Lists every canonical icon in the Catalyst library (work-type,
 *     priority, project avatars + stock pool) — the 48 assets shipped
 *     in src/assets/icons/.
 *   - Renders each one with the live URL it's currently rendering at
 *     (override OR bundled fallback).
 *   - Lets the admin upload a replacement file. Uploads land in the
 *     icon-overrides Supabase Storage bucket; an upsert into
 *     catalyst_icon_overrides ties the URL to the canonical key.
 *   - Lets the admin remove an override (which deletes the row + the
 *     storage object, returning the surface to the bundled asset).
 *
 * Every change immediately invalidates the icon-overrides React Query
 * cache so the rest of Catalyst re-renders with the new URL within a
 * few hundred ms.
 *
 * Note on scope: this is the ONLY route in Catalyst that can write to
 * `catalyst_icon_overrides`. Supabase RLS enforces the admin gate at
 * the database; this UI exists because that's how admins discover the
 * surface.
 */

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  WorkItemTypeIcon,
  PriorityIcon,
  ProjectAvatar,
  WORK_ITEM_TYPES,
  PRIORITY_LEVELS,
  PROJECT_KEYS,
  STOCK_AVATAR_REGISTRY,
  WORK_TYPE_REGISTRY,
  PRIORITY_REGISTRY,
  PROJECT_AVATAR_REGISTRY,
  useIconOverrides,
  type WorkItemType,
  type PriorityLevel,
  type ProjectKey,
  type StockAvatarId,
  type IconCategory,
} from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import {
  uploadIconOverride,
  removeIconOverride,
} from '@/services/iconOverrideService';

// ─── Section header ────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        marginTop: 24,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--ds-text, #172B4D)' }}>
        {title}
      </h2>
      <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #626F86)' }}>
        {count} icons
      </span>
    </div>
  );
}

// ─── Single icon card ──────────────────────────────────────────────

interface IconCardProps {
  category: IconCategory;
  itemKey: string;
  label: string;
  preview: React.ReactNode;
  hasOverride: boolean;
}

function IconCard({ category, itemKey, label, preview, hasOverride }: IconCardProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [variant, setVariant] = useState<'light' | 'dark'>('light');

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast.error('Not signed in');
      return;
    }

    // Reject anything except SVG/PNG/JPG/WEBP. Reject anything > 1 MB.
    const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Unsupported file type: ${file.type}. Use SVG / PNG / JPG / WEBP.`);
      e.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error(`File too large (${Math.round(file.size / 1024)} KB). Max 1 MB.`);
      e.target.value = '';
      return;
    }

    setBusy(true);
    try {
      await uploadIconOverride({
        category,
        key: itemKey,
        variant,
        file,
        uploadedBy: user.id,
      });
      await queryClient.invalidateQueries({ queryKey: ['icon-overrides'] });
      toast.success(`${label} updated`);
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function handleReset() {
    setBusy(true);
    try {
      await removeIconOverride(category, itemKey, variant);
      await queryClient.invalidateQueries({ queryKey: ['icon-overrides'] });
      toast.success(`${label} reset to bundled icon`);
    } catch (err) {
      toast.error(`Reset failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: '1px solid var(--ds-border, #DCDFE4)',
        borderRadius: 6,
        padding: 12,
        background: 'var(--ds-surface, #FFFFFF)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 140,
      }}
      data-testid={`icon-card--${category}--${itemKey}`}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 56,
          background: 'var(--ds-background-neutral, #F4F5F7)',
          borderRadius: 4,
        }}
      >
        {preview}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
          {label}
        </div>
        {hasOverride && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--ds-text-success, #216E4E)',
              background: 'var(--ds-background-success, #DCFFF1)',
              padding: '2px 6px',
              borderRadius: 3,
            }}
          >
            OVERRIDE
          </span>
        )}
      </div>
      {(category === 'work-type' || category === 'priority') && (
        <div style={{ display: 'flex', gap: 4, fontSize: 11 }}>
          {(['light', 'dark'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              style={{
                flex: 1,
                padding: '2px 6px',
                border: `1px solid ${variant === v ? 'var(--ds-border-selected, #1868DB)' : 'var(--ds-border, #DCDFE4)'}`,
                background: variant === v ? 'var(--ds-background-selected, #E9F2FF)' : 'transparent',
                borderRadius: 3,
                fontSize: 11,
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      )}
      <label
        style={{
          display: 'inline-block',
          padding: '4px 8px',
          border: '1px solid var(--ds-border, #DCDFE4)',
          borderRadius: 3,
          fontSize: 12,
          textAlign: 'center',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.5 : 1,
          background: 'var(--ds-surface, #FFFFFF)',
        }}
      >
        {busy ? 'Working…' : 'Upload replacement'}
        <input
          type="file"
          accept="image/svg+xml,image/png,image/jpeg,image/webp"
          onChange={handleUpload}
          disabled={busy}
          style={{ display: 'none' }}
        />
      </label>
      {hasOverride && (
        <button
          type="button"
          onClick={handleReset}
          disabled={busy}
          style={{
            padding: '4px 8px',
            border: '1px solid var(--ds-border-danger, #C9372C)',
            color: 'var(--ds-text-danger, #C9372C)',
            background: 'transparent',
            borderRadius: 3,
            fontSize: 12,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          Reset to bundled
        </button>
      )}
    </div>
  );
}

// ─── The page ──────────────────────────────────────────────────────

export default function AdminIconsPage() {
  const { data: overrides } = useIconOverrides();

  function workTypeHasOverride(t: WorkItemType, v: 'light' | 'dark' = 'light') {
    return Boolean(overrides?.workType?.[t]?.[v]);
  }
  function priorityHasOverride(p: PriorityLevel, v: 'light' | 'dark' = 'light') {
    return Boolean(overrides?.priority?.[p]?.[v]);
  }
  function avatarHasOverride(k: string) {
    return Boolean(overrides?.projectAvatar?.[k]);
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--ds-text, #172B4D)' }}>
          Icon library
        </h1>
        <p style={{ marginTop: 8, fontSize: 14, color: 'var(--ds-text-subtle, #626F86)' }}>
          Replace any work-item type, priority indicator, or project avatar without redeploying.
          Uploads take effect immediately across all Catalyst surfaces. Reset returns the
          surface to the bundled canonical asset. RESET ICONS.
        </p>
      </header>

      <SectionHeader title="Work-item types" count={WORK_ITEM_TYPES.length} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {WORK_ITEM_TYPES.map((t) => (
          <IconCard
            key={t}
            category="work-type"
            itemKey={t}
            label={WORK_TYPE_REGISTRY[t].label}
            hasOverride={workTypeHasOverride(t)}
            preview={<WorkItemTypeIcon type={t} size={32} />}
          />
        ))}
      </div>

      <SectionHeader title="Priority indicators" count={PRIORITY_LEVELS.length} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {PRIORITY_LEVELS.map((p) => (
          <IconCard
            key={p}
            category="priority"
            itemKey={p}
            label={PRIORITY_REGISTRY[p].label}
            hasOverride={priorityHasOverride(p)}
            preview={<PriorityIcon level={p} size={32} />}
          />
        ))}
      </div>

      <SectionHeader title="Project avatars (keyed)" count={PROJECT_KEYS.length} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {PROJECT_KEYS.map((k: ProjectKey) => (
          <IconCard
            key={k}
            category="project-avatar"
            itemKey={k}
            label={`${k} — ${PROJECT_AVATAR_REGISTRY[k].name}`}
            hasOverride={avatarHasOverride(k)}
            preview={<ProjectAvatar projectKey={k} size={48} />}
          />
        ))}
      </div>

      <SectionHeader title="Stock pool avatars (unassigned)" count={Object.keys(STOCK_AVATAR_REGISTRY).length} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {(Object.keys(STOCK_AVATAR_REGISTRY) as StockAvatarId[]).map((id) => (
          <IconCard
            key={id}
            category="project-avatar"
            itemKey={id}
            label={id}
            hasOverride={avatarHasOverride(id)}
            preview={
              <img
                src={STOCK_AVATAR_REGISTRY[id]}
                width={48}
                height={48}
                alt={id}
                style={{ borderRadius: 4, objectFit: 'cover' }}
              />
            }
          />
        ))}
      </div>
    </div>
  );
}
