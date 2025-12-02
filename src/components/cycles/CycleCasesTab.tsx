/**
 * CATALYST TESTS - Cycle Cases Tab
 * Add cases via search, from folder, from set, bulk selection
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, FolderOpen, Package, Plus, Trash2 } from 'lucide-react';

interface CycleCasesTabProps {
  selectedCases: { case_id: string; version: number; assigned_to?: string }[];
  onCasesChange: (cases: { case_id: string; version: number; assigned_to?: string }[]) => void;
  fromSetId?: string;
}

export function CycleCasesTab({ selectedCases, onCasesChange, fromSetId }: CycleCasesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedSet, setSelectedSet] = useState<string>(fromSetId || '');

  // Fetch all test cases
  const { data: testCases = [] } = useQuery({
    queryKey: ['test-cases-for-cycle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cases')
        .select('id, title, status, priority, folder_id, version')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['test-folders-for-cycle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_folders')
        .select('id, name')
        .eq('entity_type', 'test_cases')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch sets
  const { data: sets = [] } = useQuery({
    queryKey: ['test-sets-for-cycle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_sets')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Filter cases
  const filteredCases = testCases.filter((tc: any) => {
    const matchesSearch = !searchTerm || 
      tc.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = !selectedFolder || tc.folder_id === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const selectedIds = new Set(selectedCases.map((c) => c.case_id));

  const handleToggleCase = (caseId: string, version: number) => {
    if (selectedIds.has(caseId)) {
      onCasesChange(selectedCases.filter((c) => c.case_id !== caseId));
    } else {
      onCasesChange([...selectedCases, { case_id: caseId, version }]);
    }
  };

  const handleSelectAll = () => {
    const casesToAdd = filteredCases
      .filter((tc: any) => !selectedIds.has(tc.id))
      .map((tc: any) => ({ case_id: tc.id, version: tc.version || 1 }));
    onCasesChange([...selectedCases, ...casesToAdd]);
  };

  const handleRemoveSelected = (caseId: string) => {
    onCasesChange(selectedCases.filter((c) => c.case_id !== caseId));
  };

  const handleClearAll = () => {
    onCasesChange([]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive/10 text-destructive';
      case 'high': return 'bg-orange-500/10 text-orange-500';
      case 'medium': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-[400px]">
      {/* Available Cases */}
      <div className="border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border bg-muted/30 space-y-2">
          <h3 className="font-medium text-sm">Available Cases</h3>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger className="h-8 text-xs">
                <FolderOpen className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Filter by folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Folders</SelectItem>
                {folders.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs"
            onClick={handleSelectAll}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add All Filtered
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredCases.map((tc: any) => (
              <div
                key={tc.id}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                  selectedIds.has(tc.id) ? 'bg-brand-gold/10' : ''
                }`}
                onClick={() => handleToggleCase(tc.id, tc.version || 1)}
              >
                <Checkbox checked={selectedIds.has(tc.id)} />
                <span className="text-sm truncate flex-1">{tc.title}</span>
                <Badge className={`text-xs ${getPriorityColor(tc.priority)}`}>
                  {tc.priority}
                </Badge>
              </div>
            ))}
            {filteredCases.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No cases found
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Selected Cases */}
      <div className="border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-medium text-sm">
            Selected Cases 
            <Badge variant="secondary" className="ml-2">{selectedCases.length}</Badge>
          </h3>
          {selectedCases.length > 0 && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs text-destructive"
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {selectedCases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No cases selected. Select cases from the left panel.
              </p>
            ) : (
              selectedCases.map((sc) => {
                const testCase = testCases.find((tc: any) => tc.id === sc.case_id);
                return (
                  <div
                    key={sc.case_id}
                    className="flex items-center gap-2 p-2 rounded-md bg-brand-gold/5 border border-brand-gold/20"
                  >
                    <span className="text-sm truncate flex-1">
                      {(testCase as any)?.title || 'Unknown Case'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      v{sc.version}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => handleRemoveSelected(sc.case_id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
