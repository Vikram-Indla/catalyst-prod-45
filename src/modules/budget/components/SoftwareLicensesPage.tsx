/**
 * Software Licenses Management Page
 */

import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertCircle, DollarSign } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { 
  useSoftwareLicenses, 
  useLicenseStats, 
  useDeleteLicense,
  getDaysUntilRenewal,
  getRenewalStatusColor,
} from '../hooks/useSoftwareLicenses';
import { formatSAR } from '../hooks/useResourceCost';
import { LicenseDialog } from './LicenseDialog';
import type { SoftwareLicenseWithAllocation } from '../types';

export function SoftwareLicensesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<SoftwareLicenseWithAllocation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [licenseToDelete, setLicenseToDelete] = useState<string | null>(null);

  const { data: licenses = [], isLoading } = useSoftwareLicenses();
  const { data: stats } = useLicenseStats();
  const deleteLicense = useDeleteLicense();

  // Filter licenses
  const filteredLicenses = useMemo(() => {
    return licenses.filter(license => {
      const matchesSearch = !searchQuery || 
        license.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || license.allocation_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [licenses, searchQuery, statusFilter]);

  const handleCreate = () => {
    setEditingLicense(null);
    setDialogOpen(true);
  };

  const handleEdit = (license: SoftwareLicenseWithAllocation) => {
    setEditingLicense(license);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setLicenseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (licenseToDelete) {
      deleteLicense.mutate(licenseToDelete);
    }
    setDeleteDialogOpen(false);
    setLicenseToDelete(null);
  };

  const getLicenseTypeBadge = (type: string) => {
    if (type === 'monthly') {
      return <Badge variant="outline" className="text-purple-600 border-purple-300">Monthly</Badge>;
    }
    return <Badge variant="outline" className="text-blue-600 border-blue-300">Annual</Badge>;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 min-h-[72px] border-b bg-card px-6 py-4 flex items-center">
        <div className="flex items-center justify-between w-full gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Software Licenses</h1>
            <p className="text-sm text-muted-foreground truncate">Manage software licenses and track allocation</p>
          </div>
          <Button onClick={handleCreate} size="default" className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add License
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Licenses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatSAR(licenses.reduce((sum, l) => sum + l.annual_cost, 0))}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Cost/Year</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.renewals_soon || 0}</p>
                  <p className="text-sm text-muted-foreground">Renewals Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search licenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Allocation Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="complete">Fully Allocated</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="over">Over-allocated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Software</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead className="text-right">Seats</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredLicenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No licenses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLicenses.map((license) => {
                  const daysUntilRenewal = getDaysUntilRenewal(license.renewal_date);
                  const allocationPercent = Math.min(license.total_allocated, 100);
                  
                  return (
                    <TableRow key={license.id}>
                      <TableCell>
                        <span className="font-medium">{license.name}</span>
                      </TableCell>
                      <TableCell>{getLicenseTypeBadge(license.license_type)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {license.user_count || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-medium tabular-nums">{formatSAR(license.annual_cost / 12)}/mo</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatSAR(license.annual_cost)}/yr
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={allocationPercent} 
                            className="h-2 w-16"
                          />
                          <span className={`text-sm font-medium tabular-nums ${
                            license.allocation_status === 'complete' ? 'text-green-600' :
                            license.allocation_status === 'over' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {license.total_allocated}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {license.renewal_date ? (
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(license.renewal_date), 'MMM yyyy')}
                            </span>
                            {daysUntilRenewal !== null && (
                              <span className={`text-xs ${getRenewalStatusColor(daysUntilRenewal)}`}>
                                {daysUntilRenewal < 0 
                                  ? 'Expired'
                                  : daysUntilRenewal === 0 
                                  ? 'Today'
                                  : `${daysUntilRenewal}d`
                                }
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(license)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(license.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <LicenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        license={editingLicense}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete License</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this license? This action cannot be undone.
              Any existing allocations will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
