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

export default function TestHubDashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Data fetching will be wired in G5-03+
      await new Promise((r) => setTimeout(r, 400));
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
          {/* Stat Cards Row — G5-03 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {['Total Cases', 'Active Cycles', 'Pass Rate', 'Open Defects'].map((label) => (
              <div
                key={label}
                style={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  padding: '20px 24px',
                  minHeight: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'hsl(var(--muted-foreground))',
                  fontSize: 13,
                }}
              >
                {label} — G5-03
              </div>
            ))}
          </div>

          {/* Charts Row — G5-04 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                padding: 24,
                minHeight: 280,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--muted-foreground))',
                fontSize: 13,
              }}
            >
              Pass Rate Trend Chart — G5-04
            </div>
            <div
              style={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                padding: 24,
                minHeight: 280,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--muted-foreground))',
                fontSize: 13,
              }}
            >
              Status Distribution Chart — G5-04
            </div>
          </div>

          {/* Lists Row — G5-05 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                padding: 24,
                minHeight: 260,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--muted-foreground))',
                fontSize: 13,
              }}
            >
              Active Cycles List — G5-05
            </div>
            <div
              style={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                padding: 24,
                minHeight: 260,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--muted-foreground))',
                fontSize: 13,
              }}
            >
              Recent Activity Feed — G5-05
            </div>
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
