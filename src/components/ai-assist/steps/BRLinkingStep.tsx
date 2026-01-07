import React, { useState } from 'react';
import { Link2, Search, CheckCircle2, ExternalLink, Plus, Unlink, Building2, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface BusinessRequest {
  id: string;
  key: string;
  titleAr?: string;
  titleEn: string;
  status: 'open' | 'in_progress' | 'closed';
  owner: string;
  quarter: string;
}

interface BRLinkingStepProps {
  linkedBR?: BusinessRequest | null;
  recentRequests?: BusinessRequest[];
  searchResults?: BusinessRequest[];
  onSearch?: (query: string) => void;
  onLink?: (brId: string) => void;
  onUnlink?: () => void;
  onCreateNew?: () => void;
}

export function BRLinkingStep({
  linkedBR = null,
  recentRequests = [],
  searchResults = [],
  onSearch,
  onLink,
  onUnlink,
  onCreateNew
}: BRLinkingStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');

  // Mock recent requests if none provided
  const displayRequests = recentRequests.length > 0 ? recentRequests : [
    {
      id: '1',
      key: 'BR-2024-0892',
      titleAr: 'نظام إدارة المشتريات - المرحلة الأولى',
      titleEn: 'Procurement System - Phase 1',
      status: 'open' as const,
      owner: 'Ahmed M.',
      quarter: 'Q2 2026'
    },
    {
      id: '2',
      key: 'BR-2024-0756',
      titleAr: 'تحديث النظام القديم',
      titleEn: 'Legacy System Modernization',
      status: 'closed' as const,
      owner: 'Sara K.',
      quarter: 'Q1 2025'
    }
  ];

  const getStatusConfig = (status: BusinessRequest['status']) => {
    switch (status) {
      case 'open':
        return { label: 'Open', className: 'bg-success/10 text-success' };
      case 'in_progress':
        return { label: 'In Progress', className: 'bg-primary/10 text-primary' };
      case 'closed':
        return { label: 'Closed', className: 'bg-muted text-muted-foreground' };
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  // Linked state
  if (linkedBR) {
    return (
      <div className="space-y-6">
        {/* Success Banner */}
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Successfully Linked</p>
            <p className="text-xs text-muted-foreground">
              This AI Assist draft is now connected to a Business Request.
            </p>
          </div>
        </div>

        {/* Linked BR Card */}
        <div className="bg-card border border-success/30 rounded-xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <Badge variant="outline" className="font-mono text-xs mb-1">
                  {linkedBR.key}
                </Badge>
              </div>
            </div>

            {linkedBR.titleAr && (
              <p className="font-medium mb-1" dir="rtl">{linkedBR.titleAr}</p>
            )}
            <p className="text-sm text-muted-foreground mb-4">{linkedBR.titleEn}</p>

            <div className="flex flex-wrap gap-2 mb-6">
              <Badge className={cn("text-xs", getStatusConfig(linkedBR.status).className)}>
                {getStatusConfig(linkedBR.status).label}
              </Badge>
              <Badge variant="secondary" className="text-xs gap-1">
                <User className="h-3 w-3" />
                {linkedBR.owner}
              </Badge>
              <Badge variant="secondary" className="text-xs gap-1">
                <Calendar className="h-3 w-3" />
                {linkedBR.quarter}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View in Portfolio
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-destructive hover:text-destructive"
                onClick={onUnlink}
              >
                <Unlink className="h-3 w-3" />
                Unlink
              </Button>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-muted/30 rounded-xl p-4">
          <h4 className="text-sm font-medium mb-3">What happens now?</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              BRD will be attached to this Business Request
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Epics will be linked for portfolio traceability
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Compliance status will sync to the BR
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Unlinked state
  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm">
          Connect this AI Assist draft to a Business Request for full traceability in the portfolio system.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            ⚪ Not Linked
          </Badge>
        </div>
      </div>

      {/* Tabs: Link Existing / Create New */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'existing' | 'new')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing" className="gap-2">
            <Link2 className="h-4 w-4" />
            Link Existing
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by BR ID or title..."
              value={searchQuery}
              onChange={handleSearch}
              className="ps-10"
            />
          </div>

          {/* Results or Recent */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {searchQuery ? 'Search Results' : 'Recent Business Requests'}
            </p>

            {(searchQuery ? searchResults : displayRequests).map((br) => (
              <div
                key={br.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {br.key}
                      </Badge>
                    </div>
                    {br.titleAr && (
                      <p className="font-medium mb-1" dir="rtl">{br.titleAr}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{br.titleEn}</p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge className={cn("text-xs", getStatusConfig(br.status).className)}>
                        {getStatusConfig(br.status).label}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {br.owner}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {br.quarter}
                      </span>
                    </div>
                  </div>

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onLink?.(br.id)}
                    className="ms-4 gap-1"
                  >
                    <Link2 className="h-3 w-3" />
                    Link
                  </Button>
                </div>
              </div>
            ))}

            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No Business Requests found matching "{searchQuery}"
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Create New Business Request</h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Create a new Business Request in the portfolio system and automatically link it to this AI Assist draft.
            </p>
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Create & Link BR
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
