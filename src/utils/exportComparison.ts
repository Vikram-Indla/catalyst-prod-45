/**
 * Export utility for Release Comparison data
 */

import { ComparedRelease } from '@/features/release-compare';

interface ComparisonExportData {
  releases: ComparedRelease[];
  generatedAt: string;
}

export async function exportComparison(
  data: ComparisonExportData,
  format: 'pdf' | 'excel'
): Promise<void> {
  const { releases, generatedAt } = data;

  if (format === 'excel') {
    await exportAsExcel(releases, generatedAt);
  } else {
    await exportAsPdf(releases, generatedAt);
  }
}

async function exportAsExcel(releases: ComparedRelease[], generatedAt: string): Promise<void> {
  // Build CSV content for Excel
  const headers = [
    'Version',
    'Name',
    'Status',
    'Target Date',
    'Days Remaining',
    'Health Score',
    'Health Level',
    'Test Progress %',
    'Tests Executed',
    'Tests Total',
    'Pass Rate %',
    'Passed',
    'Failed',
    'Blocked',
    'Not Run',
    'Blocker Defects',
    'Critical Defects',
    'Major Defects',
    'Minor Defects',
    'Total Defects',
    'Quality Gates Passing',
    'Quality Gates Failing',
    'Work Items Complete',
    'Work Items In Progress',
    'Work Items Total',
  ];

  const rows = releases.map((r) => [
    r.version,
    r.name,
    r.status,
    r.targetDate,
    r.daysRemaining,
    r.metrics.healthScore,
    r.metrics.healthLevel,
    r.metrics.testProgress.percentage,
    r.metrics.testProgress.executed,
    r.metrics.testProgress.total,
    r.metrics.passRate.percentage,
    r.metrics.testBreakdown.passed,
    r.metrics.testBreakdown.failed,
    r.metrics.testBreakdown.blocked,
    r.metrics.testBreakdown.notRun,
    r.metrics.defects.blocker,
    r.metrics.defects.critical,
    r.metrics.defects.major,
    r.metrics.defects.minor,
    r.metrics.defects.total,
    r.metrics.qualityGates.passing,
    r.metrics.qualityGates.failing,
    r.metrics.workItems.complete,
    r.metrics.workItems.inProgress,
    r.metrics.workItems.total,
  ]);

  const csvContent = [
    `Release Comparison - Generated: ${new Date(generatedAt).toLocaleString()}`,
    '',
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  // Download as CSV (Excel compatible)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `release-comparison-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportAsPdf(releases: ComparedRelease[], generatedAt: string): Promise<void> {
  // Build HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Release Comparison Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        .generated { color: #64748b; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f1f5f9; color: #475569; text-align: left; padding: 12px 8px; border: 1px solid #e2e8f0; }
        td { padding: 10px 8px; border: 1px solid #e2e8f0; }
        .health-healthy { background: #dcfce7; color: #166534; }
        .health-attention { background: #fef3c7; color: #92400e; }
        .health-at_risk { background: #fed7aa; color: #9a3412; }
        .health-critical { background: #fee2e2; color: #991b1b; }
        .metric-label { font-weight: 600; color: #475569; }
        .section { margin-top: 30px; }
        .section-title { font-size: 16px; font-weight: 600; color: rgba(237,237,237,0.53); margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <h1>Release Comparison Report</h1>
      <p class="generated">Generated: ${new Date(generatedAt).toLocaleString()}</p>
      
      <table>
        <thead>
          <tr>
            <th>Release</th>
            <th>Status</th>
            <th>Health</th>
            <th>Test Progress</th>
            <th>Pass Rate</th>
            <th>Defects</th>
            <th>Quality Gates</th>
          </tr>
        </thead>
        <tbody>
          ${releases
            .map(
              (r) => `
            <tr>
              <td><strong>${r.version}</strong><br/>${r.name}</td>
              <td>${r.status}</td>
              <td class="health-${r.metrics.healthLevel}">${r.metrics.healthScore}%</td>
              <td>${r.metrics.testProgress.percentage}% (${r.metrics.testProgress.executed}/${r.metrics.testProgress.total})</td>
              <td>${r.metrics.passRate.percentage}%</td>
              <td>B:${r.metrics.defects.blocker} C:${r.metrics.defects.critical} M:${r.metrics.defects.major}</td>
              <td>${r.metrics.qualityGates.passing}/${r.metrics.qualityGates.total} passing</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      
      <div class="section">
        <div class="section-title">Detailed Breakdown</div>
        ${releases
          .map(
            (r) => `
          <h3>${r.version} - ${r.name}</h3>
          <table>
            <tr><td class="metric-label">Target Date</td><td>${r.targetDate} (${r.daysRemaining} days remaining)</td></tr>
            <tr><td class="metric-label">Test Breakdown</td><td>Passed: ${r.metrics.testBreakdown.passed} | Failed: ${r.metrics.testBreakdown.failed} | Blocked: ${r.metrics.testBreakdown.blocked} | Not Run: ${r.metrics.testBreakdown.notRun}</td></tr>
            <tr><td class="metric-label">Work Items</td><td>Complete: ${r.metrics.workItems.complete}/${r.metrics.workItems.total} | In Progress: ${r.metrics.workItems.inProgress}</td></tr>
          </table>
        `
          )
          .join('')}
      </div>
    </body>
    </html>
  `;

  // Open print dialog for PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
