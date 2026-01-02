/**
 * Issue Actions Menu
 * Dropdown menu with all issue actions (Clone, Move, Archive, Delete, Export, etc.)
 */

import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  Copy, 
  Move, 
  Archive, 
  Trash2, 
  FileDown,
  Search,
  FileSpreadsheet,
  FileText,
  FileCode,
  Flag,
  Link,
  ExternalLink,
  Bell,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface IssueActionsMenuProps {
  issueId: string;
  issueKey: string;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}

export function IssueActionsMenu({ issueId, issueKey, onAction }: IssueActionsMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleClone = () => {
    onAction('clone', { issueId });
    toast.success(`Cloning ${issueKey}...`);
  };

  const handleMove = () => {
    onAction('move', { issueId });
    toast.info('Move issue dialog coming soon');
  };

  const handleArchive = () => {
    onAction('archive', { issueId });
    toast.success(`${issueKey} archived`);
  };

  const handleDelete = () => {
    onAction('delete', { issueId });
    setShowDeleteDialog(false);
    toast.success(`${issueKey} deleted`);
  };

  const handleExport = (format: 'excel' | 'word' | 'xml') => {
    onAction('export', { issueId, format });
    toast.success(`Exporting ${issueKey} as ${format.toUpperCase()}...`);
  };

  const handleFindField = () => {
    onAction('find-field', { issueId });
    toast.info('Field finder coming soon');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/issue/${issueKey}`);
    toast.success('Link copied to clipboard');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleClone}>
            <Copy className="mr-2 h-4 w-4" />
            Clone issue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMove}>
            <Move className="mr-2 h-4 w-4" />
            Move issue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link className="mr-2 h-4 w-4" />
            Copy link
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('word')}>
                <FileText className="mr-2 h-4 w-4" />
                Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xml')}>
                <FileCode className="mr-2 h-4 w-4" />
                XML
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleFindField}>
            <Search className="mr-2 h-4 w-4" />
            Find your field
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Flag className="mr-2 h-4 w-4" />
            Flag issue
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Bell className="mr-2 h-4 w-4" />
            Watch issue
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Lock className="mr-2 h-4 w-4" />
            Restrict issue
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Archive issue
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete issue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {issueKey}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the issue
              and all associated comments, attachments, and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default IssueActionsMenu;
