import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { EFDSession } from '../../types/efd.types';
import { useEFDAtoms, useEFDFeatures, useEFDEpics } from '../../hooks/useEFDSession';
import { useMapAtomToFeature } from '../../hooks/useEFDMutations';
import { Link2, AlertCircle, CheckCircle, Filter, Search, GripVertical, Box, Atom } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const MappingStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: atoms = [] } = useEFDAtoms(session.id);
  const { data: features = [] } = useEFDFeatures(session.id);
  const { data: epics = [] } = useEFDEpics(session.id);
  const mapAtom = useMapAtomToFeature();
  
  const [filter, setFilter] = useState<'all' | 'unmapped' | 'mapped'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'dnd'>('dnd');

  // Get feature with epic info
  const featuresWithEpic = features.map((f: any) => {
    const epic = epics.find((e: any) => e.id === f.epic_id);
    return { ...f, epicKey: epic?.epic_key || 'Unknown', epicName: epic?.name || '' };
  });

  // Filter atoms
  const filteredAtoms = atoms.filter((atom: any) => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'unmapped' && atom.status !== 'mapped') ||
      (filter === 'mapped' && atom.status === 'mapped');
    
    const matchesSearch = 
      !searchQuery || 
      atom.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      atom.atom_key.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const unmappedAtoms = atoms.filter((a: any) => a.status !== 'mapped' && !a.is_excluded);
  const mappedCount = atoms.filter((a: any) => a.status === 'mapped').length;
  const coverage = atoms.length > 0 ? Math.round((mappedCount / atoms.length) * 100) : 0;

  const handleMapChange = (atomId: string, featureId: string | null) => {
    mapAtom.mutate({ atomId, featureId, sessionId: session.id });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const atomId = result.draggableId;
    const destDroppableId = result.destination.droppableId;
    
    if (destDroppableId === 'unmapped') {
      handleMapChange(atomId, null);
    } else if (destDroppableId.startsWith('feature-')) {
      const featureId = destDroppableId.replace('feature-', '');
      handleMapChange(atomId, featureId);
    }
  };

  if (atoms.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Map Requirements to Features</h2>
          <p className="text-muted-foreground">Link each requirement atom to a feature</p>
        </div>
        <div className="border rounded-xl p-8 text-center bg-muted/30">
          <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Requirements to Map</h3>
          <p className="text-muted-foreground">Parse your documents first to extract requirements</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Map Requirements to Features</h2>
        <p className="text-muted-foreground">
          Drag requirements to features or use the dropdown to assign
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${coverage >= 85 ? 'bg-green-500' : coverage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
          <span className="font-semibold">{coverage}%</span>
          <span className="text-muted-foreground">coverage</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>{mappedCount} mapped</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span>{unmappedAtoms.length} unmapped</span>
        </div>
        <div className="ml-auto">
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <TabsList className="h-8">
              <TabsTrigger value="dnd" className="text-xs">Drag & Drop</TabsTrigger>
              <TabsTrigger value="table" className="text-xs">Table</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {unmappedAtoms.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-amber-700 font-medium">{unmappedAtoms.length} requirements still need mapping</p>
            <p className="text-amber-600 text-sm">Drag them to features or select from dropdown</p>
          </div>
        </div>
      )}

      {viewMode === 'dnd' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-12 gap-4">
            {/* Unmapped Pool */}
            <div className="col-span-4">
              <div className="border rounded-xl overflow-hidden bg-card">
                <div className="p-3 bg-muted/50 border-b flex items-center gap-2">
                  <Atom className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">Unmapped Requirements</span>
                  <Badge variant="secondary" className="ml-auto">{unmappedAtoms.length}</Badge>
                </div>
                <Droppable droppableId="unmapped">
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-2 min-h-[300px] max-h-[500px] overflow-y-auto ${snapshot.isDraggingOver ? 'bg-amber-50' : ''}`}
                    >
                      {unmappedAtoms.map((atom: any, index: number) => (
                        <Draggable key={atom.id} draggableId={atom.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-2 mb-2 border rounded-lg bg-background flex items-start gap-2 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs text-primary">{atom.atom_key}</span>
                                  <Badge variant="outline" className="text-[10px] h-4">{atom.type || 'FR'}</Badge>
                                </div>
                                <p className="text-xs line-clamp-2">{atom.text}</p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {unmappedAtoms.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          All requirements mapped!
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>

            {/* Features */}
            <div className="col-span-8">
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {featuresWithEpic.map((feature: any) => {
                  const featureAtoms = atoms.filter((a: any) => a.mapped_to_feature_id === feature.id);
                  
                  return (
                    <Droppable key={feature.id} droppableId={`feature-${feature.id}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`border rounded-xl overflow-hidden ${snapshot.isDraggingOver ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                        >
                          <div className="p-3 bg-teal-50/50 border-b flex items-center gap-2">
                            <Box className="h-4 w-4 text-teal-600" />
                            <span className="font-mono text-xs text-teal-600">{feature.feature_key}</span>
                            <span className="font-medium flex-1">{feature.name}</span>
                            <Badge variant="outline" className="text-xs">{feature.epicKey}</Badge>
                            <Badge variant="secondary">{featureAtoms.length} reqs</Badge>
                          </div>
                          <div className={`p-2 min-h-[60px] ${snapshot.isDraggingOver ? 'bg-teal-50/30' : 'bg-background'}`}>
                            {featureAtoms.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground text-xs">
                                Drop requirements here
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {featureAtoms.map((atom: any, index: number) => (
                                  <Draggable key={atom.id} draggableId={atom.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`inline-flex items-center gap-1 px-2 py-1 border rounded bg-background text-xs cursor-grab ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
                                      >
                                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-mono text-primary">{atom.atom_key}</span>
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </div>
          </div>
        </DragDropContext>
      ) : (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({atoms.length})</SelectItem>
                  <SelectItem value="unmapped">Unmapped ({unmappedAtoms.length})</SelectItem>
                  <SelectItem value="mapped">Mapped ({mappedCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table View */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium w-24">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Requirement</th>
                  <th className="px-4 py-3 text-left text-sm font-medium w-28">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium w-64">Mapped Feature</th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAtoms.map((atom: any) => {
                  const isMapped = atom.status === 'mapped';
                  
                  return (
                    <tr key={atom.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-primary">{atom.atom_key}</td>
                      <td className="px-4 py-3 text-sm max-w-md">
                        <p className="line-clamp-2">{atom.text}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="capitalize">
                          {atom.type || 'FR'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Select 
                          value={atom.mapped_to_feature_id || 'unmapped'}
                          onValueChange={(val) => handleMapChange(atom.id, val === 'unmapped' ? null : val)}
                        >
                          <SelectTrigger className={isMapped ? 'border-green-500' : ''}>
                            <SelectValue placeholder="Select feature..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unmapped">— Unmapped —</SelectItem>
                            {featuresWithEpic.map((feature: any) => (
                              <SelectItem key={feature.id} value={feature.id}>
                                [{feature.epicKey}] {feature.feature_key}: {feature.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isMapped ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredAtoms.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No requirements match your filter
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
