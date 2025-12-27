import React, { useState } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDAtoms, useEFDFeatures, useEFDEpics } from '../../hooks/useEFDSession';
import { useMapAtomToFeature } from '../../hooks/useEFDMutations';
import { Link2, AlertCircle, CheckCircle, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

  // Get feature with epic info
  const featuresWithEpic = features.map((f: any) => {
    const epic = epics.find((e: any) => e.id === f.epic_id);
    return { ...f, epicKey: epic?.epic_key || 'Unknown' };
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

  const unmappedCount = atoms.filter((a: any) => a.status !== 'mapped').length;
  const mappedCount = atoms.filter((a: any) => a.status === 'mapped').length;
  const coverage = atoms.length > 0 ? Math.round((mappedCount / atoms.length) * 100) : 0;

  const handleMapChange = (atomId: string, featureId: string | null) => {
    mapAtom.mutate({ atomId, featureId, sessionId: session.id });
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
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Map Requirements to Features</h2>
        <p className="text-muted-foreground">
          Ensure each requirement is linked to a feature for full traceability
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
          <span>{unmappedCount} unmapped</span>
        </div>
      </div>

      {unmappedCount > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-amber-700 font-medium">{unmappedCount} requirements still need mapping</p>
            <p className="text-amber-600 text-sm">Map them to features or mark as excluded</p>
          </div>
        </div>
      )}

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
              <SelectItem value="unmapped">Unmapped ({unmappedCount})</SelectItem>
              <SelectItem value="mapped">Mapped ({mappedCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mapping Table */}
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
              const mappedFeature = features.find((f: any) => f.id === atom.mapped_to_feature_id);
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
    </div>
  );
};
