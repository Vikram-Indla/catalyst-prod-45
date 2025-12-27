import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface DemandConfirmationData {
  requestId: string;
  submittedAt: Date;
  summary: string;
  businessAsk: string;
  deliveryPlatform: string;
  requestedBy: string;
  email: string;
  department: string;
  businessOwner: string;
  description: string;
}

export const generateDemandConfirmationPDF = (data: DemandConfirmationData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // ========== HEADER ==========
  // Catalyst logo text
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  
  // "Cata" in dark gray
  doc.setTextColor(10, 10, 10); // #0a0a0a
  const cataText = 'Cata';
  const cataWidth = doc.getTextWidth(cataText);
  const logoStartX = (pageWidth - doc.getTextWidth('Catalyst')) / 2;
  doc.text(cataText, logoStartX, y);
  
  // "lyst" in gold
  doc.setTextColor(198, 156, 109); // #c69c6d
  doc.text('lyst', logoStartX + cataWidth, y);
  
  y += 15;

  // Title
  doc.setFontSize(16);
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'bold');
  const title = 'Demand Request Confirmation';
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  
  y += 8;

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(102, 102, 102);
  doc.setFont('helvetica', 'normal');
  doc.text('Official submission receipt for your records', pageWidth / 2, y, { align: 'center' });

  y += 15;

  // ========== REQUEST ID BOX ==========
  const boxX = 30;
  const boxWidth = pageWidth - 60;
  const boxHeight = 40;
  
  // Cream/beige background
  doc.setFillColor(245, 237, 227); // #f5ede3
  doc.roundedRect(boxX, y, boxWidth, boxHeight, 4, 4, 'F');
  
  y += 12;
  
  // "REQUEST ID" label
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  doc.setFont('helvetica', 'normal');
  doc.text('REQUEST ID', pageWidth / 2, y, { align: 'center' });
  
  y += 10;
  
  // Request ID value in gold
  doc.setFontSize(22);
  doc.setTextColor(198, 156, 109); // #c69c6d
  doc.setFont('helvetica', 'bold');
  doc.text(data.requestId, pageWidth / 2, y, { align: 'center' });
  
  y += 10;
  
  // Submitted date
  doc.setFontSize(10);
  doc.setTextColor(102, 102, 102);
  doc.setFont('helvetica', 'normal');
  doc.text(`Submitted: ${format(data.submittedAt, 'd MMMM yyyy \'at\' HH:mm')}`, pageWidth / 2, y, { align: 'center' });
  
  y += 20;

  // ========== REQUEST SUMMARY SECTION ==========
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUEST SUMMARY', 20, y);
  
  y += 2;
  doc.setDrawColor(238, 238, 238);
  doc.line(20, y, pageWidth - 20, y);
  
  y += 10;
  
  // Summary rows
  const drawRow = (label: string, value: string) => {
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 25, y);
    
    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'normal');
    // Truncate long values
    const maxWidth = 100;
    let displayValue = value;
    if (doc.getTextWidth(value) > maxWidth) {
      while (doc.getTextWidth(displayValue + '...') > maxWidth && displayValue.length > 0) {
        displayValue = displayValue.slice(0, -1);
      }
      displayValue += '...';
    }
    doc.text(displayValue, 80, y);
    y += 8;
  };
  
  drawRow('Summary', data.summary);
  drawRow('Business Ask', data.businessAsk);
  drawRow('Delivery Platform', data.deliveryPlatform);
  
  y += 5;

  // ========== REQUESTER INFORMATION SECTION ==========
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUESTER INFORMATION', 20, y);
  
  y += 2;
  doc.setDrawColor(238, 238, 238);
  doc.line(20, y, pageWidth - 20, y);
  
  y += 10;
  
  drawRow('Requested by', data.requestedBy);
  drawRow('Email', data.email);
  drawRow('Department', data.department);
  drawRow('Business Owner', data.businessOwner);
  
  y += 5;

  // ========== DESCRIPTION SECTION ==========
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', 20, y);
  
  y += 2;
  doc.setDrawColor(238, 238, 238);
  doc.line(20, y, pageWidth - 20, y);
  
  y += 8;
  
  // Description box with gold left border
  const descBoxX = 20;
  const descBoxWidth = pageWidth - 40;
  
  // Left border (gold)
  doc.setFillColor(198, 156, 109); // #c69c6d
  doc.rect(descBoxX, y, 3, 30, 'F');
  
  // Background
  doc.setFillColor(249, 249, 249);
  doc.rect(descBoxX + 3, y, descBoxWidth - 3, 30, 'F');
  
  // Description text
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'normal');
  
  const splitDescription = doc.splitTextToSize(data.description, descBoxWidth - 20);
  doc.text(splitDescription.slice(0, 4), descBoxX + 10, y + 8);
  
  y += 45;

  // ========== FOOTER ==========
  doc.setFontSize(9);
  doc.setTextColor(153, 153, 153);
  doc.setFont('helvetica', 'normal');
  doc.text(`Document generated on ${format(new Date(), 'd MMMM yyyy')}`, pageWidth / 2, y, { align: 'center' });
  doc.text(`Reference: ${data.requestId}`, pageWidth / 2, y + 5, { align: 'center' });

  return doc;
};

export const downloadDemandConfirmationPDF = (data: DemandConfirmationData, filename?: string) => {
  const doc = generateDemandConfirmationPDF(data);
  doc.save(filename || `Catalyst-Confirmation-${data.requestId}.pdf`);
};
