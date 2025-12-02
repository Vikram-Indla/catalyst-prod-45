// ==============================================
// MANAGE IDEATION USERS PAGE
// Per Jira Align "Manage External Users" spec
// ==============================================

import { useState } from 'react';
import { Users, Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useIdeationExternalUsers, useUpdateExternalUser, type ExternalUserFilters } from '@/hooks/useIdeationExternalUsers';
import { useIdeaGroups } from '@/hooks/useIdeation';
import { format } from 'date-fns';
import type { IdeationExternalUser } from '@/types/ideation';

export default function ManageIdeationUsersPage() {
  const [filters, setFilters] = useState<ExternalUserFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IdeationExternalUser | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Temporary filter state for dialog
  const [tempGroupId, setTempGroupId] = useState<string>('');
  const [tempShowDisabled, setTempShowDisabled] = useState(false);

  const { data: users = [], isLoading } = useIdeationExternalUsers(filters);
  const { data: groups = [] } = useIdeaGroups(false);
  const updateUser = useUpdateExternalUser();

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput }));
  };

  const handleApplyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      groupId: tempGroupId || undefined,
      showDisabled: tempShowDisabled,
    }));
    setFilterDialogOpen(false);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchInput('');
    setTempGroupId('');
    setTempShowDisabled(false);
  };

  const handleUserClick = (user: IdeationExternalUser) => {
    setSelectedUser(user);
    setDetailPanelOpen(true);
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!selectedUser) return;
    await updateUser.mutateAsync({ id: selectedUser.id, is_enabled: enabled });
    setSelectedUser((prev) => (prev ? { ...prev, is_enabled: enabled } : null));
  };

  const getGroupNames = (groupIds: string[]) => {
    return groupIds
      .map((id) => groups.find((g) => g.id === id)?.name || id)
      .join(', ');
  };

  const hasActiveFilters = filters.search || filters.groupId || filters.showDisabled;

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-brand-gold" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold truncate">
            Manage Ideation Users
          </h1>
          <p className="text-muted-foreground">
            View and manage external users who have signed up for ideation campaigns
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by UID, name, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSearch}>
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setTempGroupId(filters.groupId || '');
              setTempShowDisabled(filters.showDisabled || false);
              setFilterDialogOpen(true);
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.search && (
            <Badge variant="secondary">Search: {filters.search}</Badge>
          )}
          {filters.groupId && (
            <Badge variant="secondary">
              Group: {groups.find((g) => g.id === filters.groupId)?.name || filters.groupId}
            </Badge>
          )}
          {filters.showDisabled && (
            <Badge variant="secondary">Including disabled users</Badge>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">UID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Registered Groups</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No external users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleUserClick(user)}
                >
                  <TableCell className="font-mono text-xs">
                    {user.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {user.registered_group_ids.length > 0
                      ? getGroupNames(user.registered_group_ids)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_enabled ? 'default' : 'secondary'}>
                      {user.is_enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ideation Group</Label>
              <Select value={tempGroupId} onValueChange={setTempGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="All groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Disabled Users</Label>
              <Switch
                checked={tempShowDisabled}
                onCheckedChange={setTempShowDisabled}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Panel */}
      <Sheet open={detailPanelOpen} onOpenChange={setDetailPanelOpen}>
        <SheetContent className="w-full sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
          </SheetHeader>
          {selectedUser && (
            <div className="space-y-6 mt-6">
              <div>
                <Label className="text-muted-foreground text-xs">UID</Label>
                <p className="font-mono text-sm">{selectedUser.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">First Name</Label>
                <p className="text-sm">{selectedUser.first_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Last Name</Label>
                <p className="text-sm">{selectedUser.last_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="text-sm">{selectedUser.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Registered Ideation Portals</Label>
                {selectedUser.registered_group_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedUser.registered_group_ids.map((gid) => (
                      <Badge key={gid} variant="outline" className="text-xs">
                        {groups.find((g) => g.id === gid)?.name || gid.slice(0, 8)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Last Login</Label>
                <p className="text-sm">
                  {selectedUser.last_login_at
                    ? format(new Date(selectedUser.last_login_at), 'PPp')
                    : 'Never'}
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label>Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Disabling prevents login but preserves ideas
                  </p>
                </div>
                <Switch
                  checked={selectedUser.is_enabled}
                  onCheckedChange={handleToggleEnabled}
                  disabled={updateUser.isPending}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
