/**
 * Bulk Assign Dialog
 * Assigns selected test cases to a team member
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onAssign: (assigneeId: string) => void;
}

// Mock team members - in real app, fetch from API
const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@example.com', role: 'QA Lead' },
  { id: '2', name: 'Mohammed Al-Rashid', email: 'm.alrashid@example.com', role: 'Senior QA' },
  { id: '3', name: 'Emily Watson', email: 'e.watson@example.com', role: 'QA Engineer' },
  { id: '4', name: 'James Rodriguez', email: 'j.rodriguez@example.com', role: 'QA Engineer' },
  { id: '5', name: 'Aisha Patel', email: 'a.patel@example.com', role: 'Test Analyst' },
  { id: '6', name: 'David Kim', email: 'd.kim@example.com', role: 'Automation Engineer' },
];

export function BulkAssignDialog({
  open,
  onOpenChange,
  selectedCount,
  onAssign,
}: BulkAssignDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const filteredMembers = TEAM_MEMBERS.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = () => {
    if (selectedMember) {
      onAssign(selectedMember);
      onOpenChange(false);
      setSelectedMember(null);
      setSearch('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            Assign Test Cases
          </DialogTitle>
          <DialogDescription>
            Assign {selectedCount} test case{selectedCount > 1 ? 's' : ''} to a team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Team Members List */}
          <ScrollArea className="h-[280px] -mx-6 px-6">
            <div className="space-y-1">
              {filteredMembers.map((member, index) => (
                <motion.button
                  key={member.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedMember(member.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                    "hover:bg-muted/70",
                    selectedMember === member.id && "bg-primary/10 ring-2 ring-primary"
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-xs">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{member.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                  </div>
                  {selectedMember === member.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedMember}>
            Assign to {selectedMember ? TEAM_MEMBERS.find(m => m.id === selectedMember)?.name.split(' ')[0] : '...'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
