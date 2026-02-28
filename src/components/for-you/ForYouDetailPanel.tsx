/**
 * ForYouDetailPanel — Enterprise right-drawer detail panel
 * V3 FINAL · fy- ring-fenced · 5 tabs · DB-backed Comments/History/Links
 * No Sprint/Story Points · Parent banner · Linkify
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ExternalLink, Copy, Layers, MessageSquare, Clock, Link2, Zap, Target, Tag, Calendar, GitBranch, User, CornerDownLeft, Paperclip, FileText, Image, Download, File } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItem } from '@/hooks/useForYouData';

// Design tokens (ring-fenced)
const T = {
  ink: '#09090B', inkSecondary: '#18181B', inkTertiary: '#3F3F46',
  inkMuted: '#71717A', inkMutedStrong: '#6F6F78',
  surface: '#FFFFFF', surfaceSecondary: '#FAFAFA', surfaceTertiary: '#F4F4F5',
  border: '#E4E4E7', borderStrong: '#D4D4D8',
  primary: '#2563EB', primaryHover: '#1D4ED8', primaryBg: '#EFF6FF',
  teal: '#0D9488', tealText: '#0A8277', tealBg: '#F0FDFA',
  success: '#16A34A', successText: '#11853D', successBg: '#F0FDF4',
  warning: '#D97706', warningText: '#AF6003', warningBg: '#FFFBEB',
  danger: '#DC2626', dangerText: '#D92525', dangerBg: '#FEF2F2',
};

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  'In Progress':           { dot: T.teal, text: T.tealText, bg: T.tealBg },
  'In Development':        { dot: T.teal, text: T.tealText, bg: T.tealBg },
  'Ready for Development': { dot: T.teal, text: T.tealText, bg: T.tealBg },
  'Ready for Dev':         { dot: T.teal, text: T.tealText, bg: T.tealBg },
  'In Dev':                { dot: T.teal, text: T.tealText, bg: T.tealBg },
  'To Do':     { dot: T.primary, text: T.primary, bg: T.primaryBg },
  'ToDo':      { dot: T.primary, text: T.primary, bg: T.primaryBg },
  'Planned':   { dot: T.primary, text: T.primary, bg: T.primaryBg },
  'Backlog':   { dot: T.inkMutedStrong, text: T.inkMutedStrong, bg: T.surfaceTertiary },
  'Done':          { dot: T.success, text: T.successText, bg: T.successBg },
  'In Production': { dot: T.success, text: T.successText, bg: T.successBg },
  'In Prod':       { dot: T.success, text: T.successText, bg: T.successBg },
  'In Review':          { dot: T.warning, text: T.warningText, bg: T.warningBg },
  'End to End Testing': { dot: T.warning, text: T.warningText, bg: T.warningBg },
  'E2E Testing':        { dot: T.warning, text: T.warningText, bg: T.warningBg },
  'Ready for Review':   { dot: T.warning, text: T.warningText, bg: T.warningBg },
  'Blocked': { dot: T.danger, text: T.dangerText, bg: T.dangerBg },
};

const HUB_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Project:  { bg: T.primaryBg, color: T.primary, border: T.primary },
  Product:  { bg: T.surfaceTertiary, color: T.inkTertiary, border: T.inkTertiary },
  Task:     { bg: T.surfaceTertiary, color: T.inkMutedStrong, border: T.borderStrong },
  Incident: { bg: T.dangerBg, color: T.dangerText, border: T.danger },
  Release:  { bg: T.successBg, color: T.successText, border: T.success },
  Test:     { bg: T.surfaceTertiary, color: T.inkTertiary, border: T.inkTertiary },
};

const PRI: Record<number, { label: string; color: string }> = {
  1: { label: 'Lowest', color: T.inkMuted },
  2: { label: 'Low', color: T.inkMuted },
  3: { label: 'Medium', color: T.warning },
  4: { label: 'High', color: T.danger },
  5: { label: 'Highest', color: T.danger },
};

// --- Linkify utility: detect URLs, special-case Figma ---
function Linkify({ text }: { text: string }) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          const isFigma = part.includes('figma.com');
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: T.primary, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                wordBreak: 'break-all',
              }}
            >
              {isFigma && (
                <svg width="14" height="14" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                  <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                  <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                  <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                  <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
                </svg>
              )}
              {isFigma ? 'Open Figma Design' : (part.length > 60 ? part.slice(0, 60) + '…' : part)}
              <ExternalLink size={11} style={{ flexShrink: 0 }} />
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['In Progress'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 10px', borderRadius: 9999, background: s.bg, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      <span style={{ color: s.text }}>{status}</span>
    </span>
  );
}

function HubBadge({ hub }: { hub: string }) {
  const h = HUB_CFG[hub] || HUB_CFG.Task;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', background: h.bg, color: h.color, borderLeft: `3px solid ${h.border}` }}>
      {hub}
    </span>
  );
}

function PriorityBars({ level = 3, showLabel = false }: { level?: number; showLabel?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: showLabel ? 8 : 2 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ width: showLabel ? 5 : 4, height: showLabel ? 16 : 14, borderRadius: 1, background: i <= level ? (showLabel ? (PRI[level]?.color || T.inkMuted) : T.inkMuted) : T.border }} />
        ))}
      </div>
      {showLabel && <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{PRI[level]?.label || 'Medium'}</span>}
    </div>
  );
}

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const nameAvatarMap = useProfileAvatarsByName();
  const avatarUrl = nameAvatarMap.get(name.toLowerCase());
  const ini = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const clr = [T.primary, T.teal, T.warning, T.danger, '#7C3AED'][ini.charCodeAt(0) % 5];

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${T.border}` }} />;
  }
  return <div style={{ width: size, height: size, borderRadius: '50%', background: clr, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>{ini}</div>;
}

function FieldRow({ icon, label, children, last }: { icon: React.ReactNode; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '152px 1fr', borderBottom: last ? 'none' : `1px solid ${T.border}`, minHeight: 38 }}>
      <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.06em', background: T.surfaceSecondary, borderRight: `1px solid ${T.border}` }}>
        <span style={{ display: 'flex', color: T.inkMuted }}>{icon}</span>{label}
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: T.ink }}>{children}</div>
    </div>
  );
}

// --- DB data types ---
interface JiraComment {
  id: string;
  author_display_name: string;
  body: string;
  jira_created_at: string;
}

interface JiraChangelogEntry {
  id: string;
  author_display_name: string;
  field_name: string;
  from_string: string | null;
  to_string: string | null;
  jira_created_at: string;
}

interface JiraIssueLink {
  id: string;
  link_type: string;
  direction: string;
  source_key: string;
  target_key: string;
  target_summary: string | null;
  target_type: string | null;
  target_status: string | null;
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

interface ForYouDetailPanelProps {
  item: WorkItem;
  onClose: () => void;
}

export function ForYouDetailPanel({ item, onClose }: ForYouDetailPanelProps) {
  const [tab, setTab] = useState('details');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [comments, setComments] = useState<JiraComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [changelog, setChangelog] = useState<JiraChangelogEntry[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [issueLinks, setIssueLinks] = useState<JiraIssueLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);

  // Fetch attachments
  useEffect(() => {
    async function fetchAttachments() {
      if (!item.key) return;
      setAttachmentsLoading(true);
      try {
        const { data } = await supabase.from('ph_issue_attachments').select('*').eq('issue_key', item.key).order('jira_created_at', { ascending: false });
        if (data) setAttachments(data);
      } catch (e) { console.error('Error fetching attachments:', e); }
      finally { setAttachmentsLoading(false); }
    }
    fetchAttachments();
  }, [item.key]);

  // Fetch comments from DB
  useEffect(() => {
    async function fetchComments() {
      if (!item.key) return;
      setCommentsLoading(true);
      try {
        const { data } = await supabase.from('jira_sync_comments').select('id, author_display_name, body, jira_created_at').eq('issue_key', item.key).order('jira_created_at', { ascending: false });
        if (data) setComments(data);
      } catch (e) { console.error('Error fetching comments:', e); }
      finally { setCommentsLoading(false); }
    }
    fetchComments();
  }, [item.key]);

  // Fetch changelog from DB
  useEffect(() => {
    async function fetchChangelog() {
      if (!item.key) return;
      setChangelogLoading(true);
      try {
        const { data } = await supabase.from('jira_sync_changelog').select('id, author_display_name, field_name, from_string, to_string, jira_created_at').eq('issue_key', item.key).order('jira_created_at', { ascending: false });
        if (data) setChangelog(data);
      } catch (e) { console.error('Error fetching changelog:', e); }
      finally { setChangelogLoading(false); }
    }
    fetchChangelog();
  }, [item.key]);

  // Fetch issue links from DB
  useEffect(() => {
    async function fetchLinks() {
      if (!item.key) return;
      setLinksLoading(true);
      try {
        const { data } = await supabase.from('jira_sync_issue_links').select('id, link_type, direction, source_key, target_key, target_summary, target_type, target_status').or(`source_key.eq.${item.key},target_key.eq.${item.key}`);
        if (data) setIssueLinks(data);
      } catch (e) { console.error('Error fetching links:', e); }
      finally { setLinksLoading(false); }
    }
    fetchLinks();
  }, [item.key]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Combine parent link with DB links for count
  const parentLinkCount = item.parentKey ? 1 : 0;
  const totalLinksCount = issueLinks.length + parentLinkCount;

  const tabs = [
    { id: 'details', label: 'Details', icon: <Layers size={13} /> },
    { id: 'attachments', label: 'Attachments', icon: <Paperclip size={13} />, count: attachments.length },
    { id: 'comments', label: 'Comments', icon: <MessageSquare size={13} />, count: comments.length },
    { id: 'history', label: 'History', icon: <Clock size={13} />, count: changelog.length },
    { id: 'links', label: 'Links', icon: <Link2 size={13} />, count: totalLinksCount },
  ];

  const openInJira = () => {
    if (item.jiraUrl) window.open(item.jiraUrl, '_blank', 'noopener');
  };

  // Build activity entries from changelog for the "Recent Activity" section in Details tab
  const recentActivity = changelog.length > 0
    ? changelog.slice(0, 3).map(c => ({
        user: c.author_display_name || 'Unknown',
        action: c.field_name === 'status' ? 'changed status to' : `updated ${c.field_name}`,
        value: c.to_string || '',
        isStatus: c.field_name === 'status',
        from: c.from_string,
        time: formatTimeAgo(c.jira_created_at),
      }))
    : [
        { user: item.assignee.name, action: 'changed status to', value: item.status, isStatus: true, from: null, time: item.updatedAt },
        { user: item.reporter || item.assignee.name, action: 'created this issue', value: '', isStatus: false, from: null, time: item.createdAt },
      ];

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} className="fy-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,11,0.4)', zIndex: 200, animation: 'fy-fadeIn .15s ease' }} />

      {/* Panel */}
      <div className="fy-detail-panel" style={{ position: 'fixed', top: 0, right: 0, width: 'min(58%, 880px)', minWidth: 520, height: '100vh', background: T.surface, borderLeft: `1px solid ${T.border}`, boxShadow: '-12px 0 48px rgba(0,0,0,0.12)', zIndex: 201, display: 'flex', flexDirection: 'column', animation: 'fy-slideIn .2s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${T.border}`, background: T.surfaceSecondary, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkTertiary, display: 'flex', padding: 4, borderRadius: 4 }}><ArrowLeft size={18} /></button>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: T.primary, background: T.primaryBg, padding: '4px 12px', borderRadius: 4 }}>{item.key}</span>
            <button onClick={openInJira} style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}><ExternalLink size={13} /> Open in Jira</button>
            <button onClick={() => navigator.clipboard?.writeText(item.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, display: 'flex', padding: 2 }}><Copy size={13} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.primary, background: T.primaryBg, padding: '3px 8px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>JIRA SYNC</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, display: 'flex', padding: 4 }}><X size={18} /></button>
          </div>
        </div>

        {/* Title Section */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 3 }}><JiraIssueTypeIcon issueType={item.issueType} size={22} /></div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: "'Sora', system-ui", fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: '-0.025em', lineHeight: 1.35 }}>{item.summary}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <StatusPill status={item.status} />
                <span style={{ fontSize: 12, fontWeight: 500, color: T.inkTertiary }}>{item.project}</span>
                <span style={{ color: T.borderStrong }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: T.inkTertiary }}>Updated {item.updatedAt}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: `1px solid ${T.border}`, marginTop: 16, flexShrink: 0 }}>
          {tabs.map(t => {
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '10px 14px', fontSize: 13, fontWeight: isActive ? 600 : 500,
                color: isActive ? T.primary : T.inkTertiary, background: 'none', border: 'none',
                borderBottom: isActive ? `2px solid ${T.primary}` : '2px solid transparent',
                cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {t.icon}{t.label}
                {t.count != null && t.count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? T.primary : T.inkMuted, background: isActive ? T.primaryBg : T.surfaceTertiary, padding: '1px 6px', borderRadius: 9999, minWidth: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {/* ═══ DETAILS TAB ═══ */}
          {tab === 'details' && (
            <>
              {/* Parent Info Banner */}
              {item.parentKey && (
                <div className="fy-parent-banner" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16, background: T.surfaceTertiary, borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <CornerDownLeft size={14} style={{ color: T.inkMuted, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PARENT</span>
                  <JiraIssueTypeIcon issueType="epic" size={14} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: T.primary }}>{item.parentKey}</span>
                  {item.parentSummary && <span style={{ fontSize: 13, fontWeight: 500, color: T.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.parentSummary}</span>}
                </div>
              )}

              {/* Field Grid — NO Sprint, NO Story Points */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <FieldRow icon={<Zap size={13} />} label="Status"><StatusPill status={item.status} /></FieldRow>
                <FieldRow icon={<Target size={13} />} label="Priority"><PriorityBars level={item.priorityLevel} showLabel /></FieldRow>
                <FieldRow icon={<Layers size={13} />} label="Project"><span style={{ fontWeight: 600 }}>{item.project}</span></FieldRow>
                <FieldRow icon={<Tag size={13} />} label="Hub"><HubBadge hub={item.hubLabel} /></FieldRow>
                <FieldRow icon={<Tag size={13} />} label="Labels">
                  {item.labels && item.labels.length > 0 ? (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {item.labels.map(l => <span key={l} style={{ fontSize: 11, fontWeight: 600, color: T.inkSecondary, background: T.surfaceTertiary, padding: '2px 8px', borderRadius: 4 }}>{l}</span>)}
                    </div>
                  ) : <span style={{ color: T.inkMuted }}>—</span>}
                </FieldRow>
                <FieldRow icon={<GitBranch size={13} />} label="Fix Version"><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{item.fixVersion || '—'}</span></FieldRow>
                <FieldRow icon={<Layers size={13} />} label="Component"><span>{item.component || '—'}</span></FieldRow>
                <div style={{ height: 2, background: T.surfaceTertiary }} />
                <FieldRow icon={<User size={13} />} label="Reporter">
                  {item.reporter ? (<><Avatar name={item.reporter} size={22} /><span style={{ fontWeight: 500 }}>{item.reporter}</span></>) : <span style={{ color: T.inkMuted }}>—</span>}
                </FieldRow>
                <FieldRow icon={<User size={13} />} label="Assignee"><Avatar name={item.assignee.name} size={22} /><span style={{ fontWeight: 500 }}>{item.assignee.name}</span></FieldRow>
                <div style={{ height: 2, background: T.surfaceTertiary }} />
                <FieldRow icon={<Calendar size={13} />} label="Created"><span style={{ fontWeight: 500 }}>{item.createdAt}</span></FieldRow>
                <FieldRow icon={<Clock size={13} />} label="Updated" last><span style={{ fontWeight: 500 }}>{item.updatedAt}</span></FieldRow>
              </div>

              {/* Jira Sync bar */}
              <div className="fy-jira-sync" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '10px 14px', background: T.primaryBg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                <ExternalLink size={13} style={{ color: T.primary }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.primary, fontFamily: "'JetBrains Mono', monospace" }}>JIRA SYNC</span>
                <span style={{ fontSize: 12, color: T.inkTertiary }}>· Last synced {item.lastSyncedAt ? new Date(item.lastSyncedAt).toLocaleDateString() : item.updatedAt} · Source of truth: Jira</span>
              </div>

              {/* Description — with Linkify */}
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontFamily: "'Sora', system-ui", fontSize: 14, fontWeight: 600, color: T.ink, paddingBottom: 8, borderBottom: `1px solid ${T.border}`, marginBottom: 12 }}>Description</h3>
                <div style={{ fontSize: 13, color: T.inkSecondary, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  <Linkify text={item.description || (item.issueType?.toLowerCase().includes('bug')
                    ? `Steps to reproduce: Navigate to the relevant screen → perform the action described → observe the inconsistency. Expected: Match the approved Figma design specifications.`
                    : `Implement the feature as described. Ensure alignment with approved Figma designs and UX specifications. All acceptance criteria must be verified before moving to Done.`)} />
                </div>
              </div>

              {/* Recent Activity */}
              <div className="fy-activity" style={{ marginTop: 24 }}>
                <h3 style={{ fontFamily: "'Sora', system-ui", fontSize: 14, fontWeight: 600, color: T.ink, paddingBottom: 8, borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>Recent Activity</h3>
                {recentActivity.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < recentActivity.length - 1 ? `1px solid ${T.surfaceTertiary}` : 'none' }}>
                    <Avatar name={a.user} size={28} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 600, color: T.ink }}>{a.user}</span>
                        <span style={{ color: T.inkTertiary }}> {a.action} </span>
                        {a.isStatus && a.value && <><StatusPill status={a.value} />{a.from && <span style={{ fontSize: 12, color: T.inkMuted, marginLeft: 4 }}>(was: {a.from})</span>}</>}
                        {!a.isStatus && a.value && <span style={{ fontWeight: 600, color: T.ink }}>{a.value}</span>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: T.inkMuted, marginTop: 2, display: 'block' }}>{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══ ATTACHMENTS TAB ═══ */}
          {tab === 'attachments' && (
            <div style={{ padding: '16px 0' }}>
              {attachmentsLoading ? (
                <div style={{ textAlign: 'center', padding: 24, color: T.inkMuted, fontSize: 13 }}>Loading attachments…</div>
              ) : attachments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: T.inkMuted, fontSize: 13 }}>
                  <Paperclip size={24} style={{ margin: '0 auto 8px', display: 'block', color: T.border }} />
                  No attachments found for this issue.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {attachments.map((att: any) => {
                    const isImage = att.mime_type?.startsWith('image/');
                    const isPdf = att.mime_type === 'application/pdf';
                    const fileIcon = isImage ? <Image size={16} style={{ color: T.teal }} /> : isPdf ? <FileText size={16} style={{ color: T.danger }} /> : <File size={16} style={{ color: T.inkMuted }} />;
                    const sizeStr = att.file_size ? (att.file_size > 1048576 ? `${(att.file_size / 1048576).toFixed(1)} MB` : `${Math.round(att.file_size / 1024)} KB`) : '';
                    const createdStr = att.jira_created_at ? new Date(att.jira_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                    return (
                      <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.surface, transition: 'background .15s', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.surfaceSecondary)}
                        onMouseLeave={e => (e.currentTarget.style.background = T.surface)}
                      >
                        {isImage && att.thumbnail_url ? (
                          <img src={att.thumbnail_url} alt={att.filename} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', border: `1px solid ${T.border}` }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 4, background: T.surfaceTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.border}`, flexShrink: 0 }}>{fileIcon}</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            {sizeStr && <span style={{ fontSize: 11, color: T.inkMuted }}>{sizeStr}</span>}
                            {createdStr && <span style={{ fontSize: 11, color: T.inkMuted }}>· {createdStr}</span>}
                            {att.author_display_name && <span style={{ fontSize: 11, color: T.inkMuted }}>· {att.author_display_name}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <a href={att.content_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Open in Jira" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 4, border: `1px solid ${T.border}`, background: T.surface, color: T.primary, cursor: 'pointer', textDecoration: 'none' }}><ExternalLink size={13} /></a>
                          <a href={att.content_url} download={att.filename} onClick={e => e.stopPropagation()} title="Download" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 4, border: `1px solid ${T.border}`, background: T.surface, color: T.inkTertiary, cursor: 'pointer', textDecoration: 'none' }}><Download size={13} /></a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ COMMENTS TAB ═══ */}
          {tab === 'comments' && (
            <div style={{ padding: '16px 0' }}>
              {commentsLoading ? (
                <div style={{ textAlign: 'center', padding: 24, color: T.inkMuted, fontSize: 13 }}>Loading comments…</div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: T.inkMuted, fontSize: 13 }}>No comments synced from Jira yet.</div>
              ) : (
                comments.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <Avatar name={c.author_display_name || 'Unknown'} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{c.author_display_name || 'Unknown'}</span>
                        <span style={{ fontSize: 11, color: T.inkMuted }}>{formatTimeAgo(c.jira_created_at)}</span>
                      </div>
                      <div style={{ marginTop: 6, padding: '10px 14px', background: T.surfaceTertiary, borderRadius: 8, fontSize: 13, color: T.inkSecondary, lineHeight: 1.7, borderLeft: `3px solid ${T.borderStrong}`, whiteSpace: 'pre-wrap' }}>
                        <Linkify text={c.body || ''} />
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div style={{ marginTop: 8, padding: 12, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.inkMuted, cursor: 'text' }}>Add a comment…</div>
            </div>
          )}

          {/* ═══ HISTORY TAB ═══ */}
          {tab === 'history' && (
            <div style={{ padding: '16px 0' }}>
              {changelogLoading ? (
                <div style={{ textAlign: 'center', padding: 24, color: T.inkMuted, fontSize: 13 }}>Loading history…</div>
              ) : changelog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: T.inkMuted, fontSize: 13 }}>No changelog entries synced from Jira yet.</div>
              ) : (
                changelog.map((c, i) => {
                  const isStatusChange = c.field_name === 'status';
                  const isAssignment = c.field_name === 'assignee';
                  const isPriority = c.field_name === 'priority';
                  let actionText = `updated ${c.field_name}`;
                  if (isStatusChange) actionText = 'changed status';
                  else if (isAssignment) actionText = 'assigned to';
                  else if (isPriority) actionText = 'set priority to';

                  return (
                    <div key={c.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < changelog.length - 1 ? `1px solid ${T.surfaceTertiary}` : 'none' }}>
                      <Avatar name={c.author_display_name || 'Unknown'} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 600, color: T.ink }}>{c.author_display_name || 'Unknown'}</span>
                          <span style={{ color: T.inkTertiary }}> {actionText} </span>
                          {isStatusChange && c.to_string && (
                            <>
                              <StatusPill status={c.to_string} />
                              {c.from_string && <span style={{ fontSize: 12, color: T.inkMuted, marginLeft: 4 }}>(was: {c.from_string})</span>}
                            </>
                          )}
                          {isAssignment && c.to_string && <span style={{ fontWeight: 600, color: T.ink }}>{c.to_string}</span>}
                          {isPriority && c.to_string && <span style={{ fontWeight: 600, color: T.ink }}>{c.to_string}</span>}
                          {!isStatusChange && !isAssignment && !isPriority && c.to_string && (
                            <span style={{ color: T.inkSecondary }}>{c.from_string && <><s style={{ color: T.inkMuted }}>{c.from_string}</s> → </>}{c.to_string}</span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 500, color: T.inkMuted, marginTop: 2, display: 'block' }}>{formatTimeAgo(c.jira_created_at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ═══ LINKS TAB ═══ */}
          {tab === 'links' && (
            <div style={{ padding: '16px 0' }}>
              {linksLoading ? (
                <div style={{ textAlign: 'center', padding: 24, color: T.inkMuted, fontSize: 13 }}>Loading links…</div>
              ) : (
                <>
                  {/* Parent link (always from item data) */}
                  {item.parentKey && (
                    <div className="fy-link-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 8 }}>
                      <Link2 size={13} style={{ color: T.inkMuted, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>IS CHILD OF</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <JiraIssueTypeIcon issueType="epic" size={14} />
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: T.primary }}>{item.parentKey}</span>
                          <span style={{ fontSize: 13, color: T.inkSecondary }}>{item.parentSummary || ''}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DB issue links */}
                  {issueLinks.map(link => {
                    const isSource = link.source_key === item.key;
                    const linkedKey = isSource ? link.target_key : link.source_key;
                    const relLabel = isSource ? link.link_type.toUpperCase() : `${link.link_type} (inward)`.toUpperCase();

                    return (
                      <div key={link.id} className="fy-link-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 8 }}>
                        <Link2 size={13} style={{ color: T.inkMuted, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{relLabel}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                            <JiraIssueTypeIcon issueType={link.target_type || 'story'} size={14} />
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: T.primary }}>{linkedKey}</span>
                            {link.target_summary && <span style={{ fontSize: 13, color: T.inkSecondary }}>{link.target_summary}</span>}
                            {link.target_status && <StatusPill status={link.target_status} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!item.parentKey && issueLinks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 24, color: T.inkMuted, fontSize: 13 }}>No linked items.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fy-slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fy-fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
