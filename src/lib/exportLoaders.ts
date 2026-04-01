/**
 * Shared lazy loaders for heavy export libraries.
 * Consolidates 26+ duplicate loader definitions across the codebase.
 */

export const loadJsPDF = () => import('jspdf').then(m => m.default || m.jsPDF);
export const loadXLSX = () => import('xlsx');
export const loadExcelJS = () => import('exceljs');
