import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResourceMetric, CapacitySummary } from '../types';

interface ExportData {
  resources: ResourceMetric[];
  summary: CapacitySummary;
  period: string;
  generatedAt: Date;
}

export async function exportCapacityToPdf(data: ExportData): Promise<void> {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  // Header - Logo text
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55); // #1f2937
  pdf.text('Cata', margin, 18);
  
  const cataWidth = pdf.getTextWidth('Cata');
  pdf.setTextColor(198, 156, 109); // #c69c6d
  pdf.text('lyst', margin + cataWidth, 18);

  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(31, 41, 55);
  pdf.text('Capacity Planner Report', margin, 30);

  // Subtitle with period and date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text(
    `Period: ${data.period} | Generated: ${data.generatedAt.toLocaleDateString()} ${data.generatedAt.toLocaleTimeString()}`,
    margin,
    38
  );

  // Summary cards
  const summaryY = 45;
  const cardWidth = (pageWidth - 2 * margin - 40) / 5;
  const summaryItems = [
    { label: 'Total Resources', value: data.summary.total, color: [37, 99, 235] },
    { label: 'Available', value: data.summary.available + data.summary.healthy, color: [13, 148, 136] },
    { label: 'At Capacity', value: data.summary.atCapacity, color: [217, 119, 6] },
    { label: 'Over-allocated', value: data.summary.overAllocated, color: [220, 38, 38] },
    { label: 'Avg Utilization', value: `${data.summary.avgUtilization}%`, color: [37, 99, 235] },
  ];

  summaryItems.forEach((item, i) => {
    const x = margin + i * (cardWidth + 10);
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(x, summaryY, cardWidth, 20, 2, 2, 'F');
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(item.color[0], item.color[1], item.color[2]);
    pdf.text(String(item.value), x + 5, summaryY + 12);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(item.label, x + 5, summaryY + 17);
  });

  // Resources table
  const tableY = summaryY + 30;
  const tableData = data.resources.map((r) => [
    r.name,
    r.role || '-',
    r.department || '-',
    r.assignments?.map((a) => a.projects?.name || 'Unknown').join(', ') || 'None',
    `${r.allocation}%`,
    r.allocation > 100 ? 'Over' : r.allocation > 80 ? 'At Capacity' : r.allocation > 0 ? 'Healthy' : 'Available',
  ]);

  autoTable(pdf, {
    startY: tableY,
    head: [['Name', 'Role', 'Division', 'Projects', 'Allocation', 'Status']],
    body: tableData,
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  // Footer
  const finalY = (pdf as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(156, 163, 175);
  pdf.text(
    'Catalyst Enterprise Portfolio Management Platform',
    margin,
    Math.min(finalY + 15, pageHeight - 10)
  );
  pdf.text(
    'Page 1 of 1',
    pageWidth - margin - 20,
    Math.min(finalY + 15, pageHeight - 10)
  );

  // Download
  pdf.save(`Catalyst-Capacity-Report-${new Date().toISOString().split('T')[0]}.pdf`);
}
