/**
 * Vacancy Cards
 * Display open vacancies with Fill Gap button
 */

import { Vacancy, CapacityProject } from '@/types/capacity';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VacancyCardsProps {
  vacancies: Vacancy[];
  projects: CapacityProject[];
  onFillGap: (vacancyId: string) => void;
}

export function VacancyCards({ vacancies, projects, onFillGap }: VacancyCardsProps) {
  const openVacancies = vacancies.filter(v => v.status !== 'FILLED');

  const getProjectName = (projectId: string): string => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const getSeverityClass = (severity: Vacancy['severity']): string => {
    switch (severity) {
      case 'critical':
        return 'border-l-destructive';
      case 'high':
        return 'border-l-warning';
      case 'medium':
        return 'border-l-brand-gold';
      default:
        return 'border-l-muted-foreground';
    }
  };

  const getSeverityBadgeClass = (severity: Vacancy['severity']): string => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/10 text-destructive';
      case 'high':
        return 'bg-warning/10 text-warning';
      case 'medium':
        return 'bg-brand-gold/10 text-brand-gold';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (openVacancies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-lg font-medium mb-2">No open vacancies</div>
        <div className="text-sm">All positions are currently filled</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {openVacancies.map((vacancy) => (
        <div 
          key={vacancy.id}
          className={cn(
            "bg-card border border-border rounded-lg p-4 border-l-[3px]",
            getSeverityClass(vacancy.severity)
          )}
        >
          <div className="flex justify-between items-start mb-3">
            <span className="font-semibold text-sm text-foreground">
              {vacancy.skill} ({vacancy.proficiencyLevel})
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[11px] font-medium capitalize",
              getSeverityBadgeClass(vacancy.severity)
            )}>
              {vacancy.severity}
            </span>
          </div>
          
          <div className="text-xs text-muted-foreground mb-3">
            {getProjectName(vacancy.projectId)}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-0.5 rounded">
              {vacancy.percentageNeeded}% needed
            </span>
            <span className="bg-muted px-2 py-0.5 rounded">
              {vacancy.location}
            </span>
            <span className="bg-muted px-2 py-0.5 rounded">
              W{vacancy.startWeek}–W{vacancy.endWeek}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {vacancy.percentageNeeded}% needed
            </span>
            <Button 
              size="sm"
              className="h-7 px-3 text-xs bg-brand-gold hover:bg-brand-gold/90 text-white"
              onClick={() => onFillGap(vacancy.id)}
            >
              Fill Gap
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
