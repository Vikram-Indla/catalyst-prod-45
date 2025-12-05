import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Trash2, 
  ExternalLink, 
  FilePlus, 
  Upload, 
  X, 
  Download,
  FileText 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE_MB: 20,
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,
  MAX_FILES: 5,
};

const LINK_TYPE_OPTIONS = [
  { value: 'documentation', label: 'Documentation' },
  { value: 'design', label: 'Design' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'reference', label: 'Reference' },
  { value: 'other', label: 'Other' },
];

type FormView = 'selection' | 'external' | 'document';

interface LinksViewTabProps {
  requestId: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export function LinksViewTab({ requestId }: LinksViewTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formView, setFormView] = useState<FormView>('selection');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // External link form state
  const [externalForm, setExternalForm] = useState({
    title: '',
    url: '',
    link_type: 'documentation'
  });
  
  // Document upload form state
  const [documentForm, setDocumentForm] = useState({
    title: '',
    files: [] as File[]
  });

  const { data: links = [] } = useQuery({
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

  const createExternalLinkMutation = useMutation({
    mutationFn: async (link: typeof externalForm) => {
      const { error } = await supabase
        .from('business_request_links')
        .insert({ 
          ...link, 
          business_request_id: requestId,
          kind: 'external'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-links', requestId] });
      toast.success('External link added');
      setExternalForm({ title: '', url: '', link_type: 'documentation' });
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

      for (const file of files) {
        const fileName = `${requestId}/${Date.now()}-${file.name}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        // Create link record
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
            uploaded_by: user.id
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

  const deleteMutation = useMutation({
    mutationFn: async (link: any) => {
      // If it's a document, delete from storage first
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
      toast.success('Link deleted');
    }
  });

  const handleAddExternalLink = () => {
    if (!externalForm.title || !externalForm.url) {
      toast.error('Title and URL are required');
      return;
    }
    createExternalLinkMutation.mutate(externalForm);
  };

  const handleUploadDocuments = () => {
    if (documentForm.files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }
    uploadDocumentMutation.mutate({
      title: documentForm.title || documentForm.files[0].name,
      files: documentForm.files
    });
  };

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

  const handleRemoveFile = (index: number) => {
    setDocumentForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFilesAdded(files);
  }, [handleFilesAdded]);

  const handleBack = () => {
    setFormView('selection');
    setExternalForm({ title: '', url: '', link_type: 'documentation' });
    setDocumentForm({ title: '', files: [] });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Add New Link Section */}
      <Card className="p-5 border-dashed border-2 border-border/60 bg-card">
        <h4 className="font-semibold text-[15px] text-foreground mb-4">Add New Link</h4>
        
        {formView === 'selection' && (
          <div className="grid grid-cols-2 gap-4">
            {/* External Link Card */}
            <button
              className="p-6 border-2 border-border rounded-xl text-center cursor-pointer transition-all hover:border-brand-gold/30 hover:bg-brand-gold/5 group"
              onClick={() => setFormView('external')}
            >
              <div className="w-[52px] h-[52px] mx-auto mb-3 flex items-center justify-center bg-muted/50 rounded-xl group-hover:bg-brand-gold group-hover:text-white transition-all">
                <ExternalLink className="h-6 w-6 text-muted-foreground group-hover:text-white" />
              </div>
              <div className="font-semibold text-[14px] text-foreground mb-1">External Link</div>
              <div className="text-[12px] text-muted-foreground">Add a URL to external resource</div>
            </button>

            {/* Upload Documents Card */}
            <button
              className="p-6 border-2 border-border rounded-xl text-center cursor-pointer transition-all hover:border-brand-gold/30 hover:bg-brand-gold/5 group"
              onClick={() => setFormView('document')}
            >
              <div className="w-[52px] h-[52px] mx-auto mb-3 flex items-center justify-center bg-muted/50 rounded-xl group-hover:bg-brand-gold group-hover:text-white transition-all">
                <FilePlus className="h-6 w-6 text-muted-foreground group-hover:text-white" />
              </div>
              <div className="font-semibold text-[14px] text-foreground mb-1">Upload Documents</div>
              <div className="text-[12px] text-muted-foreground">Attach files up to 20MB each</div>
            </button>
          </div>
        )}

        {formView === 'external' && (
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            
            <div>
              <Label className="text-[13px] font-medium text-foreground">Title*</Label>
              <Input
                value={externalForm.title}
                onChange={(e) => setExternalForm({ ...externalForm, title: e.target.value })}
                placeholder="e.g., Figma Design Mockups"
                className="mt-1.5 h-10 bg-muted/30 border-border/60 focus:border-brand-gold focus:ring-brand-gold/15"
              />
            </div>

            <div>
              <Label className="text-[13px] font-medium text-foreground">URL*</Label>
              <Input
                value={externalForm.url}
                onChange={(e) => setExternalForm({ ...externalForm, url: e.target.value })}
                placeholder="https://..."
                className="mt-1.5 h-10 bg-muted/30 border-border/60 focus:border-brand-gold focus:ring-brand-gold/15"
              />
            </div>

            <div>
              <Label className="text-[13px] font-medium text-foreground">Link Type</Label>
              <Select 
                value={externalForm.link_type} 
                onValueChange={(v) => setExternalForm({ ...externalForm, link_type: v })}
              >
                <SelectTrigger className="mt-1.5 h-10 bg-muted/30 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAddExternalLink} 
              disabled={createExternalLinkMutation.isPending}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {createExternalLinkMutation.isPending ? 'Adding...' : 'Add Link'}
            </Button>
          </div>
        )}

        {formView === 'document' && (
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div>
              <Label className="text-[13px] font-medium text-foreground">Title (optional)</Label>
              <Input
                value={documentForm.title}
                onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                placeholder="e.g., Technical Specification"
                className="mt-1.5 h-10 bg-muted/30 border-border/60 focus:border-brand-gold focus:ring-brand-gold/15"
              />
            </div>

            {/* File Drop Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                isDragOver 
                  ? "border-brand-gold bg-brand-gold/5" 
                  : "border-border/60 bg-muted/30 hover:border-brand-gold/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-brand-gold" />
              <p className="text-[14px] text-muted-foreground">
                Drag & drop files here, or <span className="text-brand-gold font-medium">browse</span>
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Max {FILE_UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB per file • Up to {FILE_UPLOAD_CONFIG.MAX_FILES} files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => handleFilesAdded(Array.from(e.target.files || []))}
              />
            </div>

            {/* File List */}
            {documentForm.files.length > 0 && (
              <div className="space-y-2">
                {documentForm.files.map((file, index) => (
                  <div 
                    key={`${file.name}-${index}`} 
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-md"
                  >
                    <div className="w-9 h-9 flex items-center justify-center bg-brand-gold/10 rounded-md">
                      <FileText className="h-5 w-5 text-brand-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{file.name}</div>
                      <div className="text-[12px] text-muted-foreground">{formatFileSize(file.size)}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(index); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="text-[12px] text-muted-foreground">
                  {documentForm.files.length} / {FILE_UPLOAD_CONFIG.MAX_FILES} files selected
                </div>
              </div>
            )}

            <Button 
              onClick={handleUploadDocuments} 
              disabled={uploadDocumentMutation.isPending || documentForm.files.length === 0}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload Documents'}
            </Button>
          </div>
        )}
      </Card>

      {/* Links List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-[15px] text-foreground">Links ({links.length})</h4>
        {links.length > 0 ? (
          <Card className="overflow-hidden border-border/40">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_100px_100px_80px] gap-3 px-4 py-3 bg-muted/50 border-b border-border/40 text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              <div></div>
              <div>Title</div>
              <div>Type</div>
              <div>Size/Host</div>
              <div className="text-right">Actions</div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-border/30">
              {links.map((link: any) => (
                <div 
                  key={link.id} 
                  className="grid grid-cols-[40px_1fr_100px_100px_80px] gap-3 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
                >
                  {/* Icon */}
                  <div className="w-9 h-9 flex items-center justify-center bg-brand-gold/10 rounded-lg">
                    {link.kind === 'document' ? (
                      <FileText className="h-4 w-4 text-brand-gold" />
                    ) : (
                      <ExternalLink className="h-4 w-4 text-brand-gold" />
                    )}
                  </div>
                  
                  {/* Title */}
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">{link.title}</div>
                    {link.kind === 'document' && link.file_name && (
                      <div className="text-[11px] text-muted-foreground truncate">{link.file_name}</div>
                    )}
                  </div>
                  
                  {/* Type Badge */}
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground rounded capitalize">
                      {link.link_type}
                    </span>
                  </div>
                  
                  {/* Size/Host */}
                  <div className="text-[12px] text-muted-foreground truncate">
                    {link.kind === 'document' 
                      ? (link.file_size ? formatFileSize(link.file_size) : '-')
                      : (() => { try { return new URL(link.url).hostname; } catch { return '-'; } })()
                    }
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={async () => {
                        if (link.kind === 'document' && link.file_path) {
                          const { data } = await supabase.storage
                            .from('attachments')
                            .createSignedUrl(link.file_path, 3600);
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          }
                        } else {
                          window.open(link.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                      title={link.kind === 'document' ? 'Download' : 'Open'}
                    >
                      {link.kind === 'document' ? (
                        <Download className="h-4 w-4" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this link?')) {
                          deleteMutation.mutate(link);
                        }
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No links yet. Add links above.
          </div>
        )}
      </div>
    </div>
  );
}
