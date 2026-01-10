/**
 * LogDefectModal — Modal for logging defects during test execution
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bug, Upload } from 'lucide-react';

interface LogDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCaseId: string;
  stepNumber: number;
  actualResult?: string;
}

export function LogDefectModal({
  isOpen,
  onClose,
  testCaseId,
  stepNumber,
  actualResult = '',
}: LogDefectModalProps) {
  const [title, setTitle] = useState(`Defect in ${testCaseId} - Step ${stepNumber}`);
  const [severity, setSeverity] = useState('major');
  const [description, setDescription] = useState(actualResult);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Please enter a defect title');
      return;
    }

    // Mock defect creation
    const defectId = `DEF-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    toast.success(`Defect ${defectId} created and linked to ${testCaseId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-600" />
            Log Defect
          </DialogTitle>
          <DialogDescription>
            Create a defect linked to step {stepNumber} of {testCaseId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter defect title..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Severity</label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blocker">Blocker</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="trivial">Trivial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the defect in detail..."
              className="min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Attachments</label>
            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Drag & drop or browse</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleSubmit}
          >
            <Bug className="w-4 h-4 mr-2" />
            Create Defect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
