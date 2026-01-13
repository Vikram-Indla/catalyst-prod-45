// ============================================================
// PLANNER CREATE TEAM MODAL
// Modal for creating new teams with name, emoji, color, members
// ============================================================

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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
import type { PlannerUser } from '../types';

interface PlannerCreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    emoji: string;
    color: string;
    memberIds: string[];
  }) => void;
  users: PlannerUser[];
}

const EMOJI_OPTIONS = ['📈', '⚙️', '🛡️', '🎯', '💡', '🚀', '📊', '🔧', '📝', '✨', '🔥', '💼'];

const COLOR_OPTIONS = [
  { value: '#2563eb', label: 'Blue' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#059669', label: 'Green' },
  { value: '#d97706', label: 'Orange' },
  { value: '#dc2626', label: 'Red' },
  { value: '#4f46e5', label: 'Indigo' },
];

export function PlannerCreateTeamModal({
  isOpen,
  onClose,
  onCreate,
  users,
}: PlannerCreateTeamModalProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📈');
  const [color, setColor] = useState('#2563eb');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreate({
      name: name.trim(),
      emoji,
      color,
      memberIds,
    });

    // Reset form
    setName('');
    setEmoji('📈');
    setColor('#2563eb');
    setMemberIds([]);
    onClose();
  };

  const handleAddMember = (userId: string) => {
    if (userId && !memberIds.includes(userId)) {
      setMemberIds([...memberIds, userId]);
    }
  };

  const handleRemoveMember = (userId: string) => {
    setMemberIds(memberIds.filter(id => id !== userId));
  };

  const availableUsers = users.filter(u => !memberIds.includes(u.id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Team</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-sm font-medium">
              Team Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name..."
              className="h-10"
              autoFocus
            />
          </div>

          {/* Emoji Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Emoji</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all",
                    emoji === e
                      ? "bg-blue-100 ring-2 ring-blue-500"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-blue-500"
                      : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Members</Label>
            
            {/* Selected members */}
            {memberIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {memberIds.map((id) => {
                  const user = users.find(u => u.id === id);
                  if (!user) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: color }}
                      >
                        {user.initials}
                      </div>
                      <span>{user.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add member dropdown */}
            {availableUsers.length > 0 && (
              <Select onValueChange={handleAddMember}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="+ Add member" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {user.initials}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: color }}
              >
                {emoji}
              </div>
              <span className="font-medium">{name || 'Team Name'}</span>
              <span className="text-sm text-muted-foreground">
                • {memberIds.length} member{memberIds.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Team
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
