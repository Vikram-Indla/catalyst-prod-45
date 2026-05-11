/**
 * useInviteUser — admin hook that sends an invitation email.
 *
 * Contract:
 *   - inviteUser({ email, role, module_access }) calls user-invite-send edge function
 *   - Returns { ok: true, invitation_id } on success
 *   - Returns { ok: false, error } when edge function signals failure
 *   - Returns { ok: false, error } when invoke itself errors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}));

import { useInviteUser } from '@/hooks/useInviteUser';
import { supabase } from '@/integrations/supabase/client';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useInviteUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls user-invite-send with the correct payload', async () => {
    (supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { ok: true, invitation_id: 'inv-123' },
      error: null,
    });

    const { result } = renderHook(() => useInviteUser(), { wrapper });
    await act(async () => {
      await result.current.inviteUser({
        email: 'test@example.com',
        role: 'user',
        module_access: {},
      });
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('user-invite-send', {
      body: { email: 'test@example.com', role: 'user', module_access: {} },
    });
  });

  it('returns invitation_id on success', async () => {
    (supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { ok: true, invitation_id: 'inv-456' },
      error: null,
    });

    const { result } = renderHook(() => useInviteUser(), { wrapper });
    let response: Awaited<ReturnType<typeof result.current.inviteUser>>;
    await act(async () => {
      response = await result.current.inviteUser({
        email: 'newuser@gmail.com',
        role: 'user',
        module_access: {},
      });
    });

    expect(response!).toMatchObject({ ok: true, invitation_id: 'inv-456' });
  });

  it('returns error when edge function returns ok: false', async () => {
    (supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { ok: false, error: 'User already exists' },
      error: null,
    });

    const { result } = renderHook(() => useInviteUser(), { wrapper });
    let response: Awaited<ReturnType<typeof result.current.inviteUser>>;
    await act(async () => {
      response = await result.current.inviteUser({
        email: 'existing@example.com',
        role: 'user',
        module_access: {},
      });
    });

    expect(response!).toMatchObject({ ok: false, error: 'User already exists' });
  });

  it('returns error when invoke throws a network error', async () => {
    (supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: { message: 'FunctionsHttpError' },
    });

    const { result } = renderHook(() => useInviteUser(), { wrapper });
    let response: Awaited<ReturnType<typeof result.current.inviteUser>>;
    await act(async () => {
      response = await result.current.inviteUser({
        email: 'anyone@example.com',
        role: 'user',
        module_access: {},
      });
    });

    expect(response!.ok).toBe(false);
    expect(response!.error).toBeTruthy();
  });
});
