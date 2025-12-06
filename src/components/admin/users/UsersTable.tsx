import { useState } from 'react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Search, MoreHorizontal, UserCog, Power, PowerOff, ShieldCheck, Trash2 } from 'lucide-react';
import { UserProfile, useUpdateUserStatus, useDeleteUser } from '@/hooks/useUsers';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ResponsiveTableWrapper } from '@/components/layout/ResponsivePageContainer';

interface UsersTableProps {
  users: UserProfile[];
  isLoading: boolean;
  onEditRoles?: (userId: string) => void;
  onEditPermissions?: (userId: string) => void;
}

export function UsersTable({ users, isLoading, onEditRoles, onEditPermissions }: UsersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  
  const updateStatus = useUpdateUserStatus();
  const deleteUser = useDeleteUser();

  // Get unique roles for filter dropdown
  const allRoles = [...new Set(users.flatMap(u => u.roles.map(r => r.role_name)))];

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesRole = roleFilter === 'all' || 
      user.roles.some(r => r.role_name === roleFilter);
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return '-';
    const date = new Date(lastLogin);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    }
    if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, yyyy');
  };

  const getInitials = (fullName: string | null) => {
    if (!fullName) return '??';
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700 hover:bg-green-100';
      case 'Inactive':
        return 'bg-muted text-muted-foreground hover:bg-muted';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
      default:
        return '';
    }
  };

  const handleStatusToggle = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    updateStatus.mutate({ userId, status: newStatus });
  };

  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUser.mutate(userToDelete.id);
      setUserToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>View and manage all users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User List</CardTitle>
        <CardDescription>View and manage all users in the system</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {allRoles.map(role => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <ResponsiveTableWrapper minWidth={700}>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Role(s)</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Last Login</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-gold/20 flex items-center justify-center text-xs font-medium text-brand-gold">
                        {getInitials(user.full_name)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{user.full_name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      {user.roles.length > 0 
                        ? user.roles.map(r => r.role_name).join(', ')
                        : <span className="text-muted-foreground">No roles</span>
                      }
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-muted-foreground">
                      {formatLastLogin(user.last_login)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", getStatusBadgeClass(user.status))}
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEditRoles && (
                            <DropdownMenuItem onClick={() => onEditRoles(user.id)}>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Edit Roles
                            </DropdownMenuItem>
                          )}
                          {onEditPermissions && (
                            <DropdownMenuItem onClick={() => onEditPermissions(user.id)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Edit Permissions
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusToggle(user.id, user.status)}>
                            {user.status === 'Active' ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          {user.status === 'Inactive' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTableWrapper>

        {filteredUsers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No users found matching your search criteria.
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>Showing {filteredUsers.length} of {users.length} users</span>
        </div>
      </CardContent>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove <strong>{userToDelete?.full_name || userToDelete?.email}</strong> from the system? 
              This action cannot be undone and will delete all associated data including roles and permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
