import { useState } from 'react';
import { useBoardUsers, useAddBoardUser } from '@/hooks/useKanbanBoards';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BoardUserRole } from '@/types/kanban.types';

interface ManageUsersTabProps {
  boardId: string;
}

const USER_ROLES: { value: BoardUserRole; label: string; description: string }[] = [
  { value: 'Admin', label: 'Admin', description: 'Full access to setup and functions' },
  { value: 'Edit Boards', label: 'Edit Boards', description: 'Permission to change board layout' },
  { value: 'Manage Cards', label: 'Manage Cards', description: 'Permission to edit cards' },
  { value: 'View Cards', label: 'View Cards', description: 'View access only' },
];

export function ManageUsersTab({ boardId }: ManageUsersTabProps) {
  const { data: boardUsers = [] } = useBoardUsers(boardId);
  const addBoardUser = useAddBoardUser();
  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <div className="space-y-6">
      {/* Add User Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">Board Users</h3>
            <p className="text-sm text-muted-foreground">
              Manage who has access to this board and their permissions
            </p>
          </div>
          <Button
            onClick={() => setShowAddUser(!showAddUser)}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {showAddUser && (
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user1">TODO: Load Users</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              >
                Add User
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddUser(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* User Role Descriptions */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">User Roles</h3>
        <div className="space-y-3">
          {USER_ROLES.map((role) => (
            <div key={role.value} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
              <Badge variant="outline" className="mt-0.5">
                {role.label}
              </Badge>
              <p className="text-sm text-muted-foreground flex-1">{role.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Current Users List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Current Users</h3>
          <Badge variant="secondary">{boardUsers.length} users</Badge>
        </div>

        {boardUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No users assigned yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {boardUsers.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-brand-gold text-white text-xs">
                        {user.profiles?.full_name?.substring(0, 2).toUpperCase() || 'UN'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {user.profiles?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.profiles?.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{user.role}</Badge>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
