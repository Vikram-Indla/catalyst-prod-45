/**
 * useWidgetSettings — per-user widget config with tenant fallback.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Accepts (widgetId, dashboardId='product-dashboard')
 *   - Returns { config, isLoading, isError, error }
 *   - Unauthenticated → config={}, no DB query
 *   - Auth loading    → isLoading=true
 *   - User row exists → config = user_widget_settings.config
 *   - No user row, tenant default exists → config = dashboard_widget_defaults.default_config
 *   - No user row, no tenant default → config = {}
 *   - DB error        → isError=true, config={}
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useWidgetSettings } from '@/hooks/useWidgetSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

/** Mocks user_widget_settings query (maybeSingle chain) */
const mockUserSettings = (data: Record<string, unknown> | null, error: Error | null = null) => {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqWidget = vi.fn().mockReturnValue({ maybeSingle });
  const eqDash = vi.fn().mockReturnValue({ eq: eqWidget });
  const eqUser = vi.fn().mockReturnValue({ eq: eqDash });
  const select = vi.fn().mockReturnValue({ eq: eqUser });
  (supabase.from as any).mockReturnValueOnce({ select });
  return { select, eqUser, eqDash, eqWidget, maybeSingle };
};

/** Mocks dashboard_widget_defaults query (maybeSingle chain) */
const mockTenantDefaults = (data: Record<string, unknown> | null, error: Error | null = null) => {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqWidget = vi.fn().mockReturnValue({ maybeSingle });
  const eqDash = vi.fn().mockReturnValue({ eq: eqWidget });
  const select = vi.fn().mockReturnValue({ eq: eqDash });
  (supabase.from as any).mockReturnValueOnce({ select });
  return { select, eqDash, eqWidget, maybeSingle };
};

describe('useWidgetSettings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty config when unauthenticated', async () => {
    (useAuth as any).mockReturnValue({ user: null, loading: false, isAuthenticated: false });

    const { result } = renderHook(
      () => useWidgetSettings('at-a-glance'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.config).toEqual({});
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('reports isLoading=true while auth resolves', () => {
    (useAuth as any).mockReturnValue({ user: null, loading: true, isAuthenticated: false });

    const { result } = renderHook(
      () => useWidgetSettings('at-a-glance'),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.config).toEqual({});
  });

  it('returns user config when user row exists', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: USER_ID },
      loading: false,
      isAuthenticated: true,
    });
    const userConfig = { startStep: 'funnel', endStep: 'done' };
    mockUserSettings({ config: userConfig });
    // tenant query should not be needed but mock it to avoid leaking calls
    mockTenantDefaults(null);

    const { result } = renderHook(
      () => useWidgetSettings('at-a-glance'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.config).toEqual(userConfig);
    expect(supabase.from).toHaveBeenCalledWith('user_widget_settings');
  });

  it('falls back to tenant default when no user row exists', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: USER_ID },
      loading: false,
      isAuthenticated: true,
    });
    const tenantConfig = { startStep: 'intake', endStep: 'released' };
    mockUserSettings(null);
    mockTenantDefaults({ default_config: tenantConfig });

    const { result } = renderHook(
      () => useWidgetSettings('recent-releases'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.config).toEqual(tenantConfig);
    expect(supabase.from).toHaveBeenCalledWith('user_widget_settings');
    expect(supabase.from).toHaveBeenCalledWith('dashboard_widget_defaults');
  });

  it('returns empty config when neither user row nor tenant default exists', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: USER_ID },
      loading: false,
      isAuthenticated: true,
    });
    mockUserSettings(null);
    mockTenantDefaults(null);

    const { result } = renderHook(
      () => useWidgetSettings('who-carries-what'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.config).toEqual({});
  });

  it('surfaces query errors via isError', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: USER_ID },
      loading: false,
      isAuthenticated: true,
    });
    mockUserSettings(null, new Error('rls denied'));

    const { result } = renderHook(
      () => useWidgetSettings('at-a-glance'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.config).toEqual({});
  });

  it('accepts custom dashboardId', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: USER_ID },
      loading: false,
      isAuthenticated: true,
    });
    mockUserSettings({ config: { custom: true } });
    mockTenantDefaults(null);

    const { result } = renderHook(
      () => useWidgetSettings('at-a-glance', 'my-custom-dashboard'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.config).toEqual({ custom: true });
  });
});
