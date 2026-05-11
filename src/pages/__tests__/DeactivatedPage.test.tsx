/**
 * DeactivatedPage — /deactivated
 *
 * Contract:
 *   - Renders a clear "account deactivated" message
 *   - Shows a contact-admin instruction
 *   - Has a "Sign out" button that calls supabase.auth.signOut
 *   - Does NOT redirect authenticated users away; they may land here
 *     after lifecycle-check deactivates their resource_inventory row
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  },
}));

import DeactivatedPage from '@/pages/DeactivatedPage';

describe('DeactivatedPage', () => {
  it('renders a deactivated heading', () => {
    render(<DeactivatedPage />);
    expect(screen.getByRole('heading', { name: /account deactivated/i })).toBeInTheDocument();
  });

  it('shows a contact-admin instruction', () => {
    render(<DeactivatedPage />);
    expect(screen.getByText(/contact.*admin/i)).toBeInTheDocument();
  });

  it('has a sign-out button', () => {
    render(<DeactivatedPage />);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('calls supabase.auth.signOut when sign-out is clicked', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    render(<DeactivatedPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
