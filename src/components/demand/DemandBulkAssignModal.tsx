import { useState, useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DemandBulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assignee: string) => void;
  selectedCount: number;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

export function DemandBulkAssignModal({ isOpen, onClose, onConfirm, selectedCount }: DemandBulkAssignModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .limit(50);
      
      if (error) throw error;
      setUsers((data || []) as UserProfile[]);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  const handleConfirm = () => {
    if (selectedUser) {
      onConfirm(selectedUser.full_name || selectedUser.email);
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedUser(null);
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Requests</DialogTitle>
          <DialogDescription>
            Assign {selectedCount} selected request{selectedCount > 1 ? 's' : ''} to:
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <ScrollArea className="h-[300px] border rounded-md">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="p-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={cn(
                    "w-full p-3 flex items-center gap-3 rounded-md text-left",
                    "hover:bg-muted transition-colors",
                    selectedUser?.id === user.id && "bg-primary/10 border border-primary"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {user.full_name || 'Unnamed User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedUser}
          >
            Assign to {selectedUser?.full_name || selectedUser?.email || 'User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DemandBulkAssignModal;
