/**
 * R360Panel — "Resource 360°" tab panel for the For You page.
 *
 * Renders inside the For You tab strip when the user selects the
 * "Resource 360°" tab. The panel shows:
 *
 *   Left (flex:1)
 *   ├── Activity heatmap (52-week ticket-closure calendar grid)
 *   ├── Project allocation bubble chart (spatial, size ∝ % capacity)
 *   ├── Release stats row (6 KPIs)
 *   └── Velocity sparkline (releases × closed-count)
 *
 *   Right (320px rail)
 *   └── Team member cards (direct reports for leads; self-card for ICs)
 *       Each card: mini donut ring + project breakdown + country/location chip
 *       Click → navigates to that member's full R360 profile page
 *
 * Data wiring (next steps):
 *   - useR360ForYouPanel() hook (Step 2) will supply real data.
 *   - This component currently renders with hard-coded skeleton shapes so
 *     the layout and visual hierarchy can be reviewed before data is wired.
 *
 * Persona routing:
 *   - Manager+ / Lead:  shows team rail with all direct reports
 *   - IC:               shows team rail with self-card only
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyLeadProjects } from '@/hooks/useMyLeadProjects';
import { useAuth } from '@/lib/auth';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamMemberCard {
  userId: string;
  name: string;
  initials: string;
  role: string;
  country: string;
  flagEmoji: string;
  locationType: 'Onsite' | 'Off-Shore' | 'Hybrid';
  allocationPct: number;
  projectBreakdown: Array<{ label: string; pct: number; color: string }>;
  isYou: boolean;
  profilePath: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Flag emoji from 2-letter ISO code */
function flagEmoji(code: string): string {
  return code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
}

/** Thin donut ring SVG — r=15, cx=cy=20, circumference ≈ 94.2 */
function MiniRing({ pct, color }: { pct: number; color: string }) {
  const C = 94.25;
  const filled = (pct / 100) * C;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="20" cy="20" r="15" fill="none" stroke={token('color.border', '#EBECF0')} strokeWidth="5" />
      <circle
        cx="20" cy="20" r="15" fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${filled} ${C - filled}`}
        strokeLinecap="butt"
      />
    </svg>
  );
}

/** Allocation status colour based on % */
function allocationColor(pct: number): string {
  if (pct >= 95) return '#FF5630'; // over-loaded
  if (pct >= 85) return '#FF991F'; // near capacity
  return '#36B37E';                // healthy
}

/** Location badge */
function LocationBadge({ type }: { type: 'Onsite' | 'Off-Shore' | 'Hybrid' }) {
  const cfg = {
    Onsite:    { bg: '#E3FCEF', color: '#006644', border: '#ABF5D1', label: 'On-site' },
    'Off-Shore': { bg: '#EAE6FF', color: '#403294', border: '#C0B6F2', label: 'Offshore' },
    Hybrid:    { bg: '#DEEBFF', color: '#0052CC', border: '#B3D4FF', label: 'Hybrid' },
  }[type] ?? { bg: '#F4F5F7', color: '#42526E', border: '#DFE1E6', label: type };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 6px', borderRadius: 12,
      fontSize: 9, fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Activity heatmap ────────────────────────────────────────────────────────

/** 52 × 7 GitHub-style grid — placeholder colour levels; real data wired in Step 3 */
function ActivityHeatmap() {
  const cells = useMemo(() => {
    const out: number[] = [];
    for (let w = 0; w < 52; w++) {
      for (let d = 0; d < 7; d++) {
        const progress = w / 52;
        const r = Math.random();
        let lvl = 0;
        if (r > 0.35) lvl = 1;
        if (r > 0.55) lvl = 2;
        if (r > 0.70 && progress > 0.3) lvl = 3;
        if (r > 0.85 && progress > 0.5) lvl = 4;
        out.push(lvl);
      }
    }
    return out;
  }, []);

  const CELL_COLORS = ['#EBECF0', '#BAE6FD', '#38BDF8', '#0EA5E9', '#0052CC'];

  return (
    <div>
      {/* Month row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', fontSize: 9, color: '#97A0AF', marginBottom: 3 }}>
        {['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'].map(m => (
          <span key={m}>{m}</span>
        ))}
      </div>
      {/* Cell grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(52,1fr)', gap: 2 }}>
        {cells.map((lvl, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              borderRadius: 2,
              background: CELL_COLORS[lvl],
            }}
          />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#6B778C', marginTop: 5, justifyContent: 'flex-end' }}>
        <span>Less</span>
        {CELL_COLORS.map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />)}
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Velocity sparkline ───────────────────────────────────────────────────────

function VelocitySparkline() {
  const points = '0,45 75,35 150,40 225,22 300,28 375,15 450,10 525,8 600,5';
  return (
    <svg width="100%" height="56" viewBox="0 0 600 56" preserveAspectRatio="none">
      <defs>
        <linearGradient id="r360-vg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0052CC" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0052CC" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,45 L75,35 L150,40 L225,22 L300,28 L375,15 L450,10 L525,8 L600,5 L600,56 L0,56 Z`} fill="url(#r360-vg)" />
      <polyline points={points} fill="none" stroke="#0052CC" strokeWidth="2" strokeLinejoin="round" />
      {points.split(' ').map((pt, i) => {
        const [x, y] = pt.split(',').map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill={i === 7 ? '#36B37E' : '#0052CC'} />;
      })}
      {['v3.5','v3.6','v3.7','v3.8','v4.0','v4.1','v4.2','v4.3↑'].map((label, i) => (
        <text key={label} x={i * 75} y="56" fontSize="8" fill="#97A0AF">{label}</text>
      ))}
    </svg>
  );
}

// ─── Team member card ─────────────────────────────────────────────────────────

function MemberCard({ member }: { member: TeamMemberCard }) {
  const color = allocationColor(member.allocationPct);
  const card = (
    <div style={{
      background: member.isYou
        ? token('color.background.warning.subtle', '#FFFAE6')
        : token('elevation.surface', '#FFFFFF'),
      border: `1px solid ${member.isYou ? '#FFE380' : token('color.border', '#DFE1E6')}`,
      borderRadius: 8,
      padding: '14px 16px',
      cursor: 'pointer',
      transition: 'border-color 80ms, box-shadow 80ms',
      fontFamily: 'var(--cp-font-body)',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = '#4C9AFF';
      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 2px ${token('color.background.information', '#DEEBFF')}`;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = member.isYou ? '#FFE380' : token('color.border', '#DFE1E6');
      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
    }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: member.isYou ? '#FF991F' : '#6554C0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {member.initials}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: token('color.text', '#172B4D'), display: 'flex', alignItems: 'center', gap: 5 }}>
            {member.name}
            {member.isYou && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#FF991F', background: '#FFF0B3', padding: '1px 5px', borderRadius: 3 }}>
                YOU
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: token('color.text.subtle', '#6B778C'), marginTop: 2 }}>{member.role}</div>
        </div>
      </div>

      {/* Country + location chips */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: '#42526E', fontWeight: 500 }}>
          {member.flagEmoji} {member.country}
        </span>
        <LocationBadge type={member.locationType} />
      </div>

      {/* Allocation ring + breakdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
          <MiniRing pct={member.allocationPct} color={color} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color,
          }}>
            {member.allocationPct}%
          </div>
        </div>
        <div style={{ flex: 1, fontSize: 10, color: token('color.text.subtle', '#6B778C'), lineHeight: 1.7 }}>
          {member.projectBreakdown.map(p => (
            <div key={p.label}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: p.color, marginRight: 3, verticalAlign: 'middle' }} />
              {p.label} {p.pct}%
            </div>
          ))}
          {member.allocationPct >= 85 && (
            <div style={{ color: '#FF991F', fontWeight: 600, fontSize: 10 }}>⚠ Near capacity</div>
          )}
          {member.allocationPct < 70 && !member.isYou && (
            <div style={{ color: '#36B37E', fontWeight: 600, fontSize: 10 }}>✓ {100 - member.allocationPct}% available</div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{ fontSize: 11, color: token('color.link', '#0052CC'), fontWeight: 600, marginTop: 10 }}>
        → View {member.isYou ? 'my' : `${member.name.split(' ')[0]}'s`} R360 profile
      </div>
    </div>
  );

  return <Link to={member.profilePath} style={{ textDecoration: 'none', display: 'block' }}>{card}</Link>;
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '12px 8px',
      background: token('color.background.neutral.subtle', '#F4F5F7'),
      borderRadius: 6,
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? token('color.text', '#172B4D'), lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: token('color.text.subtle', '#6B778C'), marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────────

function SectionHead({ icon, title, right }: { icon: string; title: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: token('color.text.subtle', '#6B778C'), marginBottom: 14,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {title}
      </span>
      {right}
    </div>
  );
}

// ─── Placeholder bubble chart ─────────────────────────────────────────────────

function BubbleChart({ projects }: { projects: Array<{ label: string; pct: number; color: string; x: number; y: number }> }) {
  return (
    <div style={{
      position: 'relative', height: 200,
      background: `radial-gradient(circle at center, ${token('color.background.neutral.subtle', '#F7F8F9')}, ${token('elevation.surface', '#fff')})`,
      borderRadius: 8, border: `1px solid ${token('color.border', '#F4F5F7')}`,
      overflow: 'hidden',
    }}>
      {projects.map(p => {
        const r = Math.max(20, (p.pct / 100) * 80);
        return (
          <div
            key={p.label}
            title={`${p.label}: ${p.pct}%`}
            style={{
              position: 'absolute',
              left: `${p.x}%`, top: `${p.y}%`,
              width: r * 2, height: r * 2,
              transform: 'translate(-50%,-50%)',
              borderRadius: '50%',
              background: p.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
              color: '#fff', fontWeight: 700,
              fontSize: r > 45 ? 14 : 10,
              boxShadow: '0 2px 8px rgba(9,30,66,.15)',
              cursor: 'default',
              userSelect: 'none',
            }}
          >
            {p.pct}%
            <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.85, marginTop: 1 }}>
              {p.label.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export default function R360Panel() {
  const { user } = useAuth();
  const { canAccessEnterprise, isTeamLead } = useUserRole();
  const { projects: leadProjects } = useMyLeadProjects();

  // Persona routing: admin/pm → /admin/resources/:id, lead → /my-team/:id, IC → /me
  const profilePath = canAccessEnterprise
    ? `/admin/resources/${user?.id ?? ''}`
    : isTeamLead
    ? `/my-team/${user?.id ?? ''}`
    : '/me';

  // ── Placeholder data — replaced by useR360ForYouPanel() in Step 2 ──────────
  const PLACEHOLDER_PROJECTS = [
    { label: 'Senaei BAU', pct: 55, color: '#0052CC', x: 35, y: 38 },
    { label: 'Data Analytics', pct: 15, color: '#00B8D9', x: 72, y: 65 },
    { label: 'ICP Project',  pct: 10, color: '#6554C0', x: 78, y: 32 },
    { label: 'Buffer',       pct: 20, color: '#C1C7D0', x: 55, y: 78 },
  ];

  const PLACEHOLDER_TEAM: TeamMemberCard[] = [
    {
      userId: user?.id ?? 'self',
      name: 'Yazeed Daraz', initials: 'YD', role: 'Senior QA Engineer',
      country: 'Saudi Arabia', flagEmoji: flagEmoji('SA'), locationType: 'Onsite',
      allocationPct: 80,
      projectBreakdown: [
        { label: 'Senaei BAU', pct: 55, color: '#0052CC' },
        { label: 'Data Analytics', pct: 15, color: '#00B8D9' },
        { label: 'ICP', pct: 10, color: '#6554C0' },
      ],
      isYou: true,
      profilePath,
    },
    {
      userId: 'sh',
      name: 'Syed Habib', initials: 'SH', role: 'QA Engineer',
      country: 'Pakistan', flagEmoji: flagEmoji('PK'), locationType: 'Off-Shore',
      allocationPct: 95,
      projectBreakdown: [
        { label: 'Senaei BAU', pct: 70, color: '#0052CC' },
        { label: 'ICP', pct: 25, color: '#6554C0' },
      ],
      isYou: false,
      profilePath: `/admin/resources/sh`,
    },
    {
      userId: 'nh',
      name: 'Nadia Hassan', initials: 'NH', role: 'Junior QA · Contractor',
      country: 'Saudi Arabia', flagEmoji: flagEmoji('SA'), locationType: 'Onsite',
      allocationPct: 60,
      projectBreakdown: [
        { label: 'Senaei BAU', pct: 45, color: '#0052CC' },
        { label: 'Data Analytics', pct: 15, color: '#00B8D9' },
      ],
      isYou: false,
      profilePath: `/admin/resources/nh`,
    },
  ];

  const card: React.CSSProperties = {
    background: token('elevation.surface', '#FFFFFF'),
    border: `1px solid ${token('color.border', '#DFE1E6')}`,
    borderRadius: 8,
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(9,30,66,.06)',
  };

  return (
    <div
      data-testid="r360-panel"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 16,
        minHeight: 500,
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {/* ── LEFT: Spatial map ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Activity heatmap */}
        <div style={card}>
          <SectionHead icon="📊" title="My activity — last 12 months"
            right={
              <span style={{ fontSize: 10, color: token('color.text.subtlest', '#97A0AF'), fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                ticket closures per week
              </span>
            }
          />
          <ActivityHeatmap />
        </div>

        {/* Project allocation bubble chart */}
        <div style={card}>
          <SectionHead icon="🫧" title="Project allocation — spatial view"
            right={
              <span style={{ fontSize: 10, color: token('color.text.subtlest', '#97A0AF'), fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                bubble size = % capacity
              </span>
            }
          />
          <BubbleChart projects={PLACEHOLDER_PROJECTS} />
        </div>

        {/* Release stats */}
        <div style={card}>
          <SectionHead icon="🚀" title="Release stats" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
            <StatCard value="2"    label="Released (Q2)"    color="#006644" />
            <StatCard value="4"    label="Issues in RC"     color="#974F0C" />
            <StatCard value="18"   label="Closed this rel." color="#0052CC" />
            <StatCard value="94%"  label="Quality score"    color="#006644" />
            <StatCard value="14"   label="Open total" />
            <StatCard value="May 15" label="Next release" />
          </div>
        </div>

        {/* Velocity sparkline */}
        <div style={card}>
          <SectionHead icon="📈" title="Ticket velocity — last 8 releases" />
          <VelocitySparkline />
          <div style={{ fontSize: 10, color: token('color.text.subtle', '#6B778C'), marginTop: 4 }}>
            Trend: <strong style={{ color: '#36B37E' }}>↑ improving</strong> · 8 consecutive releases with increasing closed count
          </div>
        </div>
      </div>

      {/* ── RIGHT: Team rail ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: token('color.text.subtle', '#6B778C'),
        }}>
          <span>My Team ({PLACEHOLDER_TEAM.length})</span>
          {isTeamLead && (
            <Link to="/my-team" style={{ fontSize: 11, color: token('color.link', '#0052CC'), fontWeight: 500, textTransform: 'none', letterSpacing: 0, textDecoration: 'none' }}>
              View all →
            </Link>
          )}
        </div>

        {PLACEHOLDER_TEAM.map(m => (
          <MemberCard key={m.userId} member={m} />
        ))}

        {/* Team summary strip */}
        <div style={{
          background: token('color.background.neutral.subtle', '#F4F5F7'),
          borderRadius: 8, padding: '14px 16px', marginTop: 4,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: token('color.text.subtle', '#6B778C'), textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Team capacity summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard value="1"   label="Available resource" color="#36B37E" />
            <StatCard value="1"   label="Near capacity"      color="#FF991F" />
            <StatCard value="78%" label="Team avg allocation" />
            <StatCard value="3"   label="Active projects"    color="#0052CC" />
          </div>
        </div>
      </div>
    </div>
  );
}
