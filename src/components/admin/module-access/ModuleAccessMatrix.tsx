// Role x Module access matrix — full-width grid editor for admin_role_module_permissions.
// Modules (grouped rows) x roles (columns). Color-coded cells: full / view / hidden.
// Sticky module column + sticky role header. Click cycles; right-click = direct menu;
// arrow keys move focus. Role-header click bulk-sets a column; group-row click bulk-sets a group.
// admin + super_admin columns are locked (bypass = always full). Writes the SAME table the
// runtime hook reads, so edits take effect at next login.

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/core/search';
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

// module_key present = single cell menu; absent = whole-column (role) bulk menu.
interface MenuState { x: number; y: number; role_code: string; module_key?: string; }

function cellStyle(level: AccessLevel, bypass: boolean): React.CSSProperties {
  return {
    width: '100%', height: 30, minWidth: 44, border: 'none', display: 'block',
    cursor: bypass ? 'default' : 'pointer', background: FILL[level],
    boxShadow: level === 'hidden' ? 'inset 0 0 0 1px var(--ds-border, #DFE1E6)' : 'none',
    opacity: bypass ? 0.4 : 1,
    backgroundImage: bypass ? 'repeating-linear-gradient(45deg, var(--ds-border, #DFE1E6), var(--ds-border, #DFE1E6) 3px, transparent 3px, transparent 6px)' : undefined,
  };
}

interface CellProps {
  moduleKey: string; roleCode: string; ri: number; ci: number;
  level: AccessLevel; bypass: boolean; borderLeft: boolean;
  onCycle: (mk: string, rc: string) => void;
  onMenu: (x: number, y: number, mk: string, rc: string) => void;
  onKey: (e: React.KeyboardEvent, r: number, c: number) => void;
}
// Memoised so an edit re-renders only the changed cell, not all ~1500.
const Cell = React.memo(function Cell({ moduleKey, roleCode, ri, ci, level, bypass, borderLeft, onCycle, onMenu, onKey }: CellProps) {
  return (
    <td style={{ padding: 0, borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)', borderLeft: borderLeft ? '2px solid var(--ds-border-bold, #758195)' : undefined }}>
      <button
        type="button"
        data-r={ri}
        data-c={ci}
        aria-label={`${moduleKey} / ${roleCode}: ${LABEL[level]}`}
        title={bypass ? 'Bypass — always full' : LABEL[level]}
        disabled={bypass}
        onClick={() => onCycle(moduleKey, roleCode)}
        onKeyDown={(e) => onKey(e, ri, ci)}
        onContextMenu={(e) => { if (bypass) return; e.preventDefault(); onMenu(e.clientX, e.clientY, moduleKey, roleCode); }}
        style={cellStyle(level, bypass)}
      />
    </td>
  );
});

export function ModuleAccessMatrix() {
  const { data: roles, isLoading: rl } = useModuleAccessRoles();
  const { data: modules, isLoading: ml } = useModuleAccessModules();
  const { data: matrix, isLoading: xl } = useModuleAccessMatrix();
  const setAccess = useSetModuleAccess();

  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<MenuState | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);

  // Latest data held in a ref so the cell callbacks stay referentially stable
  // (so React.memo on Cell actually skips unchanged cells on every edit).
  const ctx = useRef<{ matrix: any; roles: any[] }>({ matrix: undefined, roles: [] });
  const onCellCycle = useCallback((mk: string, rc: string) => {
    const { matrix, roles } = ctx.current;
    if (roles.find((x) => x.code === rc)?.bypass) return;
    const cur = (matrix?.[rc]?.[mk] || 'hidden') as AccessLevel;
    setAccess.mutate([{ role_code: rc, module_key: mk, access_level: NEXT[cur] }]);
  }, [setAccess]);
  const onCellMenu = useCallback((x: number, y: number, mk: string, rc: string) => setMenu({ x, y, module_key: mk, role_code: rc }), []);
  const onCellKey = useCallback((e: React.KeyboardEvent, r: number, c: number) => {
    const map: Record<string, [number, number]> = { ArrowUp: [r - 1, c], ArrowDown: [r + 1, c], ArrowLeft: [r, c - 1], ArrowRight: [r, c + 1] };
    if (map[e.key]) {
      e.preventDefault();
      const [nr, nc] = map[e.key];
      gridRef.current?.querySelector<HTMLButtonElement>(`button[data-r="${nr}"][data-c="${nc}"]`)?.focus();
    }
  }, []);

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
  ctx.current = { matrix, roles: allRoles };
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
  const roleName = (rc: string) => allRoles.find((r) => r.code === rc)?.name ?? rc;
  const bulkColumnTo = (rc: string, lvl: AccessLevel) => {
    setAccess.mutate(allModules.map((m) => ({ role_code: rc, module_key: m.module_key, access_level: lvl })));
  };
  const bulkGroup = (g: Group, rc: string) => {
    const keys = [...(g.parent ? [g.parent.module_key] : []), ...g.children.map((c) => c.module_key)];
    const allFull = keys.every((k) => levelOf(k, rc) === 'full');
    const lvl: AccessLevel = allFull ? 'hidden' : 'full';
    setAccess.mutate(keys.map((k) => ({ role_code: rc, module_key: k, access_level: lvl })));
  };

  const matchesGroup = (g: Group): boolean => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return g.label.toLowerCase().includes(q) || g.children.some((c) => c.name.toLowerCase().includes(q));
  };

  // visible module rows numbered for keyboard nav
  let rowIndex = -1;
  const sysCount = allRoles.filter((r) => r.tier === 'system').length;
  const visibleGroups = groups.filter(matchesGroup);
  const noMatches = !!filter.trim() && visibleGroups.length === 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, #44546F)' }}>Legend</span>
          {LEVELS.map((lv) => (
            <span key={lv} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text, #172B4D)' }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, background: FILL[lv], boxShadow: lv === 'hidden' ? 'inset 0 0 0 1px var(--ds-border, #DFE1E6)' : 'none' }} />
              {LABEL[lv]}
            </span>
          ))}
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, #6B778C)' }}>
            {allRoles.length} roles &times; {allModules.length} modules &middot; click cycles, right-click for menu, click a header to bulk-set
          </span>
        </div>
        <div style={{ width: 220 }}>
          <Textfield
            isCompact
            placeholder="Filter modules"
            value={filter}
            onChange={(e: any) => setFilter(e.target.value)}
            elemBeforeInput={<span style={{ paddingLeft: 8, display: 'flex' }}><SearchIcon label="" size="small" /></span>}
          />
        </div>
      </div>

      <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <table ref={gridRef} style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 'var(--ds-font-size-200)', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, top: 0, zIndex: 4, background: 'var(--ds-surface-sunken, #F7F8F9)', textAlign: 'left', padding: '8px 12px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', minWidth: 200, borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)' }}>
                Module \ Role
              </th>
              {allRoles.map((r, ci) => (
                <th
                  key={r.code}
                  onClick={(e) => { if (r.bypass) return; setMenu({ x: e.clientX, y: e.clientY, role_code: r.code }); }}
                  title={r.bypass ? `${r.name} — bypass (always full)` : `${r.name} — set all modules`}
                  style={{
                    position: 'sticky', top: 0, zIndex: 3, background: 'var(--ds-surface-sunken, #F7F8F9)',
                    padding: '8px 4px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)',
                    borderLeft: ci === sysCount ? '2px solid var(--ds-border-bold, #758195)' : undefined,
                    verticalAlign: 'bottom', cursor: r.bypass ? 'default' : 'pointer', minWidth: 44,
                  }}
                >
                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 'var(--ds-font-size-100)', fontWeight: r.tier === 'system' ? 600 : 400, color: r.tier === 'system' ? 'var(--ds-text, var(--ds-text, #172B4D))' : 'var(--ds-text-subtle, var(--ds-icon, #44546F))', whiteSpace: 'nowrap', height: 84, margin: '0 auto' }}>
                    {r.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map((g) => {
              const isCollapsed = collapsed[g.label];
              return (
                <React.Fragment key={g.label}>
                  <tr>
                    <td
                      onClick={() => setCollapsed((p) => ({ ...p, [g.label]: !p[g.label] }))}
                      style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--ds-surface-sunken, #F7F8F9)', padding: '8px 12px', fontWeight: 600, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text, #172B4D)', borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)', cursor: 'pointer', whiteSpace: 'nowrap' }}
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
                        <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--ds-surface, #FFFFFF)', padding: '8px 12px 8px 24px', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text, #172B4D)', borderBottom: '1px solid var(--ds-border, #DFE1E6)', borderRight: '1px solid var(--ds-border, #DFE1E6)', whiteSpace: 'nowrap' }}>
                          {c.name}
                        </td>
                        {allRoles.map((r, ci) => (
                          <Cell
                            key={r.code}
                            moduleKey={c.module_key}
                            roleCode={r.code}
                            ri={ri}
                            ci={ci}
                            level={levelOf(c.module_key, r.code)}
                            bypass={!!r.bypass}
                            borderLeft={ci === sysCount}
                            onCycle={onCellCycle}
                            onMenu={onCellMenu}
                            onKey={onCellKey}
                          />
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {noMatches && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--ds-text-subtle, #44546F)' }}>
            <div style={{ fontSize: 'var(--ds-font-size-400)', marginBottom: 12 }}>No modules match &ldquo;{filter}&rdquo;.</div>
            <button
              type="button"
              onClick={() => setFilter('')}
              style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-information, #0055CC)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {menu && createPortal(
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: menu.y, left: menu.x, zIndex: 9999, background: 'var(--ds-surface-overlay, #FFFFFF)', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 6, boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))', padding: '4px 0', minWidth: 180 }}
        >
          {!menu.module_key && (
            <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
              Set ALL {allModules.length} modules for {roleName(menu.role_code)}
            </div>
          )}
          {LEVELS.map((lv) => (
            <button
              key={lv}
              role="menuitem"
              type="button"
              onClick={() => { if (menu.module_key) setCell(menu.module_key, menu.role_code, lv); else bulkColumnTo(menu.role_code, lv); setMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)', textAlign: 'left' }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 3, background: FILL[lv], boxShadow: lv === 'hidden' ? 'inset 0 0 0 1px var(--ds-border, #DFE1E6)' : 'none' }} />
              {menu.module_key ? LABEL[lv] : `All ${LABEL[lv]}`}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default ModuleAccessMatrix;
