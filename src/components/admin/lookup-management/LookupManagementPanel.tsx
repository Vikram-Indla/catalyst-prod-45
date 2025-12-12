import { useState } from 'react';
import { useOptionSets, OptionSet } from '@/hooks/useOptionSets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Settings2, Database, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptionValuesDrawer } from './OptionValuesDrawer';

export function LookupManagementPanel() {
  const { data: optionSets = [], isLoading } = useOptionSets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState<OptionSet | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredSets = optionSets.filter(
    set =>
      set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      set.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManageOptions = (optionSet: OptionSet) => {
    setSelectedSet(optionSet);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-gold/10">
            <Database className="h-5 w-5 text-brand-gold" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Lookup Management</h2>
            <p className="text-sm text-muted-foreground">
              Configure dropdown options for fields across the application
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search option sets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Option Sets Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Key</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSets.map((set) => (
              <tr key={set.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium">{set.name}</span>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{set.key}</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                  {set.description || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge
                    variant={set.is_active ? 'default' : 'secondary'}
                    className={cn(
                      'text-xs',
                      set.is_active && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                    )}
                  >
                    {set.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  {set.is_system && (
                    <Badge variant="outline" className="text-xs">
                      System
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleManageOptions(set)}
                    className="gap-1.5"
                  >
                    <Settings2 className="h-4 w-4" />
                    Manage
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}

            {filteredSets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {searchQuery ? 'No option sets match your search' : 'No option sets found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Options Drawer */}
      {selectedSet && (
        <OptionValuesDrawer
          optionSet={selectedSet}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      )}
    </div>
  );
}
