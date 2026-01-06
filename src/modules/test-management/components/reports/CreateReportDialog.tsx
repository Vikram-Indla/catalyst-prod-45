/**
 * Create Report Dialog - 3-step wizard for report generation
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  ChevronRight, 
  ChevronLeft,
  FileText, 
  BarChart2,
  Link,
  Cpu,
  Circle,
  Layers,
  Play,
  Bug,
  Briefcase,
  User,
  Loader2
} from 'lucide-react';
import { REPORT_CATEGORIES, REPORT_TYPES, ReportTypeConfig, ReportCategory } from '../../config/reportTypes';
import { useTestCycles } from '../../hooks/useCycles';

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (reportType: string, params: Record<string, any>) => void;
  isGenerating?: boolean;
  projectId?: string;
}

const iconMap: Record<string, any> = {
  Link,
  FileText,
  Cpu,
  Circle,
  Layers,
  Play,
  Bug,
  Briefcase,
  User,
};

export function CreateReportDialog({ open, onOpenChange, onGenerate, isGenerating, projectId }: CreateReportDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<ReportTypeConfig | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [step, setStep] = useState<'category' | 'type' | 'params'>('category');
  
  const { data: cyclesData } = useTestCycles({ project_id: projectId || '' });
  const cycles = cyclesData?.data || [];

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedCategory(null);
      setSelectedReportType(null);
      setFormValues({});
      setStep('category');
    }
  }, [open]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep('type');
  };

  const handleReportTypeSelect = (reportType: ReportTypeConfig) => {
    setSelectedReportType(reportType);
    setFormValues({});
    setStep('params');
  };

  const handleBack = () => {
    if (step === 'params') {
      setStep('type');
      setSelectedReportType(null);
    } else if (step === 'type') {
      setStep('category');
      setSelectedCategory(null);
    }
  };

  const handleGenerate = () => {
    if (selectedReportType) {
      onGenerate(selectedReportType.id, formValues);
    }
  };

  const isFormValid = () => {
    if (!selectedReportType) return false;
    
    for (const field of selectedReportType.fields) {
      if (field.required && !formValues[field.id]) {
        return false;
      }
      if (field.min && Array.isArray(formValues[field.id]) && formValues[field.id].length < field.min) {
        return false;
      }
    }
    return true;
  };

  const filteredReportTypes = selectedCategory 
    ? REPORT_TYPES.filter(rt => rt.category === selectedCategory)
    : [];

  const getCategoryIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || FileText;
    return Icon;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            {step === 'category' && 'Create Report - Select Category'}
            {step === 'type' && `Create Report - ${REPORT_CATEGORIES.find(c => c.id === selectedCategory)?.name}`}
            {step === 'params' && `Generate ${selectedReportType?.name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Step 1: Category Selection */}
          {step === 'category' && (
            <div className="grid grid-cols-3 gap-3">
              {REPORT_CATEGORIES.map(category => {
                const Icon = getCategoryIcon(category.icon);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className="text-xs text-muted-foreground text-center">{category.description}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Report Type Selection */}
          {step === 'type' && (
            <div className="space-y-2">
              {filteredReportTypes.map(reportType => (
                <button
                  key={reportType.id}
                  onClick={() => handleReportTypeSelect(reportType)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BarChart2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground">{reportType.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">{reportType.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Parameters Form */}
          {step === 'params' && selectedReportType && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">{selectedReportType.description}</p>
              </div>

              {selectedReportType.fields.length === 0 && (
                <p className="text-sm text-muted-foreground">No additional parameters required. Click Generate to create your report.</p>
              )}

              {selectedReportType.fields.map(field => (
                <div key={field.id} className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                    {field.min && <span className="text-xs text-muted-foreground">(min {field.min})</span>}
                  </Label>

                  {/* Cycle Single Select */}
                  {field.type === 'cycle-select' && (
                    <Select
                      value={formValues[field.id] || ''}
                      onValueChange={(value) => setFormValues({ ...formValues, [field.id]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {cycles.map((cycle: any) => (
                          <SelectItem key={cycle.id} value={cycle.id}>
                            {cycle.cycle_key} - {cycle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Cycle Multi Select */}
                  {field.type === 'cycle-multi-select' && (
                    <div className="border rounded-lg p-2 max-h-[200px] overflow-y-auto space-y-1">
                      {cycles.length === 0 && (
                        <p className="text-sm text-muted-foreground p-2">No cycles available</p>
                      )}
                      {cycles.map((cycle: any) => (
                        <label key={cycle.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                          <Checkbox
                            checked={(formValues[field.id] || []).includes(cycle.id)}
                            onCheckedChange={(checked) => {
                              const current = formValues[field.id] || [];
                              if (checked) {
                                setFormValues({ ...formValues, [field.id]: [...current, cycle.id] });
                              } else {
                                setFormValues({ ...formValues, [field.id]: current.filter((id: string) => id !== cycle.id) });
                              }
                            }}
                          />
                          <span className="text-sm">{cycle.cycle_key} - {cycle.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Dropdown Select */}
                  {field.type === 'dropdown' && field.options && (
                    <Select
                      value={formValues[field.id] || ''}
                      onValueChange={(value) => setFormValues({ ...formValues, [field.id]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || 'Select...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Date Range */}
                  {field.type === 'date-range' && (
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !formValues[`${field.id}_from`] && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formValues[`${field.id}_from`] ? format(formValues[`${field.id}_from`], "PPP") : "From date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formValues[`${field.id}_from`]}
                            onSelect={(date) => setFormValues({ ...formValues, [`${field.id}_from`]: date })}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !formValues[`${field.id}_to`] && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formValues[`${field.id}_to`] ? format(formValues[`${field.id}_to`], "PPP") : "To date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formValues[`${field.id}_to`]}
                            onSelect={(date) => setFormValues({ ...formValues, [`${field.id}_to`]: date })}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Checkbox */}
                  {field.type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={field.id}
                        checked={formValues[field.id] || false}
                        onCheckedChange={(checked) => setFormValues({ ...formValues, [field.id]: checked })}
                      />
                      <label htmlFor={field.id} className="text-sm cursor-pointer">Enable {field.label}</label>
                    </div>
                  )}

                  {/* Folder Select - simplified */}
                  {field.type === 'folder-select' && (
                    <Select
                      value={formValues[field.id] || 'all'}
                      onValueChange={(value) => setFormValues({ ...formValues, [field.id]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Folders</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* User Select - simplified */}
                  {field.type === 'user-select' && (
                    <Select
                      value={formValues[field.id] || 'all'}
                      onValueChange={(value) => setFormValues({ ...formValues, [field.id]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* Requirement Select - simplified */}
                  {field.type === 'requirement-select' && (
                    <Select
                      value={formValues[field.id] || 'all'}
                      onValueChange={(value) => setFormValues({ ...formValues, [field.id]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Requirements</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* Defect Select - simplified */}
                  {field.type === 'defect-select' && (
                    <Select
                      value={formValues[field.id] || 'all'}
                      onValueChange={(value) => setFormValues({ ...formValues, [field.id]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Defects</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          {step !== 'category' ? (
            <Button variant="outline" onClick={handleBack} disabled={isGenerating}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}
          
          {step === 'params' ? (
            <Button onClick={handleGenerate} disabled={!isFormValid() || isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Report
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
