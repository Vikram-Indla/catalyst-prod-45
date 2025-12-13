/**
 * RiskLinksTab - Links tab for Risk Drawer
 * Shows only "Upload Documents" and "External Link" tiles (no Implementation Links or Knowledge Hub)
 * Follows the UnifiedLinksTab pattern for UI consistency
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Link as LinkIcon,
  MoreVertical,
  Calendar,
  Filter,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RiskLinksTabProps {
  riskId: string;
}

type LinkKind = 'document' | 'external';
type FormView = 'selection' | 'external' | 'document';
type SortOption = 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc' | 'type';

const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE_MB: 20,
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,
  MAX_FILES: 5,
};

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

export function RiskLinksTab({ riskId }: RiskLinksTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formView, setFormView] = useState<FormView>('selection');
  const [isDragOver, setIsDragOver] = useState(false);
  const [typeFilters, setTypeFilters] = useState<LinkKind[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  // External link form state
  const [externalForm, setExternalForm] = useState({ title: '', url: '' });
  
  // Document upload form state
  const [documentForm, setDocumentForm] = useState({ title: '', files: [] as File[] });

  // Fetch existing links
  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['risk-links', riskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_links')
        .select('*')
        .eq('risk_id', riskId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((link: any) => ({
        ...link,
        kind: link.kind || link.link_type || 'external'
      }));
    },
    enabled: !!riskId
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
      
      const { error } = await supabase
        .from('risk_links')
        .insert({
          risk_id: riskId,
          title: link.title,
          url: link.url,
          link_type: 'external',
          kind: 'external',
          added_by_name: user?.email,
          uploaded_by: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-links', riskId] });
      toast.success('External link added');
      setExternalForm({ title: '', url: '' });
      setFormView('selection');
    },
    onError: () => {
      toast.error('Failed to add link');
    }
  });

  // Upload document
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ title, files }: { title: string; files: File[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of files) {
        const fileName = `risks/${riskId}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('risk_links')
          .insert({
            risk_id: riskId,
            title: title || file.name,
            url: publicUrl,
            link_type: 'documentation',
            kind: 'document',
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            added_by_name: user.email,
            uploaded_by: user.id,
          });
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-links', riskId] });
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
        .from('risk_links')
        .delete()
        .eq('id', link.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-links', riskId] });
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
      case 'document': return <FileText className="h-4 w-4" />;
      case 'external': return <ExternalLink className="h-4 w-4" />;
      default: return <LinkIcon className="h-4 w-4" />;
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'document': return 'Document';
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
          <div className="grid grid-cols-2 gap-3">
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

            {/* External Link */}
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
                placeholder="e.g., Risk Mitigation Plan"
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
                "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
                isDragOver ? "border-brand-gold bg-brand-gold/5" : "border-border hover:border-brand-gold/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const files = Array.from(e.dataTransfer.files);
                handleFilesAdded(files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  handleFilesAdded(files);
                  e.target.value = '';
                }}
              />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-[13px] font-medium text-foreground">
                Drop files here or click to browse
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Max {FILE_UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB per file • {FILE_UPLOAD_CONFIG.MAX_FILES} files max
              </div>
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
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => setDocumentForm(prev => ({
                        ...prev,
                        files: prev.files.filter((_, i) => i !== idx)
                      }))}
                    >
                      <X className="h-3 w-3" />
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
              {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload Documents'}
            </Button>
          </div>
        )}
      </Card>

      {/* Existing Links Section */}
      <Card className="border border-border/60 bg-card">
        {/* Filter bar */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[13px]">
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                  {typeFilters.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-brand-gold/10 text-brand-gold rounded text-[10px] font-medium">
                      {typeFilters.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 z-[400]">
                <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase">Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem 
                  checked={typeFilters.includes('document')} 
                  onCheckedChange={() => toggleTypeFilter('document')}
                >
                  <FileText className="h-3.5 w-3.5 mr-2" /> Documents
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={typeFilters.includes('external')} 
                  onCheckedChange={() => toggleTypeFilter('external')}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" /> External
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <span className="text-[12px] text-muted-foreground">{getFilterSummary()}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[13px]">
                Sort
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[400]">
              <DropdownMenuCheckboxItem checked={sortOption === 'newest'} onCheckedChange={() => setSortOption('newest')}>
                Newest first
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortOption === 'oldest'} onCheckedChange={() => setSortOption('oldest')}>
                Oldest first
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortOption === 'alpha-asc'} onCheckedChange={() => setSortOption('alpha-asc')}>
                A → Z
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortOption === 'alpha-desc'} onCheckedChange={() => setSortOption('alpha-desc')}>
                Z → A
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortOption === 'type'} onCheckedChange={() => setSortOption('type')}>
                By type
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Links list */}
        <div className="divide-y divide-border/40">
          {linksLoading ? (
            <div className="p-8 text-center text-[13px] text-muted-foreground">
              Loading links...
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="p-8 text-center">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-[13px] text-muted-foreground">No links attached yet</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Upload documents or add external links
              </p>
            </div>
          ) : (
            filteredLinks.map((link: any) => (
              <div key={link.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  {getKindIcon(link.kind)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase rounded bg-muted text-muted-foreground">
                      {getKindLabel(link.kind)}
                    </span>
                    {link.file_size && (
                      <span className="text-[11px] text-muted-foreground">
                        {formatFileSize(link.file_size)}
                      </span>
                    )}
                  </div>
                  
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[13px] font-medium text-foreground hover:text-brand-gold transition-colors line-clamp-1"
                  >
                    {link.title}
                  </a>
                  
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    {link.added_by_name && (
                      <span>Added by {link.added_by_name}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(link.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {link.kind === 'document' && link.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(link.url, '_blank')}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(link)}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
