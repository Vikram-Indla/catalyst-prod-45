/**
 * FindAvailabilityPanel - V2.1 Monopoly-Grade Implementation
 * Intent-based resource discovery
 */

import { useState, useMemo } from 'react';
import { Search, ChevronDown, CheckCircle, AlertCircle, Clock, UserX, Loader2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { cn } from '@/lib/utils';
import { MiniGantt } from './MiniGantt';
import { useResourceRoles } from '@/hooks/useResourceRoles';

interface ResourceMetric {
  id: string;
  name: string;
  role?: string;
  department?: string;
  allocation?: number;
  initials?: string;
}

interface ResourceAllocation {
  profile_id?: string;
  assignment_name?: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
}

interface FindAvailabilityPanelProps {
  resources: ResourceMetric[];
  allocations: ResourceAllocation[];
  onBookResource?: (resourceId: string, criteria: FindAvailabilityCriteria) => void;
  className?: string;
}

interface FindAvailabilityCriteria {
  role: string;
  allocationNeeded: number;
  startDate: string;
  endDate: string;
  department?: string;
}

interface AvailabilityMatch {
  resource: ResourceMetric;
  availablePercent: number;
  matchType: 'perfect' | 'partial' | 'future';
  adjustmentNeeded?: string;
  availableFrom?: string;
  currentAllocations: ResourceAllocation[];
}

export function FindAvailabilityPanel({
  resources,
  allocations,
  onBookResource,
  className
}: FindAvailabilityPanelProps) {
  // Fetch roles from database
  const { data: rolesFromDb, isLoading: rolesLoading } = useResourceRoles();
  const [isExpanded, setIsExpanded] = useState(false);
  const [criteria, setCriteria] = useState<FindAvailabilityCriteria>({
    role: '',
    allocationNeeded: 50,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addMonths(new Date(), 3), 'yyyy-MM-dd')
  });

  // Find matching resources
  const matches = useMemo(() => {
    if (!criteria.role) {
      return { perfect: [], partial: [], future: [] };
    }

    const results: { perfect: AvailabilityMatch[]; partial: AvailabilityMatch[]; future: AvailabilityMatch[] } = {
      perfect: [],
      partial: [],
      future: []
    };

    resources.forEach(resource => {
      // Filter by role
      if (criteria.role && !resource.role?.toLowerCase().includes(criteria.role.toLowerCase())) {
        return;
      }

      // Get allocations for this resource in the requested period
      const resourceAllocations = allocations.filter(a => a.profile_id === resource.id);
      
      // Calculate allocation in requested period
      const periodAllocations = resourceAllocations.filter(alloc => {
        const allocStart = new Date(alloc.start_date);
        const allocEnd = new Date(alloc.end_date);
        const criteriaStart = new Date(criteria.startDate);
        const criteriaEnd = new Date(criteria.endDate);
        return allocStart < criteriaEnd && allocEnd > criteriaStart;
      });

      const totalAllocation = periodAllocations.reduce((sum, a) => sum + a.allocation_percent, 0);
      const availablePercent = Math.max(0, 100 - totalAllocation);

      const match: AvailabilityMatch = {
        resource,
        availablePercent,
        currentAllocations: resourceAllocations.map(a => ({
          ...a,
          id: a.profile_id + a.assignment_name,
          assignmentName: a.assignment_name,
          assignmentColor: '#0d9488',
          allocationPercent: a.allocation_percent,
          startDate: a.start_date,
          endDate: a.end_date
        })) as any,
        matchType: 'perfect'
      };

      if (availablePercent >= criteria.allocationNeeded) {
        match.matchType = 'perfect';
        results.perfect.push(match);
      } else if (availablePercent > 0) {
        match.matchType = 'partial';
        match.adjustmentNeeded = `Only ${availablePercent}% free (need ${criteria.allocationNeeded}%)`;
        results.partial.push(match);
      } else {
        // Check future availability - simplified: check if any allocation ends soon
        const soonestEnd = resourceAllocations.reduce((min, alloc) => {
          const end = new Date(alloc.end_date);
          return end < min ? end : min;
        }, new Date('2099-12-31'));

        if (soonestEnd < new Date('2099-01-01')) {
          match.matchType = 'future';
          match.availableFrom = format(soonestEnd, 'yyyy-MM-dd');
          results.future.push(match);
        }
      }
    });

    // Sort by availability
    results.perfect.sort((a, b) => b.availablePercent - a.availablePercent);
    results.partial.sort((a, b) => b.availablePercent - a.availablePercent);

    return results;
  }, [resources, allocations, criteria]);

  const handleQuickPeriod = (months: number) => {
    setCriteria({
      ...criteria,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addMonths(new Date(), months), 'yyyy-MM-dd')
    });
  };

  return (
    <div className={cn("bg-card border border-border rounded-xl", className)}>
      {/* Collapsed State - Quick Access */}
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 rounded-xl transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">Find Available Resources</h3>
            <p className="text-sm text-muted-foreground">
              Search by role, skills, and availability window
            </p>
          </div>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-muted-foreground transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      {/* Expanded State - Full Search */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Search Criteria */}
          <div className="grid grid-cols-5 gap-3 p-4 bg-card rounded-lg border border-border">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">I need</label>
              <div className="flex items-center gap-1 mt-1">
                <Input
                  type="number"
                  value={criteria.allocationNeeded}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    allocationNeeded: parseInt(e.target.value) || 0
                  })}
                  className="w-16 px-2 py-1.5 text-center"
                  min="5"
                  max="100"
                  step="5"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Role</label>
              <Select
                value={criteria.role}
                onValueChange={(v) => setCriteria({ ...criteria, role: v })}
              >
                <SelectTrigger className="mt-1">
                  {rolesLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Any Role" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {rolesLoading ? (
                    <div className="p-2 space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ) : (
                    rolesFromDb?.map(role => (
                      <SelectItem key={role.name} value={role.name}>
                        {role.displayName} ({role.count})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">From</label>
              <div className="mt-1">
                <CatalystDatePicker
                  value={criteria.startDate}
                  onChange={(date) => setCriteria({ ...criteria, startDate: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd') })}
                  placeholder="Pick a date"
                  showClearButton={false}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">To</label>
              <div className="mt-1">
                <CatalystDatePicker
                  value={criteria.endDate}
                  onChange={(date) => setCriteria({ ...criteria, endDate: date ? format(date, 'yyyy-MM-dd') : format(addMonths(new Date(), 3), 'yyyy-MM-dd') })}
                  placeholder="Pick a date"
                  showClearButton={false}
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button variant="default" className="w-full bg-primary hover:bg-primary/90">
                <Search className="w-4 h-4 mr-1" />
                Search
              </Button>
            </div>
          </div>

          {/* Quick Duration Buttons + Clear Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Quick periods:</span>
              {[
                { label: 'Next Month', months: 1 },
                { label: 'Next Quarter', months: 3 },
                { label: 'Next 6 Months', months: 6 }
              ].map((period) => (
                <button
                  key={period.label}
                  className="px-3 py-1 text-sm bg-card border border-border rounded hover:bg-muted transition-colors"
                  onClick={() => handleQuickPeriod(period.months)}
                >
                  {period.label}
                </button>
              ))}
            </div>
            
            {/* Clear Filters Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCriteria({
                role: '',
                allocationNeeded: 50,
                startDate: format(new Date(), 'yyyy-MM-dd'),
                endDate: format(addMonths(new Date(), 3), 'yyyy-MM-dd')
              })}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear Filters
            </Button>
          </div>

          {/* Results */}
          {criteria.role && (
            <div className="space-y-3">
              {/* Perfect Matches */}
              {matches.perfect.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-600 flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    PERFECT MATCHES ({matches.perfect.length})
                  </h4>
                  <div className="space-y-2">
                    {matches.perfect.map((match) => (
                      <MatchCard
                        key={match.resource.id}
                        match={match}
                        criteria={criteria}
                        onBook={() => onBookResource?.(match.resource.id, criteria)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Partial Matches */}
              {matches.partial.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-600 flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    PARTIAL MATCHES ({matches.partial.length})
                  </h4>
                  <div className="space-y-2">
                    {matches.partial.map((match) => (
                      <MatchCard
                        key={match.resource.id}
                        match={match}
                        criteria={criteria}
                        onBook={() => onBookResource?.(match.resource.id, criteria)}
                        showAdjustment
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Future Availability */}
              {matches.future.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" />
                    AVAILABLE LATER ({matches.future.length})
                  </h4>
                  <div className="space-y-2">
                    {matches.future.map((match) => (
                      <MatchCard
                        key={match.resource.id}
                        match={match}
                        criteria={criteria}
                        onBook={() => onBookResource?.(match.resource.id, {
                          ...criteria,
                          startDate: match.availableFrom!
                        })}
                        showFutureDate
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Matches */}
              {matches.perfect.length === 0 &&
                matches.partial.length === 0 &&
                matches.future.length === 0 && (
                  <div className="text-center py-8 bg-card rounded-lg border border-border">
                    <UserX className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No matching resources found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting the allocation % or date range
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Match Card Component
function MatchCard({
  match,
  criteria,
  onBook,
  showAdjustment,
  showFutureDate
}: {
  match: AvailabilityMatch;
  criteria: FindAvailabilityCriteria;
  onBook: () => void;
  showAdjustment?: boolean;
  showFutureDate?: boolean;
}) {
  const initials = match.resource.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'NA';

  return (
    <div className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground">{match.resource.name}</div>
        <div className="text-sm text-muted-foreground">
          {match.resource.role} • {match.resource.department}
        </div>
      </div>

      <div className="flex-shrink-0 w-32">
        <MiniGantt
          allocations={match.currentAllocations as any}
          startDate={new Date(criteria.startDate)}
          endDate={new Date(criteria.endDate)}
          height={32}
          showToday={false}
        />
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-semibold text-teal-600">
          {match.availablePercent}% available
        </div>
        {showAdjustment && match.adjustmentNeeded && (
          <div className="text-xs text-amber-600">{match.adjustmentNeeded}</div>
        )}
        {showFutureDate && match.availableFrom && (
          <div className="text-xs text-muted-foreground">
            From {format(new Date(match.availableFrom), 'MMM d, yyyy')}
          </div>
        )}
      </div>

      <Button size="sm" onClick={onBook} className="bg-primary hover:bg-primary/90">
        Book
      </Button>
    </div>
  );
}
