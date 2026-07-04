/**
 * Shared lazy loaders for heavy export libraries.
 * Consolidates 26+ duplicate loader definitions across the codebase.
 */

export const loadJsPDF = () => import('jspdf').then(m => m.default || m.jsPDF);
export const loadXLSX = () => import('xlsx');
export const loadExcelJS = () => import('exceljs');
export const loadPapaparse = () => import('papaparse');
export const loadJsPDFAutoTable = () => import('jspdf-autotable').then(m => m.default);
export const loadFileSaver = () => import('file-saver').then(m => m.saveAs);
