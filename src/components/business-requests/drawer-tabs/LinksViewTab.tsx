import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ArrowLeft, 
  Trash2, 
  ExternalLink, 
  FilePlus, 
  Upload, 
  X, 
  Download,
  FileText,
  BookOpen,
  Search,
  Link as LinkIcon,
  MoreVertical,
  Calendar,
  User,
  Clock,
  Eye,
  Filter,
  ChevronDown,
  FileIcon,
  Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkItemAttachments, downloadAttachment, type UnifiedAttachment } from '@/hooks/useUnifiedAttachments';

const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE_MB: 20,
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,
  MAX_FILES: 5,
};

type LinkKind = 'implementation' | 'document' | 'knowledge-hub' | 'external';
type FilterType = 'all' | LinkKind;
type StatusFilter = 'all' | 'not-started' | 'in-progress' | 'blocked' | 'done';
type SortOption = 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc' | 'type';
type FormView = 'selection' | 'external' | 'document' | 'knowledge-hub' | 'implementation';

// Status mapping from raw statuses to normalized categories
const STATUS_MAPPING: Record<string, StatusFilter> = {
  // Not Started
  'new': 'not-started',
  'created': 'not-started',
  'open': 'not-started',
  'backlog': 'not-started',
  'to do': 'not-started',
  'planned': 'not-started',
  'funnel': 'not-started',
  // In Progress
  'in progress': 'in-progress',
  'development': 'in-progress',
  'implementation': 'in-progress',
  'testing': 'in-progress',
  'analyzing': 'in-progress',
  'implementing': 'in-progress',
  'validating': 'in-progress',
  'deploying': 'in-progress',
  // Blocked
  'blocked': 'blocked',
  'on hold - blocked': 'blocked',
  // Done
  'done': 'done',
  'closed': 'done',
  'completed': 'done',
  'implemented': 'done',
  'released': 'done',
};

const normalizeStatus = (rawStatus: string | null): StatusFilter => {
  if (!rawStatus) return 'not-started';
  const normalized = STATUS_MAPPING[rawStatus.toLowerCase()];
  return normalized || 'not-started';
};

const STATUS_CONFIG: Record<StatusFilter, { label: string; color: string; bgColor: string }> = {
  'all': { label: 'All Statuses', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  'not-started': { label: 'Not Started', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  'in-progress': { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'blocked': { label: 'Blocked', color: 'text-red-600', bgColor: 'bg-red-100' },
  'done': { label: 'Done', color: 'text-green-600', bgColor: 'bg-green-100' },
};

const STATUS_INDICATOR_COLORS: Record<StatusFilter, string> = {
  'all': 'bg-muted',
  'not-started': 'bg-slate-400',
  'in-progress': 'bg-blue-500',
  'blocked': 'bg-red-500',
  'done': 'bg-green-500',
};

const TYPE_BADGE_CONFIG: Record<string, { bg: string; text: string }> = {
  'epic': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'feature': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'story': { bg: 'bg-sky-100', text: 'text-sky-700' },
  'task': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'document': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'kb': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'external': { bg: 'bg-gray-100', text: 'text-gray-700' },
};

interface LinksViewTabProps {
  requestId: string;
  onNavigateToEpic?: (epicId: string, programId?: string | null) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) + ' at ' + date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

export function LinksViewTab({ requestId, onNavigateToEpic }: LinksViewTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formView, setFormView] = useState<FormView>('selection');
  const [isDragOver, setIsDragOver] = useState(false);
  const [typeFilters, setTypeFilters] = useState<LinkKind[]>([]);
  const [statusFilters, setStatusFilters] = useState<Exclude<StatusFilter, 'all'>[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  // External link form state
  const [externalForm, setExternalForm] = useState({
    title: '',
    url: '',
  });
  
  // Document upload form state
  const [documentForm, setDocumentForm] = useState({
    title: '',
    files: [] as File[]
  });

  // Knowledge Hub form state
  const [kbSearch, setKbSearch] = useState('');
  const [selectedKbDoc, setSelectedKbDoc] = useState<{ id: string; title: string } | null>(null);

  // Implementation link form state
  const [implSearch, setImplSearch] = useState('');
  const [selectedWorkItem, setSelectedWorkItem] = useState<{
    id: string;
    key: string;
    title: string;
    type: string;
    status: string;
    owner: string;
    source: string;
  } | null>(null);

  // Fetch Knowledge Hub documents
  const { data: kbDocuments = [] } = useQuery({
    queryKey: ['kb-documents-for-linking', kbSearch],
    queryFn: async () => {
      let query = supabase
        .from('kb_documents')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (kbSearch) {
        query = query.ilike('title', `%${kbSearch}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: formView === 'knowledge-hub'
  });

  // Fetch work items for implementation linking
  const { data: workItems = [], isLoading: workItemsLoading, error: workItemsError } = useQuery({
    queryKey: ['work-items-for-linking', implSearch],
    queryFn: async () => {
      const searchTerm = implSearch.trim();
      if (!searchTerm) return [];
      
      const results: any[] = [];
      
      // Search Epics by key OR name using separate queries then combining
      // (Supabase .or() with ilike can be tricky, so we do explicit OR)
      try {
        const { data: epicsByKey } = await supabase
          .from('epics')
          .select('id, epic_key, name, state, owner_name')
          .ilike('epic_key', `%${searchTerm}%`)
          .limit(5);
        
        const { data: epicsByName } = await supabase
          .from('epics')
          .select('id, epic_key, name, state, owner_name')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);
        
        // Combine and dedupe
        const epicsMap = new Map();
        [...(epicsByKey || []), ...(epicsByName || [])].forEach(e => epicsMap.set(e.id, e));
        const epics = Array.from(epicsMap.values());
        
        results.push(...epics.map(e => ({
          id: e.id,
          key: e.epic_key || `E-${e.id.slice(0, 4)}`,
          title: e.name,
          type: 'epic',
          status: e.state || 'new',
          owner: e.owner_name || 'Unassigned',
          source: 'Catalyst Epics'
        })));
      } catch (err) {
        console.error('Error searching epics:', err);
      }
      
      // Search Features by key OR name
      try {
        const { data: featuresByKey } = await supabase
          .from('features')
          .select('id, display_id, name, status')
          .ilike('display_id', `%${searchTerm}%`)
          .limit(5);
        
        const { data: featuresByName } = await supabase
          .from('features')
          .select('id, display_id, name, status')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);
        
        const featuresMap = new Map();
        [...(featuresByKey || []), ...(featuresByName || [])].forEach(f => featuresMap.set(f.id, f));
        const features = Array.from(featuresMap.values());
        
        results.push(...features.map((f: any) => ({
          id: f.id,
          key: f.display_id || `F-${f.id.slice(0, 4)}`,
          title: f.name,
          type: 'feature',
          status: f.status || 'new',
          owner: 'Unassigned',
          source: 'Catalyst Features'
        })));
      } catch (err) {
        console.error('Error searching features:', err);
      }
      
      // Search Stories by key OR name
      try {
        const { data: storiesByKey } = await supabase
          .from('stories')
          .select('id, story_key, name, status')
          .ilike('story_key', `%${searchTerm}%`)
          .limit(5);
        
        const { data: storiesByName } = await supabase
          .from('stories')
          .select('id, story_key, name, status')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);
        
        const storiesMap = new Map();
        [...(storiesByKey || []), ...(storiesByName || [])].forEach(s => storiesMap.set(s.id, s));
        const stories = Array.from(storiesMap.values());
        
        results.push(...stories.map((s: any) => ({
          id: s.id,
          key: s.story_key || `S-${s.id.slice(0, 4)}`,
          title: s.name,
          type: 'story',
          status: s.status || 'new',
          owner: 'Unassigned',
          source: 'Catalyst Stories'
        })));
      } catch (err) {
        console.error('Error searching stories:', err);
      }
      
      return results;
    },
    enabled: formView === 'implementation' && implSearch.trim().length >= 1
  });

  // Fetch legacy links from business_request_links
  const { data: legacyLinks = [], isLoading: linksLoading } = useQuery({
    queryKey: ['business-request-links', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_request_links')
        .select('*')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId
  });

  // Fetch unified attachments (from external wizard uploads)
  const { data: unifiedAttachments = [], isLoading: attachmentsLoading } = useWorkItemAttachments(requestId, 'business_request');

  // Merge legacy links with unified attachments (convert to common shape)
  const links = useMemo(() => {
    // Convert unified attachments to link-like shape
    const attachmentLinks = unifiedAttachments.map((att: UnifiedAttachment) => ({
      id: att.id,
      title: att.file_name,
      url: '', // Will use storage_key for download
      kind: 'document' as LinkKind,
      link_type: 'document',
      linked_item_type: null as string | null,
      created_at: att.created_at,
      added_by_name: att.uploaded_by_name || 'External User',
      file_name: att.file_name,
      file_path: att.storage_key,
      file_size: att.file_size,
      mime_type: att.mime_type,
      // Mark as unified attachment for special handling
      _isUnifiedAttachment: true,
      _unifiedAttachment: att,
    }));

    // Combine and dedupe by id
    const allLinks = [...legacyLinks, ...attachmentLinks];
    return allLinks;
  }, [legacyLinks, unifiedAttachments]);

  // Filter and sort links
  const filteredLinks = useMemo(() => {
    let result = [...links];
    
    // Filter by type (if any selected; empty = show all)
    if (typeFilters.length > 0) {
      result = result.filter(link => typeFilters.includes(link.kind as LinkKind));
    }
    
    // Filter by status (only for implementation links)
    if (statusFilters.length > 0) {
      result = result.filter(link => {
        if (link.kind !== 'implementation') return true;
        const normalized = normalizeStatus(link.linked_item_type);
        return statusFilters.includes(normalized as Exclude<StatusFilter, 'all'>);
      });
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'alpha-asc':
          return a.title.localeCompare(b.title);
        case 'alpha-desc':
          return b.title.localeCompare(a.title);
        case 'type':
          return (a.kind || '').localeCompare(b.kind || '');
        default:
          return 0;
      }
    });
    
    return result;
  }, [links, typeFilters, statusFilters, sortOption]);

  // Calculate counts
  const typeCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      'all': links.length,
      'implementation': links.filter(l => l.kind === 'implementation').length,
      'document': links.filter(l => l.kind === 'document').length,
      'knowledge-hub': links.filter(l => l.kind === 'knowledge-hub').length,
      'external': links.filter(l => l.kind === 'external').length,
    };
    return counts;
  }, [links]);

  const createExternalLinkMutation = useMutation({
    mutationFn: async (link: typeof externalForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();
      
      const { error } = await supabase
        .from('business_request_links')
        .insert({ 
          title: link.title,
          url: link.url,
          link_type: 'external',
          business_request_id: requestId,
          kind: 'external',
          added_by_name: profile?.full_name || user?.email || 'Unknown'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-links', requestId] });
      toast.success('External link added');
      setExternalForm({ title: '', url: '' });
      setFormView('selection');
    },
    onError: () => {
      toast.error('Failed to add link');
    }
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ title, files }: { title: string; files: File[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      for (const file of files) {
        const fileName = `${requestId}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('business_request_links')
          .insert({
            business_request_id: requestId,
            title: title || file.name,
            url: publicUrl,
            link_type: 'documentation',
            kind: 'document',
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
            added_by_name: profile?.full_name || user.email || 'Unknown'
          });
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-links', requestId] });
      toast.success('Documents uploaded');
      setDocumentForm({ title: '', files: [] });
      setFormView('selection');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents');
    }
  });

  const createKbLinkMutation = useMutation({
    mutationFn: async (doc: { id: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();
      
      const { error } = await supabase
        .from('business_request_links')
        .insert({ 
          title: doc.title,
          url: `/knowledge-hub/documents/${doc.id}`,
          link_type: 'knowledge-hub',
          business_request_id: requestId,
          kind: 'knowledge-hub',
          added_by_name: profile?.full_name || user?.email || 'Unknown'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-links', requestId] });
      toast.success('Knowledge Hub page linked');
      setSelectedKbDoc(null);
      setKbSearch('');
      setFormView('selection');
    },
    onError: () => {
      toast.error('Failed to link Knowledge Hub page');
    }
  });

  const createImplementationLinkMutation = useMutation({
    mutationFn: async (workItem: typeof selectedWorkItem) => {
      if (!workItem) throw new Error('No work item selected');
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();
      
      const { error } = await supabase
        .from('business_request_links')
        .insert({ 
          title: `${workItem.key} – ${workItem.title}`,
          url: `/${workItem.type}s/${workItem.id}`,
          link_type: workItem.type,
          business_request_id: requestId,
          kind: 'implementation',
          linked_item_id: workItem.id,
          linked_item_type: workItem.type,
          linked_item_source: workItem.source,
          added_by_name: profile?.full_name || user?.email || 'Unknown'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-links', requestId] });
      toast.success('Implementation link added');
      setSelectedWorkItem(null);
      setImplSearch('');
      setFormView('selection');
    },
    onError: () => {
      toast.error('Failed to add implementation link');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (link: any) => {
      if (link.kind === 'document' && link.file_path) {
        await supabase.storage.from('attachments').remove([link.file_path]);
      }
      
      const { error } = await supabase
        .from('business_request_links')
        .delete()
        .eq('id', link.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-links', requestId] });
      toast.success('Link removed');
    }
  });

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const validFiles: File[] = [];
    
    for (const file of newFiles) {
      if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
        toast.error(`${file.name} exceeds ${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB limit`);
        continue;
      }
      if (documentForm.files.length + validFiles.length >= FILE_UPLOAD_CONFIG.MAX_FILES) {
        toast.error(`Maximum ${FILE_UPLOAD_CONFIG.MAX_FILES} files allowed`);
        break;
      }
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      setDocumentForm(prev => ({
        ...prev,
        files: [...prev.files, ...validFiles]
      }));
    }
  }, [documentForm.files.length]);

  const handleBack = () => {
    setFormView('selection');
    setExternalForm({ title: '', url: '' });
    setDocumentForm({ title: '', files: [] });
    setSelectedKbDoc(null);
    setKbSearch('');
    setSelectedWorkItem(null);
    setImplSearch('');
  };

  const clearFilters = () => {
    setTypeFilters([]);
    setStatusFilters([]);
    setSortOption('newest');
  };

  const toggleTypeFilter = (type: LinkKind) => {
    setTypeFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleStatusFilter = (status: Exclude<StatusFilter, 'all'>) => {
    setStatusFilters(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const getFilterSummary = () => {
    if (typeFilters.length === 0 && statusFilters.length === 0) {
      return 'Showing all links';
    }
    const count = filteredLinks.length;
    return `Showing ${count} link${count !== 1 ? 's' : ''}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Add New Link Section */}
      <Card className="p-5 border border-border/60 bg-card">
        <h4 className="font-semibold text-[15px] text-foreground mb-4">Add New Link</h4>
        
        {formView === 'selection' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Implementation Links - FIRST */}
            <button
              className="p-4 border-2 border-dashed border-border rounded-xl text-center cursor-pointer transition-all hover:border-brand-gold/50 hover:bg-brand-gold/5 group"
              onClick={() => setFormView('implementation')}
            >
              <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center bg-muted/50 rounded-lg group-hover:bg-brand-gold group-hover:text-white transition-all">
                <LinkIcon className="h-5 w-5 text-muted-foreground group-hover:text-white" />
              </div>
              <div className="font-medium text-[13px] text-foreground mb-0.5">Implementation Links</div>
              <div className="text-[11px] text-muted-foreground leading-tight">Link epics, features, or stories</div>
            </button>

            {/* Upload Documents */}
            <button
              className="p-4 border-2 border-dashed border-border rounded-xl text-center cursor-pointer transition-all hover:border-brand-gold/50 hover:bg-brand-gold/5 group"
              onClick={() => setFormView('document')}
            >
              <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center bg-muted/50 rounded-lg group-hover:bg-brand-gold group-hover:text-white transition-all">
                <FilePlus className="h-5 w-5 text-muted-foreground group-hover:text-white" />
              </div>
              <div className="font-medium text-[13px] text-foreground mb-0.5">Upload Documents</div>
              <div className="text-[11px] text-muted-foreground leading-tight">Attach files up to 20MB each</div>
            </button>

            {/* Knowledge Hub */}
            <button
              className="p-4 border-2 border-dashed border-border rounded-xl text-center cursor-pointer transition-all hover:border-brand-gold/50 hover:bg-brand-gold/5 group"
              onClick={() => setFormView('knowledge-hub')}
            >
              <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center bg-muted/50 rounded-lg group-hover:bg-brand-gold group-hover:text-white transition-all">
                <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-white" />
              </div>
              <div className="font-medium text-[13px] text-foreground mb-0.5">Knowledge Hub</div>
              <div className="text-[11px] text-muted-foreground leading-tight">Link to a KB page</div>
            </button>

            {/* External Link - LAST */}
            <button
              className="p-4 border-2 border-dashed border-border rounded-xl text-center cursor-pointer transition-all hover:border-brand-gold/50 hover:bg-brand-gold/5 group"
              onClick={() => setFormView('external')}
            >
              <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center bg-muted/50 rounded-lg group-hover:bg-brand-gold group-hover:text-white transition-all">
                <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-white" />
              </div>
              <div className="font-medium text-[13px] text-foreground mb-0.5">External Link</div>
              <div className="text-[11px] text-muted-foreground leading-tight">Add a URL to external resource</div>
            </button>
          </div>
        )}

        {/* Implementation Links Form */}
        {formView === 'implementation' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            
            <div>
              <Label className="text-[13px] font-medium text-foreground">Search Work Items</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={implSearch}
                  onChange={(e) => setImplSearch(e.target.value)}
                  placeholder="Search by key (E-1234) or title..."
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus:border-brand-gold focus:ring-brand-gold/15"
                />
              </div>
              {workItemsError && (
                <p className="text-[11px] text-destructive mt-1.5">
                  Something went wrong while searching work items. Please try again or contact support if the issue persists.
                </p>
              )}
            </div>

            {implSearch.trim().length >= 1 && (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {workItemsLoading ? (
                    <div className="text-center py-8 text-[13px] text-muted-foreground">
                      Searching...
                    </div>
                  ) : workItems.length > 0 ? (
                    workItems.map((item: any) => {
                      const statusCategory = normalizeStatus(item.status);
                      const statusConfig = STATUS_CONFIG[statusCategory];
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedWorkItem(item)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                            selectedWorkItem?.id === item.id 
                              ? "bg-brand-gold/10 border border-brand-gold" 
                              : "hover:bg-muted/50"
                          )}
                        >
                          <span className={cn(
                            "px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded",
                            TYPE_BADGE_CONFIG[item.type]?.bg || 'bg-gray-100',
                            TYPE_BADGE_CONFIG[item.type]?.text || 'text-gray-700'
                          )}>
                            {item.type}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium truncate">
                              <span className="text-muted-foreground">{item.key}</span> – {item.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                              <span>{item.owner}</span>
                              <span>•</span>
                              <span>{item.source}</span>
                            </div>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0",
                            statusConfig.bgColor,
                            statusConfig.color
                          )}>
                            {statusConfig.label}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-[13px] text-muted-foreground">
                      No work items found
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {selectedWorkItem && (
              <div className="p-3 bg-brand-gold/5 border border-brand-gold/20 rounded-lg">
                <div className="text-[12px] text-muted-foreground mb-1">Selected:</div>
                <div className="text-[13px] font-medium text-foreground">
                  {selectedWorkItem.key} – {selectedWorkItem.title}
                </div>
              </div>
            )}

            <Button 
              onClick={() => createImplementationLinkMutation.mutate(selectedWorkItem)} 
              disabled={createImplementationLinkMutation.isPending || !selectedWorkItem}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {createImplementationLinkMutation.isPending ? 'Linking...' : 'Link Work Item'}
            </Button>
          </div>
        )}

        {/* External Link Form */}
        {formView === 'external' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            
            <div>
              <Label className="text-[13px] font-medium text-foreground">Title*</Label>
              <Input
                value={externalForm.title}
                onChange={(e) => setExternalForm({ ...externalForm, title: e.target.value })}
                placeholder="e.g., Figma Design Mockups"
                className="mt-1.5 h-10 bg-muted/30 border-border/60 focus:border-brand-gold"
              />
            </div>

            <div>
              <Label className="text-[13px] font-medium text-foreground">URL*</Label>
              <Input
                value={externalForm.url}
                onChange={(e) => setExternalForm({ ...externalForm, url: e.target.value })}
                placeholder="https://..."
                className="mt-1.5 h-10 bg-muted/30 border-border/60 focus:border-brand-gold"
              />
            </div>

            <Button 
              onClick={() => createExternalLinkMutation.mutate(externalForm)} 
              disabled={createExternalLinkMutation.isPending || !externalForm.title || !externalForm.url}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {createExternalLinkMutation.isPending ? 'Adding...' : 'Add Link'}
            </Button>
          </div>
        )}

        {/* Document Upload Form */}
        {formView === 'document' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div>
              <Label className="text-[13px] font-medium text-foreground">Title (optional)</Label>
              <Input
                value={documentForm.title}
                onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                placeholder="e.g., Technical Specification"
                className="mt-1.5 h-10 bg-muted/30 border-border/60 focus:border-brand-gold"
              />
            </div>

            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                isDragOver ? "border-brand-gold bg-brand-gold/5" : "border-border/60 bg-muted/30 hover:border-brand-gold/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFilesAdded(Array.from(e.dataTransfer.files));
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-brand-gold" />
              <p className="text-[13px] text-muted-foreground">
                Drag & drop files here, or <span className="text-brand-gold font-medium">browse</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Max 20MB per file • Up to 5 files</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => handleFilesAdded(Array.from(e.target.files || []))}
              />
            </div>

            {documentForm.files.length > 0 && (
              <div className="space-y-2">
                {documentForm.files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                    <FileText className="h-5 w-5 text-brand-gold" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{file.name}</div>
                      <div className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDocumentForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) })); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={() => uploadDocumentMutation.mutate({ title: documentForm.title, files: documentForm.files })} 
              disabled={uploadDocumentMutation.isPending || documentForm.files.length === 0}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload Documents'}
            </Button>
          </div>
        )}

        {/* Knowledge Hub Form */}
        {formView === 'knowledge-hub' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div>
              <Label className="text-[13px] font-medium text-foreground">Search Knowledge Hub</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder="Search pages..."
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus:border-brand-gold"
                />
              </div>
            </div>

            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-1">
                {kbDocuments.length > 0 ? (
                  kbDocuments.map((doc: any) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedKbDoc({ id: doc.id, title: doc.title })}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                        selectedKbDoc?.id === doc.id ? "bg-brand-gold/10 border border-brand-gold" : "hover:bg-muted/50"
                      )}
                    >
                      <BookOpen className="h-4 w-4 text-brand-gold flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate">{doc.title}</div>
                        <div className="text-[11px] text-muted-foreground">Updated {new Date(doc.updated_at).toLocaleDateString()}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-[13px] text-muted-foreground">
                    {kbSearch ? 'No pages found' : 'No Knowledge Hub pages available'}
                  </div>
                )}
              </div>
            </ScrollArea>

            {selectedKbDoc && (
              <div className="p-3 bg-brand-gold/5 border border-brand-gold/20 rounded-lg">
                <div className="text-[12px] text-muted-foreground mb-1">Selected:</div>
                <div className="text-[13px] font-medium text-foreground">{selectedKbDoc.title}</div>
              </div>
            )}

            <Button 
              onClick={() => createKbLinkMutation.mutate(selectedKbDoc!)} 
              disabled={createKbLinkMutation.isPending || !selectedKbDoc}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {createKbLinkMutation.isPending ? 'Linking...' : 'Link Page'}
            </Button>
          </div>
        )}
      </Card>

      {/* Filter & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Type Filter + Status Filter Dropdowns */}
        <div className="flex items-center gap-3">
          {/* Type Filter Multi-Select Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px] bg-background">
                <Filter className="h-3.5 w-3.5" />
                Type
                {typeFilters.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-foreground text-background rounded-full text-[10px] font-semibold">
                    {typeFilters.length}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-background" align="start">
              <div className="space-y-1">
                {(['implementation', 'document', 'knowledge-hub', 'external'] as LinkKind[]).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={typeFilters.includes(type)}
                      onCheckedChange={() => toggleTypeFilter(type)}
                    />
                    <span className="text-[12px] font-medium">
                      {type === 'knowledge-hub' ? 'Knowledge Hub' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-auto">({typeCounts[type]})</span>
                  </label>
                ))}
              </div>
              {typeFilters.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2 text-[11px] h-7" 
                  onClick={() => setTypeFilters([])}
                >
                  Clear
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Status Filter Multi-Select Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px] bg-background">
                <Clock className="h-3.5 w-3.5" />
                Status
                {statusFilters.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-foreground text-background rounded-full text-[10px] font-semibold">
                    {statusFilters.length}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-2 bg-background" align="start">
              <div className="space-y-1">
                {(['not-started', 'in-progress', 'blocked', 'done'] as Exclude<StatusFilter, 'all'>[]).map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={statusFilters.includes(status)}
                      onCheckedChange={() => toggleStatusFilter(status)}
                    />
                    <span className={cn("w-2 h-2 rounded-full", STATUS_INDICATOR_COLORS[status])} />
                    <span className="text-[12px] font-medium">{STATUS_CONFIG[status].label}</span>
                  </label>
                ))}
              </div>
              {statusFilters.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2 text-[11px] h-7" 
                  onClick={() => setStatusFilters([])}
                >
                  Clear
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Sort Control */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">Sort by</span>
          <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
            <SelectTrigger className="h-8 w-[130px] text-[12px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="alpha-asc">Name (A–Z)</SelectItem>
              <SelectItem value="alpha-desc">Name (Z–A)</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Links List Header */}
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <h4 className="font-semibold text-[15px] text-foreground flex items-center gap-2">
          Links <span className="text-muted-foreground font-normal">({filteredLinks.length})</span>
        </h4>
        <p className="text-[13px] text-muted-foreground">{getFilterSummary()}</p>
      </div>

      {/* Links List */}
      {linksLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading links...</div>
      ) : filteredLinks.length > 0 ? (
        <div className="border border-border rounded-lg overflow-hidden bg-muted/20">
          <ScrollArea className="max-h-[400px]">
            <ul className="divide-y divide-border">
              {filteredLinks.map((link: any) => {
                const normalizedStatus = link.kind === 'implementation' ? normalizeStatus(link.linked_item_type) : null;
                const statusConfig = normalizedStatus ? STATUS_CONFIG[normalizedStatus] : null;
                const typeBadge = TYPE_BADGE_CONFIG[link.linked_item_type || link.kind] || TYPE_BADGE_CONFIG.external;
                
                return (
                  <li key={link.id} className="flex bg-background hover:bg-muted/30 transition-colors">
                    {/* Status Indicator Bar */}
                    <div className={cn(
                      "w-1 flex-shrink-0",
                      link.kind === 'implementation' && normalizedStatus
                        ? STATUS_INDICATOR_COLORS[normalizedStatus]
                        : link.kind === 'document' ? 'bg-orange-400'
                        : link.kind === 'knowledge-hub' ? 'bg-indigo-400'
                        : 'bg-gray-400'
                    )} />
                    
                    {/* Card Body - 2 line layout */}
                    <div className="flex-1 p-3 min-w-0">
                      {/* Line 1: Title + Type Badge + Status Badge + Menu */}
                      <div className="flex items-center gap-2">
                        {/* Title - truncates to make room for badges */}
                        {/* Epic links get special navigation handling */}
                        {link.kind === 'implementation' && link.linked_item_type === 'epic' && onNavigateToEpic ? (
                          <button
                            onClick={() => onNavigateToEpic(link.linked_item_id, null)}
                            className="text-[14px] font-medium text-brand-gold hover:underline underline-offset-2 truncate flex-1 min-w-0 text-left"
                          >
                            {link.title}
                          </button>
                        ) : (
                          <a 
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[14px] font-medium text-brand-gold hover:underline underline-offset-2 truncate flex-1 min-w-0"
                          >
                            {link.title}
                          </a>
                        )}
                        
                        {/* Badges Group - flex-shrink-0 to keep visible */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Implementation: show status badge */}
                          {link.kind === 'implementation' && statusConfig && (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded",
                              statusConfig.bgColor, statusConfig.color
                            )}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_INDICATOR_COLORS[normalizedStatus!])} />
                              {statusConfig.label}
                            </span>
                          )}
                          
                          {/* Type Badge */}
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded capitalize whitespace-nowrap",
                            link.kind === 'implementation' && link.linked_item_type
                              ? `${TYPE_BADGE_CONFIG[link.linked_item_type]?.bg || 'bg-gray-100'} ${TYPE_BADGE_CONFIG[link.linked_item_type]?.text || 'text-gray-700'}`
                              : `${typeBadge.bg} ${typeBadge.text}`
                          )}>
                            {link.kind === 'implementation' && link.linked_item_type
                              ? link.linked_item_type
                              : link.kind === 'knowledge-hub' ? 'KB' : link.kind === 'document' ? 'Document' : 'External'}
                          </span>
                          
                          {/* 3-dot menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-background">
                              <DropdownMenuItem onClick={async () => {
                                if (link.kind === 'document' && link.file_path) {
                                  const { data } = await supabase.storage.from('attachments').createSignedUrl(link.file_path, 3600);
                                  if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                } else {
                                  window.open(link.url, '_blank', 'noopener,noreferrer');
                                }
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                {link.kind === 'document' ? 'Download' : 'Open'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (confirm('Remove this link?')) {
                                    deleteMutation.mutate(link);
                                  }
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove link
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {/* Line 2: Meta info */}
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1 truncate">
                        {link.kind === 'document' && link.file_size && (
                          <>
                            <span>{formatFileSize(link.file_size)}</span>
                            <span>•</span>
                          </>
                        )}
                        {link.kind === 'external' && (
                          <>
                            <span className="truncate max-w-[120px]">{(() => { try { return new URL(link.url).hostname; } catch { return 'External'; } })()}</span>
                            <span>•</span>
                          </>
                        )}
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">Added {formatDate(link.created_at)}</span>
                        {link.added_by_name && (
                          <span className="truncate">by {link.added_by_name}</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>
      ) : (
        <div 
          className="flex flex-col items-center justify-center py-12 px-6 rounded-lg text-center"
          style={{ 
            backgroundColor: 'var(--surface-2)',
            border: '1px dashed var(--border-color)'
          }}
        >
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--surface-3)' }}
          >
            <LinkIcon className="h-6 w-6" style={{ color: 'var(--text-3)' }} />
          </div>
          {typeFilters.length > 0 || statusFilters.length > 0 ? (
            <>
              <h4 
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--text-1)' }}
              >
                No matching links found
              </h4>
              <p 
                className="text-xs max-w-[280px] mb-4"
                style={{ color: 'var(--text-2)' }}
              >
                Try adjusting your filters to see more results.
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
            </>
          ) : (
            <>
              <h4 
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--text-1)' }}
              >
                No links yet
              </h4>
              <p 
                className="text-xs max-w-[280px]"
                style={{ color: 'var(--text-2)' }}
              >
                Use the tiles above to add implementation links, documents, or external references.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
