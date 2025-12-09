/**
 * Terminology Dictionary for Catalyst
 * Centralized terminology mappings for consistent language across the app
 * PI / Program Increment / Project Increment → Quarter
 */

export const terminology = {
  // Quarter terminology (replaces PI/Program Increment/Project Increment)
  programIncrement: 'Quarter',
  projectIncrement: 'Quarter',
  pi: 'Quarter',
  selectPi: 'Select Quarter',
  piPlanning: 'Quarter Planning',
  piPlanningChecklist: 'Quarter Planning Checklist',
  monitorPi: 'Monitor the Quarter',
  planPi: 'Plan the Quarter',
  
  // Quarter format helper
  formatQuarter: (quarter: number, year: number): string => {
    return `Q${quarter} ${year}`;
  },
  
  // Parse quarter string back to quarter/year
  parseQuarter: (quarterString: string): { quarter: number; year: number } | null => {
    const match = quarterString.match(/Q(\d)\s*(\d{4})/);
    if (match) {
      return { quarter: parseInt(match[1]), year: parseInt(match[2]) };
    }
    return null;
  },
  
  // Get quarter options for a given year range
  getQuarterOptions: (startYear: number, endYear: number): { value: string; label: string }[] => {
    const options: { value: string; label: string }[] = [];
    for (let year = startYear; year <= endYear; year++) {
      for (let q = 1; q <= 4; q++) {
        const label = `Q${q} ${year}`;
        options.push({ value: label, label });
      }
    }
    return options;
  },
  
  // Sprint end date helper (always Thursday)
  getSprintEndDate: (sprintStartDate: Date): Date => {
    const date = new Date(sprintStartDate);
    // Find next Thursday (day 4)
    const dayOfWeek = date.getDay();
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7; // If already Thursday, next Thursday
    date.setDate(date.getDate() + daysUntilThursday + 7); // Add 2 weeks for typical sprint
    return date;
  },
  
  // Format sprint with end date
  formatSprintWithEndDate: (sprintName: string, endDate: Date): string => {
    const formatted = endDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    return `${sprintName} — Ends ${formatted}`;
  },
} as const;

export type Terminology = typeof terminology;
