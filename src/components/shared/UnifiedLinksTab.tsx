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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Entity types supported by UnifiedLinksTab
export type LinkableEntityType = 'epic' | 'theme' | 'objective' | 'business_request';

type LinkKind = 'implementation' | 'document' | 'knowledge-hub' | 'external';
type FilterType = 'all' | LinkKind;
type SortOption = 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc' | 'type';
type FormView = 'selection' | 'external' | 'document' | 'knowledge-hub' | 'implementation';

const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE_MB: 20,
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,
  MAX_FILES: 5,
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

interface UnifiedLinksTabProps {
  entityType: LinkableEntityType;
  entityId: string;
  /** Hide specific tiles from the selection view */
  hideTiles?: ('implementation' | 'document' | 'knowledge-hub' | 'external')[];
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
  });
};

// Get table/column names based on entity type
function getTableConfig(entityType: LinkableEntityType) {
  switch (entityType) {
    case 'epic':
      return { table: 'epic_links', idColumn: 'epic_id', hasKind: false };
    case 'theme':
      return { table: 'theme_links', idColumn: 'theme_id', hasKind: true };
    case 'objective':
      return { table: 'objective_linked_items', idColumn: 'objective_id', hasKind: true };
    case 'business_request':
      return { table: 'business_request_links', idColumn: 'business_request_id', hasKind: true };
    default:
      return { table: 'epic_links', idColumn: 'epic_id', hasKind: false };
  }
}

export function UnifiedLinksTab({ entityType, entityId, hideTiles = [] }: UnifiedLinksTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableConfig = getTableConfig(entityType);
  
  // Calculate visible tiles count for responsive grid
  const allTiles: ('implementation' | 'document' | 'knowledge-hub' | 'external')[] = ['implementation', 'document', 'knowledge-hub', 'external'];
  const visibleTilesCount = allTiles.filter(tile => !hideTiles.includes(tile)).length;
  
  const [formView, setFormView] = useState<FormView>('selection');
  const [isDragOver, setIsDragOver] = useState(false);
  const [typeFilters, setTypeFilters] = useState<LinkKind[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  // External link form state
  const [externalForm, setExternalForm] = useState({ title: '', url: '' });
  
  // Document upload form state
  const [documentForm, setDocumentForm] = useState({ title: '', files: [] as File[] });

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
  const { data: workItems = [], isLoading: workItemsLoading } = useQuery({
    queryKey: ['work-items-for-linking', implSearch],
    queryFn: async () => {
      const searchTerm = implSearch.trim();
      if (!searchTerm) return [];
      
      const results: any[] = [];
      
      // Search Epics
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
      
      // Search Features
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
      
      // Search Stories
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

  // Fetch existing links
  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['unified-links', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableConfig.table as any)
        .select('*')
        .eq(tableConfig.idColumn, entityId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((link: any) => ({
        ...link,
        kind: link.kind || link.link_type || 'external'
      }));
    },
    enabled: !!entityId
  });

  // Filter and sort links
  const filteredLinks = useMemo(() => {
    let result = [...links];
    
    if (typeFilters.length > 0) {
      result = result.filter(link => typeFilters.includes(link.kind as LinkKind));
    }
    
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
  }, [links, typeFilters, sortOption]);

  // Create external link
  const createExternalLinkMutation = useMutation({
    mutationFn: async (link: typeof externalForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData: any = {
        [tableConfig.idColumn]: entityId,
        title: link.title,
        url: link.url,
        link_type: 'external',
      };
      
      if (tableConfig.hasKind) {
        insertData.kind = 'external';
      }
      
      const { error } = await supabase
        .from(tableConfig.table as any)
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-links', entityType, entityId] });
      toast.success('External link added');
      setExternalForm({ title: '', url: '' });
      setFormView('selection');
    },
    onError: () => {
      toast.error('Failed to add link');
    }
  });

  // Create implementation link
  const createImplementationLinkMutation = useMutation({
    mutationFn: async (workItem: typeof selectedWorkItem) => {
      if (!workItem) throw new Error('No work item selected');
      
      const insertData: any = {
        [tableConfig.idColumn]: entityId,
        title: `${workItem.key} – ${workItem.title}`,
        url: `/${workItem.type}s/${workItem.id}`,
        link_type: workItem.type,
      };
      
      if (tableConfig.hasKind) {
        insertData.kind = 'implementation';
        insertData.linked_item_id = workItem.id;
        insertData.linked_item_type = workItem.type;
      }
      
      const { error } = await supabase
        .from(tableConfig.table as any)
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-links', entityType, entityId] });
      toast.success('Implementation link added');
      setSelectedWorkItem(null);
      setImplSearch('');
      setFormView('selection');
    },
    onError: () => {
      toast.error('Failed to add implementation link');
    }
  });

  // Create KB link
  const createKbLinkMutation = useMutation({
    mutationFn: async (doc: { id: string; title: string }) => {
      const insertData: any = {
        [tableConfig.idColumn]: entityId,
        title: doc.title,
        url: `/knowledge-hub/documents/${doc.id}`,
        link_type: 'knowledge-hub',
      };
      
      if (tableConfig.hasKind) {
        insertData.kind = 'knowledge-hub';
      }
      
      const { error } = await supabase
        .from(tableConfig.table as any)
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-links', entityType, entityId] });
      toast.success('Knowledge Hub page linked');
      setSelectedKbDoc(null);
      setKbSearch('');
      setFormView('selection');
    },
    onError: () => {
      toast.error('Failed to link Knowledge Hub page');
    }
  });

  // Upload document
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ title, files }: { title: string; files: File[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of files) {
        const fileName = `${entityType}/${entityId}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        const insertData: any = {
          [tableConfig.idColumn]: entityId,
          title: title || file.name,
          url: publicUrl,
          link_type: 'documentation',
        };
        
        if (tableConfig.hasKind) {
          insertData.kind = 'document';
          insertData.file_name = file.name;
          insertData.file_path = fileName;
          insertData.file_size = file.size;
          insertData.mime_type = file.type;
        }

        const { error: insertError } = await supabase
          .from(tableConfig.table as any)
          .insert(insertData);
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-links', entityType, entityId] });
      toast.success('Documents uploaded');
      setDocumentForm({ title: '', files: [] });
      setFormView('selection');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents');
    }
  });

  // Delete link
  const deleteMutation = useMutation({
    mutationFn: async (link: any) => {
      if (link.kind === 'document' && link.file_path) {
        await supabase.storage.from('attachments').remove([link.file_path]);
      }
      
      const { error } = await supabase
        .from(tableConfig.table as any)
        .delete()
        .eq('id', link.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-links', entityType, entityId] });
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

  const toggleTypeFilter = (type: LinkKind) => {
    setTypeFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getFilterSummary = () => {
    if (typeFilters.length === 0) {
      return 'Showing all links';
    }
    const count = filteredLinks.length;
    return `Showing ${count} link${count !== 1 ? 's' : ''}`;
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'implementation': return <LinkIcon className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'knowledge-hub': return <BookOpen className="h-4 w-4" />;
      case 'external': return <ExternalLink className="h-4 w-4" />;
      default: return <LinkIcon className="h-4 w-4" />;
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'implementation': return 'Implementation';
      case 'document': return 'Document';
      case 'knowledge-hub': return 'Knowledge Hub';
      case 'external': return 'External';
      default: return kind;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Add New Link Section */}
      <Card className="p-5 border border-border/60 bg-card">
        <h4 className="font-semibold text-[15px] text-foreground mb-4">Add New Link</h4>
        
        {formView === 'selection' && (
          <div className={cn(
            "grid gap-3",
            // Use 2 columns when only 2 tiles visible, otherwise 2x2 on mobile, 4 on desktop
            visibleTilesCount <= 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
          )}>
            {/* Implementation Links */}
            {!hideTiles.includes('implementation') && (
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
            )}

            {/* Upload Documents */}
            {!hideTiles.includes('document') && (
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
            )}

            {/* Knowledge Hub */}
            {!hideTiles.includes('knowledge-hub') && (
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
            )}

            {/* External Link */}
            {!hideTiles.includes('external') && (
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
            )}
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
            </div>

            {implSearch.trim().length >= 1 && (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {workItemsLoading ? (
                    <div className="text-center py-8 text-[13px] text-muted-foreground">
                      Searching...
                    </div>
                  ) : workItems.length > 0 ? (
                    workItems.map((item: any) => (
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
                      </button>
                    ))
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
              {createExternalLinkMutation.isPending ? 'Adding...' : 'Add External Link'}
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
              <Label className="text-[13px] font-medium text-foreground">Document Title (optional)</Label>
              <Input
                value={documentForm.title}
                onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                placeholder="Leave blank to use filename"
                className="mt-1.5 h-10 bg-muted/30 border-border/60 focus:border-brand-gold"
              />
            </div>

            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                isDragOver ? "border-brand-gold bg-brand-gold/5" : "border-border hover:border-brand-gold/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFilesAdded(Array.from(e.dataTransfer.files));
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-[13px] text-muted-foreground">
                Drop files here or click to browse
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Max {FILE_UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB per file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFilesAdded(Array.from(e.target.files || []))}
              />
            </div>

            {documentForm.files.length > 0 && (
              <div className="space-y-2">
                {documentForm.files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-[13px] truncate">{file.name}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setDocumentForm(prev => ({
                        ...prev,
                        files: prev.files.filter((_, i) => i !== idx)
                      }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={() => uploadDocumentMutation.mutate(documentForm)} 
              disabled={uploadDocumentMutation.isPending || documentForm.files.length === 0}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {uploadDocumentMutation.isPending ? 'Uploading...' : `Upload ${documentForm.files.length} File(s)`}
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
                  placeholder="Search documents..."
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
                      onClick={() => setSelectedKbDoc(doc)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                        selectedKbDoc?.id === doc.id 
                          ? "bg-brand-gold/10 border border-brand-gold" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate">{doc.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Updated {formatDate(doc.updated_at)}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-[13px] text-muted-foreground">
                    {kbSearch ? 'No documents found' : 'Start typing to search'}
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
              onClick={() => selectedKbDoc && createKbLinkMutation.mutate(selectedKbDoc)} 
              disabled={createKbLinkMutation.isPending || !selectedKbDoc}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {createKbLinkMutation.isPending ? 'Linking...' : 'Link KB Document'}
            </Button>
          </div>
        )}
      </Card>

      {/* Filters and Sort */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Filter Button - Simplified */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Filter
                {typeFilters.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-brand-gold/20 text-brand-gold rounded-full">
                    {typeFilters.length}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-background z-[400]">
              <DropdownMenuLabel className="text-xs">Filter by Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!hideTiles.includes('implementation') && (
                <DropdownMenuCheckboxItem
                  checked={typeFilters.includes('implementation')}
                  onCheckedChange={() => toggleTypeFilter('implementation')}
                >
                  Implementation
                </DropdownMenuCheckboxItem>
              )}
              {!hideTiles.includes('document') && (
                <DropdownMenuCheckboxItem
                  checked={typeFilters.includes('document')}
                  onCheckedChange={() => toggleTypeFilter('document')}
                >
                  Document
                </DropdownMenuCheckboxItem>
              )}
              {!hideTiles.includes('knowledge-hub') && (
                <DropdownMenuCheckboxItem
                  checked={typeFilters.includes('knowledge-hub')}
                  onCheckedChange={() => toggleTypeFilter('knowledge-hub')}
                >
                  Knowledge Hub
                </DropdownMenuCheckboxItem>
              )}
              {!hideTiles.includes('external') && (
                <DropdownMenuCheckboxItem
                  checked={typeFilters.includes('external')}
                  onCheckedChange={() => toggleTypeFilter('external')}
                >
                  External
                </DropdownMenuCheckboxItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-[12px] text-muted-foreground">{getFilterSummary()}</span>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[13px]">
                Sort
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-background z-[400]">
              <DropdownMenuCheckboxItem
                checked={sortOption === 'newest'}
                onCheckedChange={() => setSortOption('newest')}
              >
                Newest First
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === 'oldest'}
                onCheckedChange={() => setSortOption('oldest')}
              >
                Oldest First
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === 'alpha-asc'}
                onCheckedChange={() => setSortOption('alpha-asc')}
              >
                A → Z
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === 'alpha-desc'}
                onCheckedChange={() => setSortOption('alpha-desc')}
              >
                Z → A
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === 'type'}
                onCheckedChange={() => setSortOption('type')}
              >
                By Type
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Links List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[14px] text-foreground">
            Links ({filteredLinks.length})
          </h4>
          <span className="text-[12px] text-muted-foreground">{getFilterSummary()}</span>
        </div>

        {linksLoading ? (
          <Card className="p-8 text-center text-muted-foreground">
            Loading links...
          </Card>
        ) : filteredLinks.length === 0 ? (
          <Card className="p-8 text-center">
            <LinkIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-[14px] text-foreground mb-1">No links attached yet</p>
            <p className="text-[12px] text-muted-foreground">Upload documents or add external links</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredLinks.map((link: any) => (
              <Card key={link.id} className="p-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                      {getKindIcon(link.kind)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-medium rounded",
                          TYPE_BADGE_CONFIG[link.kind]?.bg || 'bg-gray-100',
                          TYPE_BADGE_CONFIG[link.kind]?.text || 'text-gray-700'
                        )}>
                          {getKindLabel(link.kind)}
                        </span>
                      </div>
                      <h5 className="text-[14px] font-medium text-foreground truncate">{link.title}</h5>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-brand-gold hover:underline flex items-center gap-1 mt-1"
                      >
                        {link.url.length > 50 ? `${link.url.slice(0, 50)}...` : link.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="text-[11px] text-muted-foreground mt-1.5">
                        Added {formatDate(link.created_at)}
                        {link.added_by_name && ` by ${link.added_by_name}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {link.kind === 'document' && link.file_path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(link.url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(link)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
