/**
 * Quick Actions Panel - Right sidebar with bulk actions, evidence, defects, and comments
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Upload,
  Image,
  Bug,
  Plus,
  MessageSquare,
  Trash2,
  File,
} from 'lucide-react';
import type { ExecutionStatus } from '../../../api/types';

interface QuickActionsPanelProps {
  onBulkStatus: (status: ExecutionStatus | 'reset') => void;
  onLogDefect: () => void;
  onAddComment?: (comment: string) => void;
  onUploadEvidence?: (files: File[]) => void;
  defects?: Array<{ key: string; title: string; status: string }>;
  uploadedFiles?: Array<{ name: string; size: number }>;
  isUpdating?: boolean;
}

export function QuickActionsPanel({
  onBulkStatus,
  onLogDefect,
  onAddComment,
  onUploadEvidence,
  defects = [],
  uploadedFiles = [],
  isUpdating = false,
}: QuickActionsPanelProps) {
  const [comment, setComment] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (onUploadEvidence && e.dataTransfer.files.length > 0) {
      onUploadEvidence(Array.from(e.dataTransfer.files));
    }
  }, [onUploadEvidence]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUploadEvidence && e.target.files && e.target.files.length > 0) {
      onUploadEvidence(Array.from(e.target.files));
    }
  }, [onUploadEvidence]);

  const handleAddComment = () => {
    if (comment.trim() && onAddComment) {
      onAddComment(comment.trim());
      setComment('');
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
        </div>

        {/* Bulk Status Buttons */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Set All Steps
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="bg-teal-500 hover:bg-teal-600 text-white gap-1.5"
              onClick={() => onBulkStatus('passed')}
              disabled={isUpdating}
            >
              <Check className="h-3.5 w-3.5" />
              All Pass
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => onBulkStatus('failed')}
              disabled={isUpdating}
            >
              <X className="h-3.5 w-3.5" />
              All Fail
            </Button>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
              onClick={() => onBulkStatus('blocked')}
              disabled={isUpdating}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Blocked
            </Button>
            <Button
              size="sm"
              className="bg-muted-foreground hover:bg-muted-foreground/90 text-white gap-1.5"
              onClick={() => onBulkStatus('reset')}
              disabled={isUpdating}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Evidence Upload */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Evidence
          </label>
          
          {/* Dropzone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/30 hover:border-primary hover:bg-primary/5'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('evidence-upload')?.click()}
          >
            <input
              id="evidence-upload"
              type="file"
              multiple
              className="hidden"
              accept="image/*,video/*,.pdf,.txt,.log"
              onChange={handleFileSelect}
            />
            <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Drop files or click to upload
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Screenshots, videos, logs
            </p>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-1.5">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg group"
                >
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-foreground flex-1 truncate">
                    {file.name}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Defects Section */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Defects
          </label>
          
          <Button
            variant="outline"
            className="w-full justify-center gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={onLogDefect}
          >
            <Plus className="h-3.5 w-3.5" />
            <Bug className="h-3.5 w-3.5" />
            Log Defect
          </Button>

          {/* Linked Defects */}
          {defects.length > 0 ? (
            <div className="space-y-1.5">
              {defects.map((defect, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 border rounded-lg"
                >
                  <Badge variant="outline" className="font-mono bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                    {defect.key}
                  </Badge>
                  <span className="text-xs text-foreground flex-1 truncate">
                    {defect.title}
                  </span>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-[9px]">
                    {defect.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center text-muted-foreground py-2">
              No defects logged yet
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Comments Section */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Comments
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="resize-none text-sm"
            rows={3}
          />
          <Button
            size="sm"
            className="w-full"
            onClick={handleAddComment}
            disabled={!comment.trim()}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Add Comment
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
