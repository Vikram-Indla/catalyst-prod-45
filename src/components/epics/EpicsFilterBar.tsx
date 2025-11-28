import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface EpicsFilterBarProps {
  onFilterChange: (filters: EpicFilters) => void;
}

export interface EpicFilters {
  portfolioId?: string;
  programId?: string;
  state?: string;
  epicType?: string;
  investmentType?: string;
  mvp?: boolean;
}

export function EpicsFilterBar({ onFilterChange }: EpicsFilterBarProps) {
  const [filters, setFilters] = useState<EpicFilters>({});

  const { data: portfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs', filters.portfolioId],
    queryFn: async () => {
      let query = supabase.from('programs').select('*').order('name');
      if (filters.portfolioId) {
        query = query.eq('portfolio_id', filters.portfolioId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!filters.portfolioId,
  });

  const updateFilter = (key: keyof EpicFilters, value: any) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div className="px-6 py-4 border-b bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Filters</Label>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <Label htmlFor="portfolio" className="text-xs text-muted-foreground">Portfolio</Label>
          <Select
            value={filters.portfolioId || 'all'}
            onValueChange={(value) => updateFilter('portfolioId', value)}
          >
            <SelectTrigger id="portfolio" className="h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Portfolios</SelectItem>
              {portfolios?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="program" className="text-xs text-muted-foreground">Program</Label>
          <Select
            value={filters.programId || 'all'}
            onValueChange={(value) => updateFilter('programId', value)}
            disabled={!filters.portfolioId}
          >
            <SelectTrigger id="program" className="h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="state" className="text-xs text-muted-foreground">State</Label>
          <Select
            value={filters.state || 'all'}
            onValueChange={(value) => updateFilter('state', value)}
          >
            <SelectTrigger id="state" className="h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="epicType" className="text-xs text-muted-foreground">Type</Label>
          <Select
            value={filters.epicType || 'all'}
            onValueChange={(value) => updateFilter('epicType', value)}
          >
            <SelectTrigger id="epicType" className="h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="enabler">Enabler</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="investmentType" className="text-xs text-muted-foreground">Investment Type</Label>
          <Select
            value={filters.investmentType || 'all'}
            onValueChange={(value) => updateFilter('investmentType', value)}
          >
            <SelectTrigger id="investmentType" className="h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="strategic">Strategic</SelectItem>
              <SelectItem value="regulatory">Regulatory</SelectItem>
              <SelectItem value="technical_debt">Technical Debt</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="mvp" className="text-xs text-muted-foreground">MVP</Label>
          <Select
            value={filters.mvp === undefined ? 'all' : filters.mvp ? 'yes' : 'no'}
            onValueChange={(value) => updateFilter('mvp', value === 'all' ? undefined : value === 'yes')}
          >
            <SelectTrigger id="mvp" className="h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">MVP Only</SelectItem>
              <SelectItem value="no">Non-MVP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
