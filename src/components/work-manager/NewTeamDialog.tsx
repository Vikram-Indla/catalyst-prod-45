// src/components/work-manager/NewTeamDialog.tsx
// Dialog for creating a new team

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { Team, User } from './types';

interface NewTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onCreateTeam: (team: Omit<Team, 'id'>) => void;
}

export function NewTeamDialog({ open, onOpenChange, users, onCreateTeam }: NewTeamDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const toggleMember = (userId: string) => {
    setMemberIds(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateTeam({
      name: name.trim(),
      description: description.trim() || undefined,
      memberIds,
      color: 'olive',
    });

    setName('');
    setDescription('');
    setMemberIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create New Team</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team name *</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Portfolio PMO"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-desc">Description</Label>
            <Textarea
              id="team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this team do?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Members</Label>
            <div className="max-h-[220px] overflow-auto rounded-md border border-border p-3 space-y-2">
              {sortedUsers.map((u) => {
                const checked = memberIds.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-3 text-sm cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={() => toggleMember(u.id)} />
                    <span className="font-medium">{u.name}</span>
                    <span className="text-muted-foreground">{u.role}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
