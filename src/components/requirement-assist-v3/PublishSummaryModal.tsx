// ============================================================
// PUBLISH SUMMARY MODAL
// Shows what was published with generated keys
// ============================================================

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { WorkItem } from '@/stores/requirementAssistStore';
import toast from 'react-hot-toast';

interface PublishedItem {
  key: string;
  type: string;
  title: string;
}

interface PublishSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  publishedItems: PublishedItem[];
  programName: string;
  projectName: string;
  publishedAt: string;
}

export function PublishSummaryModal({
  isOpen,
  onClose,
  publishedItems,
  programName,
  projectName,
  publishedAt,
}: PublishSummaryModalProps) {
  const handleCopyKeys = () => {
    const keys = publishedItems.map(item => item.key).join('\n');
    navigator.clipboard.writeText(keys);
    toast.success('Keys copied to clipboard');
  };

  const handleViewInBacklog = () => {
    // TODO: Navigate to backlog
    toast.success('Opening backlog...');
    onClose();
  };

  // Type colors
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'epic': return 'text-violet-600 bg-violet-50';
      case 'feature': return 'text-teal-600 bg-teal-50';
      case 'story': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
            Published Successfully
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-500">Program:</span>{' '}
              <span className="font-medium text-slate-900">{programName}</span>
            </div>
            <div>
              <span className="text-slate-500">Project:</span>{' '}
              <span className="font-medium text-slate-900">{projectName}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Published:</span>{' '}
              <span className="font-medium text-slate-900">{publishedAt}</span>
            </div>
          </div>

          {/* Items table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Key</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {publishedItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-blue-600 font-medium">
                      {item.key}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 truncate max-w-[200px] text-slate-700">
                      {item.title}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500 text-center">
            {publishedItems.length} item{publishedItems.length > 1 ? 's' : ''} published to backlog
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCopyKeys} className="gap-2">
            <Copy className="w-4 h-4" />
            Copy Keys
          </Button>
          <Button variant="outline" onClick={handleViewInBacklog} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            View in Backlog
          </Button>
          <Button onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
