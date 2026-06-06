import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: { insight: null }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { jira_account_id: 'jid' }, error: null }) }) }) }) },
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u1' }, loading: false }) }));

import { CatyBoardInsight } from '../CatyBoardInsight';

describe('CatyBoardInsight', () => {
  it('renders rainbow CTA with correct label', () => {
    render(<CatyBoardInsight resourceId="res-123" />);
    expect(screen.getByText('Ask Caty - Board health')).toBeInTheDocument();
  });

  it('renders nothing when no resourceId', () => {
    const { container } = render(<CatyBoardInsight resourceId={null} />);
    expect(container.innerHTML).toBe('');
  });
});
