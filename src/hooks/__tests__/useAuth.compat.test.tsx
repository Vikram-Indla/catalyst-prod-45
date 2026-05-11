/**
 * useAuth hook reconciliation contract.
 *
 * src/hooks/useAuth.ts must be a thin re-export of the canonical
 * useAuth from src/lib/auth.tsx (the AuthProvider context).
 * This eliminates 43 independent Supabase subscription instances
 * and ensures isAuthenticated is available from both import paths.
 *
 * Contract:
 *   - hooks/useAuth and lib/auth export the same function reference
 *   - useAuth returns isAuthenticated as a boolean inside AuthProvider
 *   - isAuthenticated is false when no session exists (unauthenticated render)
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Mock Supabase client before importing auth modules
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { useAuth as useAuthFromHooks } from '@/hooks/useAuth';
import { useAuth as useAuthFromLib, AuthProvider } from '@/lib/auth';

describe('useAuth hook reconciliation', () => {
  it('hooks/useAuth and lib/auth export the same function reference', () => {
    expect(useAuthFromHooks).toBe(useAuthFromLib);
  });

  it('useAuth returns isAuthenticated as a boolean inside AuthProvider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuthFromHooks(), { wrapper });
    expect(typeof result.current.isAuthenticated).toBe('boolean');
  });

  it('isAuthenticated is false when no session exists', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuthFromHooks(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
  });
});
