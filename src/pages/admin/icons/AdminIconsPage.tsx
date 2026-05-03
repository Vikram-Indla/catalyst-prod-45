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
// Atlaskit primitives (Box / Stack / Inline / xcss) deliberately not used:
// xcss silently drops non-token CSS values which collapsed the layout to a
// narrow column. Plain <div style={…}> with token-backed CSS variables is
// the pragmatic choice for arbitrary widths and grid-template strings.

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
  useIconCategories,
  type WorkItemType,
  type PriorityLevel,
  type ProjectKey,
  type StockAvatarId,
  type IconCategory,
  type IconCategoryRow,
} from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import {
  uploadIconOverride,
  removeIconOverride,
  createIconCategory,
  deleteIconCategory,
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
  const surfaces = SURFACES_BY_CATEGORY[category as keyof typeof SURFACES_BY_CATEGORY];
  if (surfaces) {
    toast.success(`${label} updated`, {
      description: `Now visible in: ${surfaces.join(' · ')}`,
      duration: 9000,
    });
  } else {
    toast.success(`${label} updated`, {
      description: `Available wherever code references "${category}".`,
      duration: 6000,
    });
  }
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
  maxWidth: 1600,
  marginInline: 'auto',
  paddingBlock: 24,
  paddingInline: 24,
  boxSizing: 'border-box',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  width: '100%',
  // Tighter min — at 1280px content width that's 8 columns; at 720 it's 4;
  // at 360 it's 2. Way more efficient than the 220px v3 baseline.
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
};

const cardOuterStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 10,
  borderRadius: 6,
  backgroundColor: 'var(--ds-surface, #FFFFFF)',
  border: '1px solid var(--ds-border, #DCDFE4)',
  transition: 'all 150ms ease',
  minWidth: 0,
};

const previewWellLightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 64,
  borderRadius: 4,
  backgroundColor: 'var(--ds-surface-sunken, #F4F5F7)',
  marginBottom: 8,
};

const previewWellDarkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 64,
  borderRadius: 4,
  backgroundColor: '#1D2125',
  marginBottom: 8,
};

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
    <div style={cardOuterStyle} data-testid={`icon-card--${category}--${itemKey}`}>
      <div style={wellStyle}>{preview}</div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        marginBottom: 6,
        minWidth: 0,
      }}>
        <Tooltip content={label} position="top">
          <div style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ds-text, #172B4D)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}>{label}</div>
        </Tooltip>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {isCustom && <Lozenge appearance="new">CUSTOM</Lozenge>}
          {hasOverride && <Lozenge appearance="success">SET</Lozenge>}
        </div>
      </div>

      {supportsDarkVariant && (
        <div style={{ marginBottom: 6, fontSize: 12 }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
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
          spacing="compact"
          shouldFitContainer
          onClick={() => fileInputRef.current?.click()}
        >
          {busy ? <Spinner size="small" /> : 'Replace'}
        </Button>
        {hasOverride && (
          <Button
            appearance="subtle"
            isDisabled={busy}
            spacing="compact"
            shouldFitContainer
            onClick={handleReset}
          >
            Reset
          </Button>
        )}
      </div>
    </div>
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
  const { data: dynamicCategories = [] } = useIconCategories();
  const [filter, setFilter] = useState('');
  const [addModalCategory, setAddModalCategory] = useState<IconCategory | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<IconCategoryRow | null>(null);

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

  // Per-dynamic-category cards: items live in overrides.byCategory[name].
  const dynamicCardsByCategory = useMemo(() => {
    const map: Record<string, IconCardProps[]> = {};
    for (const cat of dynamicCategories) {
      const items = overrides?.byCategory?.[cat.name] ?? {};
      map[cat.name] = Object.entries(items).map(([k, urls]) => ({
        category: cat.name,
        itemKey: k,
        label: k,
        preview: <CustomPreview url={urls.light ?? urls.dark} size={36} />,
        hasOverride: true,
        isCustom: true,
        supportsDarkVariant: true,
      }));
    }
    return map;
  }, [dynamicCategories, overrides]);

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280, maxWidth: 420 }}>
          <Textfield
            placeholder="Filter by name or key (e.g. story, BAU, highest)"
            value={filter}
            onChange={(e) => setFilter((e.target as HTMLInputElement).value)}
            isCompact
          />
        </div>
        {/* Plain <button> not Atlaskit Button: removes any uncertainty about
            event propagation, type=submit defaults, or compiled-css wrappers
            swallowing clicks. Console.log fires so we can confirm the handler
            runs even if the Modal portal doesn't render. */}
        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('[AdminIcons] + New category clicked');
            setNewCategoryOpen(true);
          }}
          style={{
            padding: '6px 14px',
            borderRadius: 4,
            background: 'var(--ds-background-brand-bold, #1868DB)',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            border: 'none',
            fontWeight: 500,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          + New category
        </button>
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
          {dynamicCategories.map((cat) => (
            <Tab key={cat.id}>
              {tabLabel(cat.label, {
                total: dynamicCardsByCategory[cat.name]?.length ?? 0,
                overridden: dynamicCardsByCategory[cat.name]?.filter((c) => c.hasOverride).length ?? 0,
              })}
            </Tab>
          ))}
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

        {dynamicCategories.map((cat) => (
          <TabPanel key={cat.id}>
            <div style={tabPanelPadStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Button appearance="default" onClick={() => setAddModalCategory(cat.name)}>
                  + Add {cat.label.toLowerCase()} icon
                </Button>
                <Button appearance="subtle" onClick={() => setConfirmDeleteCategory(cat)}>
                  Delete category
                </Button>
              </div>
              {cat.description && (
                <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--ds-text-subtle, #626F86)' }}>
                  {cat.description}
                </div>
              )}
              <CategoryGrid cards={dynamicCardsByCategory[cat.name] ?? []} filter={filter} />
            </div>
          </TabPanel>
        ))}
      </Tabs>

      <AddCustomIconModal
        isOpen={addModalCategory !== null}
        category={addModalCategory ?? 'work-type'}
        onClose={() => setAddModalCategory(null)}
      />

      {/* Inline debug indicator — confirms state flips even if Atlaskit
          Modal portal fails to render. Remove after verifying. */}
      {newCategoryOpen && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999,
            background: '#216E4E',
            color: '#FFFFFF',
            padding: '8px 12px',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'monospace',
          }}
        >
          [debug] newCategoryOpen=true — modal should be visible
        </div>
      )}

      <NewCategoryModal
        isOpen={newCategoryOpen}
        onClose={() => setNewCategoryOpen(false)}
      />

      <ConfirmDeleteCategoryModal
        category={confirmDeleteCategory}
        onClose={() => setConfirmDeleteCategory(null)}
      />
    </div>
  );
}

// ─── New category modal ──────────────────────────────────────────────

function NewCategoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName('');
    setLabel('');
    setDescription('');
    setBusy(false);
  };

  async function handleCreate() {
    if (!user?.id) {
      toast.error('Not signed in');
      return;
    }
    setBusy(true);
    try {
      await createIconCategory({
        name: name.trim().toLowerCase(),
        label: label.trim() || name.trim(),
        description: description.trim() || undefined,
        createdBy: user.id,
      });
      await queryClient.invalidateQueries({ queryKey: ['icon-categories'] });
      toast.success(`Category "${label || name}" created`, {
        description: 'A new tab is now visible above. Add icons to populate it.',
        duration: 6000,
      });
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
            <ModalTitle>Create new icon category</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionMessage appearance="information" title="What is a category?">
                <p>
                  A category groups icons that share a purpose — e.g. <em>severity</em>,
                  <em> risk</em>, <em>environment</em>. Each category becomes its own tab
                  here. Icons inside a custom category render anywhere your code references
                  the category + key.
                </p>
              </SectionMessage>

              <div>
                <label htmlFor="cat-name" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                  Name (slug)
                </label>
                <Textfield
                  id="cat-name"
                  value={name}
                  onChange={(e) => setName((e.target as HTMLInputElement).value)}
                  placeholder="severity"
                  isDisabled={busy}
                />
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ds-text-subtle, #626F86)' }}>
                  Lowercase letters, digits, hyphens, underscores. Used as the database identifier.
                </div>
              </div>

              <div>
                <label htmlFor="cat-label" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                  Label (display name)
                </label>
                <Textfield
                  id="cat-label"
                  value={label}
                  onChange={(e) => setLabel((e.target as HTMLInputElement).value)}
                  placeholder="Severity"
                  isDisabled={busy}
                />
              </div>

              <div>
                <label htmlFor="cat-desc" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                  Description (optional)
                </label>
                <Textfield
                  id="cat-desc"
                  value={description}
                  onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
                  placeholder="Severity levels for incident response (SEV-1, SEV-2, …)"
                  isDisabled={busy}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" isDisabled={busy} onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              isDisabled={busy || !name.trim()}
              onClick={handleCreate}
            >
              {busy ? <Spinner size="small" /> : 'Create category'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

// ─── Confirm delete category modal ───────────────────────────────────

function ConfirmDeleteCategoryModal({
  category, onClose,
}: { category: IconCategoryRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!category) return;
    setBusy(true);
    try {
      await deleteIconCategory(category.name);
      await queryClient.invalidateQueries({ queryKey: ['icon-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['icon-overrides'] });
      toast.success(`Category "${category.label}" removed`);
      onClose();
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
      setBusy(false);
    }
  }

  return (
    <ModalTransition>
      {category && (
        <Modal onClose={onClose}>
          <ModalHeader>
            <ModalTitle>Delete category "{category.label}"?</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p>
              This removes the category tab. Existing icons uploaded under this category will
              remain in storage as orphaned override rows until manually cleaned up. Components
              referencing this category will fall back to bundled assets.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" isDisabled={busy} onClick={onClose}>Cancel</Button>
            <Button appearance="warning" isDisabled={busy} onClick={handleDelete}>
              {busy ? <Spinner size="small" /> : 'Delete category'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
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
