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
    expect(screen.getByText('Ask Caty - Triage stale')).toBeInTheDocument();
  });

  it('renders nothing when no items', () => {
    const { container } = render(<CatyAgeingTriage items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
