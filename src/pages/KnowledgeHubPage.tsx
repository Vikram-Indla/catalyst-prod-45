import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Search, FolderOpen, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateDocumentDialog } from '@/components/knowledge-hub/CreateDocumentDialog';
import { CreateSpaceDialog } from '@/components/knowledge-hub/CreateSpaceDialog';

export default function KnowledgeHubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);

  // Fetch spaces
  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ['kb-spaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_doc_spaces')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent documents
  const { data: recentDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['kb-recent-docs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_documents')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const handleDocSuccess = (docId: string) => {
    queryClient.invalidateQueries({ queryKey: ['kb-recent-docs'] });
    navigate(`/knowledge-hub/documents/${docId}`);
  };

  const handleSpaceSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['kb-spaces'] });
  };

  const filteredSpaces = spaces?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDocs = recentDocs?.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-brand-gold" />
            <h1 className="text-xl font-semibold">Knowledge Hub</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCreateSpaceOpen(true)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              New Space
            </Button>
            <Button onClick={() => setCreateDocOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </div>
        </div>
        <div className="mt-4 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search spaces and documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Spaces Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-brand-gold" />
              Spaces
            </h2>
            {spacesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : filteredSpaces && filteredSpaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSpaces.map((space) => (
                  <Card 
                    key={space.id} 
                    className="hover:border-brand-gold/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/knowledge-hub/spaces/${space.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{space.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {space.description || 'No description'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">No spaces yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setCreateSpaceOpen(true)}
                >
                  Create your first space
                </Button>
              </Card>
            )}
          </section>

          {/* Recent Documents Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-gold" />
              Recent Documents
            </h2>
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
                    className="p-4 hover:border-brand-gold/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/knowledge-hub/documents/${doc.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Updated {new Date(doc.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      {doc.linked_work_item_type && (
                        <Badge variant="secondary" className="capitalize">
                          {doc.linked_work_item_type}
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">No documents yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setCreateDocOpen(true)}
                >
                  Create your first document
                </Button>
              </Card>
            )}
          </section>
        </div>
      </div>

      {/* Dialogs */}
      <CreateDocumentDialog
        open={createDocOpen}
        onOpenChange={setCreateDocOpen}
        onSuccess={handleDocSuccess}
      />
      <CreateSpaceDialog
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
        onSuccess={handleSpaceSuccess}
      />
    </div>
  );
}
