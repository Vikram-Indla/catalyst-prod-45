import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, FolderOpen, Search, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreateDocumentDialog } from '@/components/knowledge-hub/CreateDocumentDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function KnowledgeHubSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [createDocOpen, setCreateDocOpen] = useState(false);

  // Fetch space details
  const { data: space, isLoading: spaceLoading } = useQuery({
    queryKey: ['kb-space', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;
      const { data, error } = await supabase
        .from('kb_doc_spaces')
        .select('*')
        .eq('id', spaceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!spaceId,
  });

  // Fetch documents in space
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['kb-space-docs', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      const { data, error } = await supabase
        .from('kb_documents')
        .select('*')
        .eq('space_id', spaceId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!spaceId,
  });

  // Create document mutation
  const handleDocSuccess = (docId: string) => {
    queryClient.invalidateQueries({ queryKey: ['kb-space-docs', spaceId] });
    navigate(`/knowledge-hub/documents/${docId}`);
  };

  // Delete document mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('kb_documents')
        .delete()
        .eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-space-docs', spaceId] });
      toast.success('Document deleted');
      setDeleteDocId(null);
    },
    onError: () => {
      toast.error('Failed to delete document');
    },
  });

  const filteredDocs = documents?.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  if (spaceLoading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="border-b bg-card px-6 py-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Space not found</h2>
          <Button variant="outline" onClick={() => navigate('/knowledge-hub')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Knowledge Hub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/knowledge-hub')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-brand-gold" />
              <div>
                <h1 className="text-xl font-semibold">{space.name}</h1>
                {space.description && (
                  <p className="text-sm text-muted-foreground">{space.description}</p>
                )}
              </div>
            </div>
          </div>
          <Button onClick={() => setCreateDocOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        </div>
        <div className="mt-4 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {docsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredDocs && filteredDocs.length > 0 ? (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <Card 
                  key={doc.id}
                  className="p-4 hover:border-brand-gold/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <FileText 
                      className="h-5 w-5 text-muted-foreground flex-shrink-0 cursor-pointer" 
                      onClick={() => navigate(`/knowledge-hub/documents/${doc.id}`)}
                    />
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/knowledge-hub/documents/${doc.id}`)}
                    >
                      <h3 className="font-medium truncate">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Updated {new Date(doc.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/knowledge-hub/documents/${doc.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteDocId(doc.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No documents in this space</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setCreateDocOpen(true)}
              >
                Create your first document
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocId && deleteDocMutation.mutate(deleteDocId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Document Dialog */}
      <CreateDocumentDialog
        open={createDocOpen}
        onOpenChange={setCreateDocOpen}
        onSuccess={handleDocSuccess}
        defaultSpaceId={spaceId}
      />
    </div>
  );
}
