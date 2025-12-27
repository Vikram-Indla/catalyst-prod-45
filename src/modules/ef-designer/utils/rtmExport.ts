import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface ExportData {
  epics: Array<{
    id: string;
    epic_key: string;
    name: string;
    description?: string | null;
  }>;
  features: Array<{
    id: string;
    epic_id: string;
    feature_key: string;
    name: string;
    description?: string | null;
  }>;
  atoms: Array<{
    id: string;
    atom_key: string;
    text: string;
    type: string;
    priority: string;
    status: string;
    mapped_to_feature_id?: string | null;
  }>;
  sessionName?: string;
}

export function exportRTMToCSV(data: ExportData): string {
  const rows: string[][] = [];
  
  // Header
  rows.push(['Epic Key', 'Epic Name', 'Feature Key', 'Feature Name', 'Req ID', 'Requirement', 'Type', 'Priority', 'Status']);
  
  // Build hierarchy
  data.epics.forEach(epic => {
    const epicFeatures = data.features.filter(f => f.epic_id === epic.id);
    
    if (epicFeatures.length === 0) {
      rows.push([epic.epic_key, epic.name, '', '', '', '', '', '', '']);
    } else {
      epicFeatures.forEach(feature => {
        const featureAtoms = data.atoms.filter(a => a.mapped_to_feature_id === feature.id);
        
        if (featureAtoms.length === 0) {
          rows.push([epic.epic_key, epic.name, feature.feature_key, feature.name, '', '', '', '', '']);
        } else {
          featureAtoms.forEach(atom => {
            rows.push([
              epic.epic_key,
              epic.name,
              feature.feature_key,
              feature.name,
              atom.atom_key,
              `"${atom.text.replace(/"/g, '""')}"`,
              atom.type,
              atom.priority,
              atom.status
            ]);
          });
        }
      });
    }
  });
  
  // Add orphan atoms
  const orphanAtoms = data.atoms.filter(a => !a.mapped_to_feature_id);
  orphanAtoms.forEach(atom => {
    rows.push([
      '',
      '',
      '',
      '',
      atom.atom_key,
      `"${atom.text.replace(/"/g, '""')}"`,
      atom.type,
      atom.priority,
      'Unmapped'
    ]);
  });
  
  return rows.map(row => row.join(',')).join('\n');
}

export function exportRTMToExcel(data: ExportData): Blob {
  // Main RTM sheet
  const rtmData: any[][] = [
    ['Epic Key', 'Epic Name', 'Feature Key', 'Feature Name', 'Req ID', 'Requirement', 'Type', 'Priority', 'Status']
  ];
  
  data.epics.forEach(epic => {
    const epicFeatures = data.features.filter(f => f.epic_id === epic.id);
    
    if (epicFeatures.length === 0) {
      rtmData.push([epic.epic_key, epic.name, '', '', '', '', '', '', '']);
    } else {
      epicFeatures.forEach(feature => {
        const featureAtoms = data.atoms.filter(a => a.mapped_to_feature_id === feature.id);
        
        if (featureAtoms.length === 0) {
          rtmData.push([epic.epic_key, epic.name, feature.feature_key, feature.name, '', '', '', '', '']);
        } else {
          featureAtoms.forEach(atom => {
            rtmData.push([
              epic.epic_key,
              epic.name,
              feature.feature_key,
              feature.name,
              atom.atom_key,
              atom.text,
              atom.type,
              atom.priority,
              atom.status
            ]);
          });
        }
      });
    }
  });
  
  // Orphan atoms
  const orphanAtoms = data.atoms.filter(a => !a.mapped_to_feature_id);
  orphanAtoms.forEach(atom => {
    rtmData.push(['', '', '', '', atom.atom_key, atom.text, atom.type, atom.priority, 'Unmapped']);
  });

  // Summary sheet
  const summaryData = [
    ['EFD Session Summary'],
    [''],
    ['Metric', 'Value'],
    ['Total Epics', data.epics.length],
    ['Total Features', data.features.length],
    ['Total Requirements', data.atoms.length],
    ['Mapped Requirements', data.atoms.filter(a => a.status === 'mapped').length],
    ['Unmapped Requirements', data.atoms.filter(a => a.status !== 'mapped').length],
    ['Coverage %', `${data.atoms.length > 0 ? Math.round((data.atoms.filter(a => a.status === 'mapped').length / data.atoms.length) * 100) : 0}%`],
  ];

  // Epics sheet
  const epicsData = [
    ['Epic Key', 'Name', 'Description', 'Features Count', 'Requirements Count']
  ];
  data.epics.forEach(epic => {
    const featureCount = data.features.filter(f => f.epic_id === epic.id).length;
    const epicFeatureIds = data.features.filter(f => f.epic_id === epic.id).map(f => f.id);
    const reqCount = data.atoms.filter(a => epicFeatureIds.includes(a.mapped_to_feature_id || '')).length;
    epicsData.push([epic.epic_key, epic.name, epic.description || '', featureCount.toString(), reqCount.toString()]);
  });

  // Features sheet
  const featuresData = [
    ['Feature Key', 'Name', 'Description', 'Epic Key', 'Requirements Count']
  ];
  data.features.forEach(feature => {
    const epic = data.epics.find(e => e.id === feature.epic_id);
    const reqCount = data.atoms.filter(a => a.mapped_to_feature_id === feature.id).length;
    featuresData.push([feature.feature_key, feature.name, feature.description || '', epic?.epic_key || '', reqCount.toString()]);
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  const rtmSheet = XLSX.utils.aoa_to_sheet(rtmData);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  const epicsSheet = XLSX.utils.aoa_to_sheet(epicsData);
  const featuresSheet = XLSX.utils.aoa_to_sheet(featuresData);
  
  XLSX.utils.book_append_sheet(wb, rtmSheet, 'RTM');
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(wb, epicsSheet, 'Epics');
  XLSX.utils.book_append_sheet(wb, featuresSheet, 'Features');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function exportRTMToPDF(data: ExportData): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = 20;
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Requirements Traceability Matrix', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  // Summary stats
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const mappedCount = data.atoms.filter(a => a.status === 'mapped').length;
  const coverage = data.atoms.length > 0 ? Math.round((mappedCount / data.atoms.length) * 100) : 0;
  
  const stats = [
    `Epics: ${data.epics.length}`,
    `Features: ${data.features.length}`,
    `Requirements: ${data.atoms.length}`,
    `Mapped: ${mappedCount}`,
    `Coverage: ${coverage}%`
  ];
  
  doc.text(stats.join('  |  '), margin, yPos);
  yPos += 15;
  
  // Hierarchy
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Hierarchy', margin, yPos);
  yPos += 10;
  
  data.epics.forEach(epic => {
    // Check if we need a new page
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    // Epic
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(124, 58, 237); // violet
    doc.text(`${epic.epic_key}: ${epic.name}`, margin, yPos);
    yPos += 6;
    
    const epicFeatures = data.features.filter(f => f.epic_id === epic.id);
    
    epicFeatures.forEach(feature => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      // Feature
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 184, 166); // teal
      doc.text(`  ${feature.feature_key}: ${feature.name}`, margin, yPos);
      yPos += 5;
      
      const featureAtoms = data.atoms.filter(a => a.mapped_to_feature_id === feature.id);
      
      featureAtoms.forEach(atom => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        // Atom
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const atomText = `    ${atom.atom_key}: ${atom.text.slice(0, 80)}${atom.text.length > 80 ? '...' : ''}`;
        doc.text(atomText, margin, yPos);
        yPos += 4;
      });
      
      yPos += 2;
    });
    
    yPos += 5;
  });
  
  // Unmapped requirements
  const orphans = data.atoms.filter(a => !a.mapped_to_feature_id);
  if (orphans.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6); // amber
    doc.text(`Unmapped Requirements (${orphans.length})`, margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    orphans.slice(0, 20).forEach(atom => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const atomText = `${atom.atom_key}: ${atom.text.slice(0, 90)}${atom.text.length > 90 ? '...' : ''}`;
      doc.text(atomText, margin, yPos);
      yPos += 4;
    });
    
    if (orphans.length > 20) {
      doc.text(`... and ${orphans.length - 20} more`, margin, yPos);
    }
  }
  
  return doc.output('blob');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}
