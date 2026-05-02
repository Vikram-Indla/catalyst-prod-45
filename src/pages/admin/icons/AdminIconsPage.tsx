/**
 * AdminIconsPage — RESET ICONS runtime override management.
 *
 * Route: /admin/icons (admin-only).
 *
 * Built with Atlaskit primitives (Heading, Button, Tabs, Lozenge,
 * SectionMessage, Tooltip, Textfield, Spinner, Modal, RadioGroup) so
 * the page reads as a native Catalyst admin surface. Layout uses
 * @atlaskit/primitives (Box / Stack / Inline) with xcss tokens.
 *
 * Responsive grid: cards auto-fill at minmax(220px, 1fr), so the page
 * goes from 5-up wide down to 1-up on narrow phones with no breakpoints.
 *
 * Light vs dark preview:
 *   The toggle changes the BACKGROUND of the preview well so admins can
 *   verify contrast on Catalyst's dark surface without theme-flipping
 *   the entire app. Icons that ship a real `_dark/` variant (Figma,
 *   priority/none) swap to it; everything else keeps its brand color
 *   (Jira parity) but is shown on the dark surface for visual review.
 *
 * Add new icon:
 *   "+ Add custom" per tab opens a modal with key + file inputs.
 *   Uploads land in catalyst_icon_overrides with the user-supplied key
 *   and surface in the same tab labelled CUSTOM.
 *
 * After-upload notification:
 *   The success toast lists every Catalyst surface where the icon now
 *   renders, so the admin sees the blast radius of their change.
 */

import React, { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import Heading from '@atlaskit/heading';
import Button from '@atlaskit/button/new';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import Tooltip from '@atlaskit/tooltip';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import { RadioGroup } from '@atlaskit/radio';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import { Box, Stack, Inline, xcss } from '@atlaskit/primitives';

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

// ─── Where each category renders across Catalyst ─────────────────────
// Used to populate the post-upload toast so admins see the blast radius.

const SURFACES_BY_CATEGORY: Record<IconCategory, string[]> = {
  'work-type': [
    'Backlog tables (Project Hub, Workhub)',
    'Kanban cards (every board)',
    'Issue detail modal + Story drawer',
    'For You page (Recommended, Assigned, Worked on)',
    'All Work table + sub-task lists',
    'Project dashboard widgets',
  ],
  priority: [
    'Issue rows on every backlog & table',
    'Story / defect / incident detail modal',
    'Priority editor dropdown',
    'Project dashboard widgets (On Hold, Time-in-Status, Overdue)',
  ],
  'project-avatar': [
    'Project header chip (every Project Hub page)',
    'For You "Recommended projects" strip',
    'Project picker + sidebar entries',
    'Breadcrumb chips',
    'Recent items',
  ],
};

function announceSurfaces(category: IconCategory, label: string) {
  const surfaces = SURFACES_BY_CATEGORY[category];
  toast.success(`${label} updated`, {
    description: `Now visible in: ${surfaces.join(' · ')}`,
    duration: 9000,
  });
}

// ─── Layout primitives (plain CSS for non-token values; xcss for tokens) ──
//
// xcss is type-safe and silently drops values that aren't ADS design tokens.
// `maxWidth: '1280px'` and `gridTemplateColumns: 'repeat(auto-fill, …)'`
// fall through and never apply, which is why v3 collapsed to a narrow column.
// We keep Atlaskit primitives for typography / spacing where tokens DO apply,
// and use plain CSSProperties for the grid + container width.

const pageContainerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 1440,
  marginInline: 'auto',
  paddingBlock: 24,
  paddingInline: 32,
  boxSizing: 'border-box',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
};

const cardStyles = xcss({
  display: 'flex',
  flexDirection: 'column',
  padding: 'space.200',
  borderRadius: 'border.radius.200',
  backgroundColor: 'elevation.surface',
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  transitionDuration: '150ms',
  transitionProperty: 'all',
  ':hover': {
    backgroundColor: 'elevation.surface.hovered',
    borderColor: 'color.border.bold',
    boxShadow: 'elevation.shadow.raised',
  },
});

const previewWellLightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 88,
  borderRadius: 6,
  backgroundColor: 'var(--ds-surface-sunken, #F4F5F7)',
  marginBottom: 12,
};

const previewWellDarkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 88,
  borderRadius: 6,
  backgroundColor: '#1D2125', // ADS dark surface
  marginBottom: 12,
};

const cardLabelRowStyles = xcss({
  marginBottom: 'space.100',
  minHeight: '24px',
});

const labelTextStyles = xcss({
  flex: '1',
  font: 'font.body',
  color: 'color.text',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const cardActionsStyles = xcss({
  marginTop: 'space.100',
});

const tabPanelPadStyle: React.CSSProperties = { paddingBlockStart: 24 };

// ─── Single icon card ────────────────────────────────────────────────

interface IconCardProps {
  category: IconCategory;
  itemKey: string;
  label: string;
  preview: React.ReactNode;
  hasOverride: boolean;
  isCustom?: boolean;
  supportsDarkVariant: boolean;
}

function IconCard({
  category, itemKey, label, preview, hasOverride, isCustom, supportsDarkVariant,
}: IconCardProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [variant, setVariant] = useState<'light' | 'dark'>('light');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast.error('Not signed in');
      return;
    }
    const allowed = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error(`Unsupported type: ${file.type}. Use SVG / PNG / JPG / WEBP.`);
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
      await uploadIconOverride({ category, key: itemKey, variant, file, uploadedBy: user.id });
      await queryClient.invalidateQueries({ queryKey: ['icon-overrides'] });
      announceSurfaces(category, label);
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

  const wellStyle = variant === 'dark' ? previewWellDarkStyle : previewWellLightStyle;

  return (
    <Box xcss={cardStyles} testId={`icon-card--${category}--${itemKey}`}>
      <div style={wellStyle}>{preview}</div>

      <Inline xcss={cardLabelRowStyles} alignBlock="center" spread="space-between" space="space.100">
        <Tooltip content={label} position="top">
          <Box xcss={labelTextStyles}>{label}</Box>
        </Tooltip>
        <Inline space="space.050" alignBlock="center">
          {isCustom && <Lozenge appearance="new">CUSTOM</Lozenge>}
          {hasOverride && <Lozenge appearance="success">OVERRIDE</Lozenge>}
        </Inline>
      </Inline>

      {supportsDarkVariant && (
        <div style={{ marginBottom: 8 }}>
          <RadioGroup
            name={`variant-${category}-${itemKey}`}
            isDisabled={busy}
            value={variant}
            onChange={(e) => setVariant(e.target.value as 'light' | 'dark')}
            options={[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
          />
        </div>
      )}

      <Stack xcss={cardActionsStyles} space="space.100">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/svg+xml,image/png,image/jpeg,image/webp"
          onChange={handleUpload}
          disabled={busy}
          style={{ display: 'none' }}
        />
        <Button
          appearance="primary"
          isDisabled={busy}
          shouldFitContainer
          onClick={() => fileInputRef.current?.click()}
        >
          {busy ? <Spinner size="small" /> : 'Replace'}
        </Button>
        {hasOverride && (
          <Button
            appearance="subtle"
            isDisabled={busy}
            shouldFitContainer
            onClick={handleReset}
          >
            Reset to bundled
          </Button>
        )}
      </Stack>
    </Box>
  );
}

// ─── Add-custom modal ────────────────────────────────────────────────

interface AddCustomIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: IconCategory;
}

function AddCustomIconModal({ isOpen, onClose, category }: AddCustomIconModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [key, setKey] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [variant, setVariant] = useState<'light' | 'dark'>('light');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setKey('');
    setFile(null);
    setVariant('light');
    setBusy(false);
  };

  async function handleCreate() {
    const trimmed = key.trim();
    if (!trimmed) {
      toast.error('Key is required');
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      toast.error('Key must contain only letters, numbers, hyphens, underscores');
      return;
    }
    if (!file) {
      toast.error('Pick a file');
      return;
    }
    if (!user?.id) {
      toast.error('Not signed in');
      return;
    }
    setBusy(true);
    try {
      await uploadIconOverride({ category, key: trimmed, variant, file, uploadedBy: user.id });
      await queryClient.invalidateQueries({ queryKey: ['icon-overrides'] });
      announceSurfaces(category, `Custom ${category} icon "${trimmed}"`);
      reset();
      onClose();
    } catch (err) {
      toast.error(`Create failed: ${err instanceof Error ? err.message : String(err)}`);
      setBusy(false);
    }
  }

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose}>
          <ModalHeader>
            <ModalTitle>Add custom {category.replace('-', ' ')} icon</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionMessage appearance="warning" title="Custom keys note">
                <p>
                  Custom keys are persisted but only render where calling code references the
                  exact key. For project avatars, set the project's <code>key</code> column
                  to the same value. For work-type / priority, the canonical registry must be
                  extended in code for the icon to appear on existing surfaces.
                </p>
              </SectionMessage>

              <div>
                <label htmlFor="custom-key" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Key</label>
                <Textfield
                  id="custom-key"
                  value={key}
                  onChange={(e) => setKey((e.target as HTMLInputElement).value)}
                  placeholder="e.g. acme-feature, RND, tech-debt"
                  isDisabled={busy}
                />
              </div>

              {category !== 'project-avatar' && (
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Variant</label>
                  <RadioGroup
                    name="custom-variant"
                    isDisabled={busy}
                    value={variant}
                    onChange={(e) => setVariant(e.target.value as 'light' | 'dark')}
                    options={[
                      { label: 'Light', value: 'light' },
                      { label: 'Dark', value: 'dark' },
                    ]}
                  />
                </div>
              )}

              <div>
                <label htmlFor="custom-file" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                  Asset (SVG / PNG / JPG / WEBP, max 1 MB)
                </label>
                <input
                  type="file"
                  id="custom-file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ds-text-subtle, #626F86)' }}>
                    {file.name} · {Math.round(file.size / 1024)} KB
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" isDisabled={busy} onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button appearance="primary" isDisabled={busy || !key.trim() || !file} onClick={handleCreate}>
              {busy ? <Spinner size="small" /> : 'Create'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

// ─── Filtered grid for one category ──────────────────────────────────

interface CategoryGridProps {
  cards: IconCardProps[];
  filter: string;
}

function CategoryGrid({ cards, filter }: CategoryGridProps) {
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) => c.label.toLowerCase().includes(q) || c.itemKey.toLowerCase().includes(q),
    );
  }, [cards, filter]);

  if (filtered.length === 0) {
    return (
      <div style={{ paddingBlock: 40, textAlign: 'center', color: 'var(--ds-text-subtlest, #8590A2)' }}>
        No icons match "{filter}"
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      {filtered.map((c) => (
        <IconCard key={`${c.category}-${c.itemKey}`} {...c} />
      ))}
    </div>
  );
}

// ─── The page ────────────────────────────────────────────────────────

export default function AdminIconsPage() {
  const { data: overrides, isLoading } = useIconOverrides();
  const [filter, setFilter] = useState('');
  const [addModalCategory, setAddModalCategory] = useState<IconCategory | null>(null);

  function workTypeOverridden(t: WorkItemType): boolean {
    return Boolean(overrides?.workType?.[t]?.light || overrides?.workType?.[t]?.dark);
  }
  function priorityOverridden(p: PriorityLevel): boolean {
    return Boolean(overrides?.priority?.[p]?.light || overrides?.priority?.[p]?.dark);
  }
  function avatarOverridden(k: string): boolean {
    return Boolean(overrides?.projectAvatar?.[k]);
  }

  // Discover any custom keys uploaded that aren't in the canonical enums.
  const customWorkTypes: string[] = useMemo(() => {
    const known = new Set<string>(WORK_ITEM_TYPES);
    return Object.keys(overrides?.workType ?? {}).filter((k) => !known.has(k as WorkItemType));
  }, [overrides]);
  const customPriorities: string[] = useMemo(() => {
    const known = new Set<string>(PRIORITY_LEVELS);
    return Object.keys(overrides?.priority ?? {}).filter((k) => !known.has(k as PriorityLevel));
  }, [overrides]);
  const customAvatars: string[] = useMemo(() => {
    const known = new Set<string>([
      ...PROJECT_KEYS,
      ...Object.keys(STOCK_AVATAR_REGISTRY),
    ]);
    return Object.keys(overrides?.projectAvatar ?? {}).filter((k) => !known.has(k));
  }, [overrides]);

  // Build the card data for each tab.
  const workTypeCards: IconCardProps[] = useMemo(() => {
    const std: IconCardProps[] = WORK_ITEM_TYPES.map((t) => ({
      category: 'work-type' as const,
      itemKey: t,
      label: WORK_TYPE_REGISTRY[t].label,
      preview: <WorkItemTypeIcon type={t} size={36} />,
      hasOverride: workTypeOverridden(t),
      supportsDarkVariant: true,
    }));
    const custom: IconCardProps[] = customWorkTypes.map((k) => ({
      category: 'work-type' as const,
      itemKey: k,
      label: k,
      preview: <CustomPreview url={overrides?.workType?.[k]?.light ?? overrides?.workType?.[k]?.dark} size={36} />,
      hasOverride: true,
      isCustom: true,
      supportsDarkVariant: true,
    }));
    return [...std, ...custom];
  }, [overrides, customWorkTypes]);

  const priorityCards: IconCardProps[] = useMemo(() => {
    const std: IconCardProps[] = PRIORITY_LEVELS.map((p) => ({
      category: 'priority' as const,
      itemKey: p,
      label: PRIORITY_REGISTRY[p].label,
      preview: <PriorityIcon level={p} size={36} />,
      hasOverride: priorityOverridden(p),
      supportsDarkVariant: true,
    }));
    const custom: IconCardProps[] = customPriorities.map((k) => ({
      category: 'priority' as const,
      itemKey: k,
      label: k,
      preview: <CustomPreview url={overrides?.priority?.[k]?.light ?? overrides?.priority?.[k]?.dark} size={36} />,
      hasOverride: true,
      isCustom: true,
      supportsDarkVariant: true,
    }));
    return [...std, ...custom];
  }, [overrides, customPriorities]);

  const projectAvatarCards: IconCardProps[] = useMemo(() => {
    const std: IconCardProps[] = PROJECT_KEYS.map((k: ProjectKey) => ({
      category: 'project-avatar' as const,
      itemKey: k,
      label: `${k} — ${PROJECT_AVATAR_REGISTRY[k].name}`,
      preview: <ProjectAvatar projectKey={k} size={56} />,
      hasOverride: avatarOverridden(k),
      supportsDarkVariant: false,
    }));
    const custom: IconCardProps[] = customAvatars.map((k) => ({
      category: 'project-avatar' as const,
      itemKey: k,
      label: k,
      preview: <CustomPreview url={overrides?.projectAvatar?.[k]} size={56} rounded />,
      hasOverride: true,
      isCustom: true,
      supportsDarkVariant: false,
    }));
    return [...std, ...custom];
  }, [overrides, customAvatars]);

  const stockCards: IconCardProps[] = useMemo(
    () =>
      (Object.keys(STOCK_AVATAR_REGISTRY) as StockAvatarId[]).map((id) => ({
        category: 'project-avatar' as const,
        itemKey: id,
        label: id,
        preview: (
          <img
            src={STOCK_AVATAR_REGISTRY[id]}
            width={56}
            height={56}
            alt={id}
            style={{ borderRadius: 4, objectFit: 'cover' }}
          />
        ),
        hasOverride: avatarOverridden(id),
        supportsDarkVariant: false,
      })),
    [overrides],
  );

  const counts = {
    workType: { total: workTypeCards.length, overridden: workTypeCards.filter((c) => c.hasOverride).length },
    priority: { total: priorityCards.length, overridden: priorityCards.filter((c) => c.hasOverride).length },
    projectAvatar: { total: projectAvatarCards.length, overridden: projectAvatarCards.filter((c) => c.hasOverride).length },
    stock: { total: stockCards.length, overridden: stockCards.filter((c) => c.hasOverride).length },
  };

  const tabLabel = (name: string, c: { total: number; overridden: number }) =>
    c.overridden > 0 ? `${name} (${c.overridden}/${c.total})` : `${name} (${c.total})`;

  return (
    <div style={pageContainerStyle}>
      <div style={{ marginBottom: 24 }}>
        <Heading size="xlarge">Icon library</Heading>
        <div style={{ marginTop: 8, color: 'var(--ds-text-subtle, #626F86)', maxWidth: 720 }}>
          Replace any work-item type, priority indicator, or project avatar without redeploying.
          Uploads take effect across every Catalyst surface within seconds. Reset any card to
          return to the bundled canonical asset.
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionMessage appearance="information" title="How runtime overrides work">
          <p>
            Icons in <code>src/assets/icons/</code> are the bundled canonical set — committed to
            git and version-controlled. Uploads here persist to Supabase Storage and are merged
            in at render time via <code>useIconOverrides()</code>. The table and bucket are
            admin-write only (RLS).
          </p>
        </SectionMessage>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, maxWidth: 420 }}>
          <Textfield
            placeholder="Filter by name or key (e.g. story, BAU, highest)"
            value={filter}
            onChange={(e) => setFilter((e.target as HTMLInputElement).value)}
            isCompact
          />
        </div>
        {isLoading && (
          <Tooltip content="Loading current overrides…" position="bottom">
            <span><Spinner size="small" /></span>
          </Tooltip>
        )}
      </div>

      <Tabs id="icon-categories">
        <TabList>
          <Tab>{tabLabel('Work item types', counts.workType)}</Tab>
          <Tab>{tabLabel('Priorities', counts.priority)}</Tab>
          <Tab>{tabLabel('Project avatars', counts.projectAvatar)}</Tab>
          <Tab>{tabLabel('Stock pool', counts.stock)}</Tab>
        </TabList>

        <TabPanel>
          <div style={tabPanelPadStyle}>
            <div style={{ marginBottom: 16 }}>
              <Button appearance="default" onClick={() => setAddModalCategory('work-type')}>
                + Add custom work-type icon
              </Button>
            </div>
            <CategoryGrid cards={workTypeCards} filter={filter} />
          </div>
        </TabPanel>

        <TabPanel>
          <div style={tabPanelPadStyle}>
            <div style={{ marginBottom: 16 }}>
              <Button appearance="default" onClick={() => setAddModalCategory('priority')}>
                + Add custom priority icon
              </Button>
            </div>
            <CategoryGrid cards={priorityCards} filter={filter} />
          </div>
        </TabPanel>

        <TabPanel>
          <div style={tabPanelPadStyle}>
            <div style={{ marginBottom: 16 }}>
              <Button appearance="default" onClick={() => setAddModalCategory('project-avatar')}>
                + Add custom project avatar
              </Button>
            </div>
            <CategoryGrid cards={projectAvatarCards} filter={filter} />
          </div>
        </TabPanel>

        <TabPanel>
          <div style={tabPanelPadStyle}>
            <div style={{ marginBottom: 16 }}>
              <Button appearance="default" onClick={() => setAddModalCategory('project-avatar')}>
                + Add custom stock avatar
              </Button>
            </div>
            <CategoryGrid cards={stockCards} filter={filter} />
          </div>
        </TabPanel>
      </Tabs>

      <AddCustomIconModal
        isOpen={addModalCategory !== null}
        category={addModalCategory ?? 'work-type'}
        onClose={() => setAddModalCategory(null)}
      />
    </div>
  );
}

// ─── Custom override preview helper ──────────────────────────────────

function CustomPreview({ url, size, rounded }: { url?: string; size: number; rounded?: boolean }) {
  if (!url) return null;
  return (
    <img
      src={url}
      width={size}
      height={size}
      alt=""
      style={{
        borderRadius: rounded ? 4 : 0,
        objectFit: 'cover',
      }}
    />
  );
}
