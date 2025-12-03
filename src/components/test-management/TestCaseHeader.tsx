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
  children?: React.ReactNode;
}

export const TestCaseHeader: React.FC<TestCaseHeaderProps> = ({
  onCreateTestCase,
  filters,
  onFilterChange,
  testCases = [],
  children,
}) => {
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <>
      <div className="border-b-2 border-brand-gold bg-background p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Test Cases</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {children}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="border-brand-gold text-brand-gold hover:bg-brand-gold/10 h-8 sm:h-9 text-xs sm:text-sm"
            >
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <ExportMenu testCases={testCases} />
            <Button
              onClick={onCreateTestCase}
              size="sm"
              className="bg-brand-gold text-white hover:bg-brand-gold-hover h-8 sm:h-9 text-xs sm:text-sm"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Test Case</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={(e) =>
                onFilterChange({ ...filters, search: e.target.value })
              }
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={filters.status || undefined}
              onValueChange={(value) =>
                onFilterChange({ ...filters, status: value || '' })
              }
            >
              <SelectTrigger className="w-[120px] sm:w-[150px] h-8 sm:h-9 text-xs sm:text-sm">
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
              <SelectTrigger className="w-[120px] sm:w-[150px] h-8 sm:h-9 text-xs sm:text-sm">
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
              <SelectTrigger className="w-[120px] sm:w-[150px] h-8 sm:h-9 text-xs sm:text-sm">
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
      </div>

      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </>
  );
};
