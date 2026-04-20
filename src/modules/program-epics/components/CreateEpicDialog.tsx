/**
 * Create Epic Dialog - Enhanced with full Epic domain model
 * Enterprise Dark Mode Quality (9.5/10) - Catalyst Design System
 * 
 * SECTIONS:
 * 1. Identity: Epic Name (required)
 * 2. Ownership: Reporter (required), Assignee (required)
 * 3. Strategic Alignment: Strategic Theme (required), Linked Business Request (optional)
 * 4. Description: Rich Text Editor
 * 5. Attachments: File uploads (flow to Links tab)
 */
import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isValidProgramKey } from '@/utils/epic-key-generator';
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
import { Lozenge } from '@/components/ads';
import { Check, ChevronsUpDown, Upload, X, FileText, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useCreateUploadSession, 
  useStageAttachment, 
  useCommitAttachments,
  UnifiedAttachment 
} from '@/hooks/useUnifiedAttachments';


interface CreateEpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string | null | undefined;
  onCreated?: (epicId: string) => void;
}

interface StagedFile {
  file: File;
  attachment?: UnifiedAttachment;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

// Form Section Component for visual grouping
const FormSection = ({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    {/* Section header with divider line */}
    <div className="flex items-center gap-3">
      <h3 
        className="text-xs font-semibold uppercase tracking-wider flex-shrink-0"
        style={{ color: 'var(--dialog-label-color)' }}
      >
        {title}
      </h3>
      <div 
        className="flex-1 h-px"
        style={{ backgroundColor: 'var(--dialog-divider)' }}
      />
    </div>
    
    {/* Section content card */}
    <div 
      className="p-4 rounded-lg space-y-4"
      style={{ 
        backgroundColor: 'var(--dialog-section-bg)',
        border: '1px solid var(--dialog-section-border)'
      }}
    >
      {children}
    </div>
  </div>
);

// Form Label Component
const FormLabel = ({ 
  children, 
  required = false 
}: { 
  children: React.ReactNode; 
  required?: boolean;
}) => (
  <label className="block space-y-1.5">
    <span className="flex items-center gap-1">
      <span 
        className="text-sm font-medium"
        style={{ color: 'var(--dialog-label-color)' }}
      >
        {children}
      </span>
      {required && (
        <span style={{ color: 'var(--dialog-label-required)' }}>*</span>
      )}
    </span>
  </label>
);

// Styled Input Component for dark mode
const CatalystInput = React.forwardRef<
  HTMLInputElement, 
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full px-4 py-3 rounded-lg text-sm transition-all outline-none",
      "focus:ring-2 focus:ring-offset-0",
      className
    )}
    style={{
      backgroundColor: 'var(--dialog-input-bg)',
      border: '1px solid var(--dialog-input-border)',
      color: 'var(--dialog-title-color)',
      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
    }}
    {...props}
  />
));
CatalystInput.displayName = 'CatalystInput';

// Styled Select Trigger for dark mode - matches UserPicker Button styling
const CatalystSelectTrigger = React.forwardRef<
  HTMLButtonElement, 
  { 
    children: React.ReactNode;
    onClick?: () => void;
    isOpen?: boolean;
    hasValue?: boolean;
  }
>(({ children, onClick, isOpen, hasValue }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="outline"
    role="combobox"
    onClick={onClick}
    className={cn(
      'w-full justify-between font-normal h-9',
      'focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0',
      !hasValue && 'text-muted-foreground'
    )}
  >
    <span className="truncate flex-1 text-left">{children}</span>
    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
  </Button>
));
CatalystSelectTrigger.displayName = 'CatalystSelectTrigger';

export function CreateEpicDialog({ 
  open, 
  onOpenChange, 
  programId,
  onCreated,
}: CreateEpicDialogProps) {
  const queryClient = useQueryClient();
  
  // Check if programId is missing - will show error state
  const isProgramMissing = !programId;
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [themeId, setThemeId] = useState<string | null>(null);
  const [linkedBusinessRequestId, setLinkedBusinessRequestId] = useState<string | null>(null);
  const [reporterId, setReporterId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);
  
  // Popover states for searchable dropdowns
  const [themePopoverOpen, setThemePopoverOpen] = useState(false);
  const [brPopoverOpen, setBrPopoverOpen] = useState(false);

  // Fetch program info to display the key preview
  const { data: program } = useQuery({
    queryKey: ['program-for-epic', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, key, name')
        .eq('id', programId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!programId,
  });

  // Fetch strategic themes
  const { data: themes = [] } = useQuery({
    queryKey: ['strategic-themes-for-epic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name, status')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch business requests for linking
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

  // Attachment mutations
  const createUploadSession = useCreateUploadSession();
  const stageAttachment = useStageAttachment();
  const commitAttachments = useCommitAttachments();

  // Get selected theme name
  const selectedTheme = themes.find(t => t.id === themeId);
  
  // Get selected business request
  const selectedBR = businessRequests.find(br => br.id === linkedBusinessRequestId);

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Create upload session if not exists
    let sessionId = uploadSessionId;
    if (!sessionId) {
      try {
        const session = await createUploadSession.mutateAsync('epic-create');
        sessionId = session.id;
        setUploadSessionId(sessionId);
      } catch (error) {
        toast.error('Failed to create upload session');
        return;
      }
    }

    // Add files to staged list
    const newFiles: StagedFile[] = Array.from(files).map(file => ({
      file,
      status: 'pending' as const,
    }));
    setStagedFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (let i = 0; i < newFiles.length; i++) {
      const fileEntry = newFiles[i];
      setStagedFiles(prev => prev.map(f => 
        f.file === fileEntry.file ? { ...f, status: 'uploading' } : f
      ));

      try {
        const attachment = await stageAttachment.mutateAsync({
          file: fileEntry.file,
          uploadSessionId: sessionId!,
          uploadedByType: 'internal',
          sourceContext: 'links_tab',
        });

        setStagedFiles(prev => prev.map(f => 
          f.file === fileEntry.file ? { ...f, status: 'uploaded', attachment } : f
        ));
      } catch (error: any) {
        setStagedFiles(prev => prev.map(f => 
          f.file === fileEntry.file ? { ...f, status: 'error', error: error.message } : f
        ));
      }
    }

    // Reset input
    event.target.value = '';
  }, [uploadSessionId, createUploadSession, stageAttachment]);

  // Remove staged file
  const removeFile = useCallback((file: File) => {
    setStagedFiles(prev => prev.filter(f => f.file !== file));
  }, []);

  const createEpicMutation = useMutation({
    mutationFn: async () => {
      // GUARD: Ensure programId exists before proceeding
      if (!programId) {
        throw new Error('Program ID is required to create an epic');
      }
      
      // Let the database trigger generate the epic_key atomically
      const { data, error } = await supabase
        .from('epics')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          primary_program_id: programId,
          status: 'proposed',
          health: 'green',
          theme_id: themeId,
          linked_business_request_id: linkedBusinessRequestId,
          reporter_id: reporterId,
          assignee_id: assigneeId,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('[CreateEpicDialog] Insert error:', error);
        throw error;
      }

      // Commit attachments if any were uploaded
      if (uploadSessionId && stagedFiles.some(f => f.status === 'uploaded')) {
        try {
          await commitAttachments.mutateAsync({
            uploadSessionId,
            workItemId: data.id,
            workItemType: 'epic',
          });
        } catch (attachError) {
          console.error('Failed to commit attachments:', attachError);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['program-epics', programId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items', programId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success(`Epic ${data.epic_key} created successfully`);
      handleClose();
      if (onCreated) {
        onCreated(data.id);
      }
    },
    onError: (error: any) => {
      console.error('[CreateEpicDialog] Failed to create epic:', error);
      const errorMessage = error?.message || error?.details || 'Failed to create epic';
      toast.error(`Failed to create epic: ${errorMessage}`);
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setThemeId(null);
    setLinkedBusinessRequestId(null);
    setReporterId(null);
    setAssigneeId(null);
    setStagedFiles([]);
    setUploadSessionId(null);
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!isValid) return;
    if (isProgramMissing) return;
    createEpicMutation.mutate();
  };

  // Validation
  const missingFields: string[] = [];
  if (isProgramMissing) missingFields.push('Program context');
  if (!name.trim()) missingFields.push('Epic Name');
  if (!themeId) missingFields.push('Strategic Theme');
  if (!reporterId) missingFields.push('Reporter');
  if (!assigneeId) missingFields.push('Assignee');
  
  const isValid = missingFields.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col overflow-hidden",
        "bg-white dark:bg-[#141414]",
        "rounded-lg",
        "shadow-xl",
        "border border-gray-200 dark:border-[#333333]",
        "[&>button]:hidden"
      )}>
        {/* Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-[#2563eb] via-[#8b5cf6] to-[#60a5fa] flex-shrink-0" />

        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-[#333333] flex-shrink-0 bg-white dark:bg-[#141414]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Box className="h-5 w-5 text-[#8b5cf6]" />
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-[#f5f5f5]">
                Create Epic
              </DialogTitle>
            </div>
            <button 
              onClick={handleClose} 
              className={cn(
                "p-1.5 rounded-md",
                "text-gray-400 hover:text-gray-600 dark:text-[#737373] dark:hover:text-[#a3a3a3]",
                "hover:bg-gray-100 dark:hover:bg-[#1a1a1a]",
                "transition-colors"
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-6 scrollbar-catalyst">
          <div className="flex flex-col gap-5 py-4">
            
            {/* Section 1: Epic Name */}
            <div className="space-y-2">
              <FormLabel required>Epic Name</FormLabel>
              <CatalystInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter epic name..."
                autoFocus
              />
            </div>

            {/* Section 2: Ownership */}
            <FormSection title="Ownership">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel required>Reporter</FormLabel>
                  <UserPicker
                    value={reporterId}
                    onChange={(val) => setReporterId(val as string | null)}
                    placeholder="Select reporter..."
                  />
                </div>
                
                <div className="space-y-2">
                  <FormLabel required>Assignee</FormLabel>
                  <UserPicker
                    value={assigneeId}
                    onChange={(val) => setAssigneeId(val as string | null)}
                    placeholder="Select assignee..."
                  />
                </div>
              </div>
            </FormSection>

            {/* Section 3: Strategic Alignment */}
            <FormSection title="Strategic Alignment">
              {/* Strategic Theme - Required */}
              <div className="space-y-2">
                <FormLabel required>Strategic Theme</FormLabel>
                <Popover open={themePopoverOpen} onOpenChange={setThemePopoverOpen}>
                  <PopoverTrigger asChild>
                    <div>
                      <CatalystSelectTrigger 
                        isOpen={themePopoverOpen}
                        hasValue={!!selectedTheme}
                      >
                        {selectedTheme ? selectedTheme.name : 'Select strategic theme...'}
                      </CatalystSelectTrigger>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[400px] p-0 z-[400]" 
                    align="start"
                    style={{ 
                      backgroundColor: 'var(--dialog-section-bg)',
                      border: '1px solid var(--dialog-input-border)',
                      boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    <Command>
                      <CommandInput placeholder="Search themes..." />
                      <CommandList className="max-h-64">
                        <CommandEmpty>No themes found.</CommandEmpty>
                        <CommandGroup>
                          {themes.map((theme) => {
                            const isActive = theme.status === 'active';
                            const statusStyle = isActive 
                              ? {
                                  backgroundColor: 'rgba(13, 148, 136, 0.1)',
                                  color: '#0d9488',
                                  border: '1px solid rgba(13, 148, 136, 0.3)'
                                }
                              : {
                                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                  color: '#b45309',
                                  border: '1px solid rgba(245, 158, 11, 0.25)'
                                };
                            
                            return (
                              <CommandItem
                                key={theme.id}
                                value={theme.name}
                                onSelect={() => {
                                  setThemeId(theme.id);
                                  setThemePopoverOpen(false);
                                }}
                                className={cn(
                                  "cursor-pointer transition-colors py-3 px-4",
                                  themeId === theme.id && "!bg-[rgba(37,99,235,0.08)]"
                                )}
                                style={{
                                  borderLeft: themeId === theme.id ? '3px solid #2563eb' : '3px solid transparent'
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4 flex-shrink-0 text-primary',
                                    themeId === theme.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <span 
                                  className="flex-1 text-sm font-medium text-popover-foreground"
                                >
                                  {theme.name}
                                </span>
                                {theme.status && (
                                  <span
                                    className="ml-auto px-2 py-0.5 rounded text-xs font-medium"
                                    style={statusStyle}
                                  >
                                    {theme.status}
                                  </span>
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Linked Business Request - Optional */}
              <div className="space-y-2">
                <FormLabel>Linked Business Request</FormLabel>
                <Popover open={brPopoverOpen} onOpenChange={setBrPopoverOpen}>
                  <PopoverTrigger asChild>
                    <div>
                      <CatalystSelectTrigger 
                        isOpen={brPopoverOpen}
                        hasValue={!!selectedBR}
                      >
                        {selectedBR ? (
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-primary">
                              {selectedBR.request_key}
                            </span>
                            <span className="truncate">{selectedBR.title}</span>
                          </span>
                        ) : (
                          'Select business request (optional)...'
                        )}
                      </CatalystSelectTrigger>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[500px] p-0 z-[400]" 
                    align="start"
                    style={{ 
                      backgroundColor: 'var(--dialog-section-bg)',
                      border: '1px solid var(--dialog-input-border)',
                      boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    <Command>
                      <CommandInput placeholder="Search by ID or title..." />
                      <CommandList className="max-h-64">
                        <CommandEmpty>No business requests found.</CommandEmpty>
                        <CommandGroup>
                          {/* Clear option */}
                          {linkedBusinessRequestId && (
                            <CommandItem
                              value="clear"
                              onSelect={() => {
                                setLinkedBusinessRequestId(null);
                                setBrPopoverOpen(false);
                              }}
                              className="cursor-pointer"
                              style={{ color: 'var(--dialog-desc-color)' }}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Clear selection
                            </CommandItem>
                          )}
                          {businessRequests.map((br) => (
                            <CommandItem
                              key={br.id}
                              value={`${br.request_key} ${br.title}`}
                              onSelect={() => {
                                setLinkedBusinessRequestId(br.id);
                                setBrPopoverOpen(false);
                              }}
                              className={cn(
                                "cursor-pointer transition-colors py-3 px-4",
                                linkedBusinessRequestId === br.id && "!bg-[rgba(37,99,235,0.08)]"
                              )}
                              style={{
                                borderLeft: linkedBusinessRequestId === br.id ? '3px solid #2563eb' : '3px solid transparent'
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4 flex-shrink-0 text-primary',
                                  linkedBusinessRequestId === br.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-mono shrink-0 text-primary">
                                  {br.request_key}
                                </span>
                                <span 
                                  className="truncate text-popover-foreground"
                                >
                                  {br.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {br.rank && (
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-success/10 text-success border border-success/30"
                                  >
                                    Rank #{br.rank}
                                  </span>
                                )}
                                {br.business_score && (
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                                    style={{
                                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                      color: '#2563eb',
                                      border: '1px solid rgba(37, 99, 235, 0.25)'
                                    }}
                                  >
                                    Score: {br.business_score}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </FormSection>

            {/* Section 4: Description */}
            <FormSection title="Description">
              <div 
                className="rounded-lg overflow-hidden"
                style={{ 
                  backgroundColor: 'var(--dialog-input-bg)',
                  border: '1px solid var(--dialog-input-border)'
                }}
              >
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Enter epic description..."
                  minHeight="120px"
                />
              </div>
            </FormSection>

            {/* Section 5: Attachments */}
            <FormSection title="Attachments">
              {/* File upload area */}
              <div 
                className="rounded-lg p-4"
                style={{
                  border: '1px dashed var(--dialog-input-border)',
                  backgroundColor: 'transparent'
                }}
              >
                <input
                  type="file"
                  id="epic-attachments"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="epic-attachments"
                  className="flex flex-col items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
                >
                  <Upload className="h-6 w-6" style={{ color: 'var(--dialog-desc-color)' }} />
                  <span className="text-sm" style={{ color: 'var(--dialog-desc-color)' }}>
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs" style={{ color: 'var(--dialog-desc-color)' }}>
                    Files will appear in Epic Drawer → Links tab
                  </span>
                </label>
              </div>

              {/* Staged files list */}
              {stagedFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  {stagedFiles.map((sf, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg',
                        sf.status === 'error' && 'border-destructive'
                      )}
                      style={{
                        backgroundColor: sf.status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'var(--dialog-input-bg)',
                        border: `1px solid ${sf.status === 'error' ? 'var(--status-danger)' : 'var(--dialog-section-border)'}`
                      }}
                    >
                      <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--dialog-desc-color)' }} />
                      <span 
                        className="text-sm truncate flex-1"
                        style={{ color: 'var(--dialog-title-color)' }}
                      >
                        {sf.file.name}
                      </span>
                      {sf.status === 'uploading' && (
                        <span className="text-xs" style={{ color: 'var(--dialog-desc-color)' }}>
                          Uploading...
                        </span>
                      )}
                      {sf.status === 'uploaded' && (
                        <Lozenge appearance="success">Uploaded</Lozenge>
                      )}
                      {sf.status === 'error' && (
                        <span className="text-xs text-destructive">{sf.error}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(sf.file)}
                        className="h-6 w-6 p-0 flex items-center justify-center rounded transition-colors"
                        style={{ color: 'var(--dialog-desc-color)' }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
            
            {/* Bottom padding for scroll */}
            <div className="h-4" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#1a1a1a]">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-gray-600 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || createEpicMutation.isPending}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6"
            title={
              isProgramMissing 
                ? 'Program context required' 
                : !name.trim() 
                ? 'Epic name required' 
                : !themeId 
                ? 'Strategic theme required' 
                : !reporterId 
                ? 'Reporter required' 
                : !assigneeId 
                ? 'Assignee required' 
                : undefined
            }
          >
            {createEpicMutation.isPending ? 'Creating...' : 'Create Epic'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}