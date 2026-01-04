/**
 * Export Dropdown Component
 * PDF, Excel, CSV, PNG exports and scheduled reports
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileType,
  Image,
  Mail,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ExportDropdownProps {
  onExport?: (format: string) => void;
}

export function ExportDropdown({ onExport }: ExportDropdownProps) {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: 'Weekly Execution Summary',
    frequency: 'weekly',
    day: 'monday',
    time: '09:00',
    recipients: '',
    includeSummary: true,
    includeExecution: true,
    includeDefects: true,
    includeTeam: false,
  });

  const handleExport = (format: string) => {
    onExport?.(format);
    toast({
      title: 'Export Started',
      description: `Generating ${format.toUpperCase()} report...`,
    });
  };

  const handleSchedule = () => {
    setScheduleModalOpen(false);
    toast({
      title: 'Report Scheduled',
      description: `${scheduleForm.name} will be sent ${scheduleForm.frequency}.`,
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            PDF Report
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel Spreadsheet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('csv')}>
            <FileType className="h-4 w-4 mr-2" />
            CSV Data
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('png')}>
            <Image className="h-4 w-4 mr-2" />
            PNG Charts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleExport('email')}>
            <Mail className="h-4 w-4 mr-2" />
            Email Report
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setScheduleModalOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Schedule Report Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Automated Report</DialogTitle>
            <DialogDescription>
              Configure automated report delivery to your team.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select
                  value={scheduleForm.frequency}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, frequency: v })}
                >
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
              <div className="grid gap-2">
                <Label>Day</Label>
                <Select
                  value={scheduleForm.day}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, day: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Time</Label>
                <Select
                  value={scheduleForm.time}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, time: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="17:00">5:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="recipients">Recipients</Label>
              <Input
                id="recipients"
                placeholder="email@company.com"
                value={scheduleForm.recipients}
                onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
            </div>

            <div className="grid gap-2">
              <Label>Include</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inc-summary"
                    checked={scheduleForm.includeSummary}
                    onCheckedChange={(c) =>
                      setScheduleForm({ ...scheduleForm, includeSummary: c as boolean })
                    }
                  />
                  <label htmlFor="inc-summary" className="text-sm">
                    Executive Summary
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inc-execution"
                    checked={scheduleForm.includeExecution}
                    onCheckedChange={(c) =>
                      setScheduleForm({ ...scheduleForm, includeExecution: c as boolean })
                    }
                  />
                  <label htmlFor="inc-execution" className="text-sm">
                    Execution Details
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inc-defects"
                    checked={scheduleForm.includeDefects}
                    onCheckedChange={(c) =>
                      setScheduleForm({ ...scheduleForm, includeDefects: c as boolean })
                    }
                  />
                  <label htmlFor="inc-defects" className="text-sm">
                    Defect Summary
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inc-team"
                    checked={scheduleForm.includeTeam}
                    onCheckedChange={(c) =>
                      setScheduleForm({ ...scheduleForm, includeTeam: c as boolean })
                    }
                  />
                  <label htmlFor="inc-team" className="text-sm">
                    Team Performance
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
