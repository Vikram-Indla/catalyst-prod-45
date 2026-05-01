/**
 * Create Epic Modal - Mirrors CreateBusinessRequestModal UX exactly
 * Features: Progress ring, keyboard shortcuts, auto-save indicator, same layout
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProgressRing, KeyboardShortcuts, AutoSaveIndicator, AutoSaveStatus } from '@/components/business-requests/create-form';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { UserPicker } from '@/components/ui/user-picker';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';

interface CreateEpicModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string | null | undefined;
}

const getInitialFormData = (): Record<string, any> => ({
  name: '',
  description: '',
  theme_id: null,
  reporter_id: null,
  assignee_id: null,
  quarters: [],
});

// Calculate form completion percentage
function calculateCompletion(data: Record<string, any>): number {
  const requiredFields = [
    { key: 'name', weight: 30, validator: (v: string) => v && v.length >= 5 },
    { key: 'description', weight: 20, validator: (v: string) => {
      const text = (v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return text.length > 0;
    }},
    { key: 'theme_id', weight: 20, validator: (v: string) => !!v },
    { key: 'reporter_id', weight: 15, validator: (v: string) => !!v },
    { key: 'assignee_id', weight: 15, validator: (v: string) => !!v },
  ];

  return requiredFields.reduce((acc, field) => {
    return acc + (field.validator(data[field.key]) ? field.weight : 0);
  }, 0);
}

export function CreateEpicModal({ isOpen, onClose, programId }: CreateEpicModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>(getInitialFormData());
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [themePopoverOpen, setThemePopoverOpen] = useState(false);

  // Calculate completion percentage
  const completionPercent = useMemo(() => calculateCompletion(formData), [formData]);

  // Fetch strategic themes
  const { data: themes = [] } = useQuery({
    queryKey: ['strategic-themes-for-epic-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name, status')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch program info
  const { data: program } = useQuery({
    queryKey: ['program-for-epic-create', programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('id, key, name')
        .eq('id', programId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: isOpen && !!programId,
  });

  const selectedTheme = themes.find(t => t.id === formData.theme_id);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setAutoSaveStatus('saving');
  }, []);

  // Auto-save simulation
  useEffect(() => {
    if (autoSaveStatus === 'saving') {
      const timer = setTimeout(() => {
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoSaveStatus]);

  // Create Epic mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!programId) throw new Error('Program ID is required');

      const { data, error } = await supabase
        .from('epics')
        .insert({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          primary_program_id: programId,
          status: 'proposed',
          theme_id: formData.theme_id,
          reporter_id: formData.reporter_id,
          assignee_id: formData.assignee_id,
          quarters: formData.quarters?.length > 0 ? formData.quarters : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      
      const epicKey = data.epic_key || data.id?.slice(0, 8);
      toast.success(`Epic ${epicKey} created successfully`);
      handleClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to create epic: ${error.message}`);
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, formData]);

  const handleSave = () => {
    if (!formData.name || formData.name.length < 5) {
      toast.error('Epic name is required and must be at least 5 characters');
      return;
    }
    if (!formData.theme_id) {
      toast.error('Strategic Theme is required');
      return;
    }
    if (!formData.reporter_id) {
      toast.error('Reporter is required');
      return;
    }
    if (!formData.assignee_id) {
      toast.error('Assignee is required');
      return;
    }

    createMutation.mutate();
  };

  const handleClose = () => {
    setFormData(getInitialFormData());
    setAutoSaveStatus('idle');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "sm:max-w-[800px] max-h-[90vh] p-0 flex flex-col overflow-hidden",
        "bg-white dark:bg-gray-900",
        "rounded-lg",
        "shadow-xl",
        "border-0",
        "[&>button]:hidden"
      )}>
        {/* Accent Bar - Catalyst gradient */}
        <div className="h-1 bg-gradient-to-r from-[var(--ds-text-brand, #2563eb)] via-[#0d9488] to-[var(--ds-text-brand, #60a5fa)] flex-shrink-0" />

        {/* Header with Progress Ring */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <ProgressRing percent={completionPercent} />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Create Epic
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {program?.name ? `Program: ${program.name}` : 'Create a new epic for the program backlog'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className={cn(
                "p-1.5 rounded-md",
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "transition-colors"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] px-5 py-4">
          <div className="space-y-5">
            {/* Epic Name */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Epic Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter epic name..."
                className={cn(
                  "w-full px-4 py-3 rounded-lg text-sm transition-all outline-none",
                  "border border-gray-200 dark:border-gray-700",
                  "bg-white dark:bg-gray-800",
                  "text-gray-900 dark:text-gray-100",
                  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                  "focus:ring-2 focus:ring-[var(--ds-text-brand, #2563eb)]/30 focus:border-[var(--ds-text-brand, #2563eb)]"
                )}
                autoFocus
              />
            </div>

            {/* Ownership Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex-shrink-0">
                  Ownership
                </h3>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
              
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reporter <span className="text-red-500">*</span>
                    </label>
                    <UserPicker
                      value={formData.reporter_id}
                      onChange={(val) => handleFieldChange('reporter_id', val)}
                      placeholder="Select reporter..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Assignee <span className="text-red-500">*</span>
                    </label>
                    <UserPicker
                      value={formData.assignee_id}
                      onChange={(val) => handleFieldChange('assignee_id', val)}
                      placeholder="Select assignee..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Alignment Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex-shrink-0">
                  Strategic Alignment
                </h3>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
              
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Strategic Theme <span className="text-red-500">*</span>
                  </label>
                  <Popover open={themePopoverOpen} onOpenChange={setThemePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between font-normal h-10",
                          !selectedTheme && "text-muted-foreground"
                        )}
                      >
                        {selectedTheme ? selectedTheme.name : 'Select strategic theme...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search themes..." />
                        <CommandList className="max-h-64">
                          <CommandEmpty>No themes found.</CommandEmpty>
                          <CommandGroup>
                            {themes.map((theme) => (
                              <CommandItem
                                key={theme.id}
                                value={theme.name}
                                onSelect={() => {
                                  handleFieldChange('theme_id', theme.id);
                                  setThemePopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.theme_id === theme.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="flex-1">{theme.name}</span>
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full",
                                  theme.status === 'active' 
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                )}>
                                  {theme.status}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex-shrink-0">
                  Description
                </h3>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
              
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <RichTextEditor
                  value={formData.description || ''}
                  onChange={(val) => handleFieldChange('description', val)}
                  placeholder="Describe the epic scope, goals, and expected outcomes..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Keyboard Shortcuts */}
        <div className={cn(
          "flex items-center justify-between",
          "px-5 py-3",
          "bg-gray-50 dark:bg-gray-800/50",
          "border-t border-gray-200 dark:border-gray-700",
          "flex-shrink-0"
        )}>
          <div className="flex items-center gap-4">
            <KeyboardShortcuts />
            <AutoSaveIndicator status={autoSaveStatus} />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md",
                "border-gray-200 dark:border-gray-600",
                "text-gray-700 dark:text-gray-300"
              )}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending}
              className={cn(
                "px-4 py-2 text-sm font-medium",
                "text-white bg-[var(--ds-text-brand, #2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered, #1d4ed8)]",
                "rounded-md shadow-sm",
                "flex items-center gap-1.5",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Save className="w-3.5 h-3.5" />
              {createMutation.isPending ? 'Saving...' : 'Save Epic'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
