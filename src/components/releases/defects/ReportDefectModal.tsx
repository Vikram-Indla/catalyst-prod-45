/**
 * Streamlined Defect Report Modal
 * Simplified form with only essential required fields
 * 
 * Required fields (6): Title, Severity, Steps, Expected, Actual, Release
 * Optional fields in collapsible "Additional Details" section
 */

import { useState } from "react";
import { 
  Bug, 
  Upload, 
  Ban, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Minus,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { releaseOptions, testCaseOptions, assigneeOptions } from "@/data/defectsData";
import { cn } from "@/lib/utils";

export interface DefectFormData {
  title: string;
  severity: string;
  priority: string;
  defectType: string;
  module: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  url: string;
  environment: string;
  releaseId: string;
  browser: string;
  os: string;
  device: string;
  linkedTestId: string;
  assigneeId: string;
  howDetected: string;
  description: string;
}

interface ReportDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: DefectFormData;
  setFormData: (data: DefectFormData) => void;
  onSubmit: () => void;
}

export function ReportDefectModal({ 
  isOpen, 
  onClose, 
  formData, 
  setFormData, 
  onSubmit 
}: ReportDefectModalProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const updateField = (field: keyof DefectFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 bg-white">
        
        {/* STICKY HEADER */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-600" />
              Report Defect
            </DialogTitle>
            <DialogDescription>
              Log a bug found during testing. Fields marked <span className="text-red-500">*</span> are required.
            </DialogDescription>
          </DialogHeader>
          
          {/* Title field in sticky area - always visible */}
          <div className="mt-4">
            <label className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <Input 
              placeholder="Brief description of the issue..."
              className="mt-1"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
        </div>
        
        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            
            {/* Severity & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Severity <span className="text-red-500">*</span>
                </label>
                <Select value={formData.severity} onValueChange={(v) => updateField('severity', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="How serious?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="blocker">
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-purple-600" />
                        <span>Blocker</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>Critical</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="major">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span>Major</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="minor">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-yellow-600" />
                        <span>Minor</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="trivial">
                      <div className="flex items-center gap-2">
                        <Minus className="w-4 h-4 text-gray-500" />
                        <span>Trivial</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={formData.priority} onValueChange={(v) => updateField('priority', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="How urgent?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="P1">P1 - Urgent</SelectItem>
                    <SelectItem value="P2">P2 - High</SelectItem>
                    <SelectItem value="P3">P3 - Medium</SelectItem>
                    <SelectItem value="P4">P4 - Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Steps to Reproduce */}
            <div>
              <label className="text-sm font-medium">
                Steps to Reproduce <span className="text-red-500">*</span>
              </label>
              <Textarea 
                placeholder={"1. Navigate to...\n2. Click on...\n3. Observe..."}
                value={formData.stepsToReproduce}
                onChange={(e) => updateField('stepsToReproduce', e.target.value)}
                className="mt-1 min-h-[80px] font-mono text-sm"
              />
            </div>
            
            {/* Expected vs Actual - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Expected <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  placeholder="What should happen..."
                  value={formData.expectedResult}
                  onChange={(e) => updateField('expectedResult', e.target.value)}
                  className="mt-1 min-h-[60px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Actual <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  placeholder="What happened..."
                  value={formData.actualResult}
                  onChange={(e) => updateField('actualResult', e.target.value)}
                  className="mt-1 min-h-[60px]"
                />
              </div>
            </div>
            
            {/* Release & Assignee */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Release <span className="text-red-500">*</span>
                </label>
                <Select value={formData.releaseId} onValueChange={(v) => updateField('releaseId', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select release" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {releaseOptions.filter(r => r.value !== 'all').map(release => (
                      <SelectItem key={release.value} value={release.value}>
                        {release.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <Select value={formData.assigneeId} onValueChange={(v) => updateField('assigneeId', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {assigneeOptions.filter(a => a.value !== 'all').map(assignee => (
                      <SelectItem key={assignee.value || 'unassigned'} value={assignee.value || 'unassigned'}>
                        {assignee.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Attachments */}
            <div>
              <label className="text-sm font-medium">Attachments</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mt-1 hover:border-gray-400 transition-colors cursor-pointer">
                <Upload className="w-5 h-5 mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-1">
                  Drop files or <span className="text-primary">browse</span>
                </p>
              </div>
            </div>
            
            {/* COLLAPSIBLE: Additional Details */}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2">
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform",
                  isAdvancedOpen && "rotate-90"
                )} />
                Additional Details (optional)
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-4">
                
                {/* Environment & Module */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Environment</label>
                    <Select value={formData.environment} onValueChange={(v) => updateField('environment', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Where found?" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="dev">Development</SelectItem>
                        <SelectItem value="qa">QA</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="uat">UAT</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Module</label>
                    <Select value={formData.module} onValueChange={(v) => updateField('module', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Which module?" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="authentication">Authentication</SelectItem>
                        <SelectItem value="dashboard">Dashboard</SelectItem>
                        <SelectItem value="reports">Reports</SelectItem>
                        <SelectItem value="user-management">User Management</SelectItem>
                        <SelectItem value="payments">Payments</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Defect Type & How Detected */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Defect Type</label>
                    <Select value={formData.defectType} onValueChange={(v) => updateField('defectType', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="What kind?" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="functional">Functional</SelectItem>
                        <SelectItem value="ui">UI/Visual</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="integration">Integration</SelectItem>
                        <SelectItem value="crash">Crash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">How Detected</label>
                    <Select value={formData.howDetected} onValueChange={(v) => updateField('howDetected', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="How found?" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="manual-test">Manual Testing</SelectItem>
                        <SelectItem value="automated-test">Automated Test</SelectItem>
                        <SelectItem value="regression">Regression</SelectItem>
                        <SelectItem value="uat">UAT</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="customer">Customer Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Linked Test Case */}
                <div>
                  <label className="text-sm font-medium">Linked Test Case</label>
                  <Select value={formData.linkedTestId} onValueChange={(v) => updateField('linkedTestId', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Link to test..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {testCaseOptions.map(tc => (
                        <SelectItem key={tc.value || 'none'} value={tc.value || 'none'}>
                          {tc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* URL */}
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <Input 
                    placeholder="https://..."
                    value={formData.url}
                    onChange={(e) => updateField('url', e.target.value)}
                    className="mt-1"
                  />
                </div>
                
              </CollapsibleContent>
            </Collapsible>
            
          </div>
        </div>
        
        {/* STICKY FOOTER */}
        <DialogFooter className="sticky bottom-0 bg-white border-t px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onSubmit}
          >
            <Bug className="w-4 h-4 mr-2" />
            Report Defect
          </Button>
        </DialogFooter>
        
      </DialogContent>
    </Dialog>
  );
}
