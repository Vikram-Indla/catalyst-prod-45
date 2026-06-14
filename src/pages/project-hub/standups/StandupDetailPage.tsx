/**
 * StandupDetailPage — /project-hub/:key/standups/:standupId
 *
 * Three sections:
 *   1. Summary — markdown rendered from standups.summary_md
 *   2. Status changes — list of standup_status_changes rows
 *   3. Transcript — collapsible, interleaved with speaker turn labels
 *
 * The transcript binning groups each transcript chunk under the
 * standup_events turn whose [started_at, ended_at] window contains
 * the chunk's `ts`. That gives an honest "Vikram was the active
 * speaker when these chunks were emitted" attribution without
 * pretending we know who actually spoke (browser speech recognition
 * has no diarization).
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import AkAvatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/new';
import ReactMarkdown from 'react-markdown';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { AtlaskitPageShell } from '@/components/ads';
import { useStandupDetail, type StandupDetail, type StandupStatusChange, type StandupTranscriptChunk } from '@/hooks/useStandupDetail';
import { supabase } from '@/integrations/supabase/client';
import type { StandupSummaryStatus } from '@/hooks/useStandupHistory';

function formatStandupDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return 'In progress';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function summaryLozenge(status: StandupSummaryStatus) {
  const map: Record<StandupSummaryStatus, { label: string; appearance: 'default' | 'inprogress' | 'success' | 'removed' }> = {
    pending:    { label: 'Pending',     appearance: 'default' },
    generating: { label: 'Generating',  appearance: 'inprogress' },
    ready:      { label: 'Ready',       appearance: 'success' },
    failed:     { label: 'Failed',      appearance: 'removed' },
  };
  const entry = map[status];
  return <Lozenge appearance={entry.appearance}>{entry.label}</Lozenge>;
}

/** Group transcript chunks under each speaker turn whose
 *  [started_at, ended_at] window contains the chunk timestamp.
 *  Chunks that don't fall within any turn (rare — e.g. chunks emitted
 *  after End standup before close persisted) land in an "Unattributed"
 *  bucket at the end. */
interface BinnedTurn {
  speaker_name: string;
  started_at: string;
  ended_at: string | null;
  timer_seconds: number | null;
  chunks: StandupTranscriptChunk[];
}

function binChunksByTurn(detail: StandupDetail): { turns: BinnedTurn[]; orphans: StandupTranscriptChunk[] } {
  const turns: BinnedTurn[] = detail.turns.map(t => ({
    speaker_name: t.speaker_name,
    started_at: t.started_at,
    ended_at: t.ended_at,
    timer_seconds: t.timer_seconds,
    chunks: [],
  }));
  const orphans: StandupTranscriptChunk[] = [];
  for (const chunk of detail.transcript_chunks) {
    const ts = new Date(chunk.ts).getTime();
    const turn = turns.find(t => {
      const start = new Date(t.started_at).getTime();
      const end = t.ended_at ? new Date(t.ended_at).getTime() : Number.POSITIVE_INFINITY;
      return ts >= start && ts <= end;
    });
    if (turn) turn.chunks.push(chunk);
    else orphans.push(chunk);
  }
  return { turns, orphans };
}

function StatusChangeRow({ change, projectKey }: { change: StandupStatusChange; projectKey: string | undefined }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: `1px solid ${token('color.border')}`,
        fontSize: 14,
      }}
    >
      <Link
        to={projectKey ? `/project-hub/${projectKey}/backlog/${change.issue_key}` : '#'}
        style={{ color: token('color.link'), fontWeight: 500, textDecoration: 'none' }}
        onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
        onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
      >
        {change.issue_key}
      </Link>
      <span style={{ color: token('color.text.subtle') }}>moved from</span>
      <Lozenge>{change.from_status ?? 'Unset'}</Lozenge>
      <span style={{ color: token('color.text.subtle') }}>to</span>
      <Lozenge appearance="inprogress">{change.to_status}</Lozenge>
      <span style={{ flex: 1 }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: token('color.text.subtle'), fontSize: 13 }}>
        by
        {change.changed_by_name ? (
          <>
            <AkAvatar size="xsmall" src={change.changed_by_avatar ?? undefined} name={change.changed_by_name} />
            {change.changed_by_name}
          </>
        ) : (
          <span>Unknown</span>
        )}
        · {formatTime(change.changed_at)}
      </span>
    </div>
  );
}

export default function StandupDetailPage() {
  const { key: projectKey, standupId } = useParams<{ key: string; standupId: string }>();
  const navigate = useNavigate();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const { data: detail, isLoading, isError, refetch } = useStandupDetail(standupId);

  const { turns: binnedTurns, orphans } = useMemo(
    () => detail ? binChunksByTurn(detail) : { turns: [], orphans: [] },
    [detail],
  );

  async function handleRegenerate() {
    if (!standupId) return;
    setRegenerating(true);
    try {
      await supabase.functions.invoke('standup-summarize', { body: { standup_id: standupId } });
      await refetch();
    } catch (err) {
      console.error('[standup-detail] regenerate failed', err);
    } finally {
      setRegenerating(false);
    }
  }

  if (isLoading) {
    return (
      <AtlaskitPageShell chromeBand={projectKey ? <ProjectHeaderChip projectKey={projectKey} /> : null}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
          <Spinner size="medium" />
        </div>
      </AtlaskitPageShell>
    );
  }

  if (isError || !detail) {
    return (
      <AtlaskitPageShell chromeBand={projectKey ? <ProjectHeaderChip projectKey={projectKey} /> : null}>
        <div style={{ padding: 48, textAlign: 'center', color: token('color.text.danger') }}>
          Couldn't load this standup. <Link to={`/project-hub/${projectKey}/standups`}>Back to standups</Link>
        </div>
      </AtlaskitPageShell>
    );
  }

  return (
    <AtlaskitPageShell chromeBand={projectKey ? <ProjectHeaderChip projectKey={projectKey} /> : null}>
      <div style={{ padding: '16px 24px', maxWidth: 920, margin: '0 auto', color: token('color.text') }}>
        {/* Back nav */}
        <button
          onClick={() => navigate(`/project-hub/${projectKey}/standups`)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: token('color.link'), fontSize: 13, marginBottom: 12,
          }}
          onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
        >
          Back to standups
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: token('color.text'), margin: 0 }}>
            Standup · {formatStandupDate(detail.started_at)}
          </h1>
          {summaryLozenge(detail.summary_status)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: token('color.text.subtle'), marginBottom: 24 }}>
          {detail.triggered_by_name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AkAvatar size="xsmall" src={detail.triggered_by_avatar ?? undefined} name={detail.triggered_by_name} />
              {detail.triggered_by_name}
            </span>
          )}
          <span>·</span>
          <span>{formatDuration(detail.duration_seconds)}</span>
          <span>·</span>
          <span>{detail.turns.length} speaker{detail.turns.length === 1 ? '' : 's'}</span>
          <span>·</span>
          <span>{detail.status_changes.length} status change{detail.status_changes.length === 1 ? '' : 's'}</span>
        </div>

        {/* Summary section */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: token('color.text'), margin: 0 }}>Summary</h2>
            {detail.summary_status === 'failed' && (
              <Button appearance="default" isLoading={regenerating} onClick={handleRegenerate}>
                Regenerate
              </Button>
            )}
            {detail.summary_status === 'ready' && (
              <Button appearance="subtle" isLoading={regenerating} onClick={handleRegenerate}>
                Regenerate
              </Button>
            )}
          </div>
          {detail.summary_status === 'generating' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: token('color.text.subtle'), fontSize: 14 }}>
              <Spinner size="small" /> Generating summary…
            </div>
          )}
          {detail.summary_status === 'pending' && (
            <div style={{ color: token('color.text.subtle'), fontSize: 14 }}>
              Summary not generated yet.
            </div>
          )}
          {detail.summary_status === 'failed' && (
            <div style={{ color: token('color.text.danger'), fontSize: 14 }}>
              Summary generation failed. Click Regenerate to try again.
            </div>
          )}
          {detail.summary_status === 'ready' && detail.summary_md && (
            <div
              className="standup-summary-markdown"
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: token('color.text'),
              }}
            >
              <ReactMarkdown>{detail.summary_md}</ReactMarkdown>
            </div>
          )}
        </section>

        {/* Status changes section */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: token('color.text'), margin: '0 0 12px 0' }}>
            Status changes during this standup
          </h2>
          {detail.status_changes.length === 0 ? (
            <div style={{ color: token('color.text.subtle'), fontSize: 14 }}>
              No status changes were recorded during this standup.
            </div>
          ) : (
            <div>
              {detail.status_changes.map(c => (
                <StatusChangeRow key={c.id} change={c} projectKey={projectKey} />
              ))}
            </div>
          )}
        </section>

        {/* Transcript section */}
        <section>
          <button
            onClick={() => setTranscriptOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 16, fontWeight: 600, color: token('color.text'),
              display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12,
            }}
          >
            {transcriptOpen
              ? <ChevronDownIcon label="" primaryColor="currentColor" />
              : <ChevronRightIcon label="" primaryColor="currentColor" />}
            Transcript ({detail.transcript_chunks.length} chunk{detail.transcript_chunks.length === 1 ? '' : 's'})
          </button>
          {transcriptOpen && detail.transcript_chunks.length === 0 && (
            <div style={{ color: token('color.text.subtle'), fontSize: 14 }}>
              No transcript was captured.
            </div>
          )}
          {transcriptOpen && detail.transcript_chunks.length > 0 && (
            <div>
              {binnedTurns.map((turn, i) => (
                turn.chunks.length === 0 ? null : (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: token('color.text.subtle'),
                      marginBottom: 6, paddingBottom: 4,
                      borderBottom: `1px solid ${token('color.border')}`,
                    }}>
                      {turn.speaker_name} · {formatTime(turn.started_at)} → {turn.ended_at ? formatTime(turn.ended_at) : 'still open'}
                      {turn.timer_seconds != null && <span> · timer {turn.timer_seconds}s</span>}
                    </div>
                    {turn.chunks.map((chunk, j) => (
                      <div key={j} style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 4, color: token('color.text') }}>
                        <span style={{ color: token('color.text.subtle'), fontSize: 12, marginRight: 8 }}>{formatTime(chunk.ts)}</span>
                        {chunk.text}
                      </div>
                    ))}
                  </div>
                )
              ))}
              {orphans.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: token('color.text.subtle'),
                    marginBottom: 6, paddingBottom: 4,
                    borderBottom: `1px solid ${token('color.border')}`,
                  }}>
                    Unattributed
                  </div>
                  {orphans.map((chunk, j) => (
                    <div key={j} style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 4, color: token('color.text') }}>
                      <span style={{ color: token('color.text.subtle'), fontSize: 12, marginRight: 8 }}>{formatTime(chunk.ts)}</span>
                      {chunk.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AtlaskitPageShell>
  );
}
