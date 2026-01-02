/**
 * User Activity Report Component
 * Complete report with input panel, results grid, and drill-down
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Users, 
  Calendar, 
  Filter,
  Play,
  RotateCcw,
  ChevronDown,
  FileText,
  Bug,
  Clock,
  CheckSquare,
  Edit3,
  Zap,
  UserPlus,
  Download,
  Table,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useUsers } from '@/hooks/useUsers';
import { 
  useUserActivityReport, 
  useActivityDrillDown,
  ActivityType,
  TimeGrouping,
} from '../../hooks/useUserActivity';
import { UserActivityGrid } from './UserActivityGrid';
import { DrillDownDialog } from './DrillDownDialog';
import { exportToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';

const ACTIVITY_TYPE_CONFIG: { type: ActivityType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'case_created', label: 'Cases Created', icon: <FileText className="h-4 w-4" />, color: 'text-green-500' },
  { type: 'case_updated', label: 'Cases Updated', icon: <Edit3 className="h-4 w-4" />, color: 'text-blue-500' },
  { type: 'case_automated', label: 'Cases Automated', icon: <Zap className="h-4 w-4" />, color: 'text-purple-500' },
  { type: 'case_assigned', label: 'Cases Assigned', icon: <UserPlus className="h-4 w-4" />, color: 'text-cyan-500' },
  { type: 'run_executed', label: 'Runs Executed', icon: <CheckSquare className="h-4 w-4" />, color: 'text-emerald-500' },
  { type: 'effort_logged', label: 'Effort Logged', icon: <Clock className="h-4 w-4" />, color: 'text-orange-500' },
  { type: 'defect_discovered', label: 'Defects Discovered', icon: <Bug className="h-4 w-4" />, color: 'text-red-500' },
];

const TIME_GROUPING_OPTIONS: { value: TimeGrouping; label: string }[] = [
  { value: 'none', label: 'No Grouping' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
];

export function UserActivityReport() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: users, isLoading: usersLoading } = useUsers();
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
  
  const {
    state,
    isGenerated,
    isValid,
    aggregates,
    isLoading,
    setUserIds,
    setStartDate,
    setEndDate,
    setGroupBy,
    setCurrentProjectOnly,
    setIncludeLimitedVisibility,
    toggleActivityType,
    generate,
    reset,
  } = useUserActivityReport(projectId || null);

  const drillDown = useActivityDrillDown();

  // Handle user selection
  const handleUserToggle = (userId: string) => {
    if (state.userIds.includes(userId)) {
      setUserIds(state.userIds.filter(id => id !== userId));
    } else {
      setUserIds([...state.userIds, userId]);
    }
  };

  const handleSelectAllUsers = () => {
    if (users && state.userIds.length < users.length) {
      setUserIds(users.map(u => u.id));
    } else {
      setUserIds([]);
    }
  };

  // Handle export
  const handleExport = () => {
    if (!aggregates.length) return;

    const rows = aggregates.map(a => ({
      User: a.userName,
      Email: a.userEmail,
      Period: a.period,
      'Cases Created': a.casesCreated,
      'Cases Updated': a.casesUpdated,
      'Cases Automated': a.casesAutomated,
      'Cases Assigned': a.casesAssigned,
      'Runs Executed': a.runsExecuted,
      'Effort (Hours)': a.effortHours.toFixed(1),
      'Defects Discovered': a.defectsDiscovered,
      'Total Actions': a.totalActions,
    }));

    exportToCSV(
      rows,
      `user-activity-report-${format(new Date(), 'yyyy-MM-dd')}`,
      Object.keys(rows[0])
    );
    toast.success('Report exported');
  };

  // Handle cell click for drill-down
  const handleCellClick = (
    userId: string,
    userName: string,
    activityType: ActivityType,
    periodStart: string
  ) => {
    drillDown.open({
      userId,
      userName,
      activityType,
      startDate: periodStart,
      endDate: state.endDate ? format(state.endDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      projectId: state.currentProjectOnly ? projectId : undefined,
    });
  };

  const selectedUsers = users?.filter(u => state.userIds.includes(u.id)) || [];

  return (
    <div className="space-y-6">
      {/* Input Panel */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Filter className="h-5 w-5 text-accent-primary" />
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Users & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label className="text-text-secondary flex items-center gap-1">
                <Users className="h-4 w-4" />
                Users <span className="text-status-error">*</span>
              </Label>
              <Popover open={isUserSelectOpen} onOpenChange={setIsUserSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-surface-1 border-border-default text-text-primary hover:bg-surface-hover"
                    data-cta="select-users"
                  >
                    {state.userIds.length > 0
                      ? `${state.userIds.length} user${state.userIds.length > 1 ? 's' : ''} selected`
                      : 'Select users...'}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 bg-surface-1 border-border-default" align="start">
                  <div className="p-2 border-b border-border-default">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-text-secondary"
                      onClick={handleSelectAllUsers}
                    >
                      {state.userIds.length === users?.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {usersLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
                      </div>
                    ) : (
                      users?.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-surface-hover cursor-pointer"
                          onClick={() => handleUserToggle(user.id)}
                        >
                          <Checkbox
                            checked={state.userIds.includes(user.id)}
                            onCheckedChange={() => handleUserToggle(user.id)}
                          />
                          <span className="text-sm text-text-primary truncate">
                            {user.full_name || user.email}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedUsers.slice(0, 3).map(u => (
                    <Badge key={u.id} variant="secondary" className="text-xs">
                      {u.full_name?.split(' ')[0] || u.email}
                    </Badge>
                  ))}
                  {selectedUsers.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedUsers.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="text-text-secondary flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Start Date <span className="text-status-error">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal bg-surface-1 border-border-default',
                      !state.startDate && 'text-text-tertiary'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {state.startDate ? format(state.startDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-surface-1 border-border-default" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={state.startDate || undefined}
                    onSelect={(date) => setStartDate(date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label className="text-text-secondary flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal bg-surface-1 border-border-default',
                      !state.endDate && 'text-text-tertiary'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {state.endDate ? format(state.endDate, 'PPP') : 'Today (default)'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-surface-1 border-border-default" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={state.endDate || undefined}
                    onSelect={(date) => setEndDate(date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 2: Grouping & Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Time Grouping */}
            <div className="space-y-2">
              <Label className="text-text-secondary">Time Period Grouping</Label>
              <Select value={state.groupBy} onValueChange={(v) => setGroupBy(v as TimeGrouping)}>
                <SelectTrigger className="bg-surface-1 border-border-default">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-1 border-border-default">
                  {TIME_GROUPING_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current Project Toggle */}
            <div className="flex items-center justify-between bg-surface-1 rounded-md border border-border-default p-3">
              <Label htmlFor="project-only" className="text-text-secondary text-sm">
                Current project only
              </Label>
              <Switch
                id="project-only"
                checked={state.currentProjectOnly}
                onCheckedChange={setCurrentProjectOnly}
              />
            </div>

            {/* Limited Visibility Toggle */}
            <div className="flex items-center justify-between bg-surface-1 rounded-md border border-border-default p-3">
              <Label htmlFor="limited-visibility" className="text-text-secondary text-sm">
                Include limited visibility
              </Label>
              <Switch
                id="limited-visibility"
                checked={state.includeLimitedVisibility}
                onCheckedChange={setIncludeLimitedVisibility}
              />
            </div>
          </div>

          {/* Row 3: Activity Types */}
          <div className="space-y-2">
            <Label className="text-text-secondary">Activity Parameters</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {ACTIVITY_TYPE_CONFIG.map(({ type, label, icon, color }) => (
                <div
                  key={type}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                    state.activityTypes.includes(type)
                      ? 'bg-accent-primary/10 border-accent-primary'
                      : 'bg-surface-1 border-border-default hover:bg-surface-hover'
                  )}
                  onClick={() => toggleActivityType(type)}
                >
                  <Checkbox
                    checked={state.activityTypes.includes(type)}
                    onCheckedChange={() => toggleActivityType(type)}
                  />
                  <span className={cn('shrink-0', color)}>{icon}</span>
                  <span className="text-xs text-text-primary truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={generate}
              disabled={!isValid || isLoading}
              className="bg-accent-primary hover:bg-accent-primary/90"
              data-cta="generate-report"
              data-disabled-reason={!isValid ? 'Please select users and start date' : undefined}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isGenerated && (
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Table className="h-5 w-5 text-accent-primary" />
              Activity Results
              {aggregates.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {aggregates.length} rows
                </Badge>
              )}
            </CardTitle>
            {aggregates.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <UserActivityGrid
              data={aggregates}
              isLoading={isLoading}
              groupBy={state.groupBy}
              activeTypes={state.activityTypes}
              onCellClick={handleCellClick}
            />
          </CardContent>
        </Card>
      )}

      {/* Drill-down Dialog */}
      <DrillDownDialog
        isOpen={drillDown.isOpen}
        onClose={drillDown.close}
        items={drillDown.items}
        isLoading={drillDown.isLoading}
        params={drillDown.params}
      />
    </div>
  );
}
