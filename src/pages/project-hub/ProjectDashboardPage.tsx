/**
 * ProjectDashboard V3 — CIO/Scrum Master–grade release-scoped dashboard
 * Shell with 9 widget placeholders, release context, and drawer containers.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronRight,
  Settings,
  Users,
  CalendarRange,
  ChevronDown,
} from 'lucide-react';
import type { DashboardFilters } from '@/types/project-dashboard';
import '@/components/project-hub/shared/phStyles.css';

/* ═══ Color tokens ═══ */
const C = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  bdr: '#E2E8F0',
  ink1: '#0F172A',
  ink2: '#334155',
  ink3: '#64748B',
  ink4: '#94A3B8',
  primary: '#2563EB',
  teal: '#0D9488',
  purple: '#7C3AED',
  success: '#16A34A',
  warn: '#D97706',
  danger: '#EF4444',
};

/* ═══ Widget placeholder ═══ */
function WidgetPlaceholder({ title, span = 1 }: { title: string; span?: number }) {
  return (
    <div
      style={{
        gridColumn: span > 1 ? `span ${span}` : undefined,
        background: C.card,
        border: `2px dashed ${C.bdr}`,
        borderRadius: 12,
        padding: 20,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: C.ink4 }}>Loading...</div>
    </div>
  );
}

export default function ProjectDashboardPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [selectedReleaseIds, setSelectedReleaseIds] = useState<string[]>([]);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-dashboard-v3', key],
    queryFn: async () => {
      if (!key) return null;
      const { data, error } = await supabase
        .from('ph_projects')
        .select('*')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      if (error) { console.warn(error.message); return null; }
      return data;
    },
    enabled: !!key,
  });

  const name = project?.name || key?.toUpperCase() || 'Project';
  const pKey = project?.key || key?.toUpperCase() || '';
  const initials = pKey.slice(0, 2);

  return (
    <div className="ph-content-wrapper" style={{ fontFamily: "'Inter', sans-serif", background: C.bg }}>
      <div className="ph-inner-content">
        {/* ═══ Breadcrumb ═══ */}
        <div className="flex items-center gap-1.5 mb-4">
          <span
            className="cursor-pointer hover:underline"
            style={{ fontSize: 13, color: C.ink3 }}
            onClick={() => navigate('/project-hub/projects')}
          >
            ProjectHub
          </span>
          <ChevronRight size={12} color={C.ink4} />
          <span style={{ fontSize: 13, color: C.ink3, fontWeight: 500 }}>{pKey}</span>
          <ChevronRight size={12} color={C.ink4} />
          <span style={{ fontSize: 13, color: C.ink1, fontWeight: 600 }}>Dashboard</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 rounded-xl" style={{ background: C.bdr }} />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl" style={{ background: C.bdr }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ═══ Project Header Card ═══ */}
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.bdr}`,
                borderRadius: 12,
                padding: '20px 24px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Left */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: C.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  {initials}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: C.ink1, fontFamily: "'Sora', sans-serif" }}>{name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: C.success, background: '#F0FDF4',
                      border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>On Track</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: C.primary, background: '#EFF6FF',
                      border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} color={C.ink4} />
                      <span style={{ fontSize: 12, color: C.ink3 }}>8 members</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CalendarRange size={12} color={C.ink4} />
                      <span style={{ fontSize: 12, color: C.ink3 }}>Jan 15 – Mar 30, 2026</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Release dropdown placeholder */}
                <button
                  style={{
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: `1px solid ${C.bdr}`,
                    background: C.card,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.ink2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  All Releases
                  <ChevronDown size={14} color={C.ink4} />
                </button>

                {/* Intelligence button */}
                <button
                  onClick={() => setIntelligenceOpen(!intelligenceOpen)}
                  style={{
                    height: 34,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: intelligenceOpen ? '1.5px solid #8B5CF6' : `1px solid ${C.bdr}`,
                    background: intelligenceOpen ? '#F5F3FF' : C.card,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    color: intelligenceOpen ? '#6D28D9' : C.ink2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: 11,
                      lineHeight: 1,
                    }}
                  >
                    ✦
                  </span>
                  Intelligence
                </button>

                {/* Settings */}
                <button
                  onClick={() => navigate(`/project-hub/${key}/settings`)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: `1px solid ${C.bdr}`,
                    background: C.card,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Settings size={15} color={C.ink3} />
                </button>
              </div>
            </div>

            {/* ═══ Release Context Pills ═══ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.ink4, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Releases:
              </span>
              {['REL-2.4.0 · 68%', 'REL-2.3.1 · 100%', 'REL-2.5.0 · 12%'].map((label, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.ink2,
                    background: i === 0 ? '#EFF6FF' : '#F8FAFC',
                    border: `1px solid ${i === 0 ? '#BFDBFE' : C.bdr}`,
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* ═══ Widget Grid ═══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Row 1: 2-col */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <WidgetPlaceholder title="Key Milestones" />
                <WidgetPlaceholder title="Latest in Production" />
              </div>

              {/* Row 2: 3-col */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <WidgetPlaceholder title="Items by Status" />
                <WidgetPlaceholder title="Overdue Items" />
                <WidgetPlaceholder title="On Hold Items" />
              </div>

              {/* Row 3: 2-col */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <WidgetPlaceholder title="Production Incidents" />
                <WidgetPlaceholder title="QA Defects" />
              </div>

              {/* Row 4: full-width */}
              <WidgetPlaceholder title="Time in Status" span={1} />

              {/* Row 5: 2-col */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <WidgetPlaceholder title="Team Workload" />
                <WidgetPlaceholder title="Recent Activity" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ Drawer containers (hidden by default) ═══ */}
      {/* Lifecycle Drawer — populated in Stage C */}
      {/* Workload Drawer — populated in Stage C */}
      {/* Intelligence Drawer — populated in Stage C */}
    </div>
  );
}
