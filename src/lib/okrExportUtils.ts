export interface OKRExportRow {
  id: string;
  summary: string;
  status: string;
  score: number | null;
  kr_progress: string;
  work_progress: string;
  tier: string;
  program_increment: string;
  owner: string;
  start_date: string;
  due_date: string;
}

export function exportOKRsToCSV(objectives: OKRExportRow[], filename = 'okr-export.csv') {
  const headers = [
    'ID',
    'Objective',
    'Status',
    'Score',
    'KR Progress',
    'Work Progress',
    'Tier',
    'Program Increment',
    'Owner',
    'Start Date',
    'Due Date',
  ];

  const rows = objectives.map((obj) => [
    obj.id.slice(0, 8),
    `"${obj.summary.replace(/"/g, '""')}"`,
    obj.status,
    obj.score !== null ? obj.score.toFixed(2) : 'N/A',
    obj.kr_progress,
    obj.work_progress,
    obj.tier,
    obj.program_increment || 'N/A',
    obj.owner || 'Unassigned',
    obj.start_date || 'N/A',
    obj.due_date || 'N/A',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
