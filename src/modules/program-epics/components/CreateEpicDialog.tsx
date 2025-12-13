/**
 * Create Epic Dialog - Enhanced with full Epic domain model
 * 
 * SECTIONS:
 * 1. Identity: Epic Number (auto), Epic Name (required)
 * 2. Strategic Alignment: Strategic Theme (required), Linked Business Request (optional)
 * 3. Description: Rich Text Editor
 * 4. Attachments: File uploads (flow to Links tab)
 * 5. Ownership: Reporter (required), Assignee (required)
 */
import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { generateNextEpicKey, isValidProgramKey } from '@/utils/epic-key-generator';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { UserPicker } from '@/components/ui/user-picker';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Upload, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useCreateUploadSession, 
  useStageAttachment, 
  useCommitAttachments,
  UnifiedAttachment 
} from '@/hooks/useUnifiedAttachments';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateEpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  onCreated?: (epicId: string) => void;
}

interface StagedFile {
  file: File;
  attachment?: UnifiedAttachment;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

export function CreateEpicDialog({ 
  open, 
  onOpenChange, 
  programId,
  onCreated,
}: CreateEpicDialogProps) {
  const queryClient = useQueryClient();
  
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
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, request_key, title, rank, business_score')
        .is('deleted_at', null)
        .order('request_key');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Attachment mutations
  const createUploadSession = useCreateUploadSession();
  const stageAttachment = useStageAttachment();
  const commitAttachments = useCommitAttachments();

  // Derive the 3-letter key for display
  const getProgramKeyPreview = () => {
    if (!program?.key) return '???';
    if (isValidProgramKey(program.key)) return program.key;
    const upper = program.key.toUpperCase().replace(/[^A-Z]/g, '');
    return upper.length >= 3 ? upper.substring(0, 3) : 'PRG';
  };

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
      // Generate the next epic key for this program
      const epicKey = await generateNextEpicKey(programId);
      
      const { data, error } = await supabase
        .from('epics')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          primary_program_id: programId,
          epic_key: epicKey,
          status: 'proposed',
          health: 'green',
          theme_id: themeId,
          linked_business_request_id: linkedBusinessRequestId,
          reporter_id: reporterId,
          assignee_id: assigneeId,
        } as any)
        .select()
        .single();

      if (error) throw error;

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
          // Don't fail the whole creation for attachment errors
        }
      }

      return { ...data, epic_key: epicKey };
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
    onError: (error) => {
      console.error('Failed to create epic:', error);
      toast.error('Failed to create epic');
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
    createEpicMutation.mutate();
  };

  // Validation: name, theme, reporter, assignee are required
  const isValid = 
    name.trim().length > 0 && 
    themeId !== null && 
    reporterId !== null && 
    assigneeId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Epic</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="flex flex-col gap-5 py-4">
            {/* Section 1: Identity */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Identity</h4>
              
              {/* Epic Number Preview */}
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
                <span className="text-sm text-muted-foreground">Epic Number:</span>
                <span className="font-mono font-medium text-brand-gold">
                  {getProgramKeyPreview()}-###
                </span>
                <span className="text-xs text-muted-foreground">(auto-generated)</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="epic-name">
                  Epic Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="epic-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter epic name"
                  autoFocus
                />
              </div>
            </div>

            {/* Section 2: Strategic Alignment */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Strategic Alignment</h4>
              
              {/* Strategic Theme - Required, Searchable */}
              <div className="space-y-2">
                <Label>
                  Strategic Theme <span className="text-destructive">*</span>
                </Label>
                <Popover open={themePopoverOpen} onOpenChange={setThemePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={themePopoverOpen}
                      className="w-full justify-between font-normal h-9"
                    >
                      {selectedTheme ? selectedTheme.name : 'Select strategic theme...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 z-[400]" align="start">
                    <Command>
                      <CommandInput placeholder="Search themes..." />
                      <CommandList>
                        <CommandEmpty>No themes found.</CommandEmpty>
                        <CommandGroup>
                          {themes.map((theme) => (
                            <CommandItem
                              key={theme.id}
                              value={theme.name}
                              onSelect={() => {
                                setThemeId(theme.id);
                                setThemePopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  themeId === theme.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span>{theme.name}</span>
                              {theme.status && (
                                <Badge variant="outline" className="ml-auto text-xs">
                                  {theme.status}
                                </Badge>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Linked Business Request - Optional, Searchable with details */}
              <div className="space-y-2">
                <Label>Linked Business Request</Label>
                <Popover open={brPopoverOpen} onOpenChange={setBrPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={brPopoverOpen}
                      className="w-full justify-between font-normal h-9"
                    >
                      {selectedBR ? (
                        <span className="flex items-center gap-2 truncate">
                          <span className="font-mono text-brand-gold">{selectedBR.request_key}</span>
                          <span className="truncate">{selectedBR.title}</span>
                        </span>
                      ) : (
                        'Select business request (optional)...'
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0 z-[400]" align="start">
                    <Command>
                      <CommandInput placeholder="Search by ID or title..." />
                      <CommandList>
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
                              className="text-muted-foreground"
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
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  linkedBusinessRequestId === br.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-mono text-brand-gold shrink-0">
                                  {br.request_key}
                                </span>
                                <span className="truncate">{br.title}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {br.rank && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Rank #{br.rank}
                                  </Badge>
                                )}
                                {br.business_score && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Score: {br.business_score}
                                  </Badge>
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
            </div>

            {/* Section 3: Description */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Enter epic description..."
                minHeight="120px"
              />
            </div>

            {/* Section 4: Attachments */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>
              
              {/* File upload area */}
              <div className="border border-dashed border-border rounded-md p-4">
                <input
                  type="file"
                  id="epic-attachments"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="epic-attachments"
                  className="flex flex-col items-center gap-2 cursor-pointer"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Files will appear in Epic Drawer → Links tab
                  </span>
                </label>
              </div>

              {/* Staged files list */}
              {stagedFiles.length > 0 && (
                <div className="space-y-2">
                  {stagedFiles.map((sf, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border',
                        sf.status === 'error' ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/30'
                      )}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate flex-1">{sf.file.name}</span>
                      {sf.status === 'uploading' && (
                        <span className="text-xs text-muted-foreground">Uploading...</span>
                      )}
                      {sf.status === 'uploaded' && (
                        <Badge variant="secondary" className="text-[10px]">Uploaded</Badge>
                      )}
                      {sf.status === 'error' && (
                        <span className="text-xs text-destructive">{sf.error}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile(sf.file)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 5: Ownership */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Ownership</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>
                    Reporter <span className="text-destructive">*</span>
                  </Label>
                  <UserPicker
                    value={reporterId}
                    onChange={(val) => setReporterId(val as string | null)}
                    placeholder="Select reporter..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>
                    Assignee <span className="text-destructive">*</span>
                  </Label>
                  <UserPicker
                    value={assigneeId}
                    onChange={(val) => setAssigneeId(val as string | null)}
                    placeholder="Select assignee..."
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || createEpicMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-background"
          >
            {createEpicMutation.isPending ? 'Creating...' : 'Create Epic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
