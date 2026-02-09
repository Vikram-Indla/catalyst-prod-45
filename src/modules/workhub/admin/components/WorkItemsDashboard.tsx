import { useState } from 'react';
import { BarChart3, RefreshCw, ChevronDown, ChevronRight, FolderKanban } from 'lucide-react';
import { useJiraIssueStats, IssueTypeStats, ProjectStats } from '../hooks/useJiraIssueStats';
import '../../shared/tokens/workhub-tokens.css';

const STATUS_COLORS: Record<string, string> = {
  'To Do': '#94A3B8', 'ToDo': '#94A3B8', 'Open': '#94A3B8',
  'Backlog': '#94A3B8', 'New': '#94A3B8',
  'In Progress': '#2563EB', 'In Review': '#7C3AED',
  'In Development': '#2563EB', 'Development': '#2563EB',
  'In QA': '#8B5CF6', 'Ready for QA': '#A78BFA',
  'In Requirements': '#F59E0B', 'Technical validation': '#F59E0B',
  'BRD Under Review': '#F59E0B', 'Portfolio Review': '#F59E0B',
  'UAT Ready': '#06B6D4', 'Retest': '#06B6D4',
  'Awaiting Info': '#F59E0B', 'On Hold': '#F59E0B', 'Waiting': '#F59E0B',
  'Done': '#10B981', 'Closed': '#10B981', 'Resolved': '#10B981',
  'Released': '#10B981', 'In Production': '#10B981',
  'Cancelled': '#EF4444', 'Rejected': '#EF4444', 'Blocked': '#EF4444',
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#94A3B8';
}

interface WorkItemsDashboardProps {
  isConnected: boolean;
}

export function WorkItemsDashboard({ isConnected }: WorkItemsDashboardProps) {
  const { data, isLoading, error, refetch, isFetching } = useJiraIssueStats(isConnected);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  if (!isConnected) return null;

  return (
    <div className="wh-card" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 style={{ width: 18, height: 18, color: 'var(--wh-pri)' }} />
          <h3 style={{
            fontFamily: 'var(--wh-fh)', fontSize: 15, fontWeight: 700,
            color: 'var(--wh-tx)', margin: 0,
          }}>
            Work Items Overview
          </h3>
          {data && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--wh-tx4)',
              background: 'var(--wh-sf2)', padding: '2px 8px', borderRadius: 20,
              fontFamily: 'var(--wh-mo)',
            }}>
              {data.scanned.toLocaleString()} scanned
            </span>
          )}
        </div>
        <button
          className="wh-btn-secondary"
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ height: 32, padding: '0 12px', fontSize: 12 }}
        >
          <RefreshCw style={{
            width: 13, height: 13,
            animation: isFetching ? 'spin 1s linear infinite' : 'none',
          }} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--wh-tx3)' }}>
          Fetching work items from Jira...
        </div>
      )}

      {error && !isLoading && (
        <div style={{
          padding: '12px 14px', background: 'var(--wh-dng-bg)',
          borderRadius: 'var(--wh-rad)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: 13, color: 'var(--wh-dng)',
        }}>
          {error.message}
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Status summary bar */}
          <StatusBar statuses={data.statuses} total={data.scanned} />

          {/* By Issue Type */}
          <SectionHeader icon={<BarChart3 style={{ width: 13, height: 13 }} />} label="By Issue Type" />
          <div style={{ border: '1px solid var(--wh-bdr)', borderRadius: 'var(--wh-rad)', overflow: 'hidden', marginBottom: 20 }}>
            <TableHeader columns={['Type', 'Count', 'Status Breakdown']} />
            {data.types.map((t, idx) => (
              <TypeRow
                key={t.type}
                type={t}
                total={data.scanned}
                isLast={idx === data.types.length - 1}
                isExpanded={expandedType === t.type}
                onToggle={() => setExpandedType(expandedType === t.type ? null : t.type)}
              />
            ))}
          </div>

          {/* By Project */}
          <SectionHeader icon={<FolderKanban style={{ width: 13, height: 13 }} />} label="By Project" />
          <div style={{ border: '1px solid var(--wh-bdr)', borderRadius: 'var(--wh-rad)', overflow: 'hidden' }}>
            <TableHeader columns={['Project', 'Count', 'Type / Status Breakdown']} />
            {data.projects.map((p, idx) => (
              <ProjectRow
                key={p.key}
                project={p}
                total={data.scanned}
                isLast={idx === data.projects.length - 1}
                isExpanded={expandedProject === p.key}
                onToggle={() => setExpandedProject(expandedProject === p.key ? null : p.key)}
              />
            ))}
          </div>

          {data.total > data.scanned && (
            <div style={{
              marginTop: 8, fontSize: 11, color: 'var(--wh-tx4)',
              fontFamily: 'var(--wh-fn)', fontStyle: 'italic',
            }}>
              Showing {data.scanned.toLocaleString()} of {data.total.toLocaleString()} issues (last 90 days)
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Shared sub-components ── */

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--wh-fh)', fontSize: 11, fontWeight: 600,
      color: 'var(--wh-tx4)', textTransform: 'uppercase', letterSpacing: '0.04em',
      marginBottom: 8,
    }}>
      {icon}
      {label}
    </div>
  );
}

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '28px 1fr 80px 1fr',
      padding: '8px 12px', background: 'var(--wh-sf)',
      borderBottom: '1px solid var(--wh-bdr)',
      fontSize: 11, fontWeight: 600, color: 'var(--wh-tx4)',
      fontFamily: 'var(--wh-fh)', textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      <div />
      <div>{columns[0]}</div>
      <div style={{ textAlign: 'right' }}>{columns[1]}</div>
      <div style={{ paddingLeft: 16 }}>{columns[2]}</div>
    </div>
  );
}

function StatusBar({ statuses, total }: { statuses: Array<{ status: string; count: number }>; total: number }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionHeader icon={null} label="Status Distribution" />
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--wh-sf2)' }}>
        {statuses.map(s => (
          <div key={s.status} title={`${s.status}: ${s.count}`} style={{
            width: `${total > 0 ? (s.count / total) * 100 : 0}%`,
            background: getStatusColor(s.status),
            minWidth: s.count > 0 ? 2 : 0,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {statuses.map(s => (
          <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--wh-tx3)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: getStatusColor(s.status) }} />
            <span style={{ fontFamily: 'var(--wh-fn)' }}>{s.status}</span>
            <span style={{ fontFamily: 'var(--wh-mo)', fontSize: 11, color: 'var(--wh-tx4)' }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBar({ items, getColor, total }: { items: Array<{ label: string; count: number }>; getColor: (l: string) => string; total: number }) {
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--wh-sf2)', flex: 1, maxWidth: 200 }}>
      {items.map(s => (
        <div key={s.label} title={`${s.label}: ${s.count}`} style={{
          width: `${total > 0 ? (s.count / total) * 100 : 0}%`,
          background: getColor(s.label),
          minWidth: s.count > 0 ? 2 : 0,
        }} />
      ))}
    </div>
  );
}

function ChipList({ items, getColor }: { items: Array<{ label: string; count: number }>; getColor: (l: string) => string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map(s => (
        <span key={s.label} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'var(--wh-bg)', border: '1px solid var(--wh-bdr)',
          borderRadius: 20, padding: '3px 10px 3px 8px',
          fontSize: 12, fontFamily: 'var(--wh-fn)', color: 'var(--wh-tx2)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: getColor(s.label) }} />
          {s.label}
          <span style={{ fontFamily: 'var(--wh-mo)', fontSize: 11, color: 'var(--wh-tx4)' }}>{s.count}</span>
        </span>
      ))}
    </div>
  );
}

/* ── Row components ── */

function TypeRow({ type, total, isLast, isExpanded, onToggle }: {
  type: IssueTypeStats; total: number; isLast: boolean;
  isExpanded: boolean; onToggle: () => void;
}) {
  const pct = total > 0 ? ((type.count / total) * 100).toFixed(1) : '0';
  return (
    <>
      <ExpandableRow
        label={type.type}
        count={type.count}
        pct={pct}
        isExpanded={isExpanded}
        isLast={isLast}
        onToggle={onToggle}
        barItems={type.statuses.map(s => ({ label: s.status, count: s.count }))}
        barTotal={type.count}
        getColor={getStatusColor}
      />
      {isExpanded && (
        <div style={{
          padding: '8px 12px 12px 40px',
          borderBottom: isLast ? 'none' : '1px solid var(--wh-bdr)',
          background: 'var(--wh-sf)',
        }}>
          <ChipList items={type.statuses.map(s => ({ label: s.status, count: s.count }))} getColor={getStatusColor} />
        </div>
      )}
    </>
  );
}

function ProjectRow({ project, total, isLast, isExpanded, onToggle }: {
  project: ProjectStats; total: number; isLast: boolean;
  isExpanded: boolean; onToggle: () => void;
}) {
  const pct = total > 0 ? ((project.count / total) * 100).toFixed(1) : '0';
  return (
    <>
      <ExpandableRow
        label={`${project.name}`}
        sublabel={project.key}
        count={project.count}
        pct={pct}
        isExpanded={isExpanded}
        isLast={isLast}
        onToggle={onToggle}
        barItems={project.statuses.map(s => ({ label: s.status, count: s.count }))}
        barTotal={project.count}
        getColor={getStatusColor}
      />
      {isExpanded && (
        <div style={{
          padding: '8px 12px 12px 40px',
          borderBottom: isLast ? 'none' : '1px solid var(--wh-bdr)',
          background: 'var(--wh-sf)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--wh-tx4)', marginBottom: 6, fontFamily: 'var(--wh-fh)', textTransform: 'uppercase' }}>
            Types
          </div>
          <ChipList items={project.types.map(t => ({ label: t.type, count: t.count }))} getColor={() => 'var(--wh-pri)'} />
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--wh-tx4)', marginBottom: 6, marginTop: 10, fontFamily: 'var(--wh-fh)', textTransform: 'uppercase' }}>
            Statuses
          </div>
          <ChipList items={project.statuses.map(s => ({ label: s.status, count: s.count }))} getColor={getStatusColor} />
        </div>
      )}
    </>
  );
}

function ExpandableRow({ label, sublabel, count, pct, isExpanded, isLast, onToggle, barItems, barTotal, getColor }: {
  label: string; sublabel?: string; count: number; pct: string;
  isExpanded: boolean; isLast: boolean; onToggle: () => void;
  barItems: Array<{ label: string; count: number }>; barTotal: number;
  getColor: (l: string) => string;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'grid', gridTemplateColumns: '28px 1fr 80px 1fr',
        padding: '10px 12px', cursor: 'pointer',
        borderBottom: isLast && !isExpanded ? 'none' : '1px solid var(--wh-bdr)',
        background: isExpanded ? 'var(--wh-sf)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {isExpanded
          ? <ChevronDown style={{ width: 14, height: 14, color: 'var(--wh-tx4)' }} />
          : <ChevronRight style={{ width: 14, height: 14, color: 'var(--wh-tx4)' }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--wh-tx)', fontFamily: 'var(--wh-fn)' }}>{label}</span>
        {sublabel && (
          <span style={{ fontSize: 10, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-mo)', background: 'var(--wh-sf2)', padding: '1px 6px', borderRadius: 4 }}>{sublabel}</span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--wh-tx)', fontFamily: 'var(--wh-mo)', textAlign: 'right' }}>
        {count}
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--wh-tx4)', marginLeft: 4 }}>({pct}%)</span>
      </div>
      <div style={{ paddingLeft: 16, display: 'flex', alignItems: 'center' }}>
        <MiniBar items={barItems} getColor={getColor} total={barTotal} />
      </div>
    </div>
  );
}
