/**
 * useAcceptInvite — accepts an invitation token, creates the user account,
 * and auto-signs in by setting the returned session.
 *
 * Contract:
 *   - acceptInvite({ token, email, password, full_name }) invokes user-invite-accept
 *   - On success: calls supabase.auth.setSession with the returned session
 *   - Returns { ok: true } after session is set
 *   - Returns { ok: false, error } when edge function signals failure
 *   - Returns { ok: false, error } when invoke itself errors
 *   - isLoading is true while the call is in-flight
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

const mockSetSession = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    auth: { setSession: mockSetSession },
  },
}));

import { useAcceptInvite } from '@/hooks/useAcceptInvite';
import { supabase } from '@/integrations/supabase/client';

const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

describe('useAcceptInvite', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invokes user-invite-accept with the correct payload', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { ok: true, session: { access_token: 'at', refresh_token: 'rt' } },
      error: null,
    });
    mockSetSession.mockResolvedValueOnce({ data: {}, error: null });

    const { result } = renderHook(() => useAcceptInvite());
    await act(async () => {
      await result.current.acceptInvite({
        token: 'tok-abc',
        email: 'user@gmail.com',
        password: 'S3cur3P@ss!',
        full_name: 'Jane Doe',
      });
    });

    expect(mockInvoke).toHaveBeenCalledWith('user-invite-accept', {
      body: {
        token: 'tok-abc',
        email: 'user@gmail.com',
        password: 'S3cur3P@ss!',
        full_name: 'Jane Doe',
      },
    });
  });

  it('calls setSession with the returned tokens on success', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { ok: true, session: { access_token: 'at-xyz', refresh_token: 'rt-xyz' } },
      error: null,
    });
    mockSetSession.mockResolvedValueOnce({ data: {}, error: null });

    const { result } = renderHook(() => useAcceptInvite());
    await act(async () => {
      await result.current.acceptInvite({
        token: 'tok-abc',
        email: 'user@gmail.com',
        password: 'S3cur3P@ss!',
        full_name: 'Jane Doe',
      });
    });

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'at-xyz',
      refresh_token: 'rt-xyz',
    });
  });

  it('returns ok: true after session is set', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { ok: true, session: { access_token: 'at', refresh_token: 'rt' } },
      error: null,
    });
    mockSetSession.mockResolvedValueOnce({ data: {}, error: null });

    const { result } = renderHook(() => useAcceptInvite());
    let response: Awaited<ReturnType<typeof result.current.acceptInvite>>;
    await act(async () => {
      response = await result.current.acceptInvite({
        token: 't',
        email: 'u@e.com',
        password: 'pass',
        full_name: 'User',
      });
    });

    expect(response!).toMatchObject({ ok: true });
  });

  it('returns ok: false when edge function signals failure', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { ok: false, error: 'Invalid or expired invitation' },
      error: null,
    });

    const { result } = renderHook(() => useAcceptInvite());
    let response: Awaited<ReturnType<typeof result.current.acceptInvite>>;
    await act(async () => {
      response = await result.current.acceptInvite({
        token: 'bad-token',
        email: 'u@e.com',
        password: 'pass',
        full_name: 'User',
      });
    });

    expect(response!).toMatchObject({ ok: false, error: 'Invalid or expired invitation' });
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('returns ok: false when invoke errors', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'FunctionsHttpError' },
    });

    const { result } = renderHook(() => useAcceptInvite());
    let response: Awaited<ReturnType<typeof result.current.acceptInvite>>;
    await act(async () => {
      response = await result.current.acceptInvite({
        token: 't',
        email: 'u@e.com',
        password: 'pass',
        full_name: 'User',
      });
    });

    expect(response!.ok).toBe(false);
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});
