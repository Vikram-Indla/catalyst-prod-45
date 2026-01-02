/**
 * Dashboard Builder
 * Configurable dashboard with save, share, schedule, and export
 */

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Save,
  Share2,
  Clock,
  Download,
  FileText,
  Settings,
  Trash2,
  Copy,
  GripVertical,
  X,
  LayoutGrid,
  Loader2,
  Calendar,
  Mail,
  Users,
  Globe,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { exportToCSV } from '@/lib/exportUtils';
import { 
  useTestDashboards, 
  useReportSchedule, 
  GadgetType, 
  Dashboard, 
  DashboardGadget,
  GadgetPosition,
} from '../../hooks/useTestDashboards';
import {
  ExecutionOverviewGadget,
  DefectSummaryGadget,
  TraceabilitySummaryGadget,
  TraceabilityDetailGadget,
  ExecutionDistributionGadget,
  BurnupGadget,
  UserActivityGadget,
  ProjectActivityGadget,
} from './ReportGadgets';

interface DashboardBuilderProps {
  projectId: string;
  programId: string;
}

const GADGET_CATALOG: { type: GadgetType; name: string; description: string; icon: string }[] = [
  { type: 'execution_overview', name: 'Execution Overview', description: 'Pass rate and execution summary', icon: '📊' },
  { type: 'defect_summary', name: 'Defect Summary', description: 'Open defects by severity', icon: '🐛' },
  { type: 'traceability_summary', name: 'Traceability Summary', description: 'Requirements coverage %', icon: '🔗' },
  { type: 'traceability_detail', name: 'Traceability Detail', description: 'Coverage by feature', icon: '📋' },
  { type: 'execution_distribution', name: 'Execution Distribution', description: 'Status pie chart', icon: '🥧' },
  { type: 'burnup', name: 'Test Burnup', description: 'Cumulative execution trend', icon: '📈' },
  { type: 'user_activity', name: 'User Activity', description: 'Top contributors', icon: '👥' },
  { type: 'project_activity', name: 'Project Activity', description: 'Activity by day', icon: '📅' },
];

const DEFAULT_POSITIONS: Record<GadgetType, GadgetPosition> = {
  execution_overview: { x: 0, y: 0, w: 4, h: 3 },
  defect_summary: { x: 4, y: 0, w: 4, h: 3 },
  traceability_summary: { x: 8, y: 0, w: 4, h: 3 },
  execution_distribution: { x: 0, y: 3, w: 6, h: 4 },
  burnup: { x: 6, y: 3, w: 6, h: 4 },
  user_activity: { x: 0, y: 7, w: 6, h: 3 },
  project_activity: { x: 6, y: 7, w: 6, h: 4 },
  traceability_detail: { x: 0, y: 10, w: 12, h: 4 },
};

export function DashboardBuilder({ projectId, programId }: DashboardBuilderProps) {
  const {
    dashboards,
    defaultDashboard,
    isLoading,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    addGadget,
    updateGadget,
    removeGadget,
    isCreating,
    isUpdating,
  } = useTestDashboards(programId);

  const { schedules, createSchedule, deleteSchedule, isCreating: isScheduling } = useReportSchedule(programId);

  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showGadgetPicker, setShowGadgetPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Form states
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDesc, setNewDashboardDesc] = useState('');
  const [shareVisibility, setShareVisibility] = useState<'private' | 'team' | 'public'>('private');
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  const [scheduleFormat, setScheduleFormat] = useState<'pdf' | 'csv'>('pdf');

  // Use default or first dashboard
  const activeDashboard = selectedDashboard || defaultDashboard || dashboards[0];

  // Create new dashboard
  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return;

    try {
      const dashboard = await createDashboard({
        name: newDashboardName,
        description: newDashboardDesc || undefined,
        visibility: 'private',
      });
      setSelectedDashboard(dashboard as unknown as Dashboard);
      setShowCreateModal(false);
      setNewDashboardName('');
      setNewDashboardDesc('');
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Add gadget to dashboard
  const handleAddGadget = async (gadgetType: GadgetType) => {
    if (!activeDashboard) return;

    try {
      await addGadget({
        dashboardId: activeDashboard.id,
        gadget: {
          gadgetType,
          position: DEFAULT_POSITIONS[gadgetType] || { x: 0, y: 0, w: 6, h: 4 },
          config: { dateRange: '14' },
        },
      });
      setShowGadgetPicker(false);
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Share dashboard
  const handleShare = async () => {
    if (!activeDashboard) return;

    try {
      await updateDashboard({
        id: activeDashboard.id,
        visibility: shareVisibility,
      });
      setShowShareModal(false);
      toast.success(`Dashboard visibility set to ${shareVisibility}`);
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Schedule report
  const handleSchedule = async () => {
    if (!activeDashboard || !scheduleRecipients.trim()) return;

    const recipients = scheduleRecipients.split(',').map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast.error('Enter at least one recipient email');
      return;
    }

    try {
      await createSchedule({
        reportType: activeDashboard.name,
        frequency: scheduleFrequency,
        recipients,
        format: scheduleFormat,
        config: { dashboardId: activeDashboard.id },
      });
      setShowScheduleModal(false);
      setScheduleRecipients('');
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!activeDashboard) return;
    setIsExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text(activeDashboard.name, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Description
      if (activeDashboard.description) {
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(activeDashboard.description, 20, yPos);
        yPos += 10;
      }

      // Gadget list
      doc.setFontSize(12);
      doc.text('Dashboard Components:', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      (activeDashboard.gadgets || []).forEach((gadget) => {
        const gadgetInfo = GADGET_CATALOG.find(g => g.type === gadget.gadget_type);
        doc.text(`• ${gadgetInfo?.name || gadget.gadget_type}`, 25, yPos);
        yPos += 6;
      });

      doc.save(`${activeDashboard.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Dashboard exported to PDF');
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!activeDashboard) return;

    const data = (activeDashboard.gadgets || []).map(g => {
      const info = GADGET_CATALOG.find(cat => cat.type === g.gadget_type);
      return {
        gadget: info?.name || g.gadget_type,
        type: g.gadget_type,
        position: `${g.position.x},${g.position.y}`,
        size: `${g.position.w}x${g.position.h}`,
      };
    });

    exportToCSV(data, `${activeDashboard.name}-layout-${format(new Date(), 'yyyy-MM-dd')}`, ['gadget', 'type', 'position', 'size']);
    toast.success('Layout exported to CSV');
  };

  // Render gadget component
  const renderGadget = (gadget: DashboardGadget) => {
    const props = { projectId, config: gadget.config, className: 'h-full' };

    switch (gadget.gadget_type) {
      case 'execution_overview':
        return <ExecutionOverviewGadget {...props} />;
      case 'defect_summary':
        return <DefectSummaryGadget {...props} />;
      case 'traceability_summary':
        return <TraceabilitySummaryGadget {...props} />;
      case 'traceability_detail':
        return <TraceabilityDetailGadget {...props} />;
      case 'execution_distribution':
        return <ExecutionDistributionGadget {...props} />;
      case 'burnup':
        return <BurnupGadget {...props} />;
      case 'user_activity':
        return <UserActivityGadget {...props} />;
      case 'project_activity':
        return <ProjectActivityGadget {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={activeDashboard?.id || ''}
            onValueChange={(id) => setSelectedDashboard(dashboards.find(d => d.id === id) || null)}
          >
            <SelectTrigger className="w-[240px] bg-surface-2">
              <SelectValue placeholder="Select dashboard..." />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  <div className="flex items-center gap-2">
                    <span>{d.name}</span>
                    {d.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGadgetPicker(true)} disabled={!activeDashboard}>
            <LayoutGrid className="h-4 w-4 mr-1" />
            Add Gadget
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)} disabled={!activeDashboard}>
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowScheduleModal(true)} disabled={!activeDashboard}>
            <Clock className="h-4 w-4 mr-1" />
            Schedule
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting || !activeDashboard}>
                {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export Layout as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {activeDashboard && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => duplicateDashboard(activeDashboard.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateDashboard({ id: activeDashboard.id, isDefault: true })}>
                  Set as Default
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    if (confirm('Delete this dashboard?')) {
                      deleteDashboard(activeDashboard.id);
                      setSelectedDashboard(null);
                    }
                  }}
                  className="text-status-error"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Dashboard Grid */}
      {!activeDashboard ? (
        <div className="text-center py-16 bg-surface-2 rounded-lg border border-border-default">
          <LayoutGrid className="h-12 w-12 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Dashboard Selected</h3>
          <p className="text-text-tertiary mb-4">Create your first dashboard to get started</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Dashboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 auto-rows-[80px]">
          {(activeDashboard.gadgets || []).map((gadget) => (
            <div
              key={gadget.id}
              className="relative group"
              style={{
                gridColumn: `span ${gadget.position.w}`,
                gridRow: `span ${gadget.position.h}`,
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-1/80"
                onClick={() => removeGadget(gadget.id)}
              >
                <X className="h-3 w-3" />
              </Button>
              {renderGadget(gadget)}
            </div>
          ))}
          {(activeDashboard.gadgets || []).length === 0 && (
            <div className="col-span-12 row-span-4 flex items-center justify-center bg-surface-2 rounded-lg border-2 border-dashed border-border-default">
              <div className="text-center">
                <LayoutGrid className="h-8 w-8 text-text-quaternary mx-auto mb-2" />
                <p className="text-text-tertiary text-sm mb-3">Add gadgets to build your dashboard</p>
                <Button variant="outline" size="sm" onClick={() => setShowGadgetPicker(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Gadget
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dashboard Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Dashboard</DialogTitle>
            <DialogDescription>Create a new custom dashboard for your reports</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="Executive Summary"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newDashboardDesc}
                onChange={(e) => setNewDashboardDesc(e.target.value)}
                placeholder="High-level test metrics for stakeholders..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateDashboard} disabled={!newDashboardName.trim() || isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gadget Picker Sheet */}
      <Sheet open={showGadgetPicker} onOpenChange={setShowGadgetPicker}>
        <SheetContent side="right" className="w-[400px]">
          <SheetHeader>
            <SheetTitle>Add Gadget</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-3 pr-4">
              {GADGET_CATALOG.map((gadget) => (
                <Button
                  key={gadget.type}
                  variant="outline"
                  className="w-full h-auto py-4 justify-start"
                  onClick={() => handleAddGadget(gadget.type)}
                >
                  <span className="text-2xl mr-3">{gadget.icon}</span>
                  <div className="text-left">
                    <div className="font-medium">{gadget.name}</div>
                    <div className="text-xs text-text-tertiary">{gadget.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Dashboard</DialogTitle>
            <DialogDescription>Control who can view this dashboard</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div 
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  shareVisibility === 'private' ? 'border-accent-primary bg-accent-subtle' : 'border-border-default hover:bg-surface-hover'
                )}
                onClick={() => setShareVisibility('private')}
              >
                <Lock className="h-5 w-5 text-text-tertiary" />
                <div>
                  <div className="font-medium text-text-primary">Private</div>
                  <div className="text-xs text-text-tertiary">Only you can view</div>
                </div>
              </div>
              <div 
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  shareVisibility === 'team' ? 'border-accent-primary bg-accent-subtle' : 'border-border-default hover:bg-surface-hover'
                )}
                onClick={() => setShareVisibility('team')}
              >
                <Users className="h-5 w-5 text-text-tertiary" />
                <div>
                  <div className="font-medium text-text-primary">Team</div>
                  <div className="text-xs text-text-tertiary">All project members can view</div>
                </div>
              </div>
              <div 
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  shareVisibility === 'public' ? 'border-accent-primary bg-accent-subtle' : 'border-border-default hover:bg-surface-hover'
                )}
                onClick={() => setShareVisibility('public')}
              >
                <Globe className="h-5 w-5 text-text-tertiary" />
                <div>
                  <div className="font-medium text-text-primary">Public</div>
                  <div className="text-xs text-text-tertiary">Anyone with link can view</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareModal(false)}>Cancel</Button>
            <Button onClick={handleShare} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Report</DialogTitle>
            <DialogDescription>Automatically send this dashboard report</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={scheduleFrequency} onValueChange={(v) => setScheduleFrequency(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipients (comma-separated emails)</Label>
              <Textarea
                value={scheduleRecipients}
                onChange={(e) => setScheduleRecipients(e.target.value)}
                placeholder="cio@company.com, qa-lead@company.com"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={scheduleFormat} onValueChange={(v) => setScheduleFormat(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={isScheduling || !scheduleRecipients.trim()}>
              {isScheduling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DashboardBuilder;
