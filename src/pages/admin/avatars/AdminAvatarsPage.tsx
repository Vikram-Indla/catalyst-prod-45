/**
 * AdminAvatarsPage — RESET ICONS face-avatar admin surface.
 *
 * Route: /admin/avatars (admin-only via AdminGuard).
 *
 * Lists every public.profiles row with their current avatar:
 *   1. Override URL from catalyst_resource_avatars (newest), OR
 *   2. Bundled photo at src/assets/avatars/<slug>.png, OR
 *   3. Initials tile fallback.
 *
 * Admins can:
 *   - Upload a replacement photo (becomes a new override row).
 *   - Remove the override (returns the resource to the bundled photo).
 *
 * Atlaskit primitives: Heading, Avatar, Button, Lozenge, Textfield,
 * SectionMessage, Spinner, Tooltip. Layout uses plain divs with token
 * variables (lessons learned from the xcss debacle).
 */

import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import Heading from '@atlaskit/heading';
import Button from '@atlaskit/button/new';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { resolveAvatarUrl } from '@/lib/avatars';
import {
  useResourceAvatarOverrides,
} from '@/hooks/useResourceAvatarOverrides';
import {
  uploadResourceAvatar,
  removeResourceAvatar,
} from '@/services/resourceAvatarService';

interface ResourceProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

// ─── Data ────────────────────────────────────────────────────────────

async function fetchProfiles(): Promise<ResourceProfile[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('profiles')
    .select('id, full_name, email, role')
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ResourceProfile[];
}

function useProfiles() {
  return useQuery({
    queryKey: ['admin-avatars-profiles'],
    queryFn: fetchProfiles,
    staleTime: 60 * 1000,
  });
}

// ─── Layout styles ───────────────────────────────────────────────────

const pageContainerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 1200,
  marginInline: 'auto',
  paddingBlock: 24,
  paddingInline: 24,
  boxSizing: 'border-box',
};

const listContainerStyle: React.CSSProperties = {
  background: 'var(--ds-surface, #FFFFFF)',
  border: '1px solid var(--ds-border, #DCDFE4)',
  borderRadius: 6,
  overflow: 'hidden',
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '64px 1fr auto',
  alignItems: 'center',
  gap: 16,
  paddingBlock: 12,
  paddingInline: 16,
  borderBottom: '1px solid var(--ds-border, #DCDFE4)',
};

const rowStyleLast: React.CSSProperties = {
  ...rowStyle,
  borderBottom: 'none',
};

const initialsTileStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#DCDFE4',
  color: '#172B4D',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 600,
  fontSize: 14,
};

// ─── Initials helper ─────────────────────────────────────────────────

function initialsOf(name: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Single resource row ─────────────────────────────────────────────

interface ResourceRowProps {
  profile: ResourceProfile;
  overrideUrl?: string;
  overrideStoragePath?: string;
  isLast: boolean;
}

function ResourceRow({ profile, overrideUrl, overrideStoragePath, isLast }: ResourceRowProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bundledUrl = profile.full_name ? resolveAvatarUrl(profile.full_name) : null;
  const liveUrl = overrideUrl ?? bundledUrl;
  const hasOverride = Boolean(overrideUrl);
  const hasBundled = Boolean(bundledUrl);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast.error('Not signed in');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error(`Unsupported type: ${file.type}. Use PNG / JPG / WEBP.`);
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(`File too large (${Math.round(file.size / 1024)} KB). Max 2 MB.`);
      e.target.value = '';
      return;
    }
    setBusy(true);
    try {
      await uploadResourceAvatar({
        profileId: profile.id,
        file,
        uploadedBy: user.id,
        previousStoragePath: overrideStoragePath ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ['resource-avatar-overrides'] });
      toast.success(`${profile.full_name ?? profile.email ?? 'Resource'} avatar updated`, {
        description: 'Visible across every Catalyst surface that renders this person.',
        duration: 6000,
      });
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await removeResourceAvatar(profile.id);
      await queryClient.invalidateQueries({ queryKey: ['resource-avatar-overrides'] });
      toast.success(`${profile.full_name ?? profile.email ?? 'Resource'} avatar reset`);
    } catch (err) {
      toast.error(`Remove failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={isLast ? rowStyleLast : rowStyle}>
      {/* Avatar column */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {liveUrl ? (
          <Avatar size="medium" src={liveUrl} name={profile.full_name ?? profile.email ?? '?'} />
        ) : (
          <div style={initialsTileStyle}>{initialsOf(profile.full_name ?? profile.email ?? '?')}</div>
        )}
      </div>

      {/* Identity column */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--ds-text, #172B4D)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          <span>{profile.full_name ?? '(no name)'}</span>
          {hasOverride && <Lozenge appearance="success">CUSTOM</Lozenge>}
          {!hasOverride && hasBundled && <Lozenge appearance="default">BUNDLED</Lozenge>}
          {!hasOverride && !hasBundled && <Lozenge appearance="moved">INITIALS</Lozenge>}
          {profile.role && <Lozenge appearance="inprogress">{profile.role}</Lozenge>}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--ds-text-subtle, #626F86)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {profile.email ?? ''}
        </div>
      </div>

      {/* Actions column */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png,image/jpeg,image/webp"
          onChange={handleUpload}
          disabled={busy}
          style={{ display: 'none' }}
        />
        <Button
          appearance="default"
          spacing="compact"
          isDisabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {busy ? <Spinner size="small" /> : hasOverride ? 'Replace' : hasBundled ? 'Override' : 'Upload'}
        </Button>
        {hasOverride && (
          <Button
            appearance="subtle"
            spacing="compact"
            isDisabled={busy}
            onClick={handleRemove}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── The page ────────────────────────────────────────────────────────

export default function AdminAvatarsPage() {
  const { data: overrides = {}, isLoading: overridesLoading } = useResourceAvatarOverrides();
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const name = (p.full_name ?? '').toLowerCase();
      const email = (p.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [profiles, filter]);

  const counts = {
    total: profiles.length,
    overridden: profiles.filter((p) => overrides[p.id]).length,
    bundled: profiles.filter((p) => !overrides[p.id] && p.full_name && resolveAvatarUrl(p.full_name)).length,
  };

  const isLoading = profilesLoading || overridesLoading;

  return (
    <div style={pageContainerStyle}>
      <div style={{ marginBottom: 16 }}>
        <Heading size="xlarge">Resource avatars</Heading>
        <div style={{ marginTop: 8, color: 'var(--ds-text-subtle, #626F86)', maxWidth: 720, fontSize: 14 }}>
          Manage face photos for every resource. Replacements take effect immediately
          across every Catalyst surface that renders this person — assignee pickers,
          comments, sidebars, breadcrumbs, recent items.
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionMessage appearance="information" title="Resolution order">
          <p>
            Each row resolves in this order: (1) admin-uploaded override on
            this page, (2) bundled photo at <code>src/assets/avatars/&lt;slug&gt;.png</code>,
            (3) initials tile fallback. Removing an override returns the resource
            to its bundled photo if one exists.
          </p>
        </SectionMessage>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}>
        <div style={{ flex: 1, minWidth: 280, maxWidth: 420 }}>
          <Textfield
            placeholder="Filter by name or email"
            value={filter}
            onChange={(e) => setFilter((e.target as HTMLInputElement).value)}
            isCompact
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <Lozenge appearance="default">{counts.total} total</Lozenge>
          <Lozenge appearance="success">{counts.overridden} overridden</Lozenge>
          <Lozenge appearance="inprogress">{counts.bundled} bundled</Lozenge>
        </div>
        {isLoading && (
          <Tooltip content="Loading…" position="bottom">
            <span><Spinner size="small" /></span>
          </Tooltip>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          background: 'var(--ds-surface-sunken, #F4F5F7)',
          borderRadius: 6,
          color: 'var(--ds-text-subtle, #626F86)',
        }}>
          {profiles.length === 0
            ? 'No profiles found. Have any users been provisioned?'
            : `No resources match "${filter}".`}
        </div>
      ) : (
        <div style={listContainerStyle}>
          {filtered.map((p, idx) => (
            <ResourceRow
              key={p.id}
              profile={p}
              overrideUrl={overrides[p.id]?.avatar_url}
              overrideStoragePath={overrides[p.id]?.storage_path}
              isLast={idx === filtered.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
