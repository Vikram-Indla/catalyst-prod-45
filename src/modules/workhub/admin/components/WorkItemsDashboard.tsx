import { useState } from 'react';
import { BarChart3, RefreshCw, ChevronDown, ChevronRight, FolderKanban, AlertTriangle, Bug, Layers } from 'lucide-react';
import { useJiraIssueStats, ProjectHierarchy, EpicNode, StoryNode } from '../hooks/useJiraIssueStats';
import '../../shared/tokens/workhub-tokens.css';

const STATUS_COLORS: Record<string, string> = {
  'To Do': 'rgba(237,237,237,0.40)', 'ToDo': 'rgba(237,237,237,0.40)', 'Open': 'rgba(237,237,237,0.40)',
  'Backlog': 'rgba(237,237,237,0.40)', 'New': 'rgba(237,237,237,0.40)',
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
  return STATUS_COLORS[status] || 'rgba(237,237,237,0.40)';
}

const DEFECT_COLORS: Record<string, string> = {
  'production incident': '#EF4444',
  'qa bug': '#F59E0B',
  'defect': '#8B5CF6',
  'bug': '#F59E0B',
};

function getDefectColor(type: string): string {
  return DEFECT_COLORS[type.toLowerCase()] || 'rgba(237,237,237,0.40)';
}

interface WorkItemsDashboardProps {
  isConnected: boolean;
  siteUrl: string;
}

function buildJiraUrl(siteUrl: string, jql: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/issues/?jql=${encodeURIComponent(jql)}`;
}

function buildBrowseUrl(siteUrl: string, key: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/browse/${key}`;
}

const BASE_JQL = 'updated >= -90d';

export function WorkItemsDashboard({ isConnected, siteUrl }: WorkItemsDashboardProps) {
  const { data, isLoading, error, refetch, isFetching } = useJiraIssueStats(isConnected);

  if (!isConnected) return null;

  return (
    <div className="wh-card" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 style={{ width: 18, height: 18, color: 'var(--wh-pri)' }} />
          <h3 style={{ fontFamily: 'var(--wh-fh)', fontSize: 15, fontWeight: 700, color: 'var(--wh-tx)', margin: 0 }}>
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
          style={{ height: 32, padding: '8px 12px', fontSize: 12 }}
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
          {/* Global Status Bar */}
          <StatusBar statuses={data.statusSummary} total={data.scanned} />

          {/* Projects */}
          <SectionHeader icon={<FolderKanban style={{ width: 13, height: 13 }} />} label="Projects" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.projects.map(project => (
              <ProjectCard key={project.key} project={project} total={data.scanned} siteUrl={siteUrl} />
            ))}
          </div>

          {data.total > data.scanned && (
            <div style={{
              marginTop: 12, fontSize: 11, color: 'var(--wh-tx4)',
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

function StatusBar({ statuses, total }: { statuses: Array<{ status: string; count: number }>; total: number }) {
  return (
    <div style={{ marginBottom: 20 }}>
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
            <span style={{ width: 8, height: 8, borderRadius: 4, background: getStatusColor(s.status) }} />
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
    <div style={{ display: 'flex', height: 6, borderRadius: 4, overflow: 'hidden', background: 'var(--wh-sf2)', flex: 1, maxWidth: 200 }}>
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

function StatusDot({ status }: { status: string }) {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: getStatusColor(status), flexShrink: 0 }} />;
}

function JiraLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick || ((e) => e.stopPropagation())}
      style={{
        color: 'var(--wh-pri)', textDecoration: 'none', borderBottom: '1px dashed var(--wh-pri)',
        fontFamily: 'var(--wh-mo)', cursor: 'pointer',
      }}
      title="Open in Jira"
    >
      {children}
    </a>
  );
}

function KeyBadge({ children }: { children: string }) {
  return (
    <span style={{
      fontSize: 10, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-mo)',
      background: 'var(--wh-sf2)', padding: '1px 6px', borderRadius: 4,
    }}>{children}</span>
  );
}

/* ── Project Card ── */

function ProjectCard({ project, total, siteUrl }: { project: ProjectHierarchy; total: number; siteUrl: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pct = total > 0 ? ((project.totalCount / total) * 100).toFixed(1) : '0';
  const jiraUrl = siteUrl ? buildJiraUrl(siteUrl, `${BASE_JQL} AND project = "${project.key}"`) : '';
  const totalDefects = project.defects.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{
      border: '1px solid var(--wh-bdr)', borderRadius: 'var(--wh-rad)',
      overflow: 'hidden', background: 'var(--wh-bg)',
    }}>
      {/* Project header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'grid', gridTemplateColumns: '28px 1fr auto',
          padding: '12px 14px', cursor: 'pointer',
          background: isExpanded ? 'var(--wh-sf)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isExpanded
            ? <ChevronDown style={{ width: 14, height: 14, color: 'var(--wh-tx4)' }} />
            : <ChevronRight style={{ width: 14, height: 14, color: 'var(--wh-tx4)' }} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <FolderKanban style={{ width: 14, height: 14, color: 'var(--wh-pri)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--wh-tx)', fontFamily: 'var(--wh-fn)' }}>{project.name}</span>
          <KeyBadge>{project.key}</KeyBadge>
          {/* Quick defect badges */}
          {project.defects.map(d => (
            <span key={d.type} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--wh-mo)',
              color: getDefectColor(d.type), background: `${getDefectColor(d.type)}15`,
              padding: '2px 7px', borderRadius: 12,
            }}>
              {d.type === 'Production Incident' ? <AlertTriangle style={{ width: 10, height: 10 }} /> : <Bug style={{ width: 10, height: 10 }} />}
              {d.count}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--wh-mo)', textAlign: 'right' }}>
            {jiraUrl ? <JiraLink href={jiraUrl}>{project.totalCount}</JiraLink> : project.totalCount}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--wh-tx4)', marginLeft: 4 }}>({pct}%)</span>
          </div>
          <MiniBar
            items={project.statusCounts.map(s => ({ label: s.status, count: s.count }))}
            getColor={getStatusColor}
            total={project.totalCount}
          />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--wh-bdr)' }}>
          {/* Defects section */}
          {project.defects.length > 0 && (
            <div style={{ padding: '12px 14px 12px 42px', borderBottom: '1px solid var(--wh-bdr)', background: 'var(--wh-sf)' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--wh-tx4)', marginBottom: 8,
                fontFamily: 'var(--wh-fh)', textTransform: 'uppercase', letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Bug style={{ width: 11, height: 11 }} /> Defects & Incidents
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {project.defects.map(d => {
                  const href = siteUrl ? buildJiraUrl(siteUrl, `${BASE_JQL} AND project = "${project.key}" AND issuetype = "${d.type}"`) : '';
                  return (
                    <div key={d.type} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--wh-bg)', border: '1px solid var(--wh-bdr)',
                      borderRadius: 8, padding: '6px 12px',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: getDefectColor(d.type) }} />
                      <span style={{ fontSize: 12, fontFamily: 'var(--wh-fn)', color: 'var(--wh-tx2)' }}>{d.type}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--wh-mo)' }}>
                        {href ? <JiraLink href={href}>{d.count}</JiraLink> : d.count}
                      </span>
                      {/* Mini status chips */}
                      {d.statuses.slice(0, 3).map(s => (
                        <span key={s.status} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: 10, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-fn)',
                        }}>
                          <StatusDot status={s.status} />
                          {s.count}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Epics hierarchy */}
          <div style={{ padding: '12px 14px 8px 42px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--wh-tx4)', marginBottom: 8,
              fontFamily: 'var(--wh-fh)', textTransform: 'uppercase', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Layers style={{ width: 11, height: 11 }} /> Hierarchy (Epic → Story → Subtask)
            </div>
            {project.epics.map((epic, idx) => (
              <EpicRow key={epic.key} epic={epic} projectKey={project.key} siteUrl={siteUrl} isLast={idx === project.epics.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Epic Row ── */

function EpicRow({ epic, projectKey, siteUrl, isLast }: { epic: EpicNode; projectKey: string; siteUrl: string; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUnlinked = epic.key === '_unlinked';
  const browseUrl = !isUnlinked && siteUrl ? buildBrowseUrl(siteUrl, epic.key) : '';

  return (
    <div style={{ marginBottom: isLast ? 0 : 4 }}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
          cursor: 'pointer', borderRadius: 6,
          background: isExpanded ? 'var(--wh-sf2)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        {epic.stories.length > 0
          ? (isExpanded
            ? <ChevronDown style={{ width: 12, height: 12, color: 'var(--wh-tx4)' }} />
            : <ChevronRight style={{ width: 12, height: 12, color: 'var(--wh-tx4)' }} />)
          : <span style={{ width: 12 }} />}
        <StatusDot status={epic.status} />
        {browseUrl ? (
          <JiraLink href={browseUrl} onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: 11 }}>{epic.key}</span>
          </JiraLink>
        ) : null}
        <span style={{
          fontSize: 12, fontWeight: 600, color: isUnlinked ? 'var(--wh-tx3)' : 'var(--wh-tx)',
          fontFamily: 'var(--wh-fn)', fontStyle: isUnlinked ? 'italic' : 'normal',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {epic.summary}
        </span>
        <span style={{ fontSize: 10, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-mo)', flexShrink: 0 }}>
          {epic.storyCount}S · {epic.subtaskCount}T
        </span>
        <MiniBar
          items={epic.statusCounts.map(s => ({ label: s.status, count: s.count }))}
          getColor={getStatusColor}
          total={epic.storyCount + epic.subtaskCount + 1}
        />
      </div>
      {isExpanded && epic.stories.length > 0 && (
        <div style={{ paddingLeft: 28 }}>
          {epic.stories.map((story, idx) => (
            <StoryRow key={story.key} story={story} projectKey={projectKey} siteUrl={siteUrl} isLast={idx === epic.stories.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Story Row ── */

function StoryRow({ story, projectKey, siteUrl, isLast }: { story: StoryNode; projectKey: string; siteUrl: string; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const browseUrl = siteUrl ? buildBrowseUrl(siteUrl, story.key) : '';

  return (
    <div style={{ marginBottom: isLast ? 4 : 0 }}>
      <div
        onClick={() => story.subtasks.length > 0 && setIsExpanded(!isExpanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
          cursor: story.subtasks.length > 0 ? 'pointer' : 'default',
          borderRadius: 4,
          transition: 'background 0.15s',
        }}
      >
        {story.subtasks.length > 0
          ? (isExpanded
            ? <ChevronDown style={{ width: 11, height: 11, color: 'var(--wh-tx4)' }} />
            : <ChevronRight style={{ width: 11, height: 11, color: 'var(--wh-tx4)' }} />)
          : <span style={{ width: 11 }} />}
        <StatusDot status={story.status} />
        {browseUrl ? (
          <JiraLink href={browseUrl} onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: 10 }}>{story.key}</span>
          </JiraLink>
        ) : null}
        <span style={{
          fontSize: 11, color: 'var(--wh-tx2)', fontFamily: 'var(--wh-fn)',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {story.summary}
        </span>
        <span style={{
          fontSize: 9, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-mo)',
          background: 'var(--wh-sf2)', padding: '1px 5px', borderRadius: 4, flexShrink: 0,
        }}>
          {story.type}
        </span>
        {story.subtaskCount > 0 && (
          <span style={{ fontSize: 10, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-mo)', flexShrink: 0 }}>
            {story.subtaskCount}T
          </span>
        )}
      </div>
      {isExpanded && story.subtasks.length > 0 && (
        <div style={{ paddingLeft: 28 }}>
          {story.subtasks.map(sub => {
            const subUrl = siteUrl ? buildBrowseUrl(siteUrl, sub.key) : '';
            return (
              <div key={sub.key} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
                fontSize: 11,
              }}>
                <span style={{ width: 11 }} />
                <StatusDot status={sub.status} />
                {subUrl ? (
                  <JiraLink href={subUrl}>
                    <span style={{ fontSize: 10 }}>{sub.key}</span>
                  </JiraLink>
                ) : null}
                <span style={{
                  color: 'var(--wh-tx3)', fontFamily: 'var(--wh-fn)',
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {sub.summary}
                </span>
                <span style={{
                  fontSize: 9, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-fn)',
                }}>
                  {sub.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
