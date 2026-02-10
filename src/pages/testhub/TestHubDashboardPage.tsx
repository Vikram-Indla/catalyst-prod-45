/**
 * TestHub Dashboard Page — G5-02 Shell
 * Route: /testhub/dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, RefreshCw, Calendar, Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { DashboardStatCards, type DashboardStats } from '@/components/testhub/dashboard/DashboardStatCards';
import { PassRateTrendChart, type CyclePassRate } from '@/components/testhub/dashboard/PassRateTrendChart';
import { StatusDistributionChart } from '@/components/testhub/dashboard/StatusDistributionChart';
import { ActiveCyclesList, type ActiveCycle } from '@/components/testhub/dashboard/ActiveCyclesList';
import { RecentActivityFeed, type RecentActivity } from '@/components/testhub/dashboard/RecentActivityFeed';

export default function TestHubDashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [passRateTrend, setPassRateTrend] = useState<CyclePassRate[]>([]);
  const [activeCycles, setActiveCycles] = useState<ActiveCycle[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, trendRes, cyclesRes, activityRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats'),
        supabase.rpc('get_cycle_pass_rates', { p_limit: 10 }),
        supabase
          .from('th_test_cycles')
          .select('id, cycle_key, name, status, progress_percent, total_cases, passed_count, failed_count, blocked_count, not_run_count')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('th_cycle_test_cases')
          .select('id, execution_status, executed_at, cycle_id, test_case_id, executed_by, th_test_cases(case_key, title), th_test_cycles!th_cycle_test_cases_cycle_id_fkey(cycle_key), profiles!th_cycle_test_cases_executed_by_fkey(full_name)')
          .not('executed_at', 'is', null)
          .order('executed_at', { ascending: false })
          .limit(10),
      ]);

      if (!statsRes.error && statsRes.data?.length) {
        setStats(statsRes.data[0] as unknown as DashboardStats);
      }
      if (!trendRes.error && trendRes.data) {
        setPassRateTrend(trendRes.data as unknown as CyclePassRate[]);
      }
      if (!cyclesRes.error && cyclesRes.data) {
        setActiveCycles(cyclesRes.data as unknown as ActiveCycle[]);
      }
      if (!activityRes.error && activityRes.data) {
        setRecentActivity(
          (activityRes.data as any[]).map((a) => ({
            id: a.id,
            execution_status: a.execution_status ?? 'not_run',
            executed_at: a.executed_at ?? '',
            case_key: a.th_test_cases?.case_key ?? '',
            title: a.th_test_cases?.title ?? '',
            cycle_key: a.th_test_cycles?.cycle_key ?? '',
            cycle_id: a.cycle_id,
            executed_by_name: a.profiles?.full_name ?? 'Unknown',
          }))
        );
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      catalystToast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatLastUpdated = () =>
    lastUpdated.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <div className="flex-1 overflow-auto bg-surface-1" style={{ padding: 24 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
            }}
          >
            <BarChart3 size={22} color="#FFFFFF" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'hsl(var(--foreground))',
                margin: 0,
                fontFamily: 'Sora, sans-serif',
              }}
            >
              TestHub Dashboard
            </h1>
            <p
              style={{
                fontSize: 13,
                color: 'hsl(var(--muted-foreground))',
                margin: '2px 0 0',
              }}
            >
              Overview of test execution metrics and activity
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 12,
              color: 'hsl(var(--muted-foreground))',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Calendar size={13} />
            Last updated: {formatLastUpdated()}
          </span>

          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            style={{
              height: 36,
              padding: '0 14px',
              border: '1.5px solid hsl(var(--border))',
              borderRadius: 8,
              backgroundColor: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              fontSize: 13,
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw
              size={14}
              style={isLoading ? { animation: 'th-spin 1s linear infinite' } : undefined}
            />
            Refresh
          </button>

          <button
            disabled
            style={{
              height: 36,
              padding: '0 14px',
              border: '1.5px solid hsl(var(--border))',
              borderRadius: 8,
              backgroundColor: 'hsl(var(--background))',
              color: 'hsl(var(--muted-foreground))',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'not-allowed',
              opacity: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 80,
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <RefreshCw
              size={32}
              style={{ marginBottom: 12, animation: 'th-spin 1s linear infinite' }}
            />
            <p style={{ fontSize: 14 }}>Loading dashboard…</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <DashboardStatCards stats={stats} />

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <PassRateTrendChart data={passRateTrend} />
            <StatusDistributionChart stats={stats} />
          </div>

          {/* Lists Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <ActiveCyclesList cycles={activeCycles} />
            <RecentActivityFeed activities={recentActivity} />
          </div>

          {/* Top Failing Tests — G5-05 */}
          <div
            style={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              padding: 24,
              minHeight: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'hsl(var(--muted-foreground))',
              fontSize: 13,
            }}
          >
            Top Failing Tests — G5-05
          </div>
        </>
      )}

      <style>{`
        @keyframes th-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
