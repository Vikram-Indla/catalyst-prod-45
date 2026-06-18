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
import React, { useMemo, useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Toggle from '@atlaskit/toggle';
import Spinner from '@atlaskit/spinner';
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

function CategoryLozenge({ label, category }: { label: string; category: ConfigColorCategory | null }) {
  const appearance = category ? CATEGORY_TO_APPEARANCE[category] : 'default';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: statusBg(appearance), borderRadius: 3, padding: '0 8px', height: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: '20px', color: statusFg(), whiteSpace: 'nowrap' }}>{label}</span>
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

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[idx], b = sorted[target];
    onReorder([{ id: a.id, sort_order: b.sort_order }, { id: b.id, sort_order: a.sort_order }]);
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>{meta.label}</h2>
          <p style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11, color: T.subtlest, margin: '4px 0 0' }}>{meta.key}</p>
          {meta.description && <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: '4px 0 0' }}>{meta.description}</p>}
        </div>
        {canManage && <Button appearance="default" spacing="compact" onClick={onAdd}>Add option</Button>}
      </div>

      <div>
        {sorted.map((o, idx) => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${T.border}`, opacity: o.is_active ? 1 : 0.5 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {meta.isStatus
                ? <CategoryLozenge label={o.label} category={o.color_category} />
                : <span style={{ fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.text }}>{o.label}</span>}
              <span style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11, color: T.subtlest }}>{o.value}</span>
              {o.is_system && <span style={{ fontSize: 10, fontWeight: 600, color: T.subtle, background: T.sunken, border: `1px solid ${T.border}`, borderRadius: 4, padding: '0 8px', lineHeight: '18px' }}>System</span>}
            </div>
            {canManage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Button appearance="subtle" spacing="compact" isDisabled={idx === 0} onClick={() => move(idx, -1)}>↑</Button>
                <Button appearance="subtle" spacing="compact" isDisabled={idx === sorted.length - 1} onClick={() => move(idx, 1)}>↓</Button>
                <Toggle isChecked={o.is_active} onChange={() => onToggleActive(o)} label="Active" />
                <Button appearance="subtle" spacing="compact" onClick={() => onEdit(o)}>Edit</Button>
                <Button appearance="subtle" spacing="compact" isDisabled={o.is_system} onClick={() => onDelete(o)}>
                  <span style={{ color: o.is_system ? undefined : 'var(--ds-text-danger, #AE2A19)' }}>Remove</span>
                </Button>
              </div>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, padding: '8px 0' }}>No options yet.</p>
        )}
      </div>
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
