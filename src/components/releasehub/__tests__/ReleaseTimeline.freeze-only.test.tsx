/**
 * Regression: ReleaseTimeline crashed with
 * "Cannot read properties of undefined (reading 'goLiveDate')" when there were
 * freeze windows but ZERO releases — rangeAnchor was empty so firstR/lastR were
 * undefined. The guard `sorted.length === 0 && freezes.length === 0` only bailed
 * when BOTH were empty. This asserts the freeze-only state renders cleanly.
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useReleasePortfolio', () => ({
  useReleasePortfolio: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/hooks/useReleaseHub', () => ({
  useFreezeWindowsList: () => ({
    data: [{ id: 'frz-1', name: 'Quarter-end freeze', startDate: '2026-07-05', endDate: '2026-07-10', status: 'active' }],
    isLoading: false,
  }),
}));

import { ReleaseTimeline } from '../ReleaseTimeline';

describe('ReleaseTimeline — freeze-only state', () => {
  it('renders without crashing when there are freeze windows but zero releases', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <ReleaseTimeline />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
