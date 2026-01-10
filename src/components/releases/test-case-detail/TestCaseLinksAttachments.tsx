/**
 * Test Case Links & Attachments Component
 */

import { useState } from 'react';
import { Plus, Upload, FileText, Bug, BookOpen, Image, FileSpreadsheet, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { linkedItems as initialLinkedItems, attachments as initialAttachments } from '@/data/testCaseDetailData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LinkedItem {
  type: string;
  id: string;
  title: string;
  status: string | null;
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

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

const mockSearchResults = [
  { type: 'requirement', id: 'REQ-099', title: 'Password complexity requirements' },
  { type: 'defect', id: 'DEF-045', title: 'Login fails on Safari browser' },
  { type: 'story', id: 'US-201', title: 'As a user, I want to reset my password' },
  { type: 'requirement', id: 'REQ-102', title: 'Session timeout requirements' },
];

export function TestCaseLinksAttachments() {
  const [linkedItems, setLinkedItems] = useState<LinkedItem[]>(initialLinkedItems);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkType, setLinkType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<typeof mockSearchResults[0] | null>(null);

  const filteredResults = mockSearchResults.filter(item => 
    (!linkType || item.type === linkType) &&
    (!searchQuery || item.id.toLowerCase().includes(searchQuery.toLowerCase()) || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddLink = () => {
    if (selectedItem) {
      const newLink: LinkedItem = {
        type: selectedItem.type,
        id: selectedItem.id,
        title: selectedItem.title,
        status: null,
      };
      setLinkedItems([...linkedItems, newLink]);
      setIsLinkModalOpen(false);
      setSelectedItem(null);
      setSearchQuery('');
      setLinkType('');
      toast.success(`Linked ${selectedItem.id} successfully`);
    }
  };

  const handleRemoveLink = (id: string) => {
    setLinkedItems(linkedItems.filter(item => item.id !== id));
    toast.success('Link removed');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter(att => att.id !== id));
    toast.success('Attachment removed');
  };

  return (
    <div className="space-y-6">
      {/* Linked Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">Linked Items</h4>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setIsLinkModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Link
          </Button>
        </div>

        <div className="space-y-2">
          {linkedItems.map((item) => {
            const config = itemTypeConfig[item.type as keyof typeof itemTypeConfig];
            const Icon = config?.icon || FileText;

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className={cn('p-2 rounded-lg', config?.className || 'text-gray-600 bg-gray-50')}>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveLink(item.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
              </div>
            );
          })}
        </div>

        {linkedItems.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No linked items. Click "Add Link" to link requirements, defects, or stories.
          </div>
        )}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveAttachment(att.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
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

      {/* Add Link Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Item Type</label>
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="requirement">Requirement</SelectItem>
                  <SelectItem value="defect">Defect</SelectItem>
                  <SelectItem value="story">User Story</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Search Items</label>
              <Input 
                placeholder="Search by ID or title..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="border rounded-lg divide-y max-h-48 overflow-auto">
              {filteredResults.map((item) => (
                <div 
                  key={item.id}
                  className={cn(
                    "p-3 hover:bg-muted cursor-pointer transition-colors",
                    selectedItem?.id === item.id && "bg-primary/10"
                  )}
                  onClick={() => setSelectedItem(item)}
                >
                  <span className="text-sm font-medium text-primary">{item.id}</span>
                  <span className="text-sm text-muted-foreground ml-2">- {item.title}</span>
                </div>
              ))}
              {filteredResults.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No items found
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLink} disabled={!selectedItem}>Add Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
