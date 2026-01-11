import { Bug, Upload } from "lucide-react";
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

interface NewDefectData {
  title: string;
  severity: string;
  releaseId: string;
  linkedTestId: string;
  assigneeId: string;
  description: string;
}

interface ReportDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  newDefect: NewDefectData;
  setNewDefect: (data: NewDefectData) => void;
  onSubmit: () => void;
}

export function ReportDefectModal({ 
  isOpen, 
  onClose, 
  newDefect, 
  setNewDefect, 
  onSubmit 
}: ReportDefectModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>Report Defect</DialogTitle>
          <DialogDescription>
            Log a new bug or issue discovered during testing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
            <Input 
              placeholder="Brief description of the issue..."
              value={newDefect.title}
              onChange={(e) => setNewDefect({...newDefect, title: e.target.value})}
            />
          </div>
          
          {/* Severity */}
          <div>
            <label className="text-sm font-medium">Severity <span className="text-red-500">*</span></label>
            <Select 
              value={newDefect.severity}
              onValueChange={(val) => setNewDefect({...newDefect, severity: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="blocker">🚫 Blocker — System unusable</SelectItem>
                <SelectItem value="critical">🔴 Critical — Major function broken</SelectItem>
                <SelectItem value="major">🟠 Major — Function impaired</SelectItem>
                <SelectItem value="minor">🟡 Minor — Cosmetic issue</SelectItem>
                <SelectItem value="trivial">⚪ Trivial — Nice to fix</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Release */}
          <div>
            <label className="text-sm font-medium">Release <span className="text-red-500">*</span></label>
            <Select 
              value={newDefect.releaseId}
              onValueChange={(val) => setNewDefect({...newDefect, releaseId: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select release" />
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
          
          {/* Linked Test Case (Optional) */}
          <div>
            <label className="text-sm font-medium">Linked Test Case</label>
            <Select 
              value={newDefect.linkedTestId}
              onValueChange={(val) => setNewDefect({...newDefect, linkedTestId: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
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
          
          {/* Assignee */}
          <div>
            <label className="text-sm font-medium">Assign To</label>
            <Select 
              value={newDefect.assigneeId}
              onValueChange={(val) => setNewDefect({...newDefect, assigneeId: val})}
            >
              <SelectTrigger>
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
          
          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
            <Textarea 
              placeholder="Detailed steps to reproduce, expected vs actual behavior..."
              value={newDefect.description}
              onChange={(e) => setNewDefect({...newDefect, description: e.target.value})}
              className="min-h-[100px]"
            />
          </div>
          
          {/* Attachments */}
          <div>
            <label className="text-sm font-medium">Attachments</label>
            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer">
              <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                Drag & drop screenshots or <span className="text-primary cursor-pointer">browse</span>
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
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
