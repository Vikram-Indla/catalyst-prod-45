/**
 * Enterprise-Grade Defect Report Modal
 * Based on industry standards from Jira, TestRail, and QA best practices
 * 
 * Required fields:
 * - Title, Severity, Priority, Defect Type, Module
 * - Steps to Reproduce, Expected Result, Actual Result
 * - Environment, Release/Version
 */

import { 
  Bug, 
  Upload, 
  Ban, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Minus 
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
import { releaseOptions, testCaseOptions, assigneeOptions } from "@/data/defectsData";

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
  const updateField = (field: keyof DefectFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-600" />
            Report Defect
          </DialogTitle>
          <DialogDescription>
            Log a bug or issue discovered during testing. Fields marked <span className="text-red-500">*</span> are required.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          
          {/* SECTION 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Basic Information
            </h3>
            
            {/* Title */}
            <div>
              <label className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <Input 
                placeholder="Brief, descriptive summary of the issue..."
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: "Login button unresponsive on Safari iOS 17"
              </p>
            </div>
            
            {/* Severity & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Severity <span className="text-red-500">*</span>
                </label>
                <Select value={formData.severity} onValueChange={(v) => updateField('severity', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="How serious is it?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="blocker">
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-purple-600" />
                        <span>Blocker — System unusable</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>Critical — Major function broken</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="major">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span>Major — Function impaired</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="minor">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-yellow-600" />
                        <span>Minor — Cosmetic issue</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="trivial">
                      <div className="flex items-center gap-2">
                        <Minus className="w-4 h-4 text-gray-500" />
                        <span>Trivial — Enhancement</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select value={formData.priority} onValueChange={(v) => updateField('priority', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="How urgent?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="P1">P1 — Urgent (Fix immediately)</SelectItem>
                    <SelectItem value="P2">P2 — High (Fix this sprint)</SelectItem>
                    <SelectItem value="P3">P3 — Medium (Fix soon)</SelectItem>
                    <SelectItem value="P4">P4 — Low (Fix when possible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Defect Type & Module Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Defect Type <span className="text-red-500">*</span>
                </label>
                <Select value={formData.defectType} onValueChange={(v) => updateField('defectType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="What kind of bug?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="functional">Functional — Feature not working</SelectItem>
                    <SelectItem value="ui">UI/Visual — Display issue</SelectItem>
                    <SelectItem value="performance">Performance — Slow/timeout</SelectItem>
                    <SelectItem value="security">Security — Vulnerability</SelectItem>
                    <SelectItem value="data">Data — Incorrect/missing data</SelectItem>
                    <SelectItem value="integration">Integration — API/system issue</SelectItem>
                    <SelectItem value="usability">Usability — Hard to use</SelectItem>
                    <SelectItem value="crash">Crash — Application crash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">
                  Module/Component <span className="text-red-500">*</span>
                </label>
                <Select value={formData.module} onValueChange={(v) => updateField('module', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Which module?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="reports">Reports</SelectItem>
                    <SelectItem value="user-management">User Management</SelectItem>
                    <SelectItem value="payments">Payments</SelectItem>
                    <SelectItem value="notifications">Notifications</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="mobile">Mobile App</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* SECTION 2: Reproduction Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Reproduction Details
            </h3>
            
            {/* Steps to Reproduce */}
            <div>
              <label className="text-sm font-medium">
                Steps to Reproduce <span className="text-red-500">*</span>
              </label>
              <Textarea 
                placeholder={"1. Navigate to login page\n2. Enter valid credentials\n3. Click 'Sign In' button\n4. Observe the error..."}
                value={formData.stepsToReproduce}
                onChange={(e) => updateField('stepsToReproduce', e.target.value)}
                className="min-h-[100px] font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number each step. Be specific about what you clicked/entered.
              </p>
            </div>
            
            {/* Expected vs Actual Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Expected Result <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  placeholder="What should have happened..."
                  value={formData.expectedResult}
                  onChange={(e) => updateField('expectedResult', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">
                  Actual Result <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  placeholder="What actually happened..."
                  value={formData.actualResult}
                  onChange={(e) => updateField('actualResult', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
            
            {/* URL */}
            <div>
              <label className="text-sm font-medium">URL (if applicable)</label>
              <Input 
                placeholder="https://app.catalyst.gov.sa/..."
                value={formData.url}
                onChange={(e) => updateField('url', e.target.value)}
              />
            </div>
          </div>
          
          {/* SECTION 3: Environment */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Environment
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Environment <span className="text-red-500">*</span>
                </label>
                <Select value={formData.environment} onValueChange={(v) => updateField('environment', v)}>
                  <SelectTrigger>
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
                <label className="text-sm font-medium">
                  Release/Version <span className="text-red-500">*</span>
                </label>
                <Select value={formData.releaseId} onValueChange={(v) => updateField('releaseId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Which release?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {releaseOptions.filter(r => r.value !== 'all').map(release => (
                      <SelectItem key={release.value} value={release.value}>
                        {release.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Browser</label>
                <Select value={formData.browser} onValueChange={(v) => updateField('browser', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="chrome">Chrome</SelectItem>
                    <SelectItem value="firefox">Firefox</SelectItem>
                    <SelectItem value="safari">Safari</SelectItem>
                    <SelectItem value="edge">Edge</SelectItem>
                    <SelectItem value="mobile-safari">Safari (iOS)</SelectItem>
                    <SelectItem value="mobile-chrome">Chrome (Android)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">OS</label>
                <Select value={formData.os} onValueChange={(v) => updateField('os', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="windows-11">Windows 11</SelectItem>
                    <SelectItem value="windows-10">Windows 10</SelectItem>
                    <SelectItem value="macos">macOS</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="linux">Linux</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Device</label>
                <Input 
                  placeholder="e.g., iPhone 15 Pro"
                  value={formData.device}
                  onChange={(e) => updateField('device', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* SECTION 4: Traceability & Assignment */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Traceability & Assignment
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Linked Test Case</label>
                <Select value={formData.linkedTestId} onValueChange={(v) => updateField('linkedTestId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Link to test case..." />
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
              
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <Select value={formData.assigneeId} onValueChange={(v) => updateField('assigneeId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee..." />
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
            
            {/* How Detected */}
            <div>
              <label className="text-sm font-medium">How Detected</label>
              <Select value={formData.howDetected} onValueChange={(v) => updateField('howDetected', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="How was this found?" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="manual-test">Manual Testing</SelectItem>
                  <SelectItem value="automated-test">Automated Testing</SelectItem>
                  <SelectItem value="regression">Regression Testing</SelectItem>
                  <SelectItem value="uat">UAT</SelectItem>
                  <SelectItem value="production">Production Monitoring</SelectItem>
                  <SelectItem value="customer">Customer Reported</SelectItem>
                  <SelectItem value="code-review">Code Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* SECTION 5: Attachments */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Attachments
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Drag & drop screenshots, videos, or logs
              </p>
              <p className="text-xs text-gray-400 mt-1">
                or <span className="text-primary">browse files</span>
              </p>
            </div>
            <p className="text-xs text-gray-500">
              💡 Tip: Screenshots with annotations help developers understand the issue faster
            </p>
          </div>
          
        </div>
        
        <DialogFooter className="mt-6 pt-4 border-t">
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
