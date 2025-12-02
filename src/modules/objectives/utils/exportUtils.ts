import type { Objective } from '@/hooks/useObjectives';

export function exportObjectivesToCSV(objectives: Objective[], filename = 'objectives.csv') {
  const headers = [
    'ID',
    'Summary',
    'Tier',
    'Status',
    'Health',
    'Category',
    'Type',
    'Score',
    'KR Progress',
    'Work Progress',
    'Owner ID',
    'Portfolio ID',
    'Program ID',
    'Team ID',
    'Start Date',
    'Due Date',
    'Is Blocked',
    'Created At',
  ];

  const rows = objectives.map((obj) => [
    obj.id,
    `"${obj.summary.replace(/"/g, '""')}"`,
    obj.tier,
    obj.status,
    obj.health || '',
    obj.category || '',
    obj.type || '',
    obj.score?.toFixed(2) || '',
    (obj.key_result_progress * 100).toFixed(1) + '%',
    (obj.work_progress * 100).toFixed(1) + '%',
    obj.owner_id || '',
    obj.portfolio_id || '',
    obj.program_id || '',
    obj.team_id || '',
    obj.start_date || '',
    obj.due_date || '',
    obj.is_blocked ? 'Yes' : 'No',
    new Date(obj.created_at).toISOString(),
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

export function exportObjectiveToJSON(objective: Objective) {
  const jsonString = JSON.stringify(objective, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `objective-${objective.id}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
