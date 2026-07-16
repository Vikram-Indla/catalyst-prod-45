/**
 * STRATA Workflow & access domain (governed control plane, anchor 27 · P5-D4).
 * Route: /strata/admin/access. Left section-nav: Role assignments + Workflow
 * transitions (reused governed section).
 *
 * Scoped honestly (P5-D4 / zero-assumption):
 *  - SoD column (F1a): the verdict comes from the ENGINE via
 *    strata_check_role_sod, which PROJECTS the four record-scoped rules the DB
 *    already enforces onto a person's role set. Nothing is computed here — P5-D4
 *    forbids a client SoD engine. 'guarded' = they hold a role a real rule gates,
 *    so it WILL refuse them on their own records; 'clean' = no rule can bite them.
 *    Rule text is quoted verbatim. CONFLICT is deliberately absent (F1-D2
 *    deferred): the server never refuses a role COMBINATION, so claiming one
 *    would assert a check that does not exist.
 *  - "View as" is a READ-ONLY client preview of the person's role assignments +
 *    what those roles permit. It does NOT switch the session, and there is no
 *    audit-write RPC, so the preview says so rather than implying it was logged.
 *  - Assign/revoke DO exist (governanceApi) — the server's refusal text is
 *    surfaced verbatim.
 */
import React, { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button, CatalystTag, EmptyState, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import { ArrowLeft, GitBranch, Users } from '@/lib/atlaskit-icons';
import { governanceApi } from '@/modules/strata/domain';
import {
  useInvalidateStrata, useProfileNames, useRoleAssignments, useStrataRoles,
} from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { StrataRestricted } from '@/modules/strata/components/StrataSystemStates';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import { fmtDate, labelize } from '@/modules/strata/components/format';
import { ROLE_DOCS, WorkflowsSection } from './StrataAdminConfigPage';
import type { StrataRole, StrataRoleSod } from '@/modules/strata/types';

type OnError = (msg: string | null) => void;

const metaStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtle };
const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: '0 0 12px' };
const railBox: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 12,
  border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, background: T.raised,
};
const railLabel: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-100)', fontWeight: 700, letterSpacing: '0.04em', color: T.subtlest,
};

/** strata_role_assignments row (domain returns untyped rows). */
interface RoleAssignmentRow {
  id: string;
  user_id: string;
  role: StrataRole;
  scope_type: string;
  scope_entity_id: string | null;
  granted_by: string | null;
  granted_at: string;
}

const ROLE_PURPOSE = new Map(ROLE_DOCS.map((r) => [r.role, r.purpose]));
const ASSIGNABLE_ROLES = ROLE_DOCS.map((r) => ({ value: r.role as string, label: labelize(r.role) }));

const NAV = [
  { key: 'assignments', label: 'Role assignments', icon: Users },
  { key: 'workflows', label: 'Workflow transitions', icon: GitBranch },
] as const;

// ── Person rail (anchor 27: consequences, not role keys) ─────────────────────
function PersonRail({ userId, name, email, assignments, canAssign, viewingAs, onViewAs, onError, sod }: {
  sod: StrataRoleSod[];
  userId: string | null;
  name: string | null;
  email: string | null;
  assignments: RoleAssignmentRow[];
  canAssign: boolean;
  viewingAs: boolean;
  onViewAs: (userId: string | null) => void;
  onError: OnError;
}) {
  const invalidate = useInvalidateStrata();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Rule text comes from the engine, quoted — never paraphrased (anchor 27).
  const guardedRules = [...new Set(sod.filter((r) => r.verdict === 'guarded').flatMap((r) => r.rules))];

  if (!userId) {
    return (
      <div style={railBox} data-testid="strata-access-rail-empty">
        <EmptyState
          size="compact"
          header="Select a person"
          description="Choose an assignment to see what their roles let them do and how segregation of duties constrains them."
        />
      </div>
    );
  }

  const revoke = async (assignmentId: string) => {
    setBusyId(assignmentId);
    onError(null);
    try {
      await governanceApi.revokeRole(assignmentId);
      invalidate();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={railBox} data-testid="strata-access-rail">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <strong style={{ fontSize: 'var(--ds-font-size-300)', color: T.text }}>{name ?? '—'}</strong>
          {email ? <span style={metaStyle}>{email}</span> : null}
        </div>
        <span style={metaStyle}>{assignments.length} role{assignments.length === 1 ? '' : 's'}</span>
      </div>

      {/* What these roles mean — real ROLE_DOCS domain language, not role keys */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={railLabel}>WHAT THESE ROLES MEAN</span>
        {assignments.map((a) => (
          <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ ...bodyStyle, fontWeight: 600 }}>{labelize(a.role)}</span>
            <span style={metaStyle}>{ROLE_PURPOSE.get(a.role) ?? 'No documented purpose for this role.'}</span>
          </div>
        ))}
      </div>

      {/* Combined effect — the DOCUMENTED, DB-enforced rule. Not a client verdict. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, border: `1px solid ${T.border}`, borderRadius: 6, padding: 12, background: T.sunken }}>
        <span style={railLabel}>COMBINED EFFECT</span>
        {guardedRules.length > 0 ? (
          <>
            <span style={metaStyle}>
              These roles let {name ?? 'this person'} approve or validate, so the database will refuse them on their
              OWN records. The rules that constrain them, quoted from the engine:
            </span>
            <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
              {guardedRules.map((r) => (
                <li key={r} style={{ ...metaStyle, marginBottom: 4 }}>“{r}”</li>
              ))}
            </ul>
          </>
        ) : (
          <span style={metaStyle}>
            Clean — {name ?? 'this person'} holds no role that the segregation-of-duties rules gate, so none of them can
            constrain their actions.
          </span>
        )}
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
          Guarded means a rule constrains them on their own records — not that the combination is illegal. The server
          never refuses a role combination, so no "conflict" state is claimed here.
        </span>
      </div>

      {/* Acts as (preview) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={railLabel}>ACTS AS (PREVIEW)</span>
        <span style={metaStyle}>
          A read-only preview of what {name ?? 'this person'} is assigned — it does not switch your session and is not
          audit-logged yet.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Button
          spacing="compact"
          onClick={() => onViewAs(viewingAs ? null : userId)}
          testId="strata-access-view-as"
        >
          {viewingAs ? 'Exit preview' : `View as ${name ? name.split(' ')[0] : 'person'}`}
        </Button>
        {canAssign ? assignments.map((a) => (
          <Button
            key={a.id}
            spacing="compact"
            appearance="subtle"
            isDisabled={busyId === a.id}
            onClick={() => void revoke(a.id)}
            testId={`strata-access-revoke-${a.id}`}
          >
            Remove {labelize(a.role)}
          </Button>
        )) : null}
      </div>
    </div>
  );
}

// ── Role assignments ─────────────────────────────────────────────────────────
function RoleAssignments({ onError }: { onError: OnError }) {
  const assignmentsQ = useRoleAssignments();
  const profilesQ = useProfileNames();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const assignments = (assignmentsQ.data ?? []) as RoleAssignmentRow[];
  // UI affordance gating only — the RPCs also authorise platform admins server-side.
  const isStrataAdmin = (rolesQ.data ?? []).includes('strata_admin');
  const profile = (id: string | null) => (id ? profilesQ.data?.get(id) ?? null : null);

  const byUser = useMemo(() => {
    const m = new Map<string, RoleAssignmentRow[]>();
    for (const a of assignments) {
      if (!m.has(a.user_id)) m.set(a.user_id, []);
      m.get(a.user_id)!.push(a);
    }
    return m;
  }, [assignments]);

  // F1a: the SoD verdict comes from the ENGINE (strata_check_role_sod), which
  // projects the four real rules. Never computed here — P5-D4 bans a client engine.
  const userIds = useMemo(() => [...byUser.keys()], [byUser]);
  const sodQueries = useQueries({
    queries: userIds.map((uid) => ({
      queryKey: ['strata', 'role-sod', uid],
      queryFn: () => governanceApi.checkRoleSod(uid),
      staleTime: 30_000,
    })),
  });
  const sodByUserRole = useMemo(() => {
    const m = new Map<string, 'clean' | 'guarded'>();
    userIds.forEach((uid, i) => {
      for (const r of (sodQueries[i]?.data ?? [])) m.set(`${uid}|${r.role_key}`, r.verdict);
    });
    return m;
  }, [userIds, sodQueries]);
  const sodRulesFor = (uid: string | null) => {
    const i = uid ? userIds.indexOf(uid) : -1;
    return i < 0 ? [] : (sodQueries[i]?.data ?? []);
  };

  const distinctPeople = byUser.size;
  const selected = selectedUserId ? profile(selectedUserId) : null;
  const viewAs = viewAsUserId ? profile(viewAsUserId) : null;

  const columns: Column<RoleAssignmentRow>[] = [
    {
      id: 'person', label: 'Person', flex: true,
      cell: ({ row }) => {
        const p = profile(row.user_id);
        return (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ ...bodyStyle, fontWeight: 600 }}>{p?.name ?? '—'}</span>
            {p?.email ? (
              <span style={{ ...metaStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      id: 'role', label: 'Role', width: 20,
      cell: ({ row }) => <StatusLozenge status={row.role} label={labelize(row.role)} appearance="default" />,
    },
    {
      id: 'sod', label: 'SoD', width: 16,
      cell: ({ row }) => {
        const v = sodByUserRole.get(`${row.user_id}|${row.role}`);
        if (!v) return <span style={{ color: T.subtlest }}>—</span>;
        return v === 'guarded'
          ? <StatusLozenge status="guarded" label="Guarded" appearance="moved" />
          : <StatusLozenge status="clean" label="Clean" appearance="success" />;
      },
    },
    {
      id: 'scope', label: 'Scope', width: 18,
      cell: ({ row }) => <CatalystTag text={labelize(row.scope_type)} />,
    },
    {
      id: 'since', label: 'Since', width: 15,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.granted_at)}</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Persistent view-as banner (anchor 27) */}
      {viewAs ? (
        <SectionMessage appearance="information" title={`Previewing as ${viewAs.name ?? 'this person'}`}>
          <p>
            Read-only preview of their role assignments — your session and permissions are unchanged. Switching sessions
            and audit-logging the preview are later features.
          </p>
          <Button spacing="compact" onClick={() => setViewAsUserId(null)} testId="strata-access-exit-preview">Exit preview</Button>
        </SectionMessage>
      ) : null}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 460px', minWidth: 0 }}>
          <StrataPanel
            title="Assignments"
            icon={<Users size={16} />}
            count={assignments.length}
            testId="strata-access-assignments"
            actions={isStrataAdmin ? (
              <Button appearance="primary" spacing="compact" onClick={() => setAssignOpen(true)} testId="strata-access-assign">
                Assign role
              </Button>
            ) : undefined}
          >
            <p style={captionStyle}>
              {ROLE_DOCS.length} roles · {assignments.length} assignment{assignments.length === 1 ? '' : 's'} ·{' '}
              {distinctPeople} {distinctPeople === 1 ? 'person' : 'people'} — this page mirrors the server role engine,
              it never replaces it. Segregation of duties is enforced in the database when an action is attempted.
            </p>
            {assignmentsQ.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
            ) : assignmentsQ.isError ? (
              <SectionMessage appearance="error" title="Failed to load role assignments">
                <p>{assignmentsQ.error instanceof Error ? assignmentsQ.error.message : 'Unknown error'}</p>
              </SectionMessage>
            ) : assignments.length === 0 ? (
              <EmptyState
                size="compact"
                header="No role assignments"
                description="Nobody has been granted a STRATA role in this tenant yet."
              />
            ) : (
              <JiraTable<RoleAssignmentRow>
                columns={columns}
                data={assignments}
                getRowId={(r) => r.id}
                onRowClick={(r) => setSelectedUserId(r.user_id)}
                showRowCount={false}
                ariaLabel="STRATA role assignments"
              />
            )}
          </StrataPanel>
        </div>

        <aside style={{ flex: '0 1 360px', minWidth: 280 }}>
          <PersonRail
            sod={sodRulesFor(selectedUserId)}
            userId={selectedUserId}
            name={selected?.name ?? null}
            email={selected?.email ?? null}
            assignments={selectedUserId ? (byUser.get(selectedUserId) ?? []) : []}
            canAssign={isStrataAdmin}
            viewingAs={!!selectedUserId && viewAsUserId === selectedUserId}
            onViewAs={setViewAsUserId}
            onError={onError}
          />
        </aside>
      </div>

      {isStrataAdmin ? (
        <StrataFormModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          title="Assign role"
          description="Grants a STRATA persona role at global scope. Segregation of duties is enforced in the database — a combination that breaks a rule is refused, and the refusal is shown verbatim."
          fields={[
            { key: 'user_id', label: 'User', kind: 'user', required: true },
            { key: 'role', label: 'Role', kind: 'select', required: true, options: ASSIGNABLE_ROLES },
            { key: 'scope', label: 'Scope', kind: 'text', isDisabled: true, helper: 'Fixed for this release' },
          ]}
          initial={{ scope: 'global' }}
          submitLabel="Assign role"
          onSubmit={async (v) => {
            await governanceApi.assignRole(v.user_id as string, v.role as StrataRole, 'global');
            invalidate();
          }}
          testId="strata-access-assign-modal"
        />
      ) : null}
    </div>
  );
}

// ── Workflow & access domain page ────────────────────────────────────────────
export default function StrataAccessPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string>('assignments');
  const [err, setErr] = useState<string | null>(null);
  const rolesQ = useStrataRoles();
  const isStrataAdmin = (rolesQ.data ?? []).includes('strata_admin');

  // Restricted: explained, never a bare 403 (anchor 27 / 28).
  if (!rolesQ.isLoading && !isStrataAdmin) {
    return (
      <StrataPageShell
        trail={[{ text: 'Administration', href: Routes.strata.admin() }]}
        title="Roles & access"
        docTitle="Roles & access · Administration"
        testId="strata-access-chrome"
      >
        <StrataRestricted
          title="This access area is restricted"
          why="Role assignments decide who can act on every governed record in STRATA, so granting and revoking them is held to one role."
          owningRole="strata_admin"
          backTo={Routes.strata.admin()}
          backLabel="Back to Configuration"
          testId="strata-access-restricted"
        />
      </StrataPageShell>
    );
  }

  return (
    <StrataPageShell
      trail={[{ text: 'Administration', href: Routes.strata.admin() }]}
      title="Roles & access"
      docTitle="Roles & access · Administration"
      testId="strata-access-chrome"
    >
      <style>{
        '.strata-domain-nav-item:hover{background:var(--ds-background-neutral-subtle-hovered);}'
        + '.strata-domain-nav-item:focus-visible{outline:2px solid var(--ds-border-focused);outline-offset:-2px;}'
      }</style>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <nav aria-label="Workflow & access sections" style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            appearance="subtle"
            spacing="compact"
            iconBefore={<ArrowLeft size={14} />}
            onClick={() => navigate(Routes.strata.admin())}
            testId="strata-access-back"
          >
            Configuration
          </Button>
          <div style={{ height: 8 }} />
          {NAV.map((n) => {
            const Icon = n.icon;
            const isActive = active === n.key;
            return (
              <button
                key={n.key}
                type="button"
                className="strata-domain-nav-item"
                onClick={() => { setActive(n.key); setErr(null); }}
                data-testid={`strata-access-nav-${n.key}`}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', font: 'inherit',
                  background: isActive ? T.selected : 'transparent',
                  color: isActive ? T.brandText : T.text,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span aria-hidden style={{ display: 'inline-flex' }}><Icon size={16} /></span>
                <span style={{ flex: 1 }}>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ flex: '1 1 520px', minWidth: 0 }}>
          {err ? (
            <div style={{ marginBottom: 16 }}>
              <SectionMessage appearance="error" title="Action rejected by the database"><p>{err}</p></SectionMessage>
            </div>
          ) : null}
          {active === 'assignments' ? <RoleAssignments onError={setErr} /> : <WorkflowsSection onError={setErr} />}
        </div>
      </div>
    </StrataPageShell>
  );
}
