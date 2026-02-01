// Aqd¹⁰ Lists Page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { AqdHeader } from '../components/AqdHeader';
import { AqdListsTable } from '../components/AqdListsTable';
import { AqdCreateListModal } from '../components/AqdCreateListModal';
import { AqdLayout } from '../components/AqdLayout';
import { useAqdLists, useCreateAqdList, useToggleAqdListPin, useDeleteAqdList, useArchiveAqdList } from '@/hooks/useAqd';
import { Skeleton } from '@/components/ui/skeleton';

export function AqdListsPage() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { data: lists = [], isLoading } = useAqdLists();
  const createList = useCreateAqdList();
  const togglePin = useToggleAqdListPin();
  const deleteList = useDeleteAqdList();
  const archiveList = useArchiveAqdList();

  const filteredLists = lists.filter(list => 
    list.name.toLowerCase().includes(search.toLowerCase()) ||
    list.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: { name: string; description?: string }) => {
    const result = await createList.mutateAsync(data);
    setIsCreateOpen(false);
    if (result?.name) {
      const slug = encodeURIComponent(result.name.toLowerCase().replace(/\s+/g, '-'));
      navigate(`/aqd/${slug}`);
    }
  };

  if (isLoading) {
    return (
      <AqdLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </AqdLayout>
    );
  }

  return (
    <AqdLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <AqdHeader onCreateList={() => setIsCreateOpen(true)} />
        
        <div className="mb-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lists..."
              className="pl-9"
            />
          </div>
        </div>
        
        <AqdListsTable
          lists={filteredLists}
          onTogglePin={(id, isPinned) => togglePin.mutate({ id, is_pinned: isPinned })}
          onArchive={(id) => archiveList.mutate(id)}
          onDelete={(id, hasItems) => deleteList.mutate({ id, hasItems })}
        />
        
        <AqdCreateListModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
          isLoading={createList.isPending}
        />
      </div>
    </AqdLayout>
  );
}
