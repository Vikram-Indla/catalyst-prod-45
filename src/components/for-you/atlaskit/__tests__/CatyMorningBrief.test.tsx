import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { brief: 'You have 3 items due this week.' },
        error: null,
      }),
    },
  },
}));

import { CatyMorningBrief } from '../CatyMorningBrief';

describe('CatyMorningBrief', () => {
  it('renders insight card with title', () => {
    render(<CatyMorningBrief items={[]} />);
    expect(screen.getByText("Caty's brief")).toBeInTheDocument();
  });

  it('renders empty hint when no items', () => {
    render(<CatyMorningBrief items={[]} />);
    expect(screen.getByText(/no assigned items/i)).toBeInTheDocument();
  });
});
