/**
 * Caty Admin Page - AI Governance
 * /admin/Caty
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAiGovernance, useAiGovernanceAdmin } from '@/hooks/useAiGovernance';
import { testPhraseMatcher } from '@/lib/ai/governed-query-planner';
// AdminLayout is used as a route wrapper, not imported here
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Bot, Route, Database, BookOpen, Shield, History, 
  Plus, Pencil, Trash2, Save, X, AlertTriangle, Check,
  ChevronRight, Search, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AiContract,
  AiRouteScope,
  AiTableAllowlist,
  AiSemanticDictionary,
  AiPolicy,
  AiGovernanceAuditLog,
  SemanticResolution
} from '@/types/ai-governance';

export default function CatyPage() {
  const [activeTab, setActiveTab] = useState('contracts');
  
  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Caty AI Governance</h1>
              <p className="text-sm text-muted-foreground">Manage AI contracts, scopes, and semantic mappings</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Contracts</span>
            </TabsTrigger>
            <TabsTrigger value="routes" className="flex items-center gap-2">
              <Route className="w-4 h-4" />
              <span className="hidden sm:inline">Route Scope</span>
            </TabsTrigger>
            <TabsTrigger value="tables" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Tables & Fields</span>
            </TabsTrigger>
            <TabsTrigger value="semantics" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Semantic Dictionary</span>
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Policies</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            <ContractsTab />
          </TabsContent>
          <TabsContent value="routes">
            <RouteScopesTab />
          </TabsContent>
          <TabsContent value="tables">
            <TablesTab />
          </TabsContent>
          <TabsContent value="semantics">
            <SemanticsTab />
          </TabsContent>
          <TabsContent value="policies">
            <PoliciesTab />
          </TabsContent>
          <TabsContent value="audit">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </div>
  );
}

// Contracts Tab
function ContractsTab() {
  const { contract, isLoading } = useAiGovernance('capacity');
  const { updateContract } = useAiGovernanceAdmin();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<AiContract>>({});

  useEffect(() => {
    if (contract) {
      setFormData(contract);
    }
  }, [contract]);

  const handleSave = async () => {
    if (!contract) return;
    try {
      await updateContract.mutateAsync({ id: contract.id, ...formData });
      toast.success('Contract updated');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update contract');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!contract) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h3 className="text-lg font-medium">No Contract Found</h3>
          <p className="text-muted-foreground">Create a contract to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Capacity Planner AI Contract</CardTitle>
            <CardDescription>Manage the AI contract configuration</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateContract.isPending}>
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            {editing ? (
              <Input 
                value={formData.name || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            ) : (
              <p className="text-sm font-medium">{contract.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Domain</Label>
            {editing ? (
              <Input 
                value={formData.domain || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
              />
            ) : (
              <Badge variant="secondary">{contract.domain}</Badge>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            {editing ? (
              <Textarea 
                value={formData.description || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{contract.description}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-2">
              <Switch 
                checked={editing ? formData.is_active : contract.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                disabled={!editing}
              />
              <span className="text-sm">{(editing ? formData.is_active : contract.is_active) ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Route Scopes Tab
function RouteScopesTab() {
  const { contract, routeScopes, isLoading } = useAiGovernance('capacity');
  const { createRouteScope, updateRouteScope, deleteRouteScope } = useAiGovernanceAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<AiRouteScope | null>(null);
  const [formData, setFormData] = useState<Partial<AiRouteScope>>({});

  const handleSave = async () => {
    if (!contract) return;
    try {
      if (editingScope) {
        await updateRouteScope.mutateAsync({ id: editingScope.id, ...formData });
        toast.success('Route scope updated');
      } else {
        await createRouteScope.mutateAsync({ contract_id: contract.id, ...formData });
        toast.success('Route scope created');
      }
      setDialogOpen(false);
      setEditingScope(null);
      setFormData({});
    } catch (error) {
      toast.error('Failed to save route scope');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this route scope?')) return;
    try {
      await deleteRouteScope.mutateAsync(id);
      toast.success('Route scope deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (scope: AiRouteScope) => {
    setEditingScope(scope);
    setFormData(scope);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingScope(null);
    setFormData({ route: '', allowed_intents: [], is_active: true });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Route Scopes</CardTitle>
              <CardDescription>Define which routes the AI can serve</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Add Route
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Allowed Intents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routeScopes.map((scope) => (
                <TableRow key={scope.id}>
                  <TableCell className="font-mono text-sm">{scope.route}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {scope.allowed_intents.map((intent) => (
                        <Badge key={intent} variant="outline" className="text-xs">
                          {intent}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={scope.is_active ? 'default' : 'secondary'}>
                      {scope.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(scope)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(scope.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {routeScopes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No route scopes configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingScope ? 'Edit Route Scope' : 'Add Route Scope'}</DialogTitle>
            <DialogDescription>Configure route access for the AI</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Route Path</Label>
              <Input 
                placeholder="/enterprise/capacity"
                value={formData.route || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, route: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Allowed Intents (comma-separated)</Label>
              <Input 
                placeholder="contract_end_date, availability, allocation_summary"
                value={formData.allowed_intents?.join(', ') || ''} 
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  allowed_intents: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.is_active ?? true}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Tables Tab
function TablesTab() {
  const { contract, tableAllowlist, isLoading } = useAiGovernance('capacity');
  const { createTableEntry, updateTableEntry, deleteTableEntry } = useAiGovernanceAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<AiTableAllowlist | null>(null);
  const [formData, setFormData] = useState<Partial<AiTableAllowlist>>({});

  const handleSave = async () => {
    if (!contract) return;
    try {
      if (editingTable) {
        await updateTableEntry.mutateAsync({ id: editingTable.id, ...formData });
        toast.success('Table entry updated');
      } else {
        await createTableEntry.mutateAsync({ contract_id: contract.id, ...formData });
        toast.success('Table entry created');
      }
      setDialogOpen(false);
      setEditingTable(null);
      setFormData({});
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this table entry?')) return;
    try {
      await deleteTableEntry.mutateAsync(id);
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (table: AiTableAllowlist) => {
    setEditingTable(table);
    setFormData(table);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingTable(null);
    setFormData({ table_name: '', allowed_columns: [], pii_level: 'none', is_active: true });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Table Allowlist</CardTitle>
              <CardDescription>Define which tables and columns the AI can query</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Add Table
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Allowed Columns</TableHead>
                <TableHead>PII Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableAllowlist.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-mono text-sm">{table.table_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {table.allowed_columns.slice(0, 5).map((col) => (
                        <Badge key={col} variant="outline" className="text-xs">
                          {col}
                        </Badge>
                      ))}
                      {table.allowed_columns.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{table.allowed_columns.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={table.pii_level === 'high' ? 'destructive' : table.pii_level === 'low' ? 'secondary' : 'outline'}>
                      {table.pii_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={table.is_active ? 'default' : 'secondary'}>
                      {table.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(table)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(table.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table Entry' : 'Add Table Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Table Name</Label>
                <Input 
                  placeholder="resource_inventory"
                  value={formData.table_name || ''} 
                  onChange={(e) => setFormData(prev => ({ ...prev, table_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>PII Level</Label>
                <Select 
                  value={formData.pii_level || 'none'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, pii_level: v as 'none' | 'low' | 'high' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Allowed Columns (comma-separated)</Label>
              <Textarea 
                placeholder="id, name, contract_end_date, department_id"
                value={formData.allowed_columns?.join(', ') || ''} 
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  allowed_columns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.is_active ?? true}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Semantics Tab
function SemanticsTab() {
  const { contract, semanticDictionary, isLoading } = useAiGovernance('capacity');
  const { createSemanticEntry, updateSemanticEntry, deleteSemanticEntry } = useAiGovernanceAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AiSemanticDictionary | null>(null);
  const [formData, setFormData] = useState<Partial<AiSemanticDictionary>>({});
  const [testPhrase, setTestPhrase] = useState('');
  const [testResult, setTestResult] = useState<{ matches: any[]; chosen?: any } | null>(null);

  const handleTest = () => {
    if (!testPhrase) return;
    const result = testPhraseMatcher(testPhrase, semanticDictionary);
    setTestResult(result);
  };

  const handleSave = async () => {
    if (!contract) return;
    try {
      if (editingEntry) {
        await updateSemanticEntry.mutateAsync({ id: editingEntry.id, ...formData });
        toast.success('Entry updated');
      } else {
        await createSemanticEntry.mutateAsync({ contract_id: contract.id, ...formData });
        toast.success('Entry created');
      }
      setDialogOpen(false);
      setEditingEntry(null);
      setFormData({});
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteSemanticEntry.mutateAsync(id);
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (entry: AiSemanticDictionary) => {
    setEditingEntry(entry);
    setFormData(entry);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingEntry(null);
    setFormData({ 
      canonical_concept: '', 
      ui_label: '', 
      synonyms: [], 
      resolution: [], 
      threshold: 0.78,
      is_active: true 
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Test Phrase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Test Phrase Matcher
          </CardTitle>
          <CardDescription>Test how phrases are matched to semantic concepts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="e.g., contract end date"
              value={testPhrase}
              onChange={(e) => setTestPhrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
            />
            <Button onClick={handleTest}>
              <Search className="w-4 h-4 mr-1" /> Test
            </Button>
          </div>
          {testResult && (
            <div className="p-4 rounded-lg bg-muted space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Matches:</span>
                {testResult.matches.length === 0 && (
                  <span className="text-sm text-muted-foreground">No matches found</span>
                )}
              </div>
              {testResult.matches.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant={i === 0 ? 'default' : 'outline'}>{m.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(m.confidence * 100)}% confidence
                  </span>
                </div>
              ))}
              {testResult.chosen && (
                <div className="pt-2 border-t">
                  <span className="text-sm">
                    <strong>Chosen:</strong>{' '}
                    <code className="text-xs bg-background px-1 py-0.5 rounded">
                      {testResult.chosen.table}.{testResult.chosen.column}
                    </code>
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dictionary Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Semantic Dictionary</CardTitle>
              <CardDescription>Map natural language to database fields</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concept</TableHead>
                <TableHead>UI Label</TableHead>
                <TableHead>Synonyms</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semanticDictionary.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">{entry.canonical_concept}</TableCell>
                  <TableCell>{entry.ui_label}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {entry.synonyms.slice(0, 3).map((syn) => (
                        <Badge key={syn} variant="outline" className="text-xs">
                          {syn}
                        </Badge>
                      ))}
                      {entry.synonyms.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{entry.synonyms.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {entry.resolution[0]?.table}.{entry.resolution[0]?.column}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.is_active ? 'default' : 'secondary'}>
                      {entry.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Semantic Entry' : 'Add Semantic Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Canonical Concept</Label>
                <Input 
                  placeholder="contract_end_date"
                  value={formData.canonical_concept || ''} 
                  onChange={(e) => setFormData(prev => ({ ...prev, canonical_concept: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>UI Label</Label>
                <Input 
                  placeholder="Contract End Date"
                  value={formData.ui_label || ''} 
                  onChange={(e) => setFormData(prev => ({ ...prev, ui_label: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Synonyms (comma-separated)</Label>
              <Textarea 
                placeholder="contract end date, end date, contract expiry"
                value={formData.synonyms?.join(', ') || ''} 
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  synonyms: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Resolution (table.column, priority)</Label>
              <Textarea 
                placeholder="resource_inventory.contract_end_date:1, profiles.contract_end_date:2"
                value={formData.resolution?.map(r => `${r.table}.${r.column}:${r.priority}`).join(', ') || ''} 
                onChange={(e) => {
                  const parts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  const resolution: SemanticResolution[] = parts.map(p => {
                    const [tableCol, priority] = p.split(':');
                    const [table, column] = tableCol.split('.');
                    return { table, column, priority: parseInt(priority) || 1 };
                  });
                  setFormData(prev => ({ ...prev, resolution }));
                }}
              />
              <p className="text-xs text-muted-foreground">Format: table.column:priority</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Match Threshold</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.threshold || 0.78} 
                  onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch 
                  checked={formData.is_active ?? true}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Policies Tab
function PoliciesTab() {
  const { contract, policies, isLoading } = useAiGovernance('capacity');
  const { updatePolicy } = useAiGovernanceAdmin();

  const handleToggle = async (policy: AiPolicy, newValue: boolean) => {
    try {
      await updatePolicy.mutateAsync({ 
        id: policy.id, 
        is_active: newValue 
      });
      toast.success(`Policy ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update policy');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const policyDescriptions: Record<string, string> = {
    always_show_source: 'Include source table.column in every AI response',
    missing_data_claim_check: 'Verify all precedence fields before claiming data is missing',
    pii_masking: 'Mask sensitive PII fields like email addresses',
    max_notes: 'Limit the number of notes in AI responses',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Policies</CardTitle>
        <CardDescription>Configure behavior policies for the AI</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {policies.map((policy) => (
            <div 
              key={policy.id} 
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{policy.policy_key}</span>
                  <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                    {policy.is_active ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {policyDescriptions[policy.policy_key] || 'No description'}
                </p>
                {policy.policy_value && Object.keys(policy.policy_value).length > 0 && (
                  <code className="text-xs bg-muted px-2 py-1 rounded block mt-2">
                    {JSON.stringify(policy.policy_value)}
                  </code>
                )}
              </div>
              <Switch 
                checked={policy.is_active}
                onCheckedChange={(checked) => handleToggle(policy, checked)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Audit Tab
function AuditTab() {
  const { contract } = useAiGovernance('capacity');
  const { fetchAuditLog } = useAiGovernanceAdmin();
  const [logs, setLogs] = useState<AiGovernanceAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contract?.id) {
      setLoading(true);
      fetchAuditLog(contract.id)
        .then(setLogs)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [contract?.id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-green-600';
      case 'update': return 'text-blue-600';
      case 'delete': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>Track all changes to AI governance configuration</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Object Type</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">{formatDate(log.created_at)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getActionColor(log.action)}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>{log.object_type}</TableCell>
                <TableCell>
                  {log.diff && (
                    <code className="text-xs bg-muted px-2 py-1 rounded block max-w-md overflow-hidden text-ellipsis">
                      {JSON.stringify(log.diff).slice(0, 100)}...
                    </code>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No audit logs yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
