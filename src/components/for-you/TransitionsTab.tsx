/**
 * TransitionsTab — V2 Journey Flow for ForYou detail panel
 * Shows complete lifecycle journey: status changes, durations, handoffs, comments, accountability
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, MessageSquare, Clock, ArrowRight, RotateCcw, CheckCircle2, Circle, Timer, Users, BarChart3 } from 'lucide-react';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { supabase } from '@/integrations/supabase/client';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';

import { useTheme } from '@/hooks/useTheme';

// Design tokens — light + dark
const TL = {
  ink: '#09090B', inkSecondary: '#18181B', inkTertiary: '#3F3F46',
  inkMuted: '#71717A', inkMutedStrong: '#6F6F78',
  surface: 'var(--ds-text-inverse, #FFFFFF)', surfaceSecondary: '#FAFAFA', surfaceTertiary: '#F4F4F5',
  border: '#E4E4E7', borderStrong: '#D4D4D8',
  primary: 'var(--ds-text-brand, #2563EB)', primaryHover: 'var(--ds-background-brand-bold-hovered, #1D4ED8)', primaryBg: 'var(--ds-background-selected, #EFF6FF)',
  teal: '#0D9488', tealBg: '#F0FDFA',
  success: 'var(--ds-text-success, #16A34A)', successBg: '#F0FDF4',
  warning: 'var(--ds-text-warning, #D97706)', warningBg: '#FFFBEB',
  danger: 'var(--ds-text-danger, #DC2626)', dangerBg: 'var(--ds-background-danger, #FEF2F2)',
};
const TD = {
  ink: 'var(--ds-text, #EDEDED)', inkSecondary: 'var(--ds-text-subtlest, #A1A1A1)', inkTertiary: 'var(--ds-text-subtlest, #878787)',
  inkMuted: 'rgba(255,255,255,0.45)', inkMutedStrong: 'rgba(255,255,255,0.50)',
  surface: 'var(--ds-surface, #0A0A0A)', surfaceSecondary: 'var(--ds-surface-raised, #1A1A1A)', surfaceTertiary: 'var(--ds-surface-overlay, #1F1F1F)',
  border: 'var(--ds-border, #2E2E2E)', borderStrong: 'var(--ds-border-bold, #454545)',
  primary: 'var(--ds-text-brand, #3B82F6)', primaryHover: 'var(--ds-text-brand, #60A5FA)', primaryBg: 'rgba(59,130,246,0.10)',
  teal: '#2DD4BF', tealBg: 'rgba(13,148,136,0.10)',
  success: '#4ADE80', successBg: 'rgba(74,222,128,0.10)',
  warning: '#FBBF24', warningBg: 'rgba(251,191,36,0.10)',
  danger: '#F87171', dangerBg: 'rgba(239,68,68,0.10)',
};

// Module-level token reference for sub-components (updated by main component on each render)
let T: typeof TL = TL;

// --- Types ---
interface TransitionStep {
  status: string;
  enteredAt: string;
  exitedAt: string | null;
  duration: number;
  durationLabel: string;
  actor: PersonInfo;
  transitionBy: PersonInfo;
  isHandoff: boolean;
  previousActor?: PersonInfo;
  isCurrent: boolean;
  isRework: boolean;
  comments: TransitionComment[];
  percentOfCycle: number;
}

interface PersonInfo {
  name: string;
  avatarUrl?: string | null;
  initials: string;
}

interface TransitionComment {
  body: string;
  author: PersonInfo;
  createdAt: string;
}

// --- Helpers ---
function getInitials(name: string): string {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days === 0 && remainingHours === 0) return totalMinutes < 1 ? '<1m' : `${totalMinutes}m`;
  if (days === 0) return `${remainingHours}h`;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusCategory(status: string): 'todo' | 'inprogress' | 'done' {
  const n = status.toLowerCase().replace(/[\s_-]+/g, '').trim();
  const doneP = ['done', 'closed', 'resolved', 'complete', 'completed', 'inproduction', 'inprod', 'released', 'shipped', 'deployed', 'verified', 'accepted', 'approved'];
  if (doneP.some(p => n.includes(p))) return 'done';
  const progP = ['inprogress', 'indevelopment', 'indev', 'inreview', 'testing', 'readyfordevelopment', 'readyfordev', 'readyforqa', 'development', 'review', 'active', 'started', 'reopened', 'open', 'ready', 'triage', 'onhold'];
  if (progP.some(p => n.includes(p))) return 'inprogress';
  return 'todo';
}

function stripJiraMarkup(text: string): string {
  if (!text) return '';
  return text
    .replace(/\{noformat\}([\s\S]*?)\{noformat\}/g, '$1')
    .replace(/\{code[^}]*\}([\s\S]*?)\{code\}/g, '$1')
    .replace(/\[([^|]+)\|([^\]]+)\]/g, '$1')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\{color[^}]*\}([\s\S]*?)\{color\}/g, '$1')
    .replace(/h[1-6]\.\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const AVATAR_PALETTE = ['var(--ds-text-brand, #2563EB)', '#0D9488', 'var(--ds-text-warning, #D97706)', '#7C3AED', 'var(--ds-text-danger, #DC2626)', 'var(--ds-text-success, #16A34A)', '#0891B2', '#BE185D'];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// --- Build Timeline ---
function findAssigneeAtTime(
  assigneeChanges: any[],
  timestamp: string,
  defaultAssignee: string
): { name: string; avatarUrl?: string | null } {
  const time = new Date(timestamp).getTime();
  let assignee = defaultAssignee || 'Unassigned';
  let avatarUrl: string | null = null;
  for (const change of assigneeChanges) {
    const changeTime = new Date(change.jira_created_at || change.created_at).getTime();
    if (changeTime <= time) {
      assignee = change.to_string || assignee;
      avatarUrl = null; // changelog doesn't have target avatar
    }
  }
  return { name: assignee, avatarUrl };
}

function buildTimeline(
  statusChanges: any[],
  assigneeChanges: any[],
  comments: any[],
  issueCreatedAt: string,
  reporterName: string,
  currentAssignee: string,
  currentStatus: string,
): TransitionStep[] {
  if (statusChanges.length === 0) {
    // No transitions — show single step for current status
    const now = Date.now();
    const created = new Date(issueCreatedAt).getTime();
    const dur = now - created;
    return [{
      status: currentStatus || 'To Do',
      enteredAt: issueCreatedAt,
      exitedAt: null,
      duration: dur,
      durationLabel: formatDuration(dur),
      actor: { name: currentAssignee || reporterName || 'Unknown', initials: getInitials(currentAssignee || reporterName || 'Unknown') },
      transitionBy: { name: reporterName || 'Unknown', initials: getInitials(reporterName || 'Unknown') },
      isHandoff: false,
      isCurrent: true,
      isRework: false,
      comments: comments.map((c: any) => ({
        body: c.body,
        author: { name: c.author_display_name || 'Unknown', avatarUrl: c.author_avatar_url, initials: getInitials(c.author_display_name || 'Unknown') },
        createdAt: c.jira_created_at || c.created_at,
      })),
      percentOfCycle: 100,
    }];
  }

  const steps: TransitionStep[] = [];
  const seenStatuses = new Set<string>();

  for (let i = 0; i <= statusChanges.length; i++) {
    const isInitial = i === 0;
    const isLast = i === statusChanges.length;

    const status = isInitial
      ? (statusChanges[0].from_string || 'Backlog')
      : statusChanges[i - 1].to_string || 'Unknown';

    const enteredAt = isInitial
      ? issueCreatedAt
      : (statusChanges[i - 1].jira_created_at || statusChanges[i - 1].created_at);

    const exitedAt = isLast
      ? null
      : (statusChanges[i].jira_created_at || statusChanges[i].created_at);

    const transitionBy = isInitial
      ? { name: reporterName || 'Unknown', avatarUrl: null as string | null, initials: getInitials(reporterName || 'Unknown') }
      : {
          name: statusChanges[i - 1].author_display_name || 'Unknown',
          avatarUrl: statusChanges[i - 1].author_avatar_url as string | null,
          initials: getInitials(statusChanges[i - 1].author_display_name || 'Unknown'),
        };

    const assigneeInfo = findAssigneeAtTime(assigneeChanges, enteredAt, currentAssignee);
    const actor: PersonInfo = { name: assigneeInfo.name, avatarUrl: assigneeInfo.avatarUrl, initials: getInitials(assigneeInfo.name) };

    const prevActor = steps.length > 0 ? steps[steps.length - 1].actor : null;
    const isHandoff = !!(prevActor && prevActor.name.toLowerCase() !== actor.name.toLowerCase());

    const statusKey = status.toLowerCase();
    const isRework = seenStatuses.has(statusKey);
    seenStatuses.add(statusKey);

    // Comments in this period
    const enterTime = new Date(enteredAt).getTime();
    const exitTime = exitedAt ? new Date(exitedAt).getTime() : Date.now();
    const periodComments = comments.filter((c: any) => {
      const cTime = new Date(c.jira_created_at || c.created_at).getTime();
      return cTime >= enterTime && cTime <= exitTime;
    });

    const duration = exitedAt
      ? new Date(exitedAt).getTime() - new Date(enteredAt).getTime()
      : Date.now() - new Date(enteredAt).getTime();

    steps.push({
      status,
      enteredAt,
      exitedAt,
      duration: Math.max(0, duration),
      durationLabel: formatDuration(Math.max(0, duration)),
      actor,
      transitionBy,
      isHandoff,
      previousActor: isHandoff ? prevActor! : undefined,
      isCurrent: isLast,
      isRework,
      comments: periodComments.map((c: any) => ({
        body: c.body,
        author: { name: c.author_display_name || 'Unknown', avatarUrl: c.author_avatar_url, initials: getInitials(c.author_display_name || 'Unknown') },
        createdAt: c.jira_created_at || c.created_at,
      })),
      percentOfCycle: 0,
    });
  }

  const totalCycle = steps.reduce((sum, s) => sum + s.duration, 0);
  steps.forEach(s => { s.percentOfCycle = totalCycle > 0 ? Math.round((s.duration / totalCycle) * 100) : 0; });
  return steps;
}

// --- Avatar component (local, uses profile avatars) ---
function PersonAvatar({ name, avatarUrl, size = 24 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const nameAvatarMap = useProfileAvatarsByName();
  const resolvedUrl = avatarUrl || nameAvatarMap.get(name.toLowerCase());
  const ini = getInitials(name);
  const clr = getAvatarColor(name);

  if (resolvedUrl) {
    return <img src={resolvedUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${T.border}` }} />;
  }
  return <div style={{ width: size, height: size, borderRadius: '50%', background: clr, color: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>{ini}</div>;
}

// --- Sub-components ---

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ flex: 1, padding: '12px 14px', background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: 'var(--cp-font-mono)', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: T.inkMuted, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function CycleSummary({ steps }: { steps: TransitionStep[] }) {
  const totalMs = steps.reduce((s, t) => s + t.duration, 0);
  const todoSteps = steps.filter(s => getStatusCategory(s.status) === 'todo');
  const progressSteps = steps.filter(s => getStatusCategory(s.status) === 'inprogress');
  const waitMs = todoSteps.reduce((s, t) => s + t.duration, 0);
  const activeMs = progressSteps.reduce((s, t) => s + t.duration, 0);
  const uniquePeople = new Set(steps.map(s => s.actor.name)).size;

  const transitionCount = Math.max(0, steps.length - 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
      <SummaryCard label="Cycle Time" value={formatDuration(totalMs)} sub={`${transitionCount} transition${transitionCount !== 1 ? 's' : ''}`} color={T.primary} />
      <SummaryCard label="Active Time" value={formatDuration(activeMs)} sub={`${progressSteps.length} statuses`} color="var(--cp-blue)" />
      <SummaryCard label="Wait Time" value={formatDuration(waitMs)} sub={`${todoSteps.length} statuses`} color="var(--sem-warning)" />
      <SummaryCard label="People" value={`${uniquePeople}`} sub={`${steps.filter(s => s.isHandoff).length} handoffs`} color="#7C3AED" />
    </div>
  );
}

function HandoffConnector({ from, to, isRework }: { from: PersonInfo; to: PersonInfo; isRework: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0', marginLeft: 15 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: isRework ? T.warningBg : T.surfaceTertiary, border: `1px solid ${isRework ? 'var(--sem-warning)' : T.border}`, fontSize: 11, fontWeight: 600, color: isRework ? T.warning : T.inkMuted }}>
        <PersonAvatar name={from.name} avatarUrl={from.avatarUrl} size={18} />
        <span>{isRework ? 'returned to' : 'handed off to'}</span>
        <span style={{ fontSize: 14 }}>{isRework ? '↩' : '→'}</span>
        <PersonAvatar name={to.name} avatarUrl={to.avatarUrl} size={18} />
        <span style={{ fontWeight: 700, color: isRework ? T.warning : T.inkTertiary }}>{to.name}</span>
      </div>
    </div>
  );
}

function StepCard({ step, index }: { step: TransitionStep; index: number }) {
  const category = getStatusCategory(step.status);
  const nodeColor = category === 'done' ? T.success : category === 'inprogress' ? T.primary : T.borderStrong;
  const nodeBorder = category === 'done' ? '#00875A' : category === 'inprogress' ? '#0065FF' : '#A5ADBA';
  const [showComments, setShowComments] = useState(step.comments.length <= 2);

  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative', opacity: 1, animation: `fy-stepIn 0.4s ease ${index * 0.06}s both` }}>
      {/* Node */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 30, zIndex: 1 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: step.isCurrent ? T.primaryBg : nodeColor,
          border: `2px solid ${step.isCurrent ? T.primary : nodeBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: step.isCurrent ? 'fy-pulse 2s ease infinite' : 'none',
        }}>
          {category === 'done' ? <CheckCircle2 size={14} color="#00875A" /> : category === 'inprogress' ? <Timer size={14} color="var(--cp-blue)" /> : <Circle size={14} color="#A5ADBA" />}
        </div>
      </div>

      {/* Card */}
      <div style={{
        flex: 1, padding: '14px 16px', borderRadius: 12,
        border: `1px solid ${step.isCurrent ? T.primary : T.border}`,
        background: step.isCurrent ? `linear-gradient(135deg, ${T.primaryBg}, ${T.surface})` : T.surface,
        boxShadow: step.isCurrent ? '0 2px 12px rgba(37,99,235,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: 4,
      }}>
        {/* Row 1: Status + badges + duration */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusLozenge status={step.status} />
            {step.isCurrent && (
              <span style={{ fontSize: 10, fontWeight: 700, color: T.primary, background: T.primaryBg, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em' }}>● CURRENT</span>
            )}
            {step.isRework && (
              <span style={{ fontSize: 10, fontWeight: 700, color: T.warning, background: T.warningBg, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 3 }}>
                <RotateCcw size={9} /> REWORK
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, background: T.surfaceTertiary, border: `1px solid ${T.border}` }}>
            <Clock size={11} color={T.inkMuted} />
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, fontWeight: 600, color: T.ink }}>{step.durationLabel}{step.isCurrent ? '+' : ''}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: T.inkMuted }}>({step.percentOfCycle}%)</span>
          </div>
        </div>

        {/* Row 2: Person + dates */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PersonAvatar name={step.actor.name} avatarUrl={step.actor.avatarUrl} size={26} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{step.actor.name}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: T.inkMuted }}>
                {step.transitionBy.name.toLowerCase() === step.actor.name.toLowerCase()
                  ? 'Self-transitioned'
                  : `Moved by ${step.transitionBy.name}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: T.inkTertiary, fontFamily: 'var(--cp-font-mono)' }}>{formatDateTime(step.enteredAt)}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: T.inkMuted, fontFamily: 'var(--cp-font-mono)' }}>→ {step.exitedAt ? formatDateTime(step.exitedAt) : 'In progress…'}</span>
          </div>
        </div>

        {/* Row 3: Comments */}
        {step.comments.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
            <button
              onClick={() => setShowComments(!showComments)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: T.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showComments ? 8 : 0 }}
            >
              <MessageSquare size={12} />
              {step.comments.length} comment{step.comments.length !== 1 ? 's' : ''} during this status
            </button>
            {showComments && step.comments.map((comment, cIdx) => (
              <div key={cIdx} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 10px', background: T.surfaceTertiary, borderRadius: 6, borderLeft: `3px solid ${T.borderStrong}` }}>
                <PersonAvatar name={comment.author.name} avatarUrl={comment.author.avatarUrl} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{comment.author.name}</span>
                    <span style={{ fontSize: 10, color: T.inkMuted }}>{formatTimeAgo(comment.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.inkSecondary, lineHeight: 1.6, marginTop: 3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {stripJiraMarkup(comment.body).slice(0, 300)}{comment.body.length > 300 ? '…' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PersonAccountability({ steps }: { steps: TransitionStep[] }) {
  const totalMs = steps.reduce((s, t) => s + t.duration, 0);

  const people = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl?: string | null; initials: string; totalMs: number; statusCount: number; statuses: Set<string> }>();
    steps.forEach(step => {
      const key = step.actor.name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: step.actor.name, avatarUrl: step.actor.avatarUrl, initials: step.actor.initials, totalMs: 0, statusCount: 0, statuses: new Set() });
      }
      const p = map.get(key)!;
      p.totalMs += step.duration;
      p.statusCount++;
      p.statuses.add(step.status);
    });
    return Array.from(map.values()).sort((a, b) => b.totalMs - a.totalMs);
  }, [steps]);

  if (people.length <= 1) return null;

  return (
    <div style={{ marginTop: 24, padding: '16px', border: `1px solid ${T.border}`, borderRadius: 12, background: T.surface }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={14} color={T.inkTertiary} />
          <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: 'var(--cp-font-heading)' }}>Person Accountability</span>
        </div>
        <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>Time ownership breakdown</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {people.map(person => {
          const pct = totalMs > 0 ? Math.round((person.totalMs / totalMs) * 100) : 0;
          return (
            <div key={person.name} style={{ padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.surfaceSecondary }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <PersonAvatar name={person.name} avatarUrl={person.avatarUrl} size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{person.name}</div>
                  <div style={{ fontSize: 11, color: T.inkMuted }}>{person.statusCount} transition{person.statusCount !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: 'var(--cp-font-mono)' }}>{formatDuration(person.totalMs)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.primary }}>{pct}%</div>
                </div>
              </div>
              <div style={{ width: '100%', height: 4, borderRadius: 4, background: T.surfaceTertiary, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: getAvatarColor(person.name), transition: 'width 0.5s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Component ---
interface TransitionsTabProps {
  issueKey: string;
}

export function TransitionsTab({ issueKey }: TransitionsTabProps) {
  const { isDark } = useTheme();
  T = isDark ? TD : TL;
  const [steps, setSteps] = useState<TransitionStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!issueKey) return;
    let cancelled = false;
    setLoading(true);

    async function fetchData() {
      // Fetch all in parallel
      const [statusRes, assigneeRes, commentsRes, issueRes] = await Promise.all([
        supabase
          .from('jira_sync_changelog')
          .select('*')
          .eq('issue_key', issueKey)
          .eq('field_name', 'status')
          .order('jira_created_at', { ascending: true }),
        supabase
          .from('jira_sync_changelog')
          .select('*')
          .eq('issue_key', issueKey)
          .eq('field_name', 'assignee')
          .order('jira_created_at', { ascending: true }),
        supabase
          .from('jira_sync_comments')
          .select('*')
          .eq('issue_key', issueKey)
          .order('jira_created_at', { ascending: true }),
        supabase
          .from('ph_issues')
          .select('issue_key, status, assignee_display_name, reporter_display_name, jira_created_at')
          .eq('issue_key', issueKey)
          .limit(1)
          .single(),
      ]);

      if (cancelled) return;

      const issue = issueRes.data;
      const statusChanges = statusRes.data || [];
      const assigneeChanges = assigneeRes.data || [];
      const cmts = commentsRes.data || [];

      const timeline = buildTimeline(
        statusChanges,
        assigneeChanges,
        cmts,
        issue?.jira_created_at || new Date().toISOString(),
        issue?.reporter_display_name || 'Unknown',
        issue?.assignee_display_name || 'Unassigned',
        issue?.status || 'To Do',
      );

      setSteps(timeline);
      setLoading(false);
    }

    fetchData().catch(err => {
      console.error('Error fetching transitions:', err);
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [issueKey]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 8 }}>
        <Loader2 size={16} color={T.inkMuted} style={{ animation: 'fy-spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: T.inkMuted }}>Loading transition history…</span>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 8 }}>
        <BarChart3 size={28} color="#A1A1AA" strokeWidth={1.5} />
        <span style={{ fontSize: 14, fontWeight: 600, color: T.inkTertiary }}>No transitions yet</span>
        <span style={{ fontSize: 12, color: T.inkMuted }}>This item hasn't had any status changes recorded.</span>
      </div>
    );
  }

  return (
    <div>
      <CycleSummary steps={steps} />

      {/* Journey flow */}
      <div style={{ position: 'relative', paddingLeft: 0 }}>
        {/* Vertical connecting line */}
        <div style={{
          position: 'absolute', left: 14, top: 30, bottom: 30,
          width: 2, background: `linear-gradient(to bottom, ${T.border}, ${T.primary}20)`,
          zIndex: 0,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              {step.isHandoff && step.previousActor && (
                <HandoffConnector from={step.previousActor} to={step.actor} isRework={step.isRework} />
              )}
              <StepCard step={step} index={index} />
            </React.Fragment>
          ))}
        </div>
      </div>

      <PersonAccountability steps={steps} />

      {/* Jira sync bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20, padding: '8px 12px', background: T.surfaceTertiary, borderRadius: 6, border: `1px solid ${T.border}` }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.inkMuted} strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, fontFamily: 'var(--cp-font-mono)', letterSpacing: '0.06em' }}>JIRA SYNC</span>
        <span style={{ fontSize: 10, color: T.inkMuted }}>· Source of truth: Jira</span>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fy-stepIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fy-pulse { 0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.08); } 50% { box-shadow: 0 0 0 6px rgba(37,99,235,0.12); } }
      `}</style>
    </div>
  );
}
