import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Edit, Clock, Folder, History, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfluenceEditor } from '@/components/knowledge-hub/editor';
import { DocumentVersionHistory } from '@/components/knowledge-hub';
import { DocumentComments } from '@/components/knowledge-hub/DocumentComments';
import { DocumentLabels } from '@/components/knowledge-hub/DocumentLabels';
import { DocumentAttachments } from '@/components/knowledge-hub/DocumentAttachments';
import { DocumentExport } from '@/components/knowledge-hub/DocumentExport';
import { DocumentWatchers } from '@/components/knowledge-hub/DocumentWatchers';
import { DocumentRestrictions } from '@/components/knowledge-hub/DocumentRestrictions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function KnowledgeHubDocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const { data: document, isLoading } = useQuery({
    queryKey: ['kb-document', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const { data, error } = await supabase
        .from('kb_documents')
        .select('*')
        .eq('id', documentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  // Fetch space info if document has a space_id
  const { data: space } = useQuery({
    queryKey: ['kb-space', document?.space_id],
    queryFn: async () => {
      if (!document?.space_id) return null;
      const { data, error } = await supabase
        .from('kb_doc_spaces')
        .select('*')
        .eq('id', document.space_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!document?.space_id,
  });

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      // content can be JSON object or HTML string
      const contentValue = document.content;
      if (typeof contentValue === 'object' && contentValue !== null) {
        // It's a TipTap JSON structure, convert to string for the editor
        setContent(JSON.stringify(contentValue));
      } else if (typeof contentValue === 'string') {
        setContent(contentValue);
      } else {
        setContent('');
      }
    }
  }, [document]);

  const updateMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      if (!documentId) throw new Error('No document ID');
      const { error } = await supabase
        .from('kb_documents')
        .update({
          title,
          content: content,
          content_text: content.replace(/<[^>]*>/g, ''), // Strip HTML for search
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-document', documentId] });
      toast.success('Document saved');
      setHasChanges(false);
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to save document');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ title, content });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  };

  if (isLoading) {
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

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-muted/30 px-6 py-2">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/knowledge-hub" className="hover:text-foreground transition-colors">
            Knowledge Hub
          </Link>
          {space && (
            <>
              <ChevronRight className="h-4 w-4" />
              <Link 
                to={`/knowledge-hub/spaces/${space.id}`} 
                className="hover:text-foreground transition-colors"
              >
                {space.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {document.title}
          </span>
        </nav>
      </div>

      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-xl font-semibold h-10 w-96"
              />
            ) : (
              <h1 className="text-xl font-semibold">{document.title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
              <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setTitle(document.title);
                    const contentValue = document.content;
                    if (typeof contentValue === 'object' && contentValue !== null) {
                      setContent(JSON.stringify(contentValue));
                    } else if (typeof contentValue === 'string') {
                      setContent(contentValue);
                    } else {
                      setContent('');
                    }
                    setHasChanges(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!hasChanges || updateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                {/* Watchers - Source: https://support.atlassian.com/confluence-cloud/docs/watch-pages-spaces-and-blogs/ */}
                {documentId && <DocumentWatchers documentId={documentId} />}
                {/* Restrictions - Source: https://support.atlassian.com/confluence-cloud/docs/restrict-a-page-or-space/ */}
                {documentId && <DocumentRestrictions documentId={documentId} />}
                {/* Export - Source: https://support.atlassian.com/confluence-cloud/docs/export-content-from-confluence-cloud/ */}
                <DocumentExport title={title} content={content} />
                <Button variant="outline" onClick={() => setShowVersionHistory(true)}>
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Metadata */}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Last updated {new Date(document.updated_at).toLocaleDateString()}
          </div>
          {document.linked_work_item_type && (
            <div className="flex items-center gap-1">
              <Folder className="h-4 w-4" />
              Linked to {document.linked_work_item_type}
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-6">
            {/* Main Editor */}
            <div className="flex-1 min-w-0">
              <ConfluenceEditor
                content={content}
                onChange={handleContentChange}
                editable={isEditing}
                placeholder="Start writing your documentation..."
              />
            </div>

            {/* Sidebar - Labels, Attachments, Comments */}
            {!isEditing && documentId && (
              <div className="w-80 flex-shrink-0 space-y-6">
                {/* Labels - Source: https://support.atlassian.com/confluence-cloud/docs/use-labels-to-categorize-spaces/ */}
                <DocumentLabels documentId={documentId} />
                
                {/* Attachments - Source: https://support.atlassian.com/confluence-cloud/docs/upload-and-manage-files/ */}
                <DocumentAttachments documentId={documentId} />

                {/* Comments - Source: https://support.atlassian.com/confluence-cloud/docs/collaborate-on-content/ */}
                <DocumentComments documentId={documentId} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version History */}
      {documentId && (
        <DocumentVersionHistory
          documentId={documentId}
          open={showVersionHistory}
          onOpenChange={setShowVersionHistory}
          onRestoreVersion={(restoredContent) => {
            setContent(restoredContent);
            setHasChanges(true);
            setIsEditing(true);
            toast.success('Version restored - save to apply changes');
          }}
        />
      )}
    </div>
  );
}
