/**
 * Chat History Export Utility
 * Export chat conversations as PDF or Markdown
 */
import jsPDF from 'jspdf';
import type { ChatMessage, PdfExportOptions, MarkdownExportOptions } from './types';

/**
 * Export chat messages as Markdown
 */
export const exportChatAsMarkdown = (
  messages: ChatMessage[],
  options: MarkdownExportOptions
): string => {
  if (messages.length === 0) {
    throw new Error('No messages to export');
  }

  const title = options.title || 'AI Conversation';
  const exportDate = new Date().toLocaleString();

  let markdown = `# ${title}\n\n`;
  markdown += `**Exported:** ${exportDate}\n\n`;
  markdown += `---\n\n`;

  messages.forEach((message, index) => {
    const role = message.role === 'user' ? '👤 You' : '🤖 AI Assistant';
    const timestamp = message.timestamp 
      ? new Date(message.timestamp).toLocaleString() 
      : '';
    
    markdown += `### ${role}\n\n`;
    markdown += `${message.content}\n\n`;
    if (timestamp) {
      markdown += `*${timestamp}*\n\n`;
    }
    if (index < messages.length - 1) {
      markdown += `---\n\n`;
    }
  });

  // Create and download file
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = options.includeTimestamp !== false 
    ? `-${new Date().toISOString().split('T')[0]}` 
    : '';
  const filename = `${options.filename}${timestamp}.md`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
};

/**
 * Export chat messages as PDF
 */
export const exportChatAsPdf = async (
  messages: ChatMessage[],
  options: PdfExportOptions
): Promise<string> => {
  if (messages.length === 0) {
    throw new Error('No messages to export');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  
  let yPosition = margin;

  // Brand header
  const brandName = options.brandName || 'Catalyst Platform';
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(brandName, margin, yPosition);
  doc.text(new Date().toLocaleDateString(), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 10;

  // Title
  const title = options.title || 'AI Conversation';
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text(title, margin, yPosition);
  yPosition += 12;

  // Separator line
  doc.setDrawColor(200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Messages
  messages.forEach((message) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = margin;
    }

    // Role header
    const role = message.role === 'user' ? 'You' : 'AI Assistant';
    const bgColor = message.role === 'user' ? [240, 240, 245] : [232, 245, 243];
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(role, margin, yPosition);
    yPosition += 6;

    // Message content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50);
    
    // Word wrap the content
    const lines = doc.splitTextToSize(message.content, contentWidth);
    
    lines.forEach((line: string) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });

    // Timestamp
    if (message.timestamp) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      const timestamp = new Date(message.timestamp).toLocaleString();
      doc.text(timestamp, margin, yPosition);
      yPosition += 4;
    }

    yPosition += 6;

    // Message separator
    if (yPosition < pageHeight - 20) {
      doc.setDrawColor(230);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
    }
  });

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const timestamp = options.includeTimestamp !== false 
    ? `-${new Date().toISOString().split('T')[0]}` 
    : '';
  const filename = `${options.filename}${timestamp}.pdf`;

  doc.save(filename);

  return filename;
};
