import React from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TestCaseHeaderProps {
  onCreateTestCase: () => void;
  filters: {
    status: string;
    priority: string;
    testType: string;
    search: string;
  };
  onFilterChange: (filters: any) => void;
}

export const TestCaseHeader: React.FC<TestCaseHeaderProps> = ({
  onCreateTestCase,
  filters,
  onFilterChange
}) => {
  return (
    <div className="border-b-2 border-brand-gold bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Test Cases</h1>
        <Button
          onClick={onCreateTestCase}
          className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Test Case
        </Button>
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
          value={filters.status}
          onValueChange={(value) =>
            onFilterChange({ ...filters, status: value })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(value) =>
            onFilterChange({ ...filters, priority: value })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.testType}
          onValueChange={(value) =>
            onFilterChange({ ...filters, testType: value })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="automated">Automated</SelectItem>
            <SelectItem value="bdd">BDD</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
