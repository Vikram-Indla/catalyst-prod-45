/**
 * Module 5A-2: Result Mapping Grid Component
 */

import React, { useState, useEffect, memo } from 'react';
import { Link2, Search, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTestMapping } from '../hooks/useResultImport';
import { RESULT_STATUS_CONFIG, type UnmappedTest } from '../types/import';
import { supabase } from '@/integrations/supabase/client';

interface ResultMappingGridProps {
  connectorId: string;
  projectId?: string;
}

interface TestCase {
  id: string;
  title: string;
  test_key: string | null;
}

export const ResultMappingGrid = memo(function ResultMappingGrid({
  connectorId,
  projectId
}: ResultMappingGridProps) {
  const { unmappedTests, isLoading, fetchUnmapped, mapTest } = useTestMapping(connectorId);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Fetch unmapped tests on mount
  useEffect(() => {
    fetchUnmapped();
  }, [fetchUnmapped]);

  // Fetch test cases for mapping
  useEffect(() => {
    async function fetchTestCases() {
      let query = supabase
        .from('test_cases')
        .select('id, title, test_key')
        .order('title');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data } = await query.limit(500);
      if (data) {
        setTestCases(data);
      }
    }
    fetchTestCases();
  }, [projectId]);

  const filteredTests = unmappedTests.filter(test => 
    test.external_test_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.external_test_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMappingChange = (externalTestId: string, testCaseId: string) => {
    setMappings(prev => ({ ...prev, [externalTestId]: testCaseId }));
  };

  const handleSaveMapping = async (test: UnmappedTest) => {
    const testCaseId = mappings[test.external_test_id];
    if (testCaseId) {
      await mapTest(test.external_test_id, testCaseId);
      setMappings(prev => {
        const next = { ...prev };
        delete next[test.external_test_id];
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (unmappedTests.length === 0) {
    return (
      <div className="text-center py-12">
        <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">All Tests Mapped!</h3>
        <p className="text-muted-foreground">No unmapped automation tests found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search unmapped tests..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{unmappedTests.length} unmapped</Badge>
      </div>

      <ScrollArea className="h-[400px] border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="text-left p-3 font-medium">External Test</th>
              <th className="text-left p-3 font-medium">Last Status</th>
              <th className="text-center p-3 font-medium">Runs</th>
              <th className="text-left p-3 font-medium">Map to Test Case</th>
              <th className="text-center p-3 font-medium w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.map((test) => (
              <tr key={test.external_test_id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3">
                  <div className="font-medium truncate max-w-[200px]" title={test.external_test_name}>
                    {test.external_test_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={test.external_test_id}>
                    {test.external_test_id}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={RESULT_STATUS_CONFIG[test.last_status]?.variant || 'outline'}>
                    {test.last_status}
                  </Badge>
                </td>
                <td className="p-3 text-center text-muted-foreground">
                  {test.run_count}
                </td>
                <td className="p-3">
                  <Select
                    value={mappings[test.external_test_id] || ''}
                    onValueChange={v => handleMappingChange(test.external_test_id, v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select test case..." />
                    </SelectTrigger>
                    <SelectContent>
                      {testCases.map(tc => (
                        <SelectItem key={tc.id} value={tc.id}>
                          <span className="flex items-center gap-2">
                            {tc.test_key && <span className="text-muted-foreground text-xs">{tc.test_key}</span>}
                            <span className="truncate max-w-[150px]">{tc.title}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-center">
                  {mappings[test.external_test_id] ? (
                    <div className="flex gap-1 justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-primary"
                        onClick={() => handleSaveMapping(test)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground"
                        onClick={() => handleMappingChange(test.external_test_id, '')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
});
