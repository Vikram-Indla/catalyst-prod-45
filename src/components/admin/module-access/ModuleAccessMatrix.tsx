// Role x Module access matrix — full-width grid editor for admin_role_module_permissions.
// Modules (grouped rows) x roles (columns). Color-coded cells: full / view / hidden.
// Sticky module column + sticky role header. Click cycles; right-click = direct menu;
// arrow keys move focus. Role-header click bulk-sets a column; group-row click bulk-sets a group.
// admin + super_admin columns are locked (bypass = always full). Writes the SAME table the
// runtime hook reads, so edits take effect at next login.

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import { Search } from 'lucide-react';
import {
  useModuleAccessRoles, useModuleAccessModules, useModuleAccessMatrix, useSetModuleAccess,
  type AccessLevel, type MatrixModule,
} from '@/hooks/useModuleAccessAdmin';

const NEXT: Record<AccessLevel, AccessLevel> = { full: 'view', view: 'hidden', hidden: 'full' };
const LEVELS: AccessLevel[] = ['full', 'view', 'hidden'];
const LABEL: Record<AccessLevel, string> = { full: 'Full', view: 'View', hidden: 'Hidden' };
const FILL: Record<AccessLevel, string> = {
  full: 'var(--ds-background-success-bold, #1F845A)',
  view: 'var(--ds-background-warning-bold, #E2B203)',
  hidden: 'var(--ds-surface-sunken, #F7F8F9)',
};

interface Group { parent: MatrixModule | null; label: string; children: MatrixModule[]; }

function buildGroups(modules: MatrixModule[]): Group[] {
  const top = modules.filter((m) => !m.parent_module).sort((a, b) => a.sort_order - b.sort_order);
  const byParent = new Map<string, MatrixModule[]>();
  modules.forEach((m) => {
    if (m.parent_module) { const a = byParent.get(m.parent_module) || []; a.push(m); byParent.set(m.parent_module, a); }
  });
  const groups: Group[] = []; const general: MatrixModule[] = [];
  top.forEach((t) => {
    const kids = (byParent.get(t.module_key) || []).sort((a, b) => a.sort_order - b.sort_order);
    if (kids.length) groups.push({ parent: t, label: t.name, children: kids });
    else general.push(t);
  });
  if (general.length) groups.push({ parent: null, label: 'General', children: general });
  return groups;
}

interface MenuState { x: number; y: number; module_key: string; role_code: string; }

export function ModuleAccessMatrix() {
  const { data: roles, isLoading: rl } = useModuleAccessRoles();
  const { data: modules, isLoading: ml } = useModuleAccessModules();
  const { data: matrix, isLoading: xl } = useModuleAccessMatrix();
  const setAccess = useSetModuleAccess();

  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<MenuState | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);

  const groups = useMemo(() => buildGroups(modules || []), [modules]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, [menu]);

  if (rl || ml || xl) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>;
  }

  const allRoles = roles || [];
  const allModules = modules || [];
  const levelOf = (mk: string, rc: string): AccessLevel => {
    const r = allRoles.find((x) => x.code === rc);
    if (r?.bypass) return 'full';
    return (matrix?.[rc]?.[mk] || 'hidden') as AccessLevel;
  };
  const setCell = (mk: string, rc: string, lvl: AccessLevel) => {
    const r = allRoles.find((x) => x.code === rc);
    if (r?.bypass) return;
    setAccess.mutate([{ role_code: rc, module_key: mk, access_level: lvl }]);
  };
  const cycle = (mk: string, rc: string) => setCell(mk, rc, NEXT[levelOf(mk, rc)]);
  const bulkColumn = (rc: string) => {
    const allFull = allModules.every((m) => levelOf(m.module_key, rc) === 'full');
    const lvl: AccessLevel = allFull ? 'hidden' : 'full';
    setAccess.mutate(allModules.map((m) => ({ role_code: rc, module_key: m.module_key, access_level: lvl })));
  };
  const bulkGroup = (g: Group, rc: string) => {
    const keys = [...(g.parent ? [g.parent.module_key] : []), ...g.children.map((c) => c.module_key)];
    const allFull = keys.every((k) => levelOf(k, rc) === 'full');
    const lvl: AccessLevel = allFull ? 'hidden' : 'full';
    setAccess.mutate(keys.map((k) => ({ role_code: rc, module_key: k, access_level: lvl })));
  };

  const moveFocus = (e: React.KeyboardEvent, r: number, c: number) => {
    const map: Record<string, [number, number]> = {
      ArrowUp: [r - 1, c], ArrowDown: [r + 1, c], ArrowLeft: [r, c - 1], ArrowRight: [r, c + 1],
    };
    if (map[e.key]) {
      e.preventDefault();
      const [nr, nc] = map[e.key];
      const next = gridRef.current?.querySelector<HTMLButtonElement>(`button[data-r="${nr}"][data-c="${nc}"]`);
      next?.focus();
    }
  };

  const matchesGroup = (g: Group): boolean => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return g.label.toLowerCase().includes(q) || g.children.some((c) => c.name.toLowerCase().includes(q));
  };

  // visible module rows numbered for keyboard nav
  let rowIndex = -1;
  const sysCount = allRoles.filter((r) => r.tier === 'system').length;

  const cellBtn = (mk: string, rc: string, ri: number, ci: number, bypass: boolean) => {
    const lvl = levelOf(mk, rc);
    return (
      <button
        type="button"
        data-r={ri}
        data-c={ci}
        aria-label={`${mk} / ${rc}: ${LABEL[lvl]}`}
        title={bypass ? 'Bypass — always full' : LABEL[lvl]}
        disabled={bypass}
        onClick={() => cycle(mk, rc)}
        onKeyDown={(e) => { moveFocus(e, ri, ci); }}
        onContextMenu={(e) => { if (bypass) return; e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, module_key: mk, role_code: rc }); }}
        style={{
          width: '100%', height: 30, minWidth: 44, border: 'none', display: 'block',
          cursor: bypass ? 'default' : 'pointer', background: FILL[lvl],
          boxShadow: lvl === 'hidden' ? 'inset 0 0 0 1px var(--ds-border, #DFE1E6)' : 'none',
          opacity: bypass ? 0.4 : 1,
          backgroundImage: bypass ? 'repeating-linear-gradient(45deg, var(--ds-border, #DFE1E6), var(--ds-border, #DFE1E6) 3px, transparent 3px, transparent 6px)' : undefined,
        }}
      />
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>Legend</span>
          {LEVELS.map((lv) => (
            <span key={lv} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ds-text, #172B4D)' }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, background: FILL[lv], boxShadow: lv === 'hidden' ? 'inset 0 0 0 1px var(--ds-border, #DFE1E6)' : 'none' }} />
              {LABEL[lv]}
            </span>
          ))}
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
            {allRoles.length} roles &times; {allModules.length} modules &middot; click cycles, right-click for menu, click a header to bulk-set
          </span>
        </div>
        <div style={{ width: 220 }}>
          <Textfield
            isCompact
            placeholder="Filter modules"
            value={filter}
            onChange={(e: any) => setFilter(e.target.value)}
            elemBeforeInput={<span style={{ paddingLeft: 8, display: 'flex' }}><Search size={14} aria-hidden /></span>}
          />
        </div>
      </div>

      <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <table ref={gridRef} style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, top: 0, zIndex: 4, background: 'var(--ds-surface-sunken, #F7F8F9)', textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', minWidth: 200, borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)' }}>
                Module \ Role
              </th>
              {allRoles.map((r, ci) => (
                <th
                  key={r.code}
                  onClick={() => !r.bypass && bulkColumn(r.code)}
                  title={r.bypass ? `${r.name} — bypass (always full)` : `${r.name} — click to toggle all`}
                  style={{
                    position: 'sticky', top: 0, zIndex: 3, background: 'var(--ds-surface-sunken, #F7F8F9)',
                    padding: '8px 4px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)',
                    borderLeft: ci === sysCount ? '2px solid var(--ds-border-bold, #758195)' : undefined,
                    verticalAlign: 'bottom', cursor: r.bypass ? 'default' : 'pointer', minWidth: 44,
                  }}
                >
                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, fontWeight: r.tier === 'system' ? 600 : 400, color: r.tier === 'system' ? 'var(--ds-text, #172B4D)' : 'var(--ds-text-subtle, #44546F)', whiteSpace: 'nowrap', height: 84, margin: '0 auto' }}>
                    {r.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.filter(matchesGroup).map((g) => {
              const isCollapsed = collapsed[g.label];
              return (
                <React.Fragment key={g.label}>
                  <tr>
                    <td
                      onClick={() => setCollapsed((p) => ({ ...p, [g.label]: !p[g.label] }))}
                      style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--ds-surface-sunken, #F7F8F9)', padding: '8px 12px', fontWeight: 600, fontSize: 12, color: 'var(--ds-text, #172B4D)', borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {isCollapsed ? '▸ ' : '▾ '}{g.label}
                    </td>
                    {allRoles.map((r, ci) => {
                      const keys = [...(g.parent ? [g.parent.module_key] : []), ...g.children.map((c) => c.module_key)];
                      const allFull = keys.every((k) => levelOf(k, r.code) === 'full');
                      const anyVis = keys.some((k) => levelOf(k, r.code) !== 'hidden');
                      const bar = r.bypass || allFull ? FILL.full : anyVis ? FILL.view : FILL.hidden;
                      return (
                        <td key={r.code} style={{ background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)', borderLeft: ci === sysCount ? '2px solid var(--ds-border-bold, #758195)' : undefined, padding: 0 }}>
                          <button
                            type="button"
                            disabled={r.bypass}
                            aria-label={`Set ${g.label} for ${r.name}`}
                            onClick={() => bulkGroup(g, r.code)}
                            style={{ width: '100%', height: 10, border: 'none', background: bar, opacity: r.bypass ? 0.4 : 0.6, cursor: r.bypass ? 'default' : 'pointer', display: 'block' }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                  {!isCollapsed && g.children.filter((c) => !filter.trim() || c.name.toLowerCase().includes(filter.toLowerCase()) || g.label.toLowerCase().includes(filter.toLowerCase())).map((c) => {
                    rowIndex += 1;
                    const ri = rowIndex;
                    return (
                      <tr key={c.module_key}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--ds-surface, #FFFFFF)', padding: '8px 12px 8px 24px', fontSize: 12, color: 'var(--ds-text, #172B4D)', borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)', whiteSpace: 'nowrap' }}>
                          {c.name}
                        </td>
                        {allRoles.map((r, ci) => (
                          <td key={r.code} style={{ padding: 0, borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)', borderLeft: ci === sysCount ? '2px solid var(--ds-border-bold, #758195)' : undefined }}>
                            {cellBtn(c.module_key, r.code, ri, ci, !!r.bypass)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {menu && createPortal(
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: menu.y, left: menu.x, zIndex: 9999, background: 'var(--ds-surface-overlay, #FFFFFF)', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 6, boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))', padding: '4px 0', minWidth: 140 }}
        >
          {LEVELS.map((lv) => (
            <button
              key={lv}
              role="menuitem"
              type="button"
              onClick={() => { setCell(menu.module_key, menu.role_code, lv); setMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--ds-text, #172B4D)', textAlign: 'left' }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 3, background: FILL[lv], boxShadow: lv === 'hidden' ? 'inset 0 0 0 1px var(--ds-border, #DFE1E6)' : 'none' }} />
              {LABEL[lv]}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default ModuleAccessMatrix;
