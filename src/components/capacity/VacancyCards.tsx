/**
 * Vacancy Cards
 * Display open vacancies with Fill Gap button and Add Vacancy capability
 */

import { useState } from 'react';
import { Vacancy, CapacityProject } from '@/types/capacity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Plus, X, Briefcase, Calendar, Target } from 'lucide-react';
import { toast } from 'sonner';

interface VacancyCardsProps {
  vacancies: Vacancy[];
  projects: CapacityProject[];
  onFillGap: (vacancyId: string) => void;
  onAddVacancy?: (vacancy: Omit<Vacancy, 'id'>) => void;
}

// Seed vacancies data
const SEED_VACANCIES: Vacancy[] = [
  {
    id: 'vacancy-1',
    projectId: 'proj-1',
    skill: 'Data Engineer',
    proficiencyLevel: 'Advanced',
    percentageNeeded: 100,
    location: 'Any',
    startWeek: 50,
    endWeek: 4,
    year: 2024,
    severity: 'high',
    status: 'OPEN'
  },
  {
    id: 'vacancy-2',
    projectId: 'proj-2',
    skill: 'QA Tester',
    proficiencyLevel: 'Intermediate',
    percentageNeeded: 50,
    location: 'Any',
    startWeek: 51,
    endWeek: 6,
    year: 2024,
    severity: 'medium',
    status: 'OPEN'
  }
];

const SKILL_OPTIONS = [
  'Data Engineer',
  'QA Tester',
  'Frontend Developer',
  'Backend Developer',
  'DevOps Engineer',
  'Product Owner',
  'Scrum Master',
  'UX Designer',
  'Data Analyst',
  'Full Stack Developer'
];

const PROFICIENCY_LEVELS: Vacancy['proficiencyLevel'][] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export function VacancyCards({ vacancies: externalVacancies, projects, onFillGap, onAddVacancy }: VacancyCardsProps) {
  // Combine external vacancies with seed data
  const [localVacancies, setLocalVacancies] = useState<Vacancy[]>(SEED_VACANCIES);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newVacancy, setNewVacancy] = useState({
    skill: '',
    proficiencyLevel: 'Intermediate' as Vacancy['proficiencyLevel'],
    projectId: '',
    percentageNeeded: 100,
    startWeek: 50,
    endWeek: 52,
    year: 2024,
    location: 'Any' as Vacancy['location'],
    severity: 'medium' as Vacancy['severity']
  });

  const allVacancies = [...externalVacancies, ...localVacancies];
  const openVacancies = allVacancies.filter(v => v.status !== 'FILLED');

  const getProjectName = (projectId: string): string => {
    return projects.find(p => p.id === projectId)?.name || 'Unassigned';
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

  const handleAddVacancy = () => {
    if (!newVacancy.skill) {
      toast.error('Please select a skill');
      return;
    }

    const vacancy: Vacancy = {
      id: `vacancy-${Date.now()}`,
      ...newVacancy,
      status: 'OPEN'
    };

    setLocalVacancies(prev => [...prev, vacancy]);
    onAddVacancy?.(vacancy);
    setAddModalOpen(false);
    setNewVacancy({
      skill: '',
      proficiencyLevel: 'Intermediate',
      projectId: '',
      percentageNeeded: 100,
      startWeek: 50,
      endWeek: 52,
      year: 2024,
      location: 'Any',
      severity: 'medium'
    });
    toast.success('Vacancy added successfully');
  };

  const handleRemoveVacancy = (vacancyId: string) => {
    setLocalVacancies(prev => prev.filter(v => v.id !== vacancyId));
    toast.success('Vacancy removed');
  };

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {openVacancies.length} open {openVacancies.length === 1 ? 'vacancy' : 'vacancies'}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Vacancy
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="font-medium text-sm">Add New Vacancy</div>
              
              {/* Skill */}
              <div className="space-y-1.5">
                <Label className="text-xs">Skill Required</Label>
                <Select 
                  value={newVacancy.skill} 
                  onValueChange={(v) => setNewVacancy(prev => ({ ...prev, skill: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_OPTIONS.map(skill => (
                      <SelectItem key={skill} value={skill} className="text-xs">
                        {skill}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proficiency */}
              <div className="space-y-1.5">
                <Label className="text-xs">Proficiency Level</Label>
                <Select 
                  value={newVacancy.proficiencyLevel} 
                  onValueChange={(v) => setNewVacancy(prev => ({ ...prev, proficiencyLevel: v as Vacancy['proficiencyLevel'] }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map(level => (
                      <SelectItem key={level} value={level} className="text-xs">
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project */}
              <div className="space-y-1.5">
                <Label className="text-xs">Project</Label>
                <Select 
                  value={newVacancy.projectId} 
                  onValueChange={(v) => setNewVacancy(prev => ({ ...prev, projectId: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id} className="text-xs">
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Week</Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={newVacancy.startWeek}
                    onChange={(e) => setNewVacancy(prev => ({ ...prev, startWeek: parseInt(e.target.value) || 1 }))}
                    className="h-8 text-xs"
                    placeholder="W1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Week</Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={newVacancy.endWeek}
                    onChange={(e) => setNewVacancy(prev => ({ ...prev, endWeek: parseInt(e.target.value) || 52 }))}
                    className="h-8 text-xs"
                    placeholder="W52"
                  />
                </div>
              </div>

              {/* Severity */}
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select 
                  value={newVacancy.severity} 
                  onValueChange={(v) => setNewVacancy(prev => ({ ...prev, severity: v as Vacancy['severity'] }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical" className="text-xs">Critical</SelectItem>
                    <SelectItem value="high" className="text-xs">High</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                    <SelectItem value="low" className="text-xs">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={handleAddVacancy}
                  className="h-7 text-xs bg-brand-gold hover:bg-brand-gold/90 text-white"
                >
                  Add Vacancy
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Vacancy Cards */}
      {openVacancies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-lg font-medium mb-2">No open vacancies</div>
          <div className="text-sm">All positions are currently filled</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {openVacancies.map((vacancy) => (
            <div 
              key={vacancy.id}
              className={cn(
                "bg-card border border-border rounded-lg p-4 border-l-[3px] relative group",
                getSeverityClass(vacancy.severity)
              )}
            >
              {/* Remove button */}
              <button
                onClick={() => handleRemoveVacancy(vacancy.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              <div className="flex justify-between items-start mb-3 pr-6">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm text-foreground">
                    {vacancy.skill}
                  </span>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-medium capitalize",
                  getSeverityBadgeClass(vacancy.severity)
                )}>
                  {vacancy.severity}
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <Target className="h-3 w-3" />
                {vacancy.proficiencyLevel} • {getProjectName(vacancy.projectId)}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
                <span className="bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  W{vacancy.startWeek}–W{vacancy.endWeek}
                </span>
                <span className="bg-muted px-2 py-0.5 rounded">
                  {vacancy.percentageNeeded}% capacity
                </span>
                <span className="bg-muted px-2 py-0.5 rounded">
                  {vacancy.location}
                </span>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
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
      )}
    </div>
  );
}
