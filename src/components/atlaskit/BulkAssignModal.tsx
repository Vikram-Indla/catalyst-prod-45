import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assignee: string) => void;
  selectedCount: number;
}

interface User {
  id: string;
  email: string;
  display_name: string | null;
}

export function BulkAssignModal({ isOpen, onClose, onConfirm, selectedCount }: BulkAssignModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
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
      setUsers((data || []).map(u => ({
        id: u.id,
        email: u.email || '',
        display_name: u.full_name || null,
      })));
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
      user.display_name?.toLowerCase().includes(query)
    );
  });

  const handleConfirm = () => {
    if (selectedUser) {
      onConfirm(selectedUser.display_name || selectedUser.email);
      onClose();
      setSelectedUser(null);
      setSearchQuery('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Requests</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="mb-4 text-muted-foreground text-sm">
            Assign {selectedCount} selected request{selectedCount > 1 ? 's' : ''} to:
          </p>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <ScrollArea className="h-[300px] rounded-md border">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full p-3 flex items-center gap-2 border-b border-border text-left transition-colors hover:bg-muted/50 ${
                    selectedUser?.id === user.id ? 'bg-accent' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm font-semibold">
                      {(user.display_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {user.display_name || 'Unnamed User'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedUser}>
            Assign to {selectedUser?.display_name || selectedUser?.email || 'User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkAssignModal;
