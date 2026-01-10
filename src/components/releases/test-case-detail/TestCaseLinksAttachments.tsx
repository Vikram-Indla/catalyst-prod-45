/**
 * Test Case Links & Attachments Component
 */

import { Plus, Upload, FileText, Bug, BookOpen, Image, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { linkedItems, attachments } from '@/data/testCaseDetailData';
import { cn } from '@/lib/utils';

const itemTypeConfig = {
  requirement: { icon: BookOpen, className: 'text-blue-600 bg-blue-50' },
  defect: { icon: Bug, className: 'text-red-600 bg-red-50' },
  story: { icon: FileText, className: 'text-purple-600 bg-purple-50' },
};

const fileTypeConfig: Record<string, { icon: typeof Image; className: string }> = {
  image: { icon: Image, className: 'text-pink-600 bg-pink-50' },
  excel: { icon: FileSpreadsheet, className: 'text-green-600 bg-green-50' },
  pdf: { icon: FileText, className: 'text-red-600 bg-red-50' },
};

export function TestCaseLinksAttachments() {
  return (
    <div className="space-y-6">
      {/* Linked Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">Linked Items</h4>
          <Button variant="ghost" size="sm" className="h-8">
            <Plus className="w-4 h-4 mr-1" />
            Add Link
          </Button>
        </div>

        <div className="space-y-2">
          {linkedItems.map((item) => {
            const config = itemTypeConfig[item.type as keyof typeof itemTypeConfig];
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer group"
              >
                <div className={cn('p-2 rounded-lg', config.className)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{item.id}</span>
                    <span className="text-sm text-foreground truncate">{item.title}</span>
                  </div>
                </div>
                {item.status && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    {item.status}
                  </Badge>
                )}
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Attachments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">Attachments</h4>
          <Button variant="ghost" size="sm" className="h-8">
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {attachments.map((att) => {
            const config = fileTypeConfig[att.type] || fileTypeConfig.pdf;
            const Icon = config.icon;

            return (
              <div
                key={att.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer group"
              >
                <div className={cn('p-2 rounded-lg', config.className)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{att.name}</p>
                  <p className="text-xs text-muted-foreground">{att.size}</p>
                </div>
              </div>
            );
          })}
        </div>

        {attachments.length === 0 && (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag & drop files or{' '}
              <span className="text-primary cursor-pointer hover:underline">browse</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
