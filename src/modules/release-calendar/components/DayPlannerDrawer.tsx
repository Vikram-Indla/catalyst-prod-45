import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react';
import { useChangeCardsByDate } from '../hooks/useChangeCards';
import { STATUS_LABELS } from '../types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DayPlannerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  onChangeClick: (changeId: string) => void;
  onCreateClick: () => void;
}

export function DayPlannerDrawer({ open, onOpenChange, date, onChangeClick, onCreateClick }: DayPlannerDrawerProps) {
  const { data: changes = [], isLoading } = useChangeCardsByDate(date);

  const stats = {
    total: changes.length,
    approved: changes.filter(c => c.approved).length,
    pending: changes.filter(c => !c.approved).length,
    exceptions: changes.filter(c => c.compliance_state === 'exception_recorded').length,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <SheetHeader>
          <SheetTitle className="text-gray-900 dark:text-gray-100">
            Plan: {date ? format(new Date(date), 'MMMM d, yyyy') : ''}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* KPI Tiles */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="p-3 text-center bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <FileText className="w-4 h-4 mx-auto text-gray-500 dark:text-gray-400 mb-1" />
              <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.total}</div>
              <div className="text-2xs text-gray-500 dark:text-gray-400">Total</div>
            </Card>
            <Card className="p-3 text-center bg-green-50 dark:bg-green-900/20 border-gray-200 dark:border-gray-700">
              <CheckCircle className="w-4 h-4 mx-auto text-status-success mb-1" />
              <div className="text-xl font-semibold text-status-success">{stats.approved}</div>
              <div className="text-2xs text-gray-500 dark:text-gray-400">Approved</div>
            </Card>
            <Card className="p-3 text-center bg-amber-50 dark:bg-amber-900/20 border-gray-200 dark:border-gray-700">
              <Clock className="w-4 h-4 mx-auto text-status-warning mb-1" />
              <div className="text-xl font-semibold text-status-warning">{stats.pending}</div>
              <div className="text-2xs text-gray-500 dark:text-gray-400">Pending</div>
            </Card>
            <Card className="p-3 text-center bg-red-50 dark:bg-red-900/20 border-gray-200 dark:border-gray-700">
              <AlertTriangle className="w-4 h-4 mx-auto text-status-danger mb-1" />
              <div className="text-xl font-semibold text-status-danger">{stats.exceptions}</div>
              <div className="text-2xs text-gray-500 dark:text-gray-400">Exceptions</div>
            </Card>
          </div>

          {/* Changes List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Changes</h3>
              <Button size="sm" onClick={onCreateClick} className="bg-brand-primary hover:bg-brand-primary/90 text-white">
                <Plus className="w-4 h-4 mr-1" /> Add Change
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
              ) : changes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">No changes planned for this day</div>
              ) : (
                changes.map(change => (
                  <Card
                    key={change.id}
                    onClick={() => onChangeClick(change.id)}
                    className="p-3 cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
                            {change.change_number}
                          </span>
                          <Badge className={cn(
                            "text-2xs",
                            change.approved 
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          )}>
                            {change.approved ? 'Approved' : 'Pending'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{change.title}</p>
                        <p className="text-2xs text-gray-500 dark:text-gray-400 mt-1">{STATUS_LABELS[change.status]}</p>
                      </div>
                      {change.compliance_state === 'exception_recorded' && (
                        <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
