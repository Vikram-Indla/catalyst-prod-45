/**
 * useSubtaskDescription — ADF round-trip assertions.
 *
 * Pins the contract that the V2 DescriptionPopover relies on:
 *   • Empty ADF  → description_adf: NULL,  description_text: NULL
 *   • Non-empty  → description_adf: parsed JSON, description_text: plain text mirror
 *
 * @/utils/adf is mocked so the test does not require @atlaskit transitive
 * resolution. Production code uses the real canonical utilities.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const updateCall = vi.fn();
const eqAfterUpdate = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({
            data: { id: 'sub-1', description_adf: null, description_text: null },
            error: null,
          })),
        })),
      })),
      update: (payload: unknown) => {
        updateCall(payload);
        return { eq: eqAfterUpdate };
      },
    })),
  },
}));

vi.mock('@/utils/adf', () => ({
  adfToPlainText: (adf: { content?: Array<{ content?: Array<{ text?: string }> }> }) => {
    const first = adf?.content?.[0]?.content;
    if (!first) return '';
    return first.map((n) => n.text ?? '').join('');
  },
  isADFEmpty: (adf: { content?: Array<{ content?: unknown[] }> } | null | undefined) => {
    if (!adf) return true;
    const first = adf.content?.[0]?.content;
    return !first || first.length === 0;
  },
  createEmptyADF: () => ({
    version: 1,
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }],
  }),
  parseADF: () => null,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useSubtaskDescription } from '../hooks/useSubtaskDescription';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const EMPTY_ADF = {
  version: 1,
  type: 'doc' as const,
  content: [{ type: 'paragraph', content: [] }],
};

const NON_EMPTY_ADF = {
  version: 1,
  type: 'doc' as const,
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
  ],
};

describe('useSubtaskDescription', () => {
  beforeEach(() => {
    updateCall.mockClear();
    eqAfterUpdate.mockClear();
  });

  it('persists empty ADF as NULL for both description_adf and description_text', async () => {
    const { result } = renderHook(() => useSubtaskDescription('sub-1', 'EPIC-1'), { wrapper });
    await act(async () => {
      await result.current.save.mutateAsync(EMPTY_ADF);
    });
    expect(updateCall).toHaveBeenCalledTimes(1);
    const payload = updateCall.mock.calls[0][0] as {
      description_adf: unknown;
      description_text: unknown;
    };
    expect(payload.description_adf).toBeNull();
    expect(payload.description_text).toBeNull();
  });

  it('persists non-empty ADF and mirrors plain text for search', async () => {
    const { result } = renderHook(() => useSubtaskDescription('sub-1', 'EPIC-1'), { wrapper });
    await act(async () => {
      await result.current.save.mutateAsync(NON_EMPTY_ADF);
    });
    expect(updateCall).toHaveBeenCalledTimes(1);
    const payload = updateCall.mock.calls[0][0] as {
      description_adf: unknown;
      description_text: string;
    };
    expect(payload.description_adf).toEqual(NON_EMPTY_ADF);
    expect(payload.description_text).toContain('Hello world');
  });

  it('does not fetch when no subtask is selected', async () => {
    const { result } = renderHook(() => useSubtaskDescription(null, 'EPIC-1'), { wrapper });
    await waitFor(() => {
      expect(result.current.query.isFetching).toBe(false);
    });
    expect(result.current.query.data).toBeUndefined();
  });
});
