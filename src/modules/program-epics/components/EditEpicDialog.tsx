/**
 * Edit Epic Dialog - Loads existing epic data and allows inline editing
 * Mirrors CreateEpicDialog structure with pre-populated fields
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
import { Check, ChevronsUpDown, X, Box, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditEpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicId: string;
  onUpdated?: () => void;
}

// Reuse FormSection / FormLabel / CatalystInput from Create dialog pattern
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--dialog-label-color)' }}>{title}</h3>
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--dialog-divider)' }} />
    </div>
    <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: 'var(--dialog-section-bg)', border: '1px solid var(--dialog-section-border)' }}>
      {children}
    </div>
  </div>
);

const FormLabel = ({ children, required = false }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block space-y-1.5">
    <span className="flex items-center gap-1">
      <span className="text-sm font-medium" style={{ color: 'var(--dialog-label-color)' }}>{children}</span>
      {required && <span style={{ color: 'var(--dialog-label-required)' }}>*</span>}
    </span>
  </label>
);

const CatalystInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('w-full px-4 py-3 rounded-lg text-sm transition-all outline-none focus:ring-2 focus:ring-offset-0', className)}
      style={{
        backgroundColor: 'var(--dialog-input-bg)',
        border: '1px solid var(--dialog-input-border)',
        color: 'var(--dialog-title-color)',
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
      }}
      {...props}
    />
  )
);
CatalystInput.displayName = 'CatalystInput';

const CatalystSelectTrigger = React.forwardRef<HTMLButtonElement, { children: React.ReactNode; onClick?: () => void; hasValue?: boolean }>(
  ({ children, onClick, hasValue }, ref) => (
    <Button ref={ref} type="button" variant="outline" role="combobox" onClick={onClick} className={cn('w-full justify-between font-normal h-9', !hasValue && 'text-muted-foreground')}>
      <span className="truncate flex-1 text-left">{children}</span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  )
);
CatalystSelectTrigger.displayName = 'CatalystSelectTrigger';

export function EditEpicDialog({ open, onOpenChange, epicId, onUpdated }: EditEpicDialogProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [themeId, setThemeId] = useState<string | null>(null);
  const [linkedBusinessRequestId, setLinkedBusinessRequestId] = useState<string | null>(null);
  const [reporterId, setReporterId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [themePopoverOpen, setThemePopoverOpen] = useState(false);
  const [brPopoverOpen, setBrPopoverOpen] = useState(false);

  // Fetch epic data
  const { data: epic, isLoading: epicLoading } = useQuery({
    queryKey: ['epic-detail', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!epicId,
  });

  // Populate form when epic loads
  useEffect(() => {
    if (epic) {
      setName(epic.name || '');
      setDescription(epic.description || '');
      setStatus(epic.status || 'proposed');
      setThemeId((epic as any).theme_id || null);
      setLinkedBusinessRequestId((epic as any).linked_business_request_id || null);
      setReporterId((epic as any).reporter_id || null);
      setAssigneeId((epic as any).assignee_id || null);
    }
  }, [epic]);

  // Fetch themes
  const { data: themes = [] } = useQuery({
    queryKey: ['strategic-themes-for-epic'],
    queryFn: async () => {
      const { data, error } = await supabase.from('strategic_themes').select('id, name, status').order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch business requests
  const { data: businessRequests = [] } = useQuery({
    queryKey: ['business-requests-for-epic-link'],
    queryFn: async () => {
      const { data, error } = await typedQuery('business_requests')
        .select('id, request_key, title, rank, business_score')
        .is('deleted_at', null)
        .order('request_key');
      if (error) throw error;
      return (data || []) as Array<{ id: string; request_key: string; title: string; rank: number | null; business_score: number | null }>;
    },
    enabled: open,
  });

  const selectedTheme = themes.find(t => t.id === themeId);
  const selectedBR = businessRequests.find(br => br.id === linkedBusinessRequestId);

  const updateEpicMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('epics')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          status,
          theme_id: themeId,
          linked_business_request_id: linkedBusinessRequestId,
          reporter_id: reporterId,
          assignee_id: assigneeId,
        } as any)
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-detail', epicId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Epic updated successfully');
      onOpenChange(false);
      onUpdated?.();
    },
    onError: (error: any) => {
      toast.error(`Failed to update epic: ${error?.message || 'Unknown error'}`);
    },
  });

  const isValid = name.trim().length > 0;

  const epicStatuses = [
    { value: 'proposed', label: 'Proposed' },
    { value: 'approved', label: 'Approved' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (epicLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col overflow-hidden',
        'bg-white dark:bg-[#141414] rounded-lg shadow-xl',
        'border border-gray-200 dark:border-[#333333] [&>button]:hidden'
      )}>
        <div className="h-1 bg-gradient-to-r from-[var(--ds-text-brand, #2563eb)] via-[#8b5cf6] to-[var(--ds-text-brand, #60a5fa)] flex-shrink-0" />

        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-[#333333] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Box className="h-5 w-5 text-[#8b5cf6]" />
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-[#f5f5f5]">
                Edit Epic {epic?.epic_key ? `— ${epic.epic_key}` : ''}
              </DialogTitle>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 scrollbar-catalyst">
          <div className="flex flex-col gap-5 py-4">
            {/* Epic Name */}
            <div className="space-y-2">
              <FormLabel required>Epic Name</FormLabel>
              <CatalystInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter epic name..." autoFocus />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <FormLabel required>Status</FormLabel>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--dialog-input-bg)',
                  border: '1px solid var(--dialog-input-border)',
                  color: 'var(--dialog-title-color)',
                }}
              >
                {epicStatuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Ownership */}
            <FormSection title="Ownership">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel required>Reporter</FormLabel>
                  <UserPicker value={reporterId} onChange={(val) => setReporterId(val as string | null)} placeholder="Select reporter..." />
                </div>
                <div className="space-y-2">
                  <FormLabel required>Assignee</FormLabel>
                  <UserPicker value={assigneeId} onChange={(val) => setAssigneeId(val as string | null)} placeholder="Select assignee..." />
                </div>
              </div>
            </FormSection>

            {/* Strategic Alignment */}
            <FormSection title="Strategic Alignment">
              <div className="space-y-2">
                <FormLabel>Strategic Theme</FormLabel>
                <Popover open={themePopoverOpen} onOpenChange={setThemePopoverOpen}>
                  <PopoverTrigger asChild>
                    <div><CatalystSelectTrigger hasValue={!!selectedTheme}>{selectedTheme ? selectedTheme.name : 'Select strategic theme...'}</CatalystSelectTrigger></div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 z-[400]" align="start">
                    <Command>
                      <CommandInput placeholder="Search themes..." />
                      <CommandList className="max-h-64">
                        <CommandEmpty>No themes found.</CommandEmpty>
                        <CommandGroup>
                          {themes.map((theme) => (
                            <CommandItem key={theme.id} value={theme.name} onSelect={() => { setThemeId(theme.id); setThemePopoverOpen(false); }} className="cursor-pointer">
                              <Check className={cn('mr-2 h-4 w-4 text-primary', themeId === theme.id ? 'opacity-100' : 'opacity-0')} />
                              <span className="flex-1 text-sm">{theme.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <FormLabel>Linked Business Request</FormLabel>
                <Popover open={brPopoverOpen} onOpenChange={setBrPopoverOpen}>
                  <PopoverTrigger asChild>
                    <div>
                      <CatalystSelectTrigger hasValue={!!selectedBR}>
                        {selectedBR ? (
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-primary">{selectedBR.request_key}</span>
                            <span className="truncate">{selectedBR.title}</span>
                          </span>
                        ) : 'Select business request (optional)...'}
                      </CatalystSelectTrigger>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0 z-[400]" align="start">
                    <Command>
                      <CommandInput placeholder="Search by ID or title..." />
                      <CommandList className="max-h-64">
                        <CommandEmpty>No business requests found.</CommandEmpty>
                        <CommandGroup>
                          {linkedBusinessRequestId && (
                            <CommandItem value="clear" onSelect={() => { setLinkedBusinessRequestId(null); setBrPopoverOpen(false); }} className="cursor-pointer text-muted-foreground">
                              <X className="mr-2 h-4 w-4" /> Clear selection
                            </CommandItem>
                          )}
                          {businessRequests.map((br) => (
                            <CommandItem key={br.id} value={`${br.request_key} ${br.title}`} onSelect={() => { setLinkedBusinessRequestId(br.id); setBrPopoverOpen(false); }} className="cursor-pointer">
                              <Check className={cn('mr-2 h-4 w-4 text-primary', linkedBusinessRequestId === br.id ? 'opacity-100' : 'opacity-0')} />
                              <span className="font-mono text-primary mr-2">{br.request_key}</span>
                              <span className="truncate">{br.title}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </FormSection>

            {/* Description */}
            <FormSection title="Description">
              <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--dialog-input-bg)', border: '1px solid var(--dialog-input-border)' }}>
                <RichTextEditor value={description} onChange={setDescription} placeholder="Enter epic description..." minHeight="120px" />
              </div>
            </FormSection>

            <div className="h-4" />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[var(--ds-surface-raised, #1a1a1a)]">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">Cancel</Button>
          <Button onClick={() => updateEpicMutation.mutate()} disabled={!isValid || updateEpicMutation.isPending} className="bg-[var(--ds-text-brand, #2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered, #1d4ed8)] text-white px-6">
            {updateEpicMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
