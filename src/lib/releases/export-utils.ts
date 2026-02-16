/**
 * ReleaseHub V2 — Export utilities
 */
import type { ReleaseV2 } from '@/hooks/releases/useReleasesV2';

export function exportReleasesToCSV(releases: ReleaseV2[]): void {
  const headers = [
    'Name','Version','Status','Health Score','Health Level',
    'Start Date','Target Date','Progress %',
    'Passed Tests','Failed Tests','Total Tests',
    'Open Defects','Blocker Defects','Critical Defects',
    'Coverage %','Days Until Target','Owner',
  ];

  const rows = releases.map(r => [
    r.name, r.version, r.status, r.health_score, r.health_level,
    r.start_date || '', r.target_date || '', r.progress,
    r.test_cases_passed, r.test_cases_failed, r.test_cases_total,
    r.defects_open, r.blocker_defects, r.critical_defects,
    r.coverage_percent, r.days_until_target, r.owner_name || 'Unassigned',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `catalyst-releases-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
