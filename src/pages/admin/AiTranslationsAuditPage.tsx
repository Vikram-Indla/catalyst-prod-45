/**
 * AiTranslationsAuditPage — admin view of cached CATY translations.
 *
 * Data source: ph_issue_translations
 *   Columns: id, issue_key, field, source_lang, target_lang,
 *            source_hash, translated_text, created_at, updated_at
 *
 * Jira admin tokens (probed live 2026-05-19):
 *   H1:          24px / 653 / var(--ds-text, #292A2E)
 *   Subtitle:    14px / 400 / var(--ds-text-subtle, #44546F)
 *   Table header:12px / 653 / var(--ds-text-subtlest, #626F86) sentence-case
 *                borderBottom 1.67px solid rgba(11,18,14,0.14)
 *   Table cell:  14px / 400 / var(--ds-text, #292A2E)
 *   Primary btn: 14px / 500 / white on var(--ds-link, #0C66E4)
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdsButton, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import AdsSelect from '@atlaskit/select';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import SearchIcon from '@atlaskit/icon/core/search';
import CrossIcon from '@atlaskit/icon/core/close';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';

/* ── Constants ───────────────────────────────────────────── */
const PAGE_SIZE = 25;

const LANG_DIRECTION_OPTIONS = [
  { label: 'All directions', value: 'all' },
  { label: 'English → Arabic', value: 'en-ar' },
  { label: 'Arabic → English', value: 'ar-en' },
];

const FIELD_TYPE_OPTIONS = [
  { label: 'All fields', value: 'all' },
  { label: 'Summary', value: 'summary' },
  { label: 'Description', value: 'description' },
  { label: 'Comment', value: 'comment' },
];

/* ── Tokens (ADS only) ──────────────────────────────────── */
const T = {
  h1: { fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #292A2E)', margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 14, fontWeight: 400, color: 'var(--ds-text-subtle, #44546F)', marginTop: 4 } as React.CSSProperties,
  th: {
    fontSize: 12, fontWeight: 653, color: 'var(--ds-text-subtlest, #626F86)',
    padding: '8px 12px', textAlign: 'left' as const,
    borderBottom: '1.67px solid var(--ds-border, rgba(11,18,14,0.14))',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  td: {
    fontSize: 14, fontWeight: 400, color: 'var(--ds-text, #292A2E)',
    padding: '8px 12px', borderBottom: '1px solid var(--ds-border-subtle, rgba(11,18,14,0.09))',
    verticalAlign: 'top' as const,
  } as React.CSSProperties,
  tagBase: {
    display: 'inline-block', padding: '4px 8px', borderRadius: 3,
    fontSize: 11, fontWeight: 600, lineHeight: '16px',
  } as React.CSSProperties,
};

/* ── Language direction badge ────────────────────────────── */
function LangBadge({ source, target }: { source: string; target: string }) {
  const isEnToAr = source === 'en' && target === 'ar';
  return (
    <span
      style={{
        ...T.tagBase,
        background: isEnToAr
          ? 'var(--ds-background-information, #E9F2FF)'
          : 'var(--ds-background-success, #DFFCF0)',
        color: isEnToAr
          ? 'var(--ds-link, #0C66E4)'
          : 'var(--ds-text-success, #216E4E)',
      }}
    >
      {source.toUpperCase()} → {target.toUpperCase()}
    </span>
  );
}

/* ── Field type badge ────────────────────────────────────── */
function FieldBadge({ field }: { field: string }) {
  const isComment = field.startsWith('comment:');
  const label = isComment ? 'comment' : field;
  return (
    <span
      style={{
        ...T.tagBase,
        background: 'var(--ds-background-neutral, #F1F2F4)',
        color: 'var(--ds-text-subtle, #44546F)',
      }}
    >
      {label}
    </span>
  );
}

/* ── Truncated text cell with expand ─────────────────────── */
function TruncatedCell({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = text.length > 120 ? text.slice(0, 120) + '…' : text;
  return (
    <div dir="auto">
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {expanded ? text : preview}
      </span>
      {text.length > 120 && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          style={{
            marginLeft: 4, background: 'none', border: 'none', padding: 0,
            fontSize: 12, color: 'var(--ds-link, #0C66E4)', cursor: 'pointer',
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

/* ── Pagination bar ───────────────────────────���──────────── */
function PaginationBar({ page, setPage, count }: { page: number; setPage: (p: number) => void; count: number }) {
  const start = page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, count);
  const hasNext = end < count;
  const hasPrev = page > 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, #626F86)' }}>
        {count === 0 ? 'No entries' : `${start}–${end} of ${count}`}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <AdsButton
          appearance="subtle"
          isDisabled={!hasPrev}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </AdsButton>
        <AdsButton
          appearance="subtle"
          isDisabled={!hasNext}
          onClick={() => setPage(page + 1)}
        >
          Next
        </AdsButton>
      </div>
    </div>
  );
}

/* ── Skeleton rows ───────────────────────────────────────── */
function SkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          {[100, 80, 72, 72, 200, 110].map((w, j) => (
            <td key={j} style={T.td}>
              <div style={{ height: 14, width: w, background: 'var(--ds-background-neutral, #F1F2F4)', borderRadius: 3 }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function AiTranslationsAuditPage() {
  const [page, setPage] = useState(0);
  const [issueSearch, setIssueSearch] = useState('');
  const [langDirection, setLangDirection] = useState<string>('all');
  const [fieldType, setFieldType] = useState<string>('all');

  // Reset to page 0 when filters change
  const resetPage = (fn: () => void) => { fn(); setPage(0); };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-ai-translations', page, issueSearch, langDirection, fieldType],
    queryFn: async () => {
      let q = supabase
        .from('ph_issue_translations')
        .select('id, issue_key, field, source_lang, target_lang, translated_text, created_at, updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (issueSearch.trim()) {
        q = q.ilike('issue_key', `%${issueSearch.trim()}%`);
      }
      if (langDirection !== 'all') {
        const [src, tgt] = langDirection.split('-');
        q = q.eq('source_lang', src).eq('target_lang', tgt);
      }
      if (fieldType !== 'all') {
        if (fieldType === 'comment') {
          q = q.like('field', 'comment:%');
        } else {
          q = q.eq('field', fieldType);
        }
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
    staleTime: 30_000,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  return (
    <AdminGuard>
      <div style={{ padding: '32px 40px', maxWidth: 1200 }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #292A2E)', margin: 0 }}>Translation logs</h1>
          <p style={T.subtitle}>
            All CATY translations cached from issue summaries, descriptions, and comments.
          </p>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          {/* Issue key search */}
          <div style={{ width: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #626F86)', marginBottom: 4 }}>
              Issue key
            </label>
            <Textfield
              placeholder="BAU-1234"
              value={issueSearch}
              onChange={e => resetPage(() => setIssueSearch((e.target as HTMLInputElement).value))}
              elemBeforeInput={<SearchIcon label="" size="small" />}
              elemAfterInput={
                issueSearch ? (
                  <IconButton
                    icon={CrossIcon}
                    label="Clear"
                    appearance="subtle"
                    spacing="compact"
                    onClick={() => resetPage(() => setIssueSearch(''))}
                  />
                ) : undefined
              }
            />
          </div>

          {/* Language direction */}
          <div style={{ width: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #626F86)', marginBottom: 4 }}>
              Direction
            </label>
            <AdsSelect
              options={LANG_DIRECTION_OPTIONS}
              value={LANG_DIRECTION_OPTIONS.find(o => o.value === langDirection)}
              onChange={opt => resetPage(() => setLangDirection(opt?.value ?? 'all'))}
              menuPosition="fixed"
            />
          </div>

          {/* Field type */}
          <div style={{ width: 180 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #626F86)', marginBottom: 4 }}>
              Field
            </label>
            <AdsSelect
              options={FIELD_TYPE_OPTIONS}
              value={FIELD_TYPE_OPTIONS.find(o => o.value === fieldType)}
              onChange={opt => resetPage(() => setFieldType(opt?.value ?? 'all'))}
              menuPosition="fixed"
            />
          </div>

          {/* Refresh */}
          <div style={{ marginLeft: 'auto' }}>
            <IconButton
              icon={RefreshIcon}
              label="Refresh"
              appearance="subtle"
              isLoading={isRefetching}
              onClick={() => refetch()}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{
          border: '1px solid var(--ds-border, #DCDFE4)',
          borderRadius: 4,
          overflow: 'hidden',
          background: 'var(--ds-surface, #FFFFFF)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '42%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
                <th style={T.th}>Issue key</th>
                <th style={T.th}>Field</th>
                <th style={T.th}>Direction</th>
                <th style={T.th}>Cached at</th>
                <th style={T.th}>Translated text</th>
                <th style={T.th}>Last updated</th>
              </tr>
            </thead>

            {isLoading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={6} style={{ ...T.td, textAlign: 'center', padding: '40px 12px', color: 'var(--ds-text-subtlest, #626F86)' }}>
                    No translation entries found
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {rows.map((row: any) => (
                  <tr
                    key={row.id}
                    style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle, #F7F8F9)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...T.td, fontWeight: 500 }}>
                      <a
                        href={`/browse/${row.issue_key}`}
                        style={{ color: 'var(--ds-link, #0C66E4)', textDecoration: 'none', fontSize: 13 }}
                        onMouseEnter={e => ((e.target as HTMLElement).style.textDecoration = 'underline')}
                        onMouseLeave={e => ((e.target as HTMLElement).style.textDecoration = 'none')}
                      >
                        {row.issue_key}
                      </a>
                    </td>
                    <td style={T.td}>
                      <FieldBadge field={row.field} />
                    </td>
                    <td style={T.td}>
                      <LangBadge source={row.source_lang} target={row.target_lang} />
                    </td>
                    <td style={{ ...T.td, fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>
                      {new Date(row.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td style={T.td}>
                      <TruncatedCell text={row.translated_text} />
                    </td>
                    <td style={{ ...T.td, fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>
                      {row.updated_at !== row.created_at
                        ? new Date(row.updated_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        <PaginationBar page={page} setPage={setPage} count={total} />
      </div>
    </AdminGuard>
  );
}
