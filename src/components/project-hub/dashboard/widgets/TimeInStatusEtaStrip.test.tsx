/**
 * TimeInStatusEtaStrip — predictive ETA inline strip on a TIS cell.
 *
 * Phase 4 row 5 — TDD red. Component does not exist yet.
 *
 * Contract:
 *   - Takes currentMs (time already spent in this status), p50Hours (cohort
 *     median), and confidence (0..1). Renders ETA string + confidence %.
 *   - Three visual states:
 *       on_track  →   blue/subtle "→ ETA <date> · 71%"
 *       over      →   red       "→ ETA <date> · 71% · over P50"
 *       overdue   →   red       "→ overdue · stalled"
 *   - Renders nothing when p50Hours is null (no forecast data).
 *   - Mocked forecast — wires to real cohort API in row 9.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeInStatusEtaStrip } from './TimeInStatusEtaStrip';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('TimeInStatusEtaStrip', () => {
  it('renders ON-TRACK state when current < p50', () => {
    render(<TimeInStatusEtaStrip currentMs={3 * DAY} p50Hours={192} confidence={0.71} />);
    // 192h = 8d P50, current 3d, so on track
    expect(screen.getByText(/ETA/)).toBeInTheDocument();
    expect(screen.getByText(/71%/)).toBeInTheDocument();
    expect(screen.getByText(/on track/i)).toBeInTheDocument();
  });

  it('renders OVER P50 state when current > p50', () => {
    render(<TimeInStatusEtaStrip currentMs={12 * DAY} p50Hours={192} confidence={0.71} />);
    expect(screen.getByText(/ETA/)).toBeInTheDocument();
    expect(screen.getByText(/over P50/i)).toBeInTheDocument();
  });

  it('renders OVERDUE when current > 2x p50', () => {
    render(<TimeInStatusEtaStrip currentMs={80 * DAY} p50Hours={192} confidence={0.4} />);
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/stalled/i)).toBeInTheDocument();
  });

  it('renders NOTHING when p50Hours is null', () => {
    const { container } = render(
      <TimeInStatusEtaStrip currentMs={5 * DAY} p50Hours={null} confidence={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('exposes data-testid for cell-level wiring', () => {
    render(<TimeInStatusEtaStrip currentMs={DAY} p50Hours={192} confidence={0.71} />);
    expect(screen.getByTestId('tis-eta-strip')).toBeInTheDocument();
  });
});
