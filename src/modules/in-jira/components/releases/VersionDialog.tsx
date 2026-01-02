/**
 * Version Create/Edit Dialog
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { VersionWithProgress } from '../../hooks/useVersions';

interface VersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version?: VersionWithProgress | null;
  onSave: (data: {
    name: string;
    description?: string;
    startDate?: string;
    releaseDate?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function VersionDialog({
  open,
  onOpenChange,
  version,
  onSave,
  isLoading,
}: VersionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [releaseDate, setReleaseDate] = useState('');

  const isEditing = !!version;

  useEffect(() => {
    if (version) {
      setName(version.name);
      setDescription(version.description || '');
      setStartDate(version.startDate || '');
      setReleaseDate(version.releaseDate || '');
    } else {
      setName('');
      setDescription('');
      setStartDate('');
      setReleaseDate('');
    }
  }, [version, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      startDate: startDate || undefined,
      releaseDate: releaseDate || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {isEditing ? 'Edit Version' : 'Create Version'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update the version details below.'
                : 'Create a new version to track your release.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., v2.5.0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this release..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="releaseDate" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Release Date
                </Label>
                <Input
                  id="releaseDate"
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Version'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
