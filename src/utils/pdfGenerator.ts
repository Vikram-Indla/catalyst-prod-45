import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportData {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  notRunTests: number;
  passRate: number;
}

export const generateReportPDF = async (reportData: ReportData, chartElement?: HTMLElement) => {
  const doc = new jsPDF();
  
  // Header with brand colors
  doc.setFillColor(26, 26, 26); // #1a1a1a
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(254, 255, 255); // #feffff
  doc.setFontSize(20);
  doc.text('Test Report', 15, 20);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 27);
  
  // Content with gold accent
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(14);
  doc.text('Summary', 15, 45);
  
  doc.setFontSize(12);
  doc.text(`Total Tests: ${reportData.totalTests}`, 15, 60);
  doc.text(`Passed: ${reportData.passedTests}`, 15, 70);
  doc.text(`Failed: ${reportData.failedTests}`, 15, 80);
  doc.text(`Not Run: ${reportData.notRunTests}`, 15, 90);
  
  // Pass rate with gold color
  doc.setTextColor(198, 156, 109); // #c69c6d gold
  doc.setFontSize(14);
  doc.text(`Pass Rate: ${reportData.passRate}%`, 15, 105);
  
  // Add chart if available
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 15, 120, 180, 100);
    } catch (error) {
      console.error('Error capturing chart:', error);
    }
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(8);
  doc.text(`Page ${pageCount}`, 190, 285);
  
  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(`${filename}.pdf`);
};
