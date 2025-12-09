/**
 * Capacity Planning PDF Generator
 * Generates professionally formatted PDF reports with Catalyst branding
 */

import jsPDF from 'jspdf';
import { Resource, CapacityProject, Vacancy } from '@/types/capacity';

interface CapacityReportData {
  resources: Resource[];
  projects: CapacityProject[];
  vacancies: Vacancy[];
  currentWeek: number;
  currentYear: number;
  period: 'weekly' | 'monthly' | 'yearly';
}

// Calculate resource utilization
function calculateUtilization(allocations: Resource['allocations'], weekNumber: number, year: number): number {
  return allocations
    .filter(a => a.weekNumber === weekNumber && a.year === year)
    .reduce((sum, a) => sum + a.percentage, 0);
}

export const generateCapacityPDF = async (data: CapacityReportData): Promise<jsPDF> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  // Colors
  const brandDark = [26, 26, 26] as [number, number, number];
  const brandGold = [198, 156, 109] as [number, number, number];
  const brandGoldLight = [240, 230, 218] as [number, number, number];
  const white = [255, 255, 255] as [number, number, number];
  const gray = [107, 114, 128] as [number, number, number];
  const grayLight = [243, 244, 246] as [number, number, number];
  
  // Calculate stats
  let totalFTE = data.resources.length;
  let allocatedFTE = 0;
  let fullCount = 0;
  let underCount = 0;
  let overCount = 0;
  
  data.resources.forEach(r => {
    const util = calculateUtilization(r.allocations, data.currentWeek, data.currentYear);
    allocatedFTE += util / 100;
    if (util > 100) overCount++;
    else if (util >= 80) fullCount++;
    else underCount++;
  });
  
  const utilizationRate = totalFTE > 0 ? Math.round((allocatedFTE / totalFTE) * 100) : 0;
  const openVacancies = data.vacancies.filter(v => v.status === 'OPEN').length;

  // Header background
  doc.setFillColor(...brandDark);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Gold accent line
  doc.setFillColor(...brandGold);
  doc.rect(0, 35, pageWidth, 2, 'F');
  
  // Logo placeholder (gold circle with C)
  doc.setFillColor(...brandGold);
  doc.circle(margin + 8, 17.5, 8, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('C', margin + 5.5, 21);
  
  // Title
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CATALYST', margin + 20, 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...brandGold);
  doc.text('Ministry of Investment', margin + 20, 19);
  
  // Report title
  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Capacity Report', pageWidth / 2, 18, { align: 'center' });
  
  // Period
  const getPeriodLabel = () => {
    switch (data.period) {
      case 'weekly': return `Week ${data.currentWeek}, ${data.currentYear}`;
      case 'monthly': return `December ${data.currentYear}`;
      case 'yearly': return `${data.currentYear}`;
    }
  };
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(getPeriodLabel(), pageWidth / 2, 26, { align: 'center' });
  
  // Generated date (right side)
  doc.setFontSize(7);
  doc.setTextColor(...brandGold);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric' 
  })}`, pageWidth - margin, 14, { align: 'right' });
  doc.text('Prepared by: Resource Management', pageWidth - margin, 19, { align: 'right' });
  
  let yPos = 48;
  
  // Summary Cards Section
  doc.setFillColor(...grayLight);
  doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
  
  // Card headers
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...gray);
  
  const cardWidth = (contentWidth - 15) / 4;
  const cards = [
    { title: 'CAPACITY OVERVIEW', value1: `${totalFTE}`, label1: 'Total FTE', value2: `${allocatedFTE.toFixed(1)}`, label2: 'Allocated FTE' },
    { title: 'RESOURCE DISTRIBUTION', items: [
      { label: 'Fully Allocated', value: `${fullCount} (${Math.round(fullCount/totalFTE*100)}%)`, color: [92, 124, 92] },
      { label: 'Underallocated', value: `${underCount} (${Math.round(underCount/totalFTE*100)}%)`, color: [139, 115, 85] },
      { label: 'Overallocated', value: `${overCount} (${Math.round(overCount/totalFTE*100)}%)`, color: [139, 92, 92] }
    ]},
    { title: 'UTILIZATION', value: `${utilizationRate}%` },
    { title: 'ALERTS', items: [
      { label: 'Overallocated', value: `${overCount}`, color: [139, 92, 92] },
      { label: 'Open Vacancies', value: `${openVacancies}`, color: [139, 115, 85] }
    ]}
  ];
  
  // Draw cards
  cards.forEach((card, i) => {
    const x = margin + 3 + (i * (cardWidth + 3));
    doc.setFillColor(...white);
    doc.roundedRect(x, yPos + 3, cardWidth, 29, 2, 2, 'F');
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gray);
    doc.text(card.title, x + 3, yPos + 8);
    
    if ('value1' in card) {
      doc.setFontSize(14);
      doc.setTextColor(...brandGold);
      doc.text(card.value1, x + 8, yPos + 18);
      doc.text(card.value2, x + cardWidth/2 + 5, yPos + 18);
      doc.setFontSize(5);
      doc.setTextColor(...gray);
      doc.text(card.label1, x + 3, yPos + 23);
      doc.text(card.label2, x + cardWidth/2, yPos + 23);
    } else if ('items' in card) {
      card.items.forEach((item, j) => {
        doc.setFontSize(6);
        doc.setFillColor(...(item.color as [number, number, number]));
        doc.circle(x + 5, yPos + 14 + j * 6, 1.5, 'F');
        doc.setTextColor(...brandDark);
        doc.text(item.label, x + 9, yPos + 15 + j * 6);
        doc.setTextColor(...(item.color as [number, number, number]));
        doc.setFont('helvetica', 'bold');
        doc.text(item.value, x + cardWidth - 5, yPos + 15 + j * 6, { align: 'right' });
        doc.setFont('helvetica', 'normal');
      });
    } else if ('value' in card) {
      doc.setFontSize(20);
      doc.setTextColor(...brandGold);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, x + cardWidth/2, yPos + 22, { align: 'center' });
    }
  });
  
  yPos += 45;
  
  // Project Breakdown Section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...brandDark);
  doc.text('PROJECT BREAKDOWN', margin, yPos);
  yPos += 5;
  
  // Table header
  doc.setFillColor(...brandGoldLight);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.setFontSize(6);
  doc.setTextColor(...gray);
  
  const colWidths = [55, 25, 25, 25, 25, 25];
  const headers = ['Project', 'Total %', 'Resources', 'Hard %', 'Soft %', 'Vacancies'];
  let xPos = margin + 3;
  headers.forEach((h, i) => {
    doc.text(h, xPos, yPos + 5);
    xPos += colWidths[i];
  });
  yPos += 9;
  
  // Project rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...brandDark);
  
  data.projects.forEach((project) => {
    let totalAlloc = 0;
    let hardAlloc = 0;
    let softAlloc = 0;
    const assignedResources = new Set<string>();
    
    data.resources.forEach(r => {
      r.allocations
        .filter(a => a.projectId === project.id && a.weekNumber === data.currentWeek && a.year === data.currentYear)
        .forEach(a => {
          totalAlloc += a.percentage;
          if (a.type === 'HARD') hardAlloc += a.percentage;
          else softAlloc += a.percentage;
          assignedResources.add(r.id);
        });
    });
    
    const projectVacancies = data.vacancies.filter(v => v.projectId === project.id && v.status === 'OPEN').length;
    
    if (totalAlloc === 0 && projectVacancies === 0) return;
    
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    
    // Alternating row background
    doc.setFillColor(...(yPos % 16 < 8 ? white : grayLight));
    doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    
    xPos = margin + 3;
    doc.setFontSize(7);
    
    // Project name with color dot
    const [r, g, b] = project.color.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [198, 156, 109];
    doc.setFillColor(r, g, b);
    doc.circle(xPos + 1, yPos, 1.5, 'F');
    doc.text(project.name.substring(0, 25), xPos + 5, yPos + 1);
    xPos += colWidths[0];
    
    doc.setTextColor(...brandGold);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalAlloc}%`, xPos, yPos + 1);
    xPos += colWidths[1];
    
    doc.setTextColor(...brandDark);
    doc.setFont('helvetica', 'normal');
    doc.text(`${assignedResources.size}`, xPos, yPos + 1);
    xPos += colWidths[2];
    
    doc.text(`${hardAlloc}%`, xPos, yPos + 1);
    xPos += colWidths[3];
    
    doc.text(`${softAlloc}%`, xPos, yPos + 1);
    xPos += colWidths[4];
    
    if (projectVacancies > 0) {
      doc.setTextColor(...[139, 115, 85] as [number, number, number]);
      doc.text(`${projectVacancies}`, xPos, yPos + 1);
    } else {
      doc.text('-', xPos, yPos + 1);
    }
    
    yPos += 7;
  });
  
  yPos += 10;
  
  // Resource Summary Section
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...brandDark);
  doc.text('RESOURCE SUMMARY', margin, yPos);
  yPos += 5;
  
  // Resource table header
  doc.setFillColor(...brandGoldLight);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.setFontSize(6);
  doc.setTextColor(...gray);
  
  const resColWidths = [45, 45, 25, 45, 20];
  const resHeaders = ['Resource', 'Role', 'Utilization', 'Primary Project', 'Status'];
  xPos = margin + 3;
  resHeaders.forEach((h, i) => {
    doc.text(h, xPos, yPos + 5);
    xPos += resColWidths[i];
  });
  yPos += 9;
  
  // Resource rows
  doc.setFont('helvetica', 'normal');
  
  data.resources.forEach((resource) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
    }
    
    const util = calculateUtilization(resource.allocations, data.currentWeek, data.currentYear);
    const status = util > 100 ? 'Over' : util >= 80 ? 'Full' : 'Under';
    const statusColor = util > 100 ? [139, 92, 92] : util >= 80 ? [92, 124, 92] : [139, 115, 85];
    
    // Find primary project
    const projectAllocations = data.projects.map(p => ({
      project: p,
      total: resource.allocations
        .filter(a => a.projectId === p.id && a.weekNumber === data.currentWeek && a.year === data.currentYear)
        .reduce((s, a) => s + a.percentage, 0)
    })).filter(pa => pa.total > 0).sort((a, b) => b.total - a.total);
    const primaryProject = projectAllocations[0];
    
    // Alternating row
    doc.setFillColor(...(yPos % 16 < 8 ? white : grayLight));
    doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    
    xPos = margin + 3;
    doc.setFontSize(7);
    doc.setTextColor(...brandDark);
    
    doc.setFont('helvetica', 'bold');
    doc.text(resource.name.substring(0, 20), xPos, yPos + 1);
    xPos += resColWidths[0];
    
    doc.setFont('helvetica', 'normal');
    doc.text(resource.role.substring(0, 20), xPos, yPos + 1);
    xPos += resColWidths[1];
    
    doc.setTextColor(...(statusColor as [number, number, number]));
    doc.setFont('helvetica', 'bold');
    doc.text(`${util}%`, xPos + 5, yPos + 1);
    xPos += resColWidths[2];
    
    doc.setTextColor(...brandDark);
    doc.setFont('helvetica', 'normal');
    doc.text(primaryProject ? primaryProject.project.name.substring(0, 20) : '-', xPos, yPos + 1);
    xPos += resColWidths[3];
    
    // Status badge
    doc.setFillColor(...(statusColor as [number, number, number]));
    doc.roundedRect(xPos, yPos - 2, 14, 5, 1, 1, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(5);
    doc.text(status, xPos + 7, yPos + 1.5, { align: 'center' });
    
    yPos += 7;
  });
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...brandGold);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(7);
    doc.text('Capacity Planning Report • Catalyst Platform', margin, pageHeight - 4);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
  }
  
  return doc;
};

export const downloadCapacityPDF = (doc: jsPDF, filename: string) => {
  doc.save(`${filename}.pdf`);
};
