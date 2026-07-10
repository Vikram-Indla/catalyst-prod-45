import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: { workload: null }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { jira_account_id: 'jid' }, error: null }) }) }) }) },
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u1' }, loading: false }) }));

import { CatyWorkloadRisk } from '../CatyWorkloadRisk';

const mockMember = {
  userId: 'u1', name: 'Syed H.', allocationPct: 80, allocationColor: 'var(--ds-background-danger-bold)',
  isYou: false, projectBreakdown: [{ label: 'BAU', pct: 60, color: 'var(--ds-link)' }],
};

describe('CatyWorkloadRisk', () => {
  it('renders rainbow CTA with correct label', () => {
    render(<CatyWorkloadRisk teamMembers={[mockMember]} />);
    expect(screen.getByRole('button', { name: 'Ask Caty — Workload risk' })).toBeInTheDocument();
  });

  it('renders nothing when no team members', () => {
    const { container } = render(<CatyWorkloadRisk teamMembers={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
