import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, Clock, FileText, History, Shield } from 'lucide-react';
import { useChangeCard, useToggleApproval, useChangeCardAuditEvents } from '../hooks/useChangeCards';
import { STATUS_LABELS, EXCEPTION_REASON_LABELS } from '../types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChangeDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeCardId: string;
}

export function ChangeDetailDrawer({ open, onOpenChange, changeCardId }: ChangeDetailDrawerProps) {
  const { data: change, isLoading } = useChangeCard(changeCardId);
  const { data: auditEvents = [] } = useChangeCardAuditEvents(changeCardId);
  const toggleApproval = useToggleApproval();

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-y-auto rounded-none">
        {isLoading || !change ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-gray-900 dark:text-gray-100 font-mono">
                    {change.change_number}
                  </SheetTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{change.title}</p>
                </div>
                <div className="flex items-center gap-2 mr-8">
                  {change.approved ? (
                    <Badge variant="success" className="border-0">
                      <CheckCircle className="w-3 h-3 mr-1" /> Approved
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="border-0">
                      <Clock className="w-3 h-3 mr-1" /> Pending Approval
                    </Badge>
                  )}
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="bg-gray-100 dark:bg-gray-800">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tickets">Tickets ({change.links?.length || 0})</TabsTrigger>
                <TabsTrigger value="governance">Governance</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{STATUS_LABELS[change.status]}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Planned Date</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {format(new Date(change.planned_prod_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Compliance</span>
                      <p className={cn(
                        "font-medium",
                        change.compliance_state === 'compliant' 
                          ? "text-status-success" 
                          : "text-status-warning"
                      )}>
                        {change.compliance_state === 'compliant' ? 'Compliant' : 'Exception Recorded'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Committee Pending</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{change.committee_pending_count || 0}</p>
                    </div>
                  </div>
                </Card>

                {change.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{change.description}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => toggleApproval.mutate({ id: change.id, approved: !change.approved })}
                    disabled={toggleApproval.isPending}
                    className={cn(
                      "w-full",
                      change.approved 
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        : "bg-brand-primary hover:bg-brand-primary/90 text-white"
                    )}
                  >
                    {change.approved ? 'Remove Approval' : 'Approve Change'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="tickets" className="mt-4">
                {!change.links?.length ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">No tickets linked</div>
                ) : (
                  <div className="space-y-2">
                    {change.links.map(link => (
                      <Card key={link.id} className="p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{link.work_item_key || link.work_item_id}</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{link.cached_title || 'No title'}</p>
                          </div>
                          <Badge 
                            variant={
                              link.committee_status === 'approved' ? 'success' :
                              link.committee_status === 'pending' ? 'warning' : 'secondary'
                            }
                            className="text-2xs border-0"
                          >
                            {link.committee_status}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="governance" className="mt-4 space-y-4">
                {change.compliance_state === 'exception_recorded' && (
                  <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-amber-800 dark:text-amber-300">Exception Recorded</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          {change.exception_reason_code && EXCEPTION_REASON_LABELS[change.exception_reason_code]}
                        </p>
                        {change.exception_notes && (
                          <p className="text-sm text-amber-600 dark:text-amber-500 mt-2">{change.exception_notes}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" /> Audit Trail
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {auditEvents.map(event => (
                      <div key={event.id} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="w-2 h-2 rounded-full bg-brand-primary mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {event.event_type.replace(/_/g, ' ')}
                            {event.from_value && event.to_value && (
                              <span className="text-gray-500 dark:text-gray-400">
                                : {event.from_value} → {event.to_value}
                              </span>
                            )}
                          </p>
                          <p className="text-2xs text-gray-500 dark:text-gray-400">
                            {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
