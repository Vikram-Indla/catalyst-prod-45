/**
 * catySummarizeStore — unit test
 *
 * Mirrors `catyImproveStore` in role: bridges the right-rail Improve dropdown
 * ("Summarize comments" menu item) and the inline `CommentsSummaryCard` that
 * renders above the comments section. The dropdown calls `start({...})`, the
 * card subscribes and mounts. As the streaming edge function emits NDJSON
 * deltas, the card pushes them through `appendDelta`. When the stream ends,
 * `complete(fullText)` flips status to 'done' so the card removes the
 * animated gradient border.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCatySummarize } from '../catySummarizeStore';

const reset = () => useCatySummarize.getState().dismiss();

describe('catySummarizeStore', () => {
  beforeEach(reset);

  it('starts in idle state with no payload', () => {
    const s = useCatySummarize.getState();
    expect(s.payload).toBeNull();
    expect(s.status).toBe('idle');
    expect(s.streamingText).toBe('');
    expect(s.errorMessage).toBeNull();
  });

  it('start() sets payload and flips status to fetching', () => {
    useCatySummarize.getState().start({
      issueKey: 'BAU-1',
      workItemId: 'uuid-1',
      issueType: 'Story',
      issueSummary: 'A story',
    });
    const s = useCatySummarize.getState();
    expect(s.payload?.issueKey).toBe('BAU-1');
    expect(s.status).toBe('fetching');
    expect(s.streamingText).toBe('');
  });

  it('setStreaming() flips status to streaming', () => {
    useCatySummarize.getState().start({
      issueKey: 'BAU-1',
      workItemId: 'uuid-1',
      issueType: 'Story',
      issueSummary: 'A story',
    });
    useCatySummarize.getState().setStreaming();
    expect(useCatySummarize.getState().status).toBe('streaming');
  });

  it('appendDelta() concatenates streamingText in order', () => {
    useCatySummarize.getState().start({
      issueKey: 'BAU-1',
      workItemId: 'uuid-1',
      issueType: 'Story',
      issueSummary: 'A story',
    });
    useCatySummarize.getState().appendDelta('Hello ');
    useCatySummarize.getState().appendDelta('world');
    expect(useCatySummarize.getState().streamingText).toBe('Hello world');
  });

  it('complete() flips status to done and sets the final text', () => {
    useCatySummarize.getState().start({
      issueKey: 'BAU-1',
      workItemId: 'uuid-1',
      issueType: 'Story',
      issueSummary: 'A story',
    });
    useCatySummarize.getState().appendDelta('partial');
    useCatySummarize.getState().complete('partial complete');
    const s = useCatySummarize.getState();
    expect(s.status).toBe('done');
    expect(s.streamingText).toBe('partial complete');
  });

  it('error() flips status to error with a message', () => {
    useCatySummarize.getState().start({
      issueKey: 'BAU-1',
      workItemId: 'uuid-1',
      issueType: 'Story',
      issueSummary: 'A story',
    });
    useCatySummarize.getState().error('AI gateway error');
    const s = useCatySummarize.getState();
    expect(s.status).toBe('error');
    expect(s.errorMessage).toBe('AI gateway error');
  });

  it('dismiss() clears the payload and resets state', () => {
    useCatySummarize.getState().start({
      issueKey: 'BAU-1',
      workItemId: 'uuid-1',
      issueType: 'Story',
      issueSummary: 'A story',
    });
    useCatySummarize.getState().appendDelta('text');
    useCatySummarize.getState().dismiss();
    const s = useCatySummarize.getState();
    expect(s.payload).toBeNull();
    expect(s.status).toBe('idle');
    expect(s.streamingText).toBe('');
    expect(s.errorMessage).toBeNull();
  });

  it('setAuto() toggles the auto-summarize preference', () => {
    // Default is ON (Jira parity).
    expect(useCatySummarize.getState().autoEnabled).toBe(true);
    useCatySummarize.getState().setAuto(false);
    expect(useCatySummarize.getState().autoEnabled).toBe(false);
    useCatySummarize.getState().setAuto(true);
    expect(useCatySummarize.getState().autoEnabled).toBe(true);
  });
});
