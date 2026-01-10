import React, { useState } from 'react';
import { Globe, Plus, Pen, Trash2, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useRAGlossaryTerms, 
  useRAGlossaryCategories,
  useCreateRAGlossaryTerm, 
  useUpdateRAGlossaryTerm, 
  useDeleteRAGlossaryTerm 
} from '@/hooks/requirement-assist';
import type { RAGlossaryTerm, CreateRAGlossaryTerm } from '@/types/requirement-assist';

const emptyTerm: Partial<RAGlossaryTerm> = {
  english_term: '',
  arabic_translation: '',
  category: 'General',
  notes: '',
};

export function RAAdminTranslation() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: terms, isLoading, error } = useRAGlossaryTerms(categoryFilter);
  const { data: categories } = useRAGlossaryCategories();
  const createTerm = useCreateRAGlossaryTerm();
  const updateTerm = useUpdateRAGlossaryTerm();
  const deleteTerm = useDeleteRAGlossaryTerm();
  
  const [editingTerm, setEditingTerm] = useState<Partial<RAGlossaryTerm> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Filter terms by search query
  const filteredTerms = terms?.filter(term => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      term.english_term.toLowerCase().includes(query) ||
      term.arabic_translation.includes(searchQuery) ||
      term.category.toLowerCase().includes(query)
    );
  });

  const handleOpenCreate = () => {
    setEditingTerm({ ...emptyTerm });
    setIsCreating(true);
  };

  const handleOpenEdit = (term: RAGlossaryTerm) => {
    setEditingTerm({ ...term });
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!editingTerm || !editingTerm.english_term || !editingTerm.arabic_translation) return;
    
    if (isCreating) {
      const { id, created_at, updated_at, ...rest } = editingTerm as any;
      createTerm.mutate(rest as CreateRAGlossaryTerm, {
        onSuccess: () => {
          setEditingTerm(null);
          setIsCreating(false);
        },
      });
    } else {
      updateTerm.mutate({ 
        id: editingTerm.id!, 
        english_term: editingTerm.english_term,
        arabic_translation: editingTerm.arabic_translation,
        category: editingTerm.category,
        notes: editingTerm.notes,
      }, {
        onSuccess: () => {
          setEditingTerm(null);
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this term?')) {
      deleteTerm.mutate(id);
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        Failed to load glossary terms. Please try again.
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Translation Glossary
            </CardTitle>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" /> Add Term
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex gap-3 mt-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredTerms && filteredTerms.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 text-left font-semibold">English</th>
                  <th className="p-3 text-right font-semibold" dir="rtl">Arabic</th>
                  <th className="p-3 text-left font-semibold w-32">Category</th>
                  <th className="p-3 text-left font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTerms.map((term) => (
                  <tr key={term.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{term.english_term}</td>
                    <td className="p-3 text-right font-arabic text-lg" dir="rtl">
                      {term.arabic_translation}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-muted">
                        {term.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenEdit(term)}
                          title="Edit"
                        >
                          <Pen className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(term.id)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'No matching terms found.' : 'No terms found. Add your first term.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingTerm} onOpenChange={() => setEditingTerm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Add Term' : 'Edit Term'}
            </DialogTitle>
          </DialogHeader>
          
          {editingTerm && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">English Term</label>
                <Input
                  value={editingTerm.english_term || ''}
                  onChange={(e) => setEditingTerm({ ...editingTerm, english_term: e.target.value })}
                  placeholder="Enter English term"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Arabic Translation</label>
                <Input
                  value={editingTerm.arabic_translation || ''}
                  onChange={(e) => setEditingTerm({ ...editingTerm, arabic_translation: e.target.value })}
                  placeholder="أدخل الترجمة العربية"
                  dir="rtl"
                  className="text-right font-arabic"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <Select
                  value={editingTerm.category || 'General'}
                  onValueChange={(val) => setEditingTerm({ ...editingTerm, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Strategy">Strategy</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Governance">Governance</SelectItem>
                    <SelectItem value="Agile">Agile</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes (optional)</label>
                <Input
                  value={editingTerm.notes || ''}
                  onChange={(e) => setEditingTerm({ ...editingTerm, notes: e.target.value })}
                  placeholder="Additional context or usage notes"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTerm(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={
                createTerm.isPending || 
                updateTerm.isPending || 
                !editingTerm?.english_term ||
                !editingTerm?.arabic_translation
              }
            >
              {(createTerm.isPending || updateTerm.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isCreating ? 'Add Term' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
