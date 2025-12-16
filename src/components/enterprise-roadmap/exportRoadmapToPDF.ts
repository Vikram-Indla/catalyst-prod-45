// ═══════════════════════════════════════════════════════════════════════════════
// Export Enterprise Roadmap to PDF - Landscape Mode
// ═══════════════════════════════════════════════════════════════════════════════

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ExportOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
}

/**
 * Exports the roadmap Gantt chart to a well-formatted landscape PDF
 */
export async function exportRoadmapToPDF(
  ganttElement: HTMLElement,
  themePanelElement: HTMLElement | null,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `enterprise-roadmap-${new Date().toISOString().split('T')[0]}.pdf`,
    title = 'Enterprise Roadmap',
    subtitle = 'Strategic Theme Timeline',
  } = options;

  // Store original styles
  const originalGanttStyles = {
    overflow: ganttElement.style.overflow,
    overflowX: ganttElement.style.overflowX,
    overflowY: ganttElement.style.overflowY,
  };

  try {
    // Temporarily expand the Gantt to show all content
    ganttElement.style.overflow = 'visible';
    ganttElement.style.overflowX = 'visible';
    ganttElement.style.overflowY = 'visible';

    // Wait for reflow
    await new Promise(resolve => setTimeout(resolve, 150));

    // Capture the Gantt chart
    const ganttCanvas = await html2canvas(ganttElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FAFBFC',
      logging: false,
      windowWidth: ganttElement.scrollWidth,
      windowHeight: ganttElement.scrollHeight,
      width: ganttElement.scrollWidth,
      height: ganttElement.scrollHeight,
    });

    // Capture theme panel if available
    let themePanelCanvas: HTMLCanvasElement | null = null;
    if (themePanelElement) {
      const originalThemeStyles = {
        overflow: themePanelElement.style.overflow,
        overflowY: themePanelElement.style.overflowY,
      };
      themePanelElement.style.overflow = 'visible';
      themePanelElement.style.overflowY = 'visible';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      themePanelCanvas = await html2canvas(themePanelElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: themePanelElement.scrollWidth,
        windowHeight: themePanelElement.scrollHeight,
        width: themePanelElement.scrollWidth,
        height: themePanelElement.scrollHeight,
      });
      
      // Restore theme panel styles
      themePanelElement.style.overflow = originalThemeStyles.overflow;
      themePanelElement.style.overflowY = originalThemeStyles.overflowY;
    }

    // Create PDF in landscape A4
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    const margin = 10;
    const headerHeight = 20;
    const footerHeight = 8;
    const contentHeight = pageHeight - headerHeight - footerHeight - (margin * 2);

    // Generate date string
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Calculate dimensions
    const themePanelWidth = themePanelCanvas ? 60 : 0; // mm for theme panel
    const ganttWidth = pageWidth - (margin * 2) - themePanelWidth - 5;
    
    // Scale factor for Gantt
    const ganttScaleFactor = ganttWidth / (ganttCanvas.width / 2); // /2 because scale:2
    const ganttScaledHeight = (ganttCanvas.height / 2) * ganttScaleFactor;
    
    // Calculate pages needed
    const totalPages = Math.ceil(ganttScaledHeight / contentHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      // === HEADER ===
      // Brand bar
      pdf.setFillColor(26, 26, 26); // brand-dark
      pdf.rect(0, 0, pageWidth, 6, 'F');
      
      // Gold accent line
      pdf.setFillColor(198, 156, 109); // brand-gold
      pdf.rect(0, 6, pageWidth, 1, 'F');

      // Title
      pdf.setFontSize(16);
      pdf.setTextColor(26, 26, 26);
      pdf.text(title, margin, margin + 12);

      // Subtitle and date
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${subtitle} • Generated: ${dateStr}`, margin, margin + 17);

      // === CONTENT ===
      const contentStartY = headerHeight + margin;
      
      // Calculate slice of canvas to render
      const sourceY = page * (contentHeight / ganttScaleFactor) * 2; // *2 for scale
      const sourceHeight = Math.min(
        (contentHeight / ganttScaleFactor) * 2,
        ganttCanvas.height - sourceY
      );

      if (sourceHeight > 0) {
        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = ganttCanvas.width;
        pageCanvas.height = sourceHeight;
        
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            ganttCanvas,
            0, sourceY,
            ganttCanvas.width, sourceHeight,
            0, 0,
            ganttCanvas.width, sourceHeight
          );
        }

        // Theme panel (only on first page or repeat header)
        const xOffset = margin + (themePanelCanvas ? themePanelWidth + 5 : 0);
        
        // Add theme panel on first page
        if (page === 0 && themePanelCanvas) {
          const themePanelScaleFactor = themePanelWidth / (themePanelCanvas.width / 2);
          const themePanelScaledHeight = Math.min(
            (themePanelCanvas.height / 2) * themePanelScaleFactor,
            contentHeight
          );
          
          pdf.addImage(
            themePanelCanvas.toDataURL('image/png'),
            'PNG',
            margin,
            contentStartY,
            themePanelWidth,
            themePanelScaledHeight
          );
        }

        // Add Gantt slice
        const sliceHeight = (sourceHeight / 2) * ganttScaleFactor;
        pdf.addImage(
          pageCanvas.toDataURL('image/png'),
          'PNG',
          xOffset,
          contentStartY,
          ganttWidth,
          Math.min(sliceHeight, contentHeight)
        );
      }

      // === FOOTER ===
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      
      // Page number
      pdf.text(
        `Page ${page + 1} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - margin,
        { align: 'center' }
      );
      
      // Branding
      pdf.text(
        'Generated by Catalyst',
        pageWidth - margin,
        pageHeight - margin,
        { align: 'right' }
      );
    }

    // Save the PDF
    pdf.save(filename);
  } finally {
    // Restore original styles
    ganttElement.style.overflow = originalGanttStyles.overflow;
    ganttElement.style.overflowX = originalGanttStyles.overflowX;
    ganttElement.style.overflowY = originalGanttStyles.overflowY;
  }
}
