/**
 * InviteAcceptPage — /invite/accept?token=...&email=...
 *
 * Contract:
 *   - Missing token or email params → renders "invalid invitation" state
 *   - Valid params present → renders form with full_name, password, confirmPassword
 *   - Form submit → calls acceptInvite({ token, email, password, full_name })
 *   - On success (ok: true) → navigates to '/'
 *   - On failure (ok: false) → renders error message inline, does not navigate
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockNavigate = vi.fn();
const mockAcceptInvite = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: vi.fn(),
}));

vi.mock('@/hooks/useAcceptInvite', () => ({
  useAcceptInvite: () => ({
    acceptInvite: mockAcceptInvite,
    isLoading: false,
  }),
}));

import { useSearchParams } from 'react-router-dom';
import InviteAcceptPage from '@/pages/InviteAcceptPage';

function withParams(token: string | null, email: string | null) {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (email) params.set('email', email);
  (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue([params]);
}

describe('InviteAcceptPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows invalid state when token is missing', () => {
    withParams(null, 'user@example.com');
    render(<InviteAcceptPage />);
    expect(screen.getByText(/invalid.*invitation/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it('shows invalid state when email is missing', () => {
    withParams('some-token', null);
    render(<InviteAcceptPage />);
    expect(screen.getByText(/invalid.*invitation/i)).toBeInTheDocument();
  });

  it('renders the form when both token and email are present', () => {
    withParams('tok-abc', 'newuser@gmail.com');
    render(<InviteAcceptPage />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
  });

  it('calls acceptInvite with correct payload on submit', async () => {
    withParams('tok-abc', 'newuser@gmail.com');
    mockAcceptInvite.mockResolvedValueOnce({ ok: true });
    render(<InviteAcceptPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'MyP@ssw0rd' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'MyP@ssw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalledWith({
        token: 'tok-abc',
        email: 'newuser@gmail.com',
        password: 'MyP@ssw0rd',
        full_name: 'Jane Doe',
      });
    });
  });

  it('navigates to / on successful acceptance', async () => {
    withParams('tok-abc', 'newuser@gmail.com');
    mockAcceptInvite.mockResolvedValueOnce({ ok: true });
    render(<InviteAcceptPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'MyP@ssw0rd' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'MyP@ssw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows error message and does not navigate on failure', async () => {
    withParams('tok-abc', 'newuser@gmail.com');
    mockAcceptInvite.mockResolvedValueOnce({ ok: false, error: 'Invalid or expired invitation' });
    render(<InviteAcceptPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'MyP@ssw0rd' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'MyP@ssw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired invitation/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
