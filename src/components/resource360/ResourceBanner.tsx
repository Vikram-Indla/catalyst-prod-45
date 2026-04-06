import React from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ResourceBannerProps {
  resource: any;
  summary: any;
}

const StatCard = ({ label, value, color, isDark }: { label: string; value: number | string; color: string; isDark: boolean }) => (
  <div
    tabIndex={0}
    aria-label={`${label}: ${value}`}
    style={{
      background: isDark ? '#1A1A1A' : 'var(--r360-surface, #FFFFFF)', border: isDark ? '1px solid #2E2E2E' : '1px solid var(--r360-border, #C5BDB3)',
      borderRadius: 8, padding: '10px 16px', minWidth: 90, textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    }}
  >
    <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--r360-text-4, #6B6B80)', marginTop: 4 }}>{label}</div>
  </div>
);

const ResourceBanner: React.FC<ResourceBannerProps> = ({ resource, summary }) => {
  const { isDark } = useTheme();
  const initials = resource?.initials || resource?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';
  const deptName = resource?.r360_departments?.name || '—';
  const vendorName = resource?.r360_vendors?.name || '—';
  const assignmentName = resource?.r360_assignments?.name || '—';

  // Format contract dates — hide pill entirely if both are null
  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;
  const contractStart = formatDate(resource?.contract_start);
  const contractEnd = formatDate(resource?.contract_end);
  const contractDisplay = contractStart && contractEnd ? `${contractStart} → ${contractEnd}` : null;

  const metaPills = [
    deptName !== '—' ? deptName : null,
    vendorName !== '—' ? vendorName : null,
    contractDisplay,
    resource?.country || null,
    assignmentName !== '—' ? assignmentName : null,
    resource?.location_type || null,
  ].filter(Boolean) as string[];

  if (resource?.ctc) {
    metaPills.push(`CTC: ${resource.ctc}`);
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 20,
      padding: '16px 20px', background: isDark ? '#1A1A1A' : 'var(--r360-surface, #FFFFFF)',
      borderBottom: isDark ? '1px solid #2E2E2E' : '1px solid var(--r360-border-light, #D9D2C9)',
      boxShadow: 'var(--r360-shadow-card, 0 2px 8px rgba(0,0,0,.12))',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1A1A2E, #2D2D4A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFFFFF', fontSize: 22, fontWeight: 700,
          boxShadow: '0 0 0 3px #FFFFFF, 0 0 0 5px #1A1A2E',
        }}>
          {initials}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--r360-text-1, #0A0A0A)', margin: 0, lineHeight: 1.3 }}>
          {resource?.full_name || 'Unknown'}
        </h1>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--r360-text-2, #1A1A2E)', margin: '2px 0 8px 0' }}>
          {resource?.job_role || 'No role'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {metaPills.map((label, i) => (
            <span key={i} style={{
              fontSize: 11.5, color: isDark ? '#A1A1A1' : 'var(--r360-text-2, #1A1A2E)',
              background: isDark ? '#1A1A1A' : 'var(--r360-surface, #FFFFFF)', borderRadius: 4,
              padding: '3px 8px', fontWeight: 600,
              border: isDark ? '1px solid #2E2E2E' : '1px solid var(--r360-border, #C5BDB3)',
            }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
        <StatCard label="Total" value={summary?.total_items ?? '–'} color="var(--r360-text-1, #0A0A0A)" isDark={isDark} />
        <StatCard label="To Do" value={summary?.todo_count ?? '–'} color="var(--r360-todo, #E23636)" isDark={isDark} />
        <StatCard label="In Progress" value={summary?.in_progress_count ?? summary?.progress_count ?? '–'} color="var(--r360-progress, #2563EB)" isDark={isDark} />
        <StatCard label="Done" value={summary?.done_count ?? '–'} color="var(--r360-done, #0E8A5F)" isDark={isDark} />
      </div>
    </header>
  );
};

export default ResourceBanner;
