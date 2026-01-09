/**
 * Test Case Modal - Create/Edit test case
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TMTestCase, TestCaseCreateInput, TestCaseStatus, TestCasePriority, TestCaseType, TMFolderNode } from '../types';

interface TestCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase?: TMTestCase | null;
  folders: TMFolderNode[];
  onSave: (data: TestCaseCreateInput) => void;
}

export function TestCaseModal({
  open,
  onOpenChange,
  testCase,
  folders,
  onSave,
}: TestCaseModalProps) {
  const isEdit = !!testCase;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TestCaseStatus>('draft');
  const [priority, setPriority] = useState<TestCasePriority>('P3');
  const [type, setType] = useState<TestCaseType>('functional');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Reset form when opening/testCase changes
  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title);
      setDescription(testCase.description || '');
      setStatus(testCase.status);
      setPriority(testCase.priority);
      setType(testCase.type);
      setFolderId(testCase.folderId);
    } else {
      setTitle('');
      setDescription('');
      setStatus('draft');
      setPriority('P3');
      setType('functional');
      setFolderId(null);
    }
    setError('');
  }, [testCase, open]);

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      type,
      folderId,
    });
    onOpenChange(false);
  };

  // Flatten folders for select
  const flatFolders: { id: string; name: string; level: number }[] = [];
  const flattenFolders = (nodes: TMFolderNode[], level = 0) => {
    nodes.forEach((folder) => {
      flatFolders.push({ id: folder.id, name: folder.name, level });
      if (folder.children) {
        flattenFolders(folder.children, level + 1);
      }
    });
  };
  flattenFolders(folders);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ borderRadius: '12px', maxWidth: '500px' }}>
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg bg-[rgba(37,99,235,0.1)]"
              style={{ width: '40px', height: '40px' }}
            >
              <FileText className="h-5 w-5 text-[#2563eb]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {isEdit ? 'Edit Test Case' : 'New Test Case'}
              </DialogTitle>
              <p className="text-sm text-[var(--text-3)]">
                {isEdit ? 'Update test case details' : 'Create a new test case'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-[#dc2626]">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter test case title"
              className="mt-1.5"
              autoFocus
            />
            {error && <p className="text-xs text-[#dc2626] mt-1">{error}</p>}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              className="mt-1.5 resize-none min-h-[80px]"
            />
          </div>

          {/* Row: Priority & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TestCasePriority)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1 - Critical</SelectItem>
                  <SelectItem value="P2">P2 - High</SelectItem>
                  <SelectItem value="P3">P3 - Medium</SelectItem>
                  <SelectItem value="P4">P4 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TestCaseType)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="edge">Edge Case</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="accessibility">Accessibility</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Status & Folder */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TestCaseStatus)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Folder</Label>
              <Select
                value={folderId || 'root'}
                onValueChange={(v) => setFolderId(v === 'root' ? null : v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root</SelectItem>
                  {flatFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {'—'.repeat(f.level)} {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white">
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TestCaseModal;
