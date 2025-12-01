import React, { useState } from 'react';
import { Plus, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImportWizard } from './ImportWizard';
import { ExportMenu } from './ExportMenu';
import type { TestCase } from '@/types/test-management';

interface TestCaseHeaderProps {
  onCreateTestCase: () => void;
  filters: {
    status: string;
    priority: string;
    testType: string;
    search: string;
  };
  onFilterChange: (filters: any) => void;
  testCases?: TestCase[];
}

export const TestCaseHeader: React.FC<TestCaseHeaderProps> = ({
  onCreateTestCase,
  filters,
  onFilterChange,
  testCases = [],
}) => {
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <>
      <div className="border-b-2 border-brand-gold bg-background p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Test Cases</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportOpen(true)}
              className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <ExportMenu testCases={testCases} />
            <Button
              onClick={onCreateTestCase}
              className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Test Case
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search test cases..."
              value={filters.search}
              onChange={(e) =>
                onFilterChange({ ...filters, search: e.target.value })
              }
              className="pl-10"
            />
          </div>

          <Select
            value={filters.status || undefined}
            onValueChange={(value) =>
              onFilterChange({ ...filters, status: value || '' })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.priority || undefined}
            onValueChange={(value) =>
              onFilterChange({ ...filters, priority: value || '' })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.testType || undefined}
            onValueChange={(value) =>
              onFilterChange({ ...filters, testType: value || '' })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="automated">Automated</SelectItem>
              <SelectItem value="bdd">BDD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </>
  );
};
