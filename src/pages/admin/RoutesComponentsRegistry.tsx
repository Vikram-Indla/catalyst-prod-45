/**
 * Routes & Components Registry Admin Page
 * 
 * Displays all routes, pages, drawers, tables, and components
 * with filters, grouping, and search functionality.
 */

import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronRight, ExternalLink, FileCode, Layout, Table2, Columns3, Box, PanelRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  routesComponentsRegistry, 
  getStats, 
  getAllTypes, 
  getAllCategories,
  type RegistryEntry,
  type ComponentType,
  type CategoryType 
} from '@/config/routesComponentsRegistry';

// Type icons mapping
const typeIcons: Record<ComponentType, React.ReactNode> = {
  Page: <FileCode className="h-4 w-4" />,
  Drawer: <PanelRight className="h-4 w-4" />,
  Table: <Table2 className="h-4 w-4" />,
  Kanban: <Columns3 className="h-4 w-4" />,
  Widget: <Box className="h-4 w-4" />,
  Layout: <Layout className="h-4 w-4" />,
};

// Type colors
const typeColors: Record<ComponentType, string> = {
  Page: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Drawer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Table: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Kanban: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  Widget: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  Layout: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

// Category colors
const categoryColors: Record<CategoryType, string> = {
  Public: 'bg-slate-100 text-slate-700',
  Home: 'bg-amber-100 text-amber-700',
  Enterprise: 'bg-indigo-100 text-indigo-700',
  Product: 'bg-emerald-100 text-emerald-700',
  Program: 'bg-cyan-100 text-cyan-700',
  Project: 'bg-teal-100 text-teal-700',
  Portfolio: 'bg-violet-100 text-violet-700',
  Team: 'bg-rose-100 text-rose-700',
  Release: 'bg-fuchsia-100 text-fuchsia-700',
  Insights: 'bg-sky-100 text-sky-700',
  Admin: 'bg-red-100 text-red-700',
  Utility: 'bg-gray-100 text-gray-700',
  Shared: 'bg-yellow-100 text-yellow-700',
};

function RegistryEntryCard({ entry }: { entry: RegistryEntry }) {
  return (
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm" style={{ color: 'var(--text-1)' }}>{entry.name}</span>
            <Badge variant="outline" className={`text-xs ${typeColors[entry.type]}`}>
              <span className="mr-1">{typeIcons[entry.type]}</span>
              {entry.type}
            </Badge>
            <Badge variant="outline" className={`text-xs ${categoryColors[entry.category]}`}>
              {entry.category}
            </Badge>
          </div>
          
          {entry.route && (
            <div className="flex items-center gap-1 mt-1">
              <code className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)' }}>
                {entry.route}
              </code>
            </div>
          )}
          
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{entry.description}</p>
          
          <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
            <FileCode className="h-3 w-3" />
            <span className="font-mono truncate">{entry.filePath}</span>
          </div>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.tags.map(tag => (
                <span 
                  key={tag} 
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-3)' }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {entry.route && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="shrink-0"
            onClick={() => window.open(entry.route, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function GroupedSection({ 
  title, 
  entries, 
  defaultOpen = true 
}: { 
  title: string; 
  entries: RegistryEntry[]; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div 
          className="flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          style={{ backgroundColor: 'var(--surface-1)' }}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-sm" style={{ color: 'var(--text-1)' }}>{title}</span>
          <Badge variant="secondary" className="ml-auto">{entries.length}</Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 mt-2 pl-6">
          {entries.map(entry => (
            <RegistryEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function RoutesComponentsRegistry() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ComponentType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [groupBy, setGroupBy] = useState<'type' | 'category'>('type');
  
  const stats = useMemo(() => getStats(), []);
  const allTypes = useMemo(() => getAllTypes(), []);
  const allCategories = useMemo(() => getAllCategories(), []);
  
  // Filter entries
  const filteredEntries = useMemo(() => {
    let entries = routesComponentsRegistry;
    
    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      entries = entries.filter(entry => 
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery) ||
        entry.route?.toLowerCase().includes(lowerQuery) ||
        entry.filePath.toLowerCase().includes(lowerQuery) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Type filter
    if (selectedTypes.length > 0) {
      entries = entries.filter(entry => selectedTypes.includes(entry.type));
    }
    
    // Category filter
    if (selectedCategories.length > 0) {
      entries = entries.filter(entry => selectedCategories.includes(entry.category));
    }
    
    return entries;
  }, [searchQuery, selectedTypes, selectedCategories]);
  
  // Group entries
  const groupedEntries = useMemo(() => {
    const groups: Record<string, RegistryEntry[]> = {};
    
    filteredEntries.forEach(entry => {
      const key = groupBy === 'type' ? entry.type : entry.category;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });
    
    return groups;
  }, [filteredEntries, groupBy]);
  
  const toggleType = (type: ComponentType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  const toggleCategory = (category: CategoryType) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedCategories([]);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
          Routes & Components Registry
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          Central registry of all pages, drawers, tables, and components in Catalyst
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="border" style={{ borderColor: 'var(--border)' }}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{stats.total}</div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>Total</div>
          </CardContent>
        </Card>
        {allTypes.map(type => (
          <Card 
            key={type} 
            className={`border cursor-pointer transition-all ${selectedTypes.includes(type) ? 'ring-2 ring-brand-gold' : ''}`}
            style={{ borderColor: 'var(--border)' }}
            onClick={() => toggleType(type)}
          >
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                {typeIcons[type]}
                <span className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{stats.byType[type]}</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>{type}s</div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Filters */}
      <Card className="border" style={{ borderColor: 'var(--border)' }}>
        <CardContent className="p-4 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-3)' }} />
              <Input
                placeholder="Search by name, route, file path, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as 'type' | 'category')}>
              <TabsList>
                <TabsTrigger value="type">Group by Type</TabsTrigger>
                <TabsTrigger value="category">Group by Category</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {(selectedTypes.length > 0 || selectedCategories.length > 0 || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
          
          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Categories:</span>
            {allCategories.map(category => (
              <Badge
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "outline"}
                className={`cursor-pointer text-xs ${selectedCategories.includes(category) ? 'bg-brand-gold text-white' : categoryColors[category]}`}
                onClick={() => toggleCategory(category)}
              >
                {category} ({stats.byCategory[category]})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--text-2)' }}>
            Showing {filteredEntries.length} of {stats.total} entries
          </span>
        </div>
        
        {Object.keys(groupedEntries).length === 0 ? (
          <Card className="border" style={{ borderColor: 'var(--border)' }}>
            <CardContent className="p-8 text-center">
              <p style={{ color: 'var(--text-3)' }}>No entries match your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedEntries)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([group, entries]) => (
                <GroupedSection
                  key={group}
                  title={group}
                  entries={entries}
                  defaultOpen={true}
                />
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
