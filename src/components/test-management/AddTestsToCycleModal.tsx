import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { useTestCases } from '@/hooks/useTestManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddTestsToCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  existingTestCaseIds: string[];
}

export function AddTestsToCycleModal({
  open,
  onOpenChange,
  cycleId,
  existingTestCaseIds,
}: AddTestsToCycleModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const { data: testCases, isLoading } = useTestCases();

  const filteredTestCases = testCases?.filter((tc: any) => {
    const matchesSearch = tc.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleToggle = (testCaseId: string) => {
    setSelectedIds((prev) =>
      prev.includes(testCaseId)
        ? prev.filter((id) => id !== testCaseId)
        : [...prev, testCaseId]
    );
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one test case');
      return;
    }

    setIsAdding(true);
    try {
      const records = selectedIds.map((testCaseId) => ({
        test_set_id: cycleId,
        test_case_id: testCaseId,
      }));

      const { error } = await supabase
        .from('test_set_cases')
        .insert(records);

      if (error) throw error;

      toast.success(`Added ${selectedIds.length} test case(s) to cycle`);
      setSelectedIds([]);
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to add test cases: ' + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">Add Test Cases to Cycle</DialogTitle>
          <DialogDescription>
            Select test cases to include in this test cycle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
                </div>
              ) : !filteredTestCases || filteredTestCases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No test cases found
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredTestCases.map((testCase: any) => {
                    const isAlreadyAdded = existingTestCaseIds.includes(testCase.id);
                    const isSelected = selectedIds.includes(testCase.id);

                    return (
                      <div
                        key={testCase.id}
                        className={`flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors ${
                          isAlreadyAdded ? 'opacity-50' : ''
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(testCase.id)}
                          disabled={isAlreadyAdded}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{testCase.title}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {testCase.test_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {testCase.priority}
                            </Badge>
                            {isAlreadyAdded && (
                              <Badge className="text-xs bg-green-500/10 text-green-500">
                                Already Added
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-lg p-3 text-sm">
              <span className="font-medium text-foreground">
                {selectedIds.length} test case(s) selected
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={isAdding || selectedIds.length === 0}
            className="bg-brand-gold hover:bg-brand-gold/90 text-background"
          >
            {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
