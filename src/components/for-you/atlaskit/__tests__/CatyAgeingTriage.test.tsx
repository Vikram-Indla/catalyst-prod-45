import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: { triageResults: [] }, error: null }) } },
}));

import { CatyAgeingTriage } from '../CatyAgeingTriage';

const mockItem = { issue_key: 'BAU-100', summary: 'Old item', days_open: 120, status: 'To Do', comment_count: 0 } as any;

describe('CatyAgeingTriage', () => {
  it('renders rainbow CTA with correct label', () => {
    render(<CatyAgeingTriage items={[mockItem]} />);
    // CatyButton strips the "Ask Caty" prefix from visible text (the cat icon
    // is the signifier) — visible label is the bare action word.
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Caty — Review' })).toBeInTheDocument();
  });

  it('renders nothing when no items', () => {
    const { container } = render(<CatyAgeingTriage items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
