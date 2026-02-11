import { useState } from 'react';
import { Loader2, Sparkles, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useGenerateCatyTestCases, useSaveCatyGeneratedTests } from '@/hooks/useCatyAI';
import { useFolders } from '@/hooks/test-management/useFolders';
import { useAuth } from '@/lib/auth';
import { CatyAIAvatar } from './CatyAIAvatar';
import { GeneratedTestCase } from '@/types/caty-ai';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save, ChevronDown, ChevronUp } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; projectId: string; }

export function CatyGenerateTestsModal({ open, onClose, projectId }: Props) {
  const { user } = useAuth();
  const { data: folders } = useFolders(projectId);
  const [inputText, setInputText] = useState('');
  const [inputTab, setInputTab] = useState('paste');
  const [options, setOptions] = useState({ count: 5, includeNegative: true, includeEdgeCases: true, priorityFocus: 'all', folderId: '' });
  const [generatedTests, setGeneratedTests] = useState<GeneratedTestCase[] | null>(null);
  const [suggestionIds, setSuggestionIds] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const generateMutation = useGenerateCatyTestCases();
  const saveMutation = useSaveCatyGeneratedTests();

  const handleGenerate = async () => {
    if (!inputText.trim() || !user) return;
    const result = await generateMutation.mutateAsync({ projectId, userId: user.id, input: inputText, options });
    setGeneratedTests(result.testCases);
    setSuggestionIds(result.suggestions?.map((s: any) => s.id) || []);
    setSelectedIndexes(new Set(result.testCases.map((_: any, i: number) => i)));
  };

  const handleSave = async () => {
    const selected = (generatedTests || []).filter((_, i) => selectedIndexes.has(i));
    const selSuggIds = suggestionIds.filter((_, i) => selectedIndexes.has(i));
    await saveMutation.mutateAsync({ projectId, folderId: options.folderId === 'root' ? undefined : options.folderId || undefined, testCases: selected, suggestionIds: selSuggIds });
    handleClose();
  };

  const handleClose = () => { setInputText(''); setGeneratedTests(null); setSuggestionIds([]); onClose(); };
  const toggleSelect = (i: number) => { const s = new Set(selectedIndexes); s.has(i) ? s.delete(i) : s.add(i); setSelectedIndexes(s); };

  const priorityColors: Record<string, string> = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CatyAIAvatar size="sm" />Generate Test Cases with CATY</DialogTitle>
        </DialogHeader>

        {!generatedTests ? (
          <div className="space-y-4">
            <Tabs value={inputTab} onValueChange={setInputTab} className="w-full">
              <TabsList className="w-fit">
                <TabsTrigger value="paste">Paste Text</TabsTrigger>
                <TabsTrigger value="upload" disabled>Upload File</TabsTrigger>
                <TabsTrigger value="url" disabled>From URL</TabsTrigger>
              </TabsList>
              <TabsContent value="paste" className="space-y-2 mt-3">
                <Label>Requirement / User Story</Label>
                <Textarea value={inputText} onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your requirement here...&#10;&#10;Example: As a user, I want to login with email and password..." rows={8} />
              </TabsContent>
              <TabsContent value="upload" className="mt-3">
                <p className="text-sm text-muted-foreground">File upload coming soon.</p>
              </TabsContent>
              <TabsContent value="url" className="mt-3">
                <p className="text-sm text-muted-foreground">URL import coming soon.</p>
              </TabsContent>
            </Tabs>
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-medium text-sm">Generation Options</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Test Count</Label>
                  <Select value={options.count.toString()} onValueChange={(v) => setOptions({ ...options, count: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3-5 tests</SelectItem>
                      <SelectItem value="5">5-8 tests</SelectItem>
                      <SelectItem value="10">8-12 tests</SelectItem>
                      <SelectItem value="15">12-15 tests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Save to Folder</Label>
                  <Select value={options.folderId} onValueChange={(v) => setOptions({ ...options, folderId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select folder..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Root</SelectItem>
                      {folders?.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="neg" checked={options.includeNegative} onCheckedChange={(c) => setOptions({ ...options, includeNegative: !!c })} />
                  <Label htmlFor="neg" className="font-normal cursor-pointer">Include negative test cases</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edge" checked={options.includeEdgeCases} onCheckedChange={(c) => setOptions({ ...options, includeEdgeCases: !!c })} />
                  <Label htmlFor="edge" className="font-normal cursor-pointer">Include edge cases</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={!inputText.trim() || generateMutation.isPending}>
                {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate with CATY</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setGeneratedTests(null)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedIndexes(new Set(generatedTests.map((_, i) => i)))}>Select All</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIndexes(new Set())}>Deselect All</Button>
                <span className="text-sm text-muted-foreground">{selectedIndexes.size} of {generatedTests.length} selected</span>
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {generatedTests.map((tc, i) => (
                <div key={i} className={cn("border border-border rounded-lg overflow-hidden", selectedIndexes.has(i) && "ring-2 ring-primary")}>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 cursor-pointer" onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}>
                    <Checkbox checked={selectedIndexes.has(i)} onCheckedChange={() => toggleSelect(i)} onClick={(e) => e.stopPropagation()} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">{tc.title}</p>
                      <p className="text-xs text-muted-foreground">{tc.steps?.length || 0} steps</p>
                    </div>
                    <Badge className={cn("capitalize", priorityColors[tc.priority])}>{tc.priority}</Badge>
                    {expandedIndex === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  {expandedIndex === i && (
                    <div className="p-3 space-y-3 border-t border-border">
                      {tc.description && <div><p className="text-xs font-medium text-muted-foreground mb-1">Description</p><p className="text-sm">{tc.description}</p></div>}
                      <div><p className="text-xs font-medium text-muted-foreground mb-2">Steps</p>
                        <div className="space-y-2">{tc.steps?.map((s, si) => (
                          <div key={si} className="text-sm bg-background p-2 rounded border border-border">
                            <span className="text-muted-foreground font-mono">{s.step_number}.</span> <strong>Action:</strong> {s.action}<br /><strong>Expected:</strong> {s.expected_result}
                            {s.test_data && <><br /><span className="text-muted-foreground"><strong>Data:</strong> {s.test_data}</span></>}
                          </div>
                        ))}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={selectedIndexes.size === 0 || saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />{saveMutation.isPending ? 'Saving...' : `Save ${selectedIndexes.size} Test Cases`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
