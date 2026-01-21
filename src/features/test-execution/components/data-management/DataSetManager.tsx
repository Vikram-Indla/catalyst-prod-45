/**
 * Phase 5C: Data Set Manager Component
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Database,
  Shield,
  FileJson,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { useDataSets } from '../../hooks/useDataSets';
import { useAccessAudit } from '../../hooks/useAccessAudit';
import { DataSetForm } from './DataSetForm';
import type { TestDataSet } from '../../types/test-data-management';
import { format } from 'date-fns';

interface DataSetManagerProps {
  projectId?: string;
}

const dataTypeIcons: Record<string, React.ElementType> = {
  json: FileJson,
  csv: FileSpreadsheet,
  sql: FileCode,
};

export function DataSetManager({ projectId }: DataSetManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDataSet, setEditingDataSet] = useState<TestDataSet | null>(null);
  
  const { dataSets, isLoading, deleteDataSet, isDeleting } = useDataSets(projectId);
  const { logAccess } = useAccessAudit();

  const filteredDataSets = dataSets.filter(ds =>
    ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleView = async (dataSet: TestDataSet) => {
    await logAccess({ dataSetId: dataSet.id, action: 'view' });
    // Could open a preview modal here
  };

  const handleEdit = (dataSet: TestDataSet) => {
    setEditingDataSet(dataSet);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await logAccess({ dataSetId: id, action: 'delete' });
    await deleteDataSet(id);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDataSet(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Test Data Sets</CardTitle>
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Data Set
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search data sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary">
            {filteredDataSets.length} data sets
          </Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading data sets...</div>
        ) : filteredDataSets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No data sets match your search' : 'No data sets created yet'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sensitive</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDataSets.map((dataSet) => {
                const TypeIcon = dataTypeIcons[dataSet.data_type] || FileJson;
                return (
                  <TableRow key={dataSet.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{dataSet.name}</div>
                        {dataSet.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {dataSet.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {dataSet.data_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {dataSet.is_sensitive && (
                        <Badge variant="destructive" className="gap-1">
                          <Shield className="h-3 w-3" />
                          PII
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(dataSet.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(dataSet)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(dataSet)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(dataSet.id)}
                            className="text-destructive"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <DataSetForm
          open={isFormOpen}
          onClose={handleFormClose}
          dataSet={editingDataSet}
          projectId={projectId}
        />
      </CardContent>
    </Card>
  );
}
