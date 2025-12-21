import React, { useState, useMemo } from 'react';
import { Plus, CalendarDays, List, Columns, BarChart3, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { CalendarView } from '../components/CalendarView';
import { ListView } from '../components/ListView';
import { KanbanView } from '../components/KanbanView';
import { ReportsView } from '../components/ReportsView';
import { DayPlannerDrawer } from '../components/DayPlannerDrawer';
import { ChangeDetailDrawer } from '../components/ChangeDetailDrawer';
import { CreateChangeForm } from '../components/CreateChangeForm';
import { useChangeCards } from '../hooks/useChangeCards';
import { STATUS_LABELS, ChangeCardStatus } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ApprovedFilter = 'all' | 'true' | 'false';
type ComplianceFilter = 'all' | 'compliant' | 'exception_recorded';

export default function ReleaseCalendarPage() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'kanban' | 'reports'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForDate, setCreateForDate] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<ChangeCardStatus | 'all'>('all');
  const [approvedFilter, setApprovedFilter] = useState<ApprovedFilter>('all');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('all');
  
  const { data: changeCards = [], isLoading } = useChangeCards({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    approved: approvedFilter !== 'all' ? approvedFilter === 'true' : undefined,
    compliance_state: complianceFilter !== 'all' ? complianceFilter : undefined,
  });

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleChangeClick = (changeId: string) => {
    setSelectedChangeId(changeId);
  };

  const handleCreateChange = (date?: string) => {
    setCreateForDate(date || null);
    setIsCreateOpen(true);
  };

  const toolbar = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ChangeCardStatus | 'all')}>
          <SelectTrigger className="w-48 h-8 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <Filter className="w-3 h-3 mr-2 text-gray-500 dark:text-gray-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={approvedFilter} onValueChange={(v) => setApprovedFilter(v as ApprovedFilter)}>
          <SelectTrigger className="w-36 h-8 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <SelectValue placeholder="Approved" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Approved</SelectItem>
            <SelectItem value="false">Not Approved</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={complianceFilter} onValueChange={(v) => setComplianceFilter(v as ComplianceFilter)}>
          <SelectTrigger className="w-40 h-8 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <SelectValue placeholder="Compliance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="exception_recorded">Exceptions</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          Plan Day
        </Button>
        <Button
          size="sm"
          onClick={() => handleCreateChange()}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Change
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <PageHeader
        title="Release Calendar"
        toolbar={toolbar}
      />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex-1 flex flex-col"
        >
          <div className="border-b border-gray-200 dark:border-gray-700 px-6">
            <TabsList className="h-10 bg-transparent">
              <TabsTrigger 
                value="calendar" 
                className={cn(
                  "h-10 px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:border-b-2 data-[state=active]:border-brand-primary",
                  "text-gray-600 dark:text-gray-400 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100"
                )}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger 
                value="list"
                className={cn(
                  "h-10 px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:border-b-2 data-[state=active]:border-brand-primary",
                  "text-gray-600 dark:text-gray-400 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100"
                )}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </TabsTrigger>
              <TabsTrigger 
                value="kanban"
                className={cn(
                  "h-10 px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:border-b-2 data-[state=active]:border-brand-primary",
                  "text-gray-600 dark:text-gray-400 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100"
                )}
              >
                <Columns className="w-4 h-4 mr-2" />
                Kanban
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className={cn(
                  "h-10 px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:border-b-2 data-[state=active]:border-brand-primary",
                  "text-gray-600 dark:text-gray-400 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100"
                )}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Reports
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="calendar" className="m-0 h-full">
              <CalendarView 
                changeCards={changeCards}
                onDayClick={handleDayClick}
                onChangeClick={handleChangeClick}
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="list" className="m-0 h-full">
              <ListView 
                changeCards={changeCards}
                onChangeClick={handleChangeClick}
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="kanban" className="m-0 h-full">
              <KanbanView 
                changeCards={changeCards}
                onChangeClick={handleChangeClick}
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="reports" className="m-0 h-full">
              <ReportsView changeCards={changeCards} isLoading={isLoading} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* Day Planner Drawer */}
      <DayPlannerDrawer
        open={!!selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        date={selectedDate || ''}
        onChangeClick={handleChangeClick}
        onCreateClick={() => handleCreateChange(selectedDate || undefined)}
      />
      
      {/* Change Detail Drawer */}
      <ChangeDetailDrawer
        open={!!selectedChangeId}
        onOpenChange={(open) => !open && setSelectedChangeId(null)}
        changeCardId={selectedChangeId || ''}
      />
      
      {/* Create Change Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Create Change</DialogTitle>
          </DialogHeader>
          <CreateChangeForm 
            defaultDate={createForDate || undefined}
            onSuccess={() => setIsCreateOpen(false)}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
