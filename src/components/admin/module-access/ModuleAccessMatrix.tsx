// Role x Module access matrix — the canonical editor for admin_role_module_permissions.
// Left rail: roles (system + product). Main: modules grouped by hub with a tri-level
// (Full / View / Hidden) control per module + per-group bulk. Right: live login nav preview.
// Writes the SAME table the runtime hook reads, so edits take effect at next login.

import React, { useMemo, useState } from 'react';
import Spinner from '@atlaskit/spinner';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import {
  ShieldCheck, Eye, EyeOff, CircleCheck, Search, Lock,
} from 'lucide-react';
import {
  useModuleAccessRoles, useModuleAccessModules, useModuleAccessMatrix, useSetModuleAccess,
  type AccessLevel, type MatrixRole, type MatrixModule,
} from '@/hooks/useModuleAccessAdmin';

const LEVELS: AccessLevel[] = ['full', 'view', 'hidden'];
const LEVEL_META: Record<AccessLevel, { label: string; Icon: typeof Eye; fg: string; bg: string }> = {
  full: { label: 'Full', Icon: CircleCheck, fg: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' },
  view: { label: 'View', Icon: Eye, fg: 'var(--ds-text-warning, #A54800)', bg: 'var(--ds-background-warning, #FFF7D6)' },
  hidden: { label: 'Hidden', Icon: EyeOff, fg: 'var(--ds-text-subtlest, #6B778C)', bg: 'var(--ds-background-neutral, #F1F2F4)' },
};

interface Group {
  parent: MatrixModule | null;
  label: string;
  children: MatrixModule[];
}

function buildGroups(modules: MatrixModule[]): Group[] {
  const top = modules.filter((m) => !m.parent_module).sort((a, b) => a.sort_order - b.sort_order);
  const childrenByParent = new Map<string, MatrixModule[]>();
  modules.forEach((m) => {
    if (m.parent_module) {
      const arr = childrenByParent.get(m.parent_module) || [];
      arr.push(m);
      childrenByParent.set(m.parent_module, arr);
    }
  });
  const groups: Group[] = [];
  const general: MatrixModule[] = [];
  top.forEach((t) => {
    const kids = (childrenByParent.get(t.module_key) || []).sort((a, b) => a.sort_order - b.sort_order);
    if (kids.length) groups.push({ parent: t, label: t.name, children: kids });
    else general.push(t);
  });
  if (general.length) groups.push({ parent: null, label: 'General', children: general });
  return groups;
}

export function ModuleAccessMatrix() {
  const { data: roles, isLoading: rolesLoading } = useModuleAccessRoles();
  const { data: modules, isLoading: modulesLoading } = useModuleAccessModules();
  const { data: matrix, isLoading: matrixLoading } = useModuleAccessMatrix();
  const setAccess = useSetModuleAccess();

  const [activeRole, setActiveRole] = useState<string>('program_manager');
  const [search, setSearch] = useState('');

  const groups = useMemo(() => buildGroups(modules || []), [modules]);
  const role: MatrixRole | undefined = (roles || []).find((r) => r.code === activeRole);

  if (rolesLoading || modulesLoading || matrixLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>;
  }

  const systemRoles = (roles || []).filter((r) => r.tier === 'system');
  const productRoles = (roles || []).filter((r) => r.tier === 'product');
  const roleMap = matrix?.[activeRole] || {};
  const levelOf = (mk: string): AccessLevel => (role?.bypass ? 'full' : (roleMap[mk] || 'hidden'));

  const setOne = (mk: string, lvl: AccessLevel) => {
    if (role?.bypass) return;
    setAccess.mutate([{ role_code: activeRole, module_key: mk, access_level: lvl }]);
  };
  const setGroup = (g: Group, lvl: AccessLevel) => {
    if (role?.bypass) return;
    const keys = [...(g.parent ? [g.parent.module_key] : []), ...g.children.map((c) => c.module_key)];
    setAccess.mutate(keys.map((mk) => ({ role_code: activeRole, module_key: mk, access_level: lvl })));
  };
  const copyFrom = (srcCode: string) => {
    const src = matrix?.[srcCode] || {};
    const rows = (modules || []).map((m) => ({
      role_code: activeRole,
      module_key: m.module_key,
      access_level: (src[m.module_key] || 'hidden') as AccessLevel,
    }));
    setAccess.mutate(rows);
  };

  // Stats across all modules for the active role
  let full = 0, view = 0, hidden = 0;
  (modules || []).forEach((m) => {
    const l = levelOf(m.module_key);
    if (l === 'full') full++; else if (l === 'view') view++; else hidden++;
  });

  const roleCount = (code: string): number => {
    const r = (roles || []).find((x) => x.code === code);
    if (r?.bypass) return modules?.length || 0;
    const rm = matrix?.[code] || {};
    return (modules || []).filter((m) => (rm[m.module_key] || 'hidden') !== 'hidden').length;
  };

  const matchesSearch = (g: Group): boolean => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return g.label.toLowerCase().includes(q) || g.children.some((c) => c.name.toLowerCase().includes(q));
  };
  const visibleGroups = groups.filter(matchesSearch);

  const Seg = ({ mk }: { mk: string }) => {
    const cur = levelOf(mk);
    const locked = !!role?.bypass;
    return (
      <div role="group" aria-label="Access level" style={{ display: 'flex', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 6, overflow: 'hidden', opacity: locked ? 0.5 : 1 }}>
        {LEVELS.map((lv, i) => {
          const on = cur === lv;
          const M = LEVEL_META[lv];
          return (
            <button
              key={lv}
              type="button"
              aria-pressed={on}
              disabled={locked}
              onClick={() => setOne(mk, lv)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px', border: 'none',
                borderLeft: i > 0 ? '1px solid var(--ds-border, #DFE1E6)' : 'none',
                cursor: locked ? 'default' : 'pointer', fontSize: 12,
                fontWeight: on ? 600 : 400,
                background: on ? M.bg : 'transparent',
                color: on ? M.fg : 'var(--ds-text-subtlest, #6B778C)',
              }}
            >
              <M.Icon size={13} aria-hidden /> {M.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['Full access', full, LEVEL_META.full.fg], ['View only', view, LEVEL_META.view.fg], ['Hidden', hidden, LEVEL_META.hidden.fg]] as const).map(([lbl, n, color]) => (
          <div key={lbl} style={{ flex: 1, background: 'var(--ds-surface-sunken, #F7F8F9)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>{lbl}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color }}>{n}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 200, flexShrink: 0, background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden' }}>
          {[['System roles', systemRoles], ['Product roles', productRoles]].map(([label, list]) => (
            <div key={label as string}>
              <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--ds-text-subtlest, #6B778C)', background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                {(label as string).toUpperCase()}
              </div>
              {(list as MatrixRole[]).map((r) => {
                const on = r.code === activeRole;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setActiveRole(r.code)}
                    style={{
                      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                      padding: '8px 12px', border: 'none', borderBottom: '1px solid var(--ds-border, #DFE1E6)', cursor: 'pointer', fontSize: 13,
                      background: on ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                      color: on ? 'var(--ds-text-selected, #0C66E4)' : 'var(--ds-text, #172B4D)',
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    <span style={{ fontSize: 11, flexShrink: 0, color: r.bypass ? 'var(--ds-text-success, #216E4E)' : 'var(--ds-text-subtlest, #6B778C)' }}>
                      {r.bypass ? 'all' : roleCount(r.code)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: role?.tier === 'system' ? 'var(--ds-background-information, #E9F2FE)' : 'var(--ds-background-neutral, #F1F2F4)', color: role?.tier === 'system' ? 'var(--ds-text-information, #0055CC)' : 'var(--ds-text-subtle, #44546F)' }}>
                {role?.tier}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ds-text, #172B4D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {role?.name}
                {role?.bypass && <span style={{ fontWeight: 400, color: 'var(--ds-text-subtle, #44546F)', fontSize: 13 }}> — bypasses matrix (full)</span>}
              </span>
            </div>
            <div style={{ width: 200, flexShrink: 0 }}>
              <Select
                inputId="copy-from"
                spacing="compact"
                placeholder="Copy access from…"
                isDisabled={!!role?.bypass}
                value={null}
                options={(roles || []).filter((r) => r.code !== activeRole && !r.bypass).map((r) => ({ label: `${r.name} (${r.tier})`, value: r.code }))}
                onChange={(opt: any) => opt && copyFrom(opt.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12, maxWidth: 280 }}>
            <Textfield
              isCompact
              placeholder="Search modules"
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              elemBeforeInput={<span style={{ paddingLeft: 8, display: 'flex' }}><Search size={14} aria-hidden /></span>}
            />
          </div>

          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden' }}>
            {visibleGroups.map((g) => (
              <div key={g.label}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>{g.label}</span>
                    {g.parent && <Seg mk={g.parent.module_key} />}
                  </div>
                  {!role?.bypass && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {LEVELS.map((lv) => {
                        const M = LEVEL_META[lv];
                        return (
                          <button key={lv} type="button" aria-label={`Set all ${g.label} to ${M.label}`} title={`Set all ${g.label} to ${M.label}`}
                            onClick={() => setGroup(g, lv)}
                            style={{ height: 24, width: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: M.fg }}>
                            <M.Icon size={14} aria-hidden />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {g.children.map((c) => (
                  <div key={c.module_key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px 8px 24px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                    <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>{c.name}</span>
                    <Seg mk={c.module_key} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, background: 'var(--ds-surface-sunken, #F7F8F9)', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 8 }}>
              <Eye size={15} aria-hidden /> Login nav preview — what this role sees
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(() => {
                const hubs = groups.filter((g) => g.parent);
                const chips = hubs.filter((g) => g.parent && levelOf(g.parent.module_key) !== 'hidden');
                if (!chips.length) return <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>No top-level modules visible — this role lands on an empty shell.</span>;
                return chips.map((g) => {
                  const ro = g.parent ? levelOf(g.parent.module_key) === 'view' : false;
                  return (
                    <span key={g.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 8px', borderRadius: 6, background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DFE1E6)', color: 'var(--ds-text, #172B4D)' }}>
                      <ShieldCheck size={13} aria-hidden style={{ color: 'var(--ds-text-subtle, #44546F)' }} />
                      {g.label}
                      {ro && <span style={{ fontSize: 10, color: 'var(--ds-text-warning, #A54800)' }}>read-only</span>}
                    </span>
                  );
                });
              })()}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={12} aria-hidden /> Admin &amp; super admin always get full access and bypass this matrix. A user's effective access merges all their roles — highest level wins.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModuleAccessMatrix;
