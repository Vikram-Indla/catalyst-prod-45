import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, AlertTriangle } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lozenge } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import { getStatusLabel } from '@/types/approval';

interface AddApproverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (approverId: string, isVeto: boolean, stepOrder: number, dueDate?: string) => void;
  fromStatus: string;
  toStatus: string;
  existingVeto: boolean;
  existingApproverIds: string[];
  nextStepOrder: number;
}

export function AddApproverModal({
  isOpen,
  onClose,
  onAdd,
  fromStatus,
  toStatus,
  existingVeto,
  existingApproverIds,
  nextStepOrder,
}: AddApproverModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isVeto, setIsVeto] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [stepOrder, setStepOrder] = useState(nextStepOrder);

  const { data: users = [] } = useQuery({
    queryKey: ['profiles-for-approvers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const notAlreadyAdded = !existingApproverIds.includes(user.id);
    return matchesSearch && notAlreadyAdded;
  });

  const handleAdd = () => {
    if (!selectedUserId) return;
    onAdd(selectedUserId, isVeto, stepOrder, dueDate || undefined);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedUserId(null);
    setIsVeto(false);
    setDueDate('');
    setStepOrder(nextStepOrder);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Approver</DialogTitle>
        </DialogHeader>

        {/* Transition Context */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-2">Adding approver for transition:</p>
          <div className="flex items-center gap-2">
            <Lozenge appearance="default">
              {getStatusLabel(fromStatus)}
            </Lozenge>
            <span className="text-muted-foreground">→</span>
            <Lozenge appearance="default">
              {getStatusLabel(toStatus)}
            </Lozenge>
          </div>
        </div>

        {/* User Search */}
        <div className="space-y-2">
          <Label>Select Approver</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
            {filteredUsers.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                No users found
              </p>
            ) : (
              filteredUsers.map(user => {
                const initials = user.full_name
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase() || '??';
                  
                return (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedUserId === user.id ? 'bg-primary/5' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="approver"
                      checked={selectedUserId === user.id}
                      onChange={() => setSelectedUserId(user.id)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedUserId === user.id 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground'
                    }`}>
                      {selectedUserId === user.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name}</p>
                      {user.role && (
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label>Due Date (Optional)</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Step Order */}
        <div className="space-y-2">
          <Label>Step Position</Label>
          <Input
            type="number"
            min={1}
            value={stepOrder}
            onChange={(e) => setStepOrder(parseInt(e.target.value) || 1)}
          />
        </div>

        {/* Veto Option */}
        <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-start gap-3">
            <Checkbox
              id="veto"
              checked={isVeto}
              onCheckedChange={(checked) => setIsVeto(!!checked)}
            />
            <div className="space-y-1">
              <label htmlFor="veto" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                Grant Veto Power
                <Lozenge appearance="moved">
                  VETO
                </Lozenge>
              </label>
              <p className="text-xs text-muted-foreground">
                Veto approval immediately unlocks the transition, overriding all other approvals.
              </p>
            </div>
          </div>

          {existingVeto && isVeto && (
            <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 text-amber-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                Another approver already has veto power. Setting this will transfer veto to the new approver.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdd}
            disabled={!selectedUserId}
            className="bg-primary hover:bg-primary/90"
          >
            Add Approver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
