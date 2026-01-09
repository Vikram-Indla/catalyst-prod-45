// =====================================================
// LINKED ITEMS SECTION
// Component for linking test cases to stories, features, epics, defects, incidents
// =====================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BookOpen,
  Target,
  Layers,
  Bug,
  AlertTriangle,
  X,
  Search,
  Link2,
  Loader2,
} from 'lucide-react';
import {
  useTestCaseLinks,
  useAddTestCaseLink,
  useRemoveTestCaseLink,
  LinkedItemType,
} from '../../hooks/useTestCaseLinks';

const LINK_TYPES: { type: LinkedItemType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'story', label: 'Story', icon: BookOpen, color: 'blue' },
  { type: 'feature', label: 'Feature', icon: Target, color: 'purple' },
  { type: 'epic', label: 'Epic', icon: Layers, color: 'indigo' },
  { type: 'defect', label: 'Defect', icon: Bug, color: 'red' },
  { type: 'incident', label: 'Incident', icon: AlertTriangle, color: 'orange' },
];

interface LinkedItemsSectionProps {
  testCaseId: string | null;
  projectId: string | null;
}

export function LinkedItemsSection({ testCaseId, projectId }: LinkedItemsSectionProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState<LinkedItemType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: linkedItems = [], isLoading } = useTestCaseLinks(testCaseId);
  const addLink = useAddTestCaseLink();
  const removeLink = useRemoveTestCaseLink();

  // Conditional search hooks based on selected type
  const storiesSearch = useSearchStories(projectId, searchQuery, selectedLinkType === 'story' && showLinkDialog);
  const featuresSearch = useSearchFeatures(projectId, searchQuery, selectedLinkType === 'feature' && showLinkDialog);
  const epicsSearch = useSearchEpics(projectId, searchQuery, selectedLinkType === 'epic' && showLinkDialog);
  const defectsSearch = useSearchDefects(searchQuery, selectedLinkType === 'defect' && showLinkDialog);
  const incidentsSearch = useSearchIncidents(searchQuery, selectedLinkType === 'incident' && showLinkDialog);

  // Get the right search results based on selected type
  const getSearchResults = (): { data: LinkedItemDetails[]; isLoading: boolean } => {
    switch (selectedLinkType) {
      case 'story': return { data: storiesSearch.data || [], isLoading: storiesSearch.isLoading };
      case 'feature': return { data: featuresSearch.data || [], isLoading: featuresSearch.isLoading };
      case 'epic': return { data: epicsSearch.data || [], isLoading: epicsSearch.isLoading };
      case 'defect': return { data: defectsSearch.data || [], isLoading: defectsSearch.isLoading };
      case 'incident': return { data: incidentsSearch.data || [], isLoading: incidentsSearch.isLoading };
      default: return { data: [], isLoading: false };
    }
  };

  const { data: searchResults, isLoading: isSearching } = getSearchResults();

  const handleOpenLinkDialog = (type: LinkedItemType) => {
    setSelectedLinkType(type);
    setSearchQuery('');
    setShowLinkDialog(true);
  };

  const handleLinkItem = (itemId: string) => {
    if (!testCaseId || !selectedLinkType) return;

    addLink.mutate({
      testCaseId,
      linkedItemType: selectedLinkType,
      linkedItemId: itemId,
    });
    setShowLinkDialog(false);
  };

  const handleRemoveLink = (linkId: string) => {
    if (!testCaseId) return;
    removeLink.mutate({ linkId, testCaseId });
  };

  const getTypeConfig = (type: LinkedItemType) => {
    return LINK_TYPES.find((t) => t.type === type) || LINK_TYPES[0];
  };

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Linked Items
          </span>
          {linkedItems.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              {linkedItems.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
          onClick={() => handleOpenLinkDialog('story')}
        >
          + Link
        </Button>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : linkedItems.length === 0 ? (
          <div className="text-center py-6">
            <Link2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No linked items</p>
            <p className="text-xs text-gray-400 mt-1">
              Link to stories, features, epics, or defects
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {linkedItems.map((item) => {
              const config = getTypeConfig(item.linked_item_type);
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 group transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded ${getColorClass(config.color)}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-mono font-medium text-gray-500">
                      {item.item_key}
                    </span>
                    <span className="text-sm text-gray-700 truncate">{item.item_title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveLink(item.id)}
                  >
                    <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick link buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {LINK_TYPES.map((lt) => {
            const Icon = lt.icon;
            return (
              <Button
                key={lt.type}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-gray-200 hover:border-gray-300"
                onClick={() => handleOpenLinkDialog(lt.type)}
              >
                <Icon className="h-3.5 w-3.5" />
                + {lt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLinkType && (
                <>
                  {React.createElement(getTypeConfig(selectedLinkType).icon, {
                    className: 'h-5 w-5',
                  })}
                  Link {getTypeConfig(selectedLinkType).label}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or key..."
                className="pl-9"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  No items found
                </div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLinkItem(item.id)}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                  >
                    <span className="text-xs font-mono font-medium text-gray-500">
                      {item.key}
                    </span>
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {item.title}
                    </span>
                    {item.status && (
                      <Badge variant="secondary" className="text-xs">
                        {item.status}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
