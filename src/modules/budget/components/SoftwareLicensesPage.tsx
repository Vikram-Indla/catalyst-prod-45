/**
 * Software Licenses Management Page
 */

import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertCircle } from 'lucide-react';
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
import type { SoftwareLicenseWithAllocation, LicenseCategory } from '../types';
import { LICENSE_CATEGORIES } from '../types';

export function SoftwareLicensesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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
        license.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        license.vendor.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || license.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || license.allocation_status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [licenses, searchQuery, categoryFilter, statusFilter]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Fully Allocated</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Partial</Badge>;
      case 'over':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Over-allocated</Badge>;
      default:
        return null;
    }
  };

  const getLicenseTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      annual: 'bg-blue-100 text-blue-700',
      monthly: 'bg-purple-100 text-purple-700',
      consumption: 'bg-orange-100 text-orange-700',
      perpetual: 'bg-green-100 text-green-700',
    };
    return <Badge className={colors[type] || 'bg-gray-100 text-gray-700'}>{type}</Badge>;
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
        <div className="grid grid-cols-4 gap-4">
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
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.fully_allocated || 0}</p>
                  <p className="text-sm text-muted-foreground">Fully Allocated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.partially_allocated || 0}</p>
                  <p className="text-sm text-muted-foreground">Partial Allocation</p>
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
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {LICENSE_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
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
                <TableHead>Software</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Annual Cost</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredLicenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                        <div className="flex flex-col">
                          <span className="font-medium">{license.name}</span>
                          {license.category && (
                            <span className="text-xs text-muted-foreground capitalize">
                              {license.category.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{license.vendor}</Badge>
                      </TableCell>
                      <TableCell>{getLicenseTypeBadge(license.license_type)}</TableCell>
                      <TableCell className="text-right">
                        {license.user_count || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-medium">{formatSAR(license.annual_cost)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatSAR(license.annual_cost / 12)}/mo
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={allocationPercent} 
                              className="h-2 w-20"
                            />
                            <span className={`text-sm font-medium ${
                              license.allocation_status === 'complete' ? 'text-green-600' :
                              license.allocation_status === 'over' ? 'text-red-600' :
                              'text-yellow-600'
                            }`}>
                              {license.total_allocated}%
                            </span>
                          </div>
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
                                  : `${daysUntilRenewal} days`
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
