import { useState } from 'react';
import { Folder, FileText, Plus, X, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScopeSummary } from './ScopeSummary';
import { FolderSelector } from './FolderSelector';
import { TestCaseSelector } from './TestCaseSelector';
import { usePlanScope, useRemoveFromScope, useAddToScope } from '@/hooks/useTestPlansG26';

interface Props { planId: string; }

export function ScopeTab({ planId }: Props) {
  const { data: scope, isLoading } = usePlanScope(planId);
  const removeFromScope = useRemoveFromScope();
  const addToScope = useAddToScope();
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [showTestSelector, setShowTestSelector] = useState(false);

  const includedFolders = scope?.filter(s => s.scope_type === 'folder' && s.action === 'include') || [];
  const includedTests = scope?.filter(s => s.scope_type === 'test_case' && s.action === 'include') || [];
  const excludedItems = scope?.filter(s => s.action === 'exclude') || [];

  const handleExclude = async (item: typeof scope extends (infer T)[] ? T : never) => {
    if (!item) return;
    await removeFromScope.mutateAsync({ scopeId: item.id, planId });
    await addToScope.mutateAsync({ planId, scopeType: item.scope_type, entityId: item.entity_id, action: 'exclude' });
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <ScopeSummary planId={planId} />
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setShowFolderSelector(true)}><Folder className="h-4 w-4 mr-2" />Add Folders</Button>
        <Button variant="outline" onClick={() => setShowTestSelector(true)}><FileText className="h-4 w-4 mr-2" />Add Test Cases</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Folder className="h-4 w-4 text-blue-500" />Included Folders ({includedFolders.length})</CardTitle></CardHeader>
        <CardContent>
          {includedFolders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No folders added. Click "Add Folders" to include test folders.</p>
          ) : (
            <div className="space-y-2">
              {includedFolders.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2"><Folder className="h-4 w-4 text-blue-500" /><span className="text-sm">{item.folder?.name || 'Unknown'}</span></div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive" onClick={() => removeFromScope.mutate({ scopeId: item.id, planId })}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {includedTests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-green-500" />Included Test Cases ({includedTests.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {includedTests.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-xs text-primary">{item.test_case?.case_key}</span>
                    <span className="text-sm">{item.test_case?.title || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-orange-600" onClick={() => handleExclude(item)}>
                      <MinusCircle className="h-4 w-4 mr-1" />Exclude
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive" onClick={() => removeFromScope.mutate({ scopeId: item.id, planId })}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {excludedItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MinusCircle className="h-4 w-4 text-red-500" />Excluded Items ({excludedItems.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {excludedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded border border-red-200 bg-red-50 dark:bg-red-900/10">
                  <div className="flex items-center gap-2">
                    {item.scope_type === 'folder' ? <Folder className="h-4 w-4 text-red-500" /> : <FileText className="h-4 w-4 text-red-500" />}
                    <span className="text-sm">{item.folder?.name || item.test_case?.title || 'Unknown'}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFromScope.mutate({ scopeId: item.id, planId })}>Remove Exclusion</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <FolderSelector open={showFolderSelector} onClose={() => setShowFolderSelector(false)} planId={planId} />
      <TestCaseSelector open={showTestSelector} onClose={() => setShowTestSelector(false)} planId={planId} />
    </div>
  );
}
