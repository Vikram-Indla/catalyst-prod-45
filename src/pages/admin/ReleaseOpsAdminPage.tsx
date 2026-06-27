/**
 * ReleaseOpsAdminPage — /admin/release-ops
 *
 * Admin surface to manage every configurable field, status, and workflow label
 * of the Release Operations module. Reads/writes public.rh_config_options +
 * public.rh_config_settings via useReleaseConfig. Writes are gated server-side
 * by rh_is_manager (RLS) and in the UI by useReleaseOpsPermissions.canManage.
 *
 * Scope boundary: this page configures the option LISTS, their labels, colour
 * categories, ordering, and module settings. It does NOT edit lifecycle
 * transition RULES — those stay enforced in src/lib/release-ops/lifecycle.ts.
 * System lifecycle stages (is_system) can be relabelled/recoloured but not
 * removed, so the 9-stage trackers never lose a step.
 *
 * 3-colour guardrail: status colour categories are limited to todo (grey),
 * in_progress (blue), done (green) + terminal (coral, for cancelled/failed) —
 * no 4th status colour can be minted here.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AdminGuard } from '@/components/admin/AdminGuard';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Toggle from '@atlaskit/toggle';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import { statusBg, statusFg } from '@/components/catalyst-detail-views/shared/sections/statusPalette';
import { RH } from '@/constants/releasehub.design';
import { useReleaseOpsPermissions } from '@/hooks/useReleaseOpsPermissions';
import {
  CONFIG_GROUPS,
  useReleaseConfig,
  useReleaseConfigRealtime,
  useReleaseConfigMutations,
  type ConfigColorCategory,
  type ConfigGroupMeta,
  type RhConfigOption,
} from '@/hooks/releases/useReleaseConfig';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
};

const CATEGORY_TO_APPEARANCE: Record<ConfigColorCategory, string> = {
  todo: 'default',
  in_progress: 'inprogress',
  done: 'success',
  terminal: 'removed',
};

const COLOR_OPTIONS: { label: string; value: ConfigColorCategory }[] = [
  { label: 'To do (grey)', value: 'todo' },
  { label: 'In progress (blue)', value: 'in_progress' },
  { label: 'Done (green)', value: 'done' },
  { label: 'Terminal (coral)', value: 'terminal' },
];

const CATEGORY_LABELS: Record<ConfigColorCategory, string> = {
  todo: 'Todo',
  in_progress: 'In progress',
  done: 'Done',
  terminal: 'Terminal',
};

function CategoryLozenge({ label, category }: { label: string; category: ConfigColorCategory | null }) {
  const appearance = category ? CATEGORY_TO_APPEARANCE[category] : 'default';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: statusBg(appearance), borderRadius: 3, padding: '0 8px', height: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: '20px', color: statusFg(appearance), whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  );
}

interface EditState {
  configKey: string;
  isStatus: boolean;
  option: RhConfigOption | null; // null = create
}

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export default function ReleaseOpsAdminPage() {
  const { data, isLoading, isError, error } = useReleaseConfig();
  useReleaseConfigRealtime();
  const { canManage } = useReleaseOpsPermissions();
  const { upsertOption, setActive, deleteOption, reorder, updateSetting } = useReleaseConfigMutations();
  const [edit, setEdit] = useState<EditState | null>(null);

  const families: { id: string; label: string; groups: ConfigGroupMeta[] }[] = [
    { id: 'release', label: 'Release fields', groups: CONFIG_GROUPS.release },
    { id: 'change', label: 'Change fields', groups: CONFIG_GROUPS.change },
    { id: 'sop', label: 'SOP & sign-off', groups: CONFIG_GROUPS.sop },
    { id: 'freeze', label: 'Freeze & events', groups: CONFIG_GROUPS.freeze },
  ];

  return (
    <AdminGuard>
      <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>Release Operations</h1>
          <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, margin: '4px 0 0' }}>
            Manage the fields, statuses, and workflow labels used across releases, changes, SOPs, sign-offs, freezes, and production events.
          </p>
        </div>

        {!canManage && (
          <div style={{ background: 'var(--ds-background-information, #E9F2FE)', border: '1px solid var(--ds-border-information, #8FB8F6)', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
            <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: 'var(--ds-text-information, #0055CC)', margin: 0 }}>
              Read-only — you need a release/change manager role to edit this configuration.
            </p>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>
        ) : isError ? (
          <div style={{ color: 'var(--ds-text-danger, #AE2A19)', fontFamily: RH.fontBody, fontSize: 13 }}>
            Could not load configuration: {(error as Error)?.message}
          </div>
        ) : (
          <Tabs id="release-ops-config">
            <TabList>
              {families.map((f) => <Tab key={f.id}>{f.label}</Tab>)}
              <Tab>Settings</Tab>
            </TabList>

            {families.map((f) => (
              <TabPanel key={f.id}>
                <div style={{ width: '100%', paddingTop: 16 }}>
                  {f.groups.map((g) => (
                    <GroupSection
                      key={g.key}
                      meta={g}
                      options={data!.options[g.key] || []}
                      canManage={canManage}
                      onAdd={() => setEdit({ configKey: g.key, isStatus: !!g.isStatus, option: null })}
                      onEdit={(o) => setEdit({ configKey: g.key, isStatus: !!g.isStatus, option: o })}
                      onToggleActive={(o) => setActive.mutate({ id: o.id, is_active: !o.is_active })}
                      onDelete={(o) => deleteOption.mutate(o.id)}
                      onReorder={(rows) => reorder.mutate(rows)}
                    />
                  ))}
                </div>
              </TabPanel>
            ))}

            <TabPanel>
              <div style={{ width: '100%', paddingTop: 16 }}>
                <SettingsSection
                  settings={data!.settings}
                  canManage={canManage}
                  onSave={(key, value) => updateSetting.mutate({ key, value })}
                />
              </div>
            </TabPanel>
          </Tabs>
        )}

        <ModalTransition>
          {edit && (
            <EditOptionModal
              state={edit}
              onClose={() => setEdit(null)}
              onSave={(payload) => {
                upsertOption.mutate(payload, { onSuccess: () => setEdit(null) });
              }}
            />
          )}
        </ModalTransition>
      </div>
    </AdminGuard>
  );
}

function SortableOptionRow({
  option, meta, canManage, isHovered, isMenuOpen,
  onToggleActive, onEdit, onOpenMenu, onHover,
}: {
  option: RhConfigOption;
  meta: ConfigGroupMeta;
  canManage: boolean;
  isHovered: boolean;
  isMenuOpen: boolean;
  onToggleActive: (o: RhConfigOption) => void;
  onEdit: (o: RhConfigOption) => void;
  onOpenMenu: (rect: DOMRect) => void;
  onHover: (id: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 8px', borderRadius: 4,
        borderBottom: `1px solid ${T.border}`,
        background: isDragging || isHovered ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.04))' : undefined,
        opacity: isDragging ? 0.5 : (option.is_active ? 1 : 0.55),
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onMouseEnter={() => onHover(option.id)}
      onMouseLeave={() => onHover(null)}
    >
      {canManage ? (
        <span
          {...attributes}
          {...listeners}
          style={{ color: 'var(--ds-text-disabled, #8590A2)', cursor: 'grab', fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0, lineHeight: '1', userSelect: 'none' }}
          aria-label="Drag to reorder"
        >
          ⠿
        </span>
      ) : <span style={{ width: 20, flexShrink: 0 }} />}

      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
        {option.label}
        {option.is_system && (
          <span style={{ fontSize: 10, fontWeight: 600, color: T.subtle, background: T.sunken, border: `1px solid ${T.border}`, borderRadius: 10, padding: '0 6px', lineHeight: '18px' }}>System</span>
        )}
      </span>

      <span style={{ width: 120, flexShrink: 0, fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12, color: T.subtlest, background: T.sunken, padding: '2px 6px', borderRadius: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {option.value}
      </span>

      {meta.isStatus && (
        <div style={{ width: 110, flexShrink: 0 }}>
          {option.color_category
            ? <CategoryLozenge label={CATEGORY_LABELS[option.color_category]} category={option.color_category} />
            : <span style={{ fontSize: 12, color: T.subtlest }}>—</span>}
        </div>
      )}

      <div style={{ width: 90, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {canManage
          ? <Toggle isChecked={option.is_active} onChange={() => onToggleActive(option)} label="Active" />
          : <span style={{ fontSize: 13, color: option.is_active ? 'var(--ds-text-success, #006644)' : T.subtlest }}>{option.is_active ? 'Active' : 'Inactive'}</span>
        }
      </div>

      {canManage && (
        <button
          aria-label={`More actions for ${option.label}`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={(e) => { e.stopPropagation(); onOpenMenu((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); }}
          style={{ width: 28, height: 28, borderRadius: 3, border: 'none', background: 'none', color: T.subtle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, opacity: isHovered || isMenuOpen ? 1 : 0, transition: 'opacity 0.1s' }}
        >
          ···
        </button>
      )}
    </div>
  );
}

function GroupSection({
  meta, options, canManage, onAdd, onEdit, onToggleActive, onDelete, onReorder,
}: {
  meta: ConfigGroupMeta;
  options: RhConfigOption[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (o: RhConfigOption) => void;
  onToggleActive: (o: RhConfigOption) => void;
  onDelete: (o: RhConfigOption) => void;
  onReorder: (rows: { id: string; sort_order: number }[]) => void;
}) {
  const sorted = useMemo(() => [...options].sort((a, b) => a.sort_order - b.sort_order), [options]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [menuState, setMenuState] = useState<{ id: string; top: number; right: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!menuState) return;
    const close = () => setMenuState(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuState]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((o) => o.id === active.id);
    const newIndex = sorted.findIndex((o) => o.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    onReorder(reordered.map((o, i) => ({ id: o.id, sort_order: (i + 1) * 10 })));
  };

  const openMenu = (id: string, rect: DOMRect) => {
    setMenuState({ id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const menuOption = menuState ? sorted.find((o) => o.id === menuState.id) : null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>{meta.label}</h2>
            <Tooltip content={meta.description ? `${meta.key} — ${meta.description}` : meta.key} position="right">
              <span tabIndex={0} aria-label="Field key" style={{ color: T.subtlest, cursor: 'default', fontSize: 13, lineHeight: '1', display: 'inline-flex', alignItems: 'center', userSelect: 'none' }}>ℹ</span>
            </Tooltip>
          </div>
        </div>
        {canManage && <Button appearance="default" spacing="compact" onClick={onAdd}>Add option</Button>}
      </div>

      {sorted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 6px', borderBottom: `1px solid ${T.border}`, marginBottom: 2 }}>
          <span style={{ width: 20, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: T.subtlest }}>Name</span>
          <span style={{ width: 120, flexShrink: 0, fontSize: 11, fontWeight: 600, color: T.subtlest }}>Value</span>
          {meta.isStatus && <span style={{ width: 110, flexShrink: 0, fontSize: 11, fontWeight: 600, color: T.subtlest }}>Category</span>}
          <span style={{ width: 90, flexShrink: 0, fontSize: 11, fontWeight: 600, color: T.subtlest }}>Active</span>
          <span style={{ width: 28, flexShrink: 0 }} />
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((o) => (
            <SortableOptionRow
              key={o.id}
              option={o}
              meta={meta}
              canManage={canManage}
              isHovered={hoveredId === o.id}
              isMenuOpen={menuState?.id === o.id}
              onToggleActive={onToggleActive}
              onEdit={onEdit}
              onOpenMenu={(rect) => openMenu(o.id, rect)}
              onHover={setHoveredId}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sorted.length === 0 && (
        <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, padding: '8px 0' }}>No options yet.</p>
      )}

      {menuState && menuOption && createPortal(
        <div
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: menuState.top, right: menuState.right, background: 'var(--ds-surface-overlay, #FFFFFF)', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 4, boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))', zIndex: 9999, minWidth: 160, padding: '4px 0' }}
        >
          <button
            role="menuitem"
            onClick={() => { onEdit(menuOption); setMenuState(null); }}
            style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '7px 12px', fontSize: 14, color: T.text, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            Edit
          </button>
          <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
          <button
            role="menuitem"
            disabled={menuOption.is_system}
            onClick={() => { if (!menuOption.is_system) { onDelete(menuOption); setMenuState(null); } }}
            style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '7px 12px', fontSize: 14, color: menuOption.is_system ? T.subtlest : 'var(--ds-text-danger, #AE2A19)', border: 'none', background: 'none', cursor: menuOption.is_system ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: menuOption.is_system ? 0.5 : 1 }}
            onMouseEnter={(e) => { if (!menuOption.is_system) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-danger-hovered, #FFEBE6)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            Remove
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

function EditOptionModal({
  state, onClose, onSave,
}: {
  state: EditState;
  onClose: () => void;
  onSave: (payload: { id?: string; config_key: string; value: string; label: string; color_category: ConfigColorCategory | null }) => void;
}) {
  const isCreate = !state.option;
  const [label, setLabel] = useState(state.option?.label ?? '');
  const [value, setValue] = useState(state.option?.value ?? '');
  const [touchedValue, setTouchedValue] = useState(false);
  const [category, setCategory] = useState<ConfigColorCategory | null>(state.option?.color_category ?? (state.isStatus ? 'todo' : null));

  const effectiveValue = isCreate ? (touchedValue ? value : slugify(label)) : value;
  const valid = label.trim().length > 0 && effectiveValue.length > 0 && (!state.isStatus || !!category);

  return (
    <Modal onClose={onClose}>
      <ModalHeader>
        <ModalTitle>{isCreate ? 'Add option' : 'Edit option'}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.subtle, marginBottom: 4 }}>Label</label>
            <Textfield value={label} onChange={(e) => setLabel((e.target as HTMLInputElement).value)} placeholder="e.g. Hotfix" autoFocus />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.subtle, marginBottom: 4 }}>Value</label>
            <Textfield
              value={effectiveValue}
              isDisabled={!isCreate}
              onChange={(e) => { setTouchedValue(true); setValue(slugify((e.target as HTMLInputElement).value)); }}
              placeholder="machine_value"
            />
            <p style={{ fontFamily: RH.fontBody, fontSize: 11, color: T.subtlest, margin: '4px 0 0' }}>
              {isCreate ? 'Stored value (lowercase, underscores). Cannot be changed later.' : 'The machine value is fixed once created.'}
            </p>
          </div>
          {state.isStatus && (
            <div>
              <label style={{ display: 'block', fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.subtle, marginBottom: 4 }}>Colour category</label>
              <Select
                options={COLOR_OPTIONS}
                value={COLOR_OPTIONS.find((o) => o.value === category) ?? null}
                onChange={(opt: any) => setCategory(opt?.value ?? null)}
                placeholder="Select a category"
              />
              <p style={{ fontFamily: RH.fontBody, fontSize: 11, color: T.subtlest, margin: '4px 0 0' }}>
                Locked to grey / blue / green + terminal coral — no 4th status colour.
              </p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button
          appearance="primary"
          isDisabled={!valid}
          onClick={() => onSave({
            id: state.option?.id,
            config_key: state.configKey,
            value: effectiveValue,
            label: label.trim(),
            color_category: state.isStatus ? category : null,
          })}
        >
          {isCreate ? 'Add' : 'Save'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function SettingsSection({
  settings, canManage, onSave,
}: {
  settings: Record<string, unknown>;
  canManage: boolean;
  onSave: (key: string, value: unknown) => void;
}) {
  const [prefix, setPrefix] = useState(String(settings.change_number_prefix ?? 'CAT-CHG-'));
  const [padding, setPadding] = useState(String(settings.change_number_padding ?? 4));
  const notifyCreate = settings.notify_on_create === true;
  const notifyStatus = settings.notify_on_status_change === true;
  const riskMap = (settings.risk_role_map ?? {}) as Record<string, string[]>;

  const pad = Math.max(1, Math.min(8, parseInt(padding, 10) || 4));
  const sample = `${prefix}${'1'.padStart(pad, '0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 12px' }}>Change numbering</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180 }}>
            <label style={{ display: 'block', fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.subtle, marginBottom: 4 }}>Prefix</label>
            <Textfield value={prefix} isDisabled={!canManage} onChange={(e) => setPrefix((e.target as HTMLInputElement).value)} />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ display: 'block', fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.subtle, marginBottom: 4 }}>Sequence padding</label>
            <Textfield type="number" value={padding} isDisabled={!canManage} onChange={(e) => setPadding((e.target as HTMLInputElement).value)} min={1} max={8} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: 0 }}>Preview</p>
            <p style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 14, color: T.text, margin: '4px 0 0' }}>{sample}</p>
          </div>
          {canManage && (
            <Button appearance="primary" spacing="compact" onClick={() => { onSave('change_number_prefix', prefix); onSave('change_number_padding', pad); }}>Save</Button>
          )}
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 12px' }}>Notifications</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.text }}>Notify subscribers when a release or change is created</span>
          <Toggle isChecked={notifyCreate} isDisabled={!canManage} onChange={() => onSave('notify_on_create', !notifyCreate)} label="Notify on create" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.text }}>Notify subscribers on every lifecycle status transition</span>
          <Toggle isChecked={notifyStatus} isDisabled={!canManage} onChange={() => onSave('notify_on_status_change', !notifyStatus)} label="Notify on status change" />
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 4px' }}>Required sign-off roles by risk</h2>
        <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: '0 0 12px' }}>Default approval roles gated per change risk level.</p>
        {['low', 'medium', 'high', 'critical'].map((risk) => (
          <div key={risk} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${T.border}` }}>
            <span style={{ fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.text, width: 80, textTransform: 'capitalize' }}>{risk}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(riskMap[risk] || []).map((role) => (
                <span key={role} style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 500, color: T.subtle, background: T.sunken, border: `1px solid ${T.border}`, borderRadius: 12, padding: '0 8px', lineHeight: '22px' }}>{role.replace(/_/g, ' ')}</span>
              ))}
              {(!riskMap[risk] || riskMap[risk].length === 0) && <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest }}>—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
