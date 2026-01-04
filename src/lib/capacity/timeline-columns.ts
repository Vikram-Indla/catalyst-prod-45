/**
 * Timeline Columns Utility
 * Generates aligned column headers for Weekly, Monthly, and Quarterly views
 */

export interface TimelineColumn {
  id: string;
  label: string;
  width: number;
  startDate: Date;
  endDate: Date;
}

export const RESOURCE_COLUMN_WIDTH = 220;
export const WEEK_COLUMN_WIDTH = 100;
export const MONTH_COLUMN_WIDTH = 150;
export const QUARTER_COLUMN_WIDTH = 250;

export function generateWeeklyColumns(startDate: Date, count: number = 12): TimelineColumn[] {
  const columns: TimelineColumn[] = [];
  const current = new Date(startDate);
  
  for (let i = 0; i < count; i++) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    columns.push({
      id: `week-${i}`,
      label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} '${weekStart.getFullYear().toString().slice(-2)}`,
      width: WEEK_COLUMN_WIDTH,
      startDate: new Date(weekStart),
      endDate: new Date(weekEnd),
    });
    current.setDate(current.getDate() + 7);
  }
  return columns;
}

export function generateMonthlyColumns(startDate: Date, count: number = 6): TimelineColumn[] {
  const columns: TimelineColumn[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  
  for (let i = 0; i < count; i++) {
    columns.push({
      id: `month-${i}`,
      label: `${current.toLocaleDateString('en-US', { month: 'short' })} '${current.getFullYear().toString().slice(-2)}`,
      width: MONTH_COLUMN_WIDTH,
      startDate: new Date(current),
      endDate: new Date(current.getFullYear(), current.getMonth() + 1, 0),
    });
    current.setMonth(current.getMonth() + 1);
  }
  return columns;
}

export function generateQuarterlyColumns(startDate: Date, count: number = 4): TimelineColumn[] {
  const columns: TimelineColumn[] = [];
  const quarterStart = Math.floor(startDate.getMonth() / 3) * 3;
  const current = new Date(startDate.getFullYear(), quarterStart, 1);
  
  for (let i = 0; i < count; i++) {
    const qNum = Math.floor(current.getMonth() / 3) + 1;
    columns.push({
      id: `quarter-${i}`,
      label: `Q${qNum} '${current.getFullYear().toString().slice(-2)}`,
      width: QUARTER_COLUMN_WIDTH,
      startDate: new Date(current),
      endDate: new Date(current.getFullYear(), current.getMonth() + 3, 0),
    });
    current.setMonth(current.getMonth() + 3);
  }
  return columns;
}

export function generateGridTemplate(columns: TimelineColumn[]): string {
  return `${RESOURCE_COLUMN_WIDTH}px ${columns.map(c => `${c.width}px`).join(' ')}`;
}

export function getTotalWidth(columns: TimelineColumn[]): number {
  return RESOURCE_COLUMN_WIDTH + columns.reduce((sum, c) => sum + c.width, 0);
}

export function getColumnCount(period: 'weekly' | 'monthly' | 'quarterly'): number {
  switch (period) {
    case 'weekly': return 12;
    case 'monthly': return 6;
    case 'quarterly': return 4;
  }
}

export function generateColumns(
  period: 'weekly' | 'monthly' | 'quarterly',
  startDate: Date = new Date()
): TimelineColumn[] {
  switch (period) {
    case 'weekly':
      return generateWeeklyColumns(startDate, 12);
    case 'monthly':
      return generateMonthlyColumns(startDate, 6);
    case 'quarterly':
      return generateQuarterlyColumns(startDate, 4);
  }
}
