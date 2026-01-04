import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  Download,
  Upload,
  Play,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/hooks/useUsers';
import { 
  matchUsers, 
  MappingRecord, 
  DryRunResult, 
  MatchResult,
  useBulkUpdateUsers 
} from '@/hooks/useBulkUserUpdate';

interface BulkUpdateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
}

// Default mapping data
const DEFAULT_MAPPING: MappingRecord[] = [
  {"name":"Hasan Elsherby","role":".Net Developer","vendor":"Freelance","end_date":"31-Mar-26","location":"Off-Shore","country":"Egypt"},
  {"name":"Yousif Shalaby","role":".Net Team Lead","vendor":"Thiqah","end_date":"30-Dec-26","location":"On-Site","country":"Egypt"},
  {"name":"Mohammed Alaa","role":".Net Developer","vendor":"Freelance","end_date":"31-Mar-26","location":"Off-Shore","country":"Egypt"},
  {"name":"Ahmed Yousry","role":".Net Developer","vendor":"Freelance","end_date":"31-Mar-26","location":"Off-Shore","country":"Egypt"},
  {"name":"Ayaz Muhammad","role":"Backend Developer","vendor":"Thiqah","end_date":"30-Oct-26","location":"Off-Shore","country":"Pakistan"},
  {"name":"Mazen Yehia","role":"Backend Developer","vendor":"BMC","end_date":"30-Oct-26","location":"Off-Shore","country":"Egypt"},
  {"name":"Raza Bangi","role":"Backend Developer","vendor":"Thiqah","end_date":"30-Oct-26","location":"Off-Shore","country":"Pakistan"},
  {"name":"Syed Habib","role":"Backend Developer","vendor":"ELM","end_date":"30-Jun-26","location":"Off-Shore","country":"Pakistan"},
  {"name":"Ubaid Nawab","role":"Backend Developer","vendor":"ELM","end_date":"30-Jun-26","location":"Off-Shore","country":"Pakistan"},
  {"name":"Waqas Ali","role":"Backend Developer","vendor":"Thiqah","end_date":"30-Oct-26","location":"Onsite","country":"Pakistan"},
  {"name":"Hassan Raza Hasrat","role":"Backend Lead","vendor":"Thiqah","end_date":"30-Oct-26","location":"Onsite","country":"Pakistan"},
  {"name":"Amadou Ndiaye","role":"Data Engineer","vendor":"ELM","end_date":"30-Jun-26","location":"Off-Shore","country":"Sudan"},
  {"name":"Maaz Majid","role":"Data Engineer","vendor":"Thiqah","end_date":"30-Dec-26","location":"Onsite","country":"Sudan"},
  {"name":"Arslan Malik","role":"DevOps","vendor":"Thiqah","end_date":"30-Oct-26","location":"Onsite","country":"Pakistan"},
  {"name":"Andrew Fayyaz","role":"Backend Developer","vendor":"Thiqah","end_date":"30-Jun-26","location":"Off-Shore","country":"Pakistan"},
  {"name":"Adnan Ali","role":"React Developer","vendor":"BMC","end_date":"30-Oct-26","location":"Off-Shore","country":"Pakistan"},
  {"name":"Divyam Kshatriya","role":"React Developer","vendor":"Thiqah","end_date":"30-Oct-26","location":"Off-Shore","country":"India"},
  {"name":"Menna Tula Nasser","role":"React Developer","vendor":"BMC","end_date":"30-Oct-26","location":"Off-Shore","country":"Egypt"},
  {"name":"Sherif Gjini","role":"React Developer","vendor":"BMC","end_date":"30-Oct-26","location":"Off-Shore","country":"Albania"},
  {"name":"Waseem Ahmad","role":"React Developer","vendor":"ELM","end_date":"30-Oct-26","location":"Off-Shore","country":"Pakistan"},
  {"name":"Dreni Djini","role":"Frontend Lead","vendor":"BMC","end_date":"30-Oct-26","location":"Onsite","country":"Albania"},
  {"name":"Imran Aslam","role":"React Team Lead","vendor":"Thiqah","end_date":"30-Oct-26","location":"Onsite","country":"Pakistan"},
  {"name":"Sikander Ahmad","role":"Mobile Developer","vendor":"Thiqah","end_date":"30-Oct-26","location":"Off-Shore","country":"Jordan"},
  {"name":"Wahid Nasri","role":"Mobile Lead","vendor":"Thiqah","end_date":"30-Dec-26","location":"Onsite","country":"Jordan"},
  {"name":"Abdulrahman Alghizzy","role":"Project Manager","vendor":"Thiqah","end_date":"30-Mar-26","location":"Onsite","country":"KSA"},
  {"name":"Aya Ibrahims","role":"QA Tester","vendor":"ELM","end_date":"30-Jun-26","location":"Off-Shore","country":"Egypt"},
  {"name":"Nour Almani","role":"QA Tester","vendor":"ELM","end_date":"30-Jun-26","location":"Off-Shore","country":"Jordan"},
  {"name":"Yazeed Daraz","role":"QA Team Lead","vendor":"Thiqah","end_date":"30-Dec-26","location":"Onsite","country":"Jordan"},
  {"name":"Mahmoud Gameel","role":"QA Tester","vendor":"Freelance","end_date":"30-Mar-26","location":"Off-Shore","country":"Egypt"},
  {"name":"Faisal Javed","role":"Technical PO","vendor":"BMC","end_date":"30-Oct-26","location":"Onsite","country":"Pakistan"},
  {"name":"Nada Alfassam","role":"Technical PO","vendor":"Thiqah","end_date":"30-Dec-26","location":"Onsite","country":"KSA"},
  {"name":"Vikram Indla","role":"Delivery Manager","vendor":"Thiqah","end_date":"30-Jun-26","location":"Onsite","country":"India"}
];

export function BulkUpdateDrawer({ isOpen, onClose, users }: BulkUpdateDrawerProps) {
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(DEFAULT_MAPPING, null, 2));
  const [dryRunMode, setDryRunMode] = useState(true);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  
  const bulkUpdate = useBulkUpdateUsers();

  const handleDryRun = () => {
    try {
      const mappingData: MappingRecord[] = JSON.parse(jsonInput);
      if (!Array.isArray(mappingData)) {
        throw new Error('Input must be a JSON array');
      }
      setParseError(null);
      const result = matchUsers(mappingData, users);
      setDryRunResult(result);
    } catch (e) {
      setParseError((e as Error).message);
      setDryRunResult(null);
    }
  };

  const handleApply = () => {
    if (!dryRunResult) return;
    
    // Include manual overrides
    const updatedMatches = [...dryRunResult.matched];
    
    // Process manual overrides
    for (const [mappingName, userId] of Object.entries(manualOverrides)) {
      const user = users.find((u) => u.id === userId);
      const ambiguousRecord = dryRunResult.ambiguous.find((r) => r.mapping.name === mappingName);
      const notFoundRecord = dryRunResult.notFound.find((r) => r.mapping.name === mappingName);
      
      const record = ambiguousRecord || notFoundRecord;
      if (record && user) {
        updatedMatches.push({
          ...record,
          matchType: 'exact_name',
          matchedUser: user,
          changes: record.changes,
        });
      }
    }

    bulkUpdate.mutate({
      matchResults: updatedMatches,
      mappingInput: JSON.parse(jsonInput),
    });
  };

  const handleLinkUser = (mappingName: string, userId: string) => {
    setManualOverrides((prev) => ({ ...prev, [mappingName]: userId }));
  };

  const handleIgnore = (mappingName: string) => {
    setManualOverrides((prev) => {
      const newOverrides = { ...prev };
      delete newOverrides[mappingName];
      return newOverrides;
    });
  };

  const exportMismatches = () => {
    if (!dryRunResult) return;
    
    const mismatches = [...dryRunResult.notFound, ...dryRunResult.ambiguous];
    const csv = [
      'Name,Match Type,Reason,Candidates',
      ...mismatches.map((m) => 
        `"${m.mapping.name}","${m.matchType}","${m.reason || ''}","${m.candidates?.map((c) => c.full_name).join('; ') || ''}"`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-update-mismatches.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasBlockingErrors = dryRunResult && 
    (dryRunResult.notFound.length > 0 || dryRunResult.ambiguous.length > 0) &&
    Object.keys(manualOverrides).length < (dryRunResult.notFound.length + dryRunResult.ambiguous.length);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Update Users
          </SheetTitle>
          <SheetDescription>
            Update vendor, contract, and country metadata for multiple users at once.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* JSON Input */}
          <div className="space-y-2">
            <Label>Mapping Data (JSON)</Label>
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="font-mono text-xs h-48"
              placeholder="Paste JSON mapping array..."
            />
            {parseError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                {parseError}
              </p>
            )}
          </div>

          {/* Dry Run Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="dry-run"
                checked={dryRunMode}
                onCheckedChange={setDryRunMode}
              />
              <Label htmlFor="dry-run">Dry Run Mode (Preview Only)</Label>
            </div>
            <Button onClick={handleDryRun} variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Run Analysis
            </Button>
          </div>

          {/* Results */}
          {dryRunResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold">{dryRunResult.summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="p-3 rounded-lg bg-green-50 text-center dark:bg-green-950">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {dryRunResult.summary.toUpdate}
                  </div>
                  <div className="text-xs text-muted-foreground">To Update</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold">{dryRunResult.summary.unchanged}</div>
                  <div className="text-xs text-muted-foreground">Unchanged</div>
                </div>
                <div className="p-3 rounded-lg bg-red-50 text-center dark:bg-red-950">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {dryRunResult.summary.mismatched}
                  </div>
                  <div className="text-xs text-muted-foreground">Mismatched</div>
                </div>
              </div>

              {/* Tabs for different categories */}
              <Tabs defaultValue="matched" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="matched" className="text-xs">
                    Matched ({dryRunResult.matched.length})
                  </TabsTrigger>
                  <TabsTrigger value="notfound" className="text-xs">
                    Not Found ({dryRunResult.notFound.length})
                  </TabsTrigger>
                  <TabsTrigger value="ambiguous" className="text-xs">
                    Ambiguous ({dryRunResult.ambiguous.length})
                  </TabsTrigger>
                  <TabsTrigger value="skipped" className="text-xs">
                    Skipped ({dryRunResult.skipped.length})
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[280px] mt-2">
                  <TabsContent value="matched" className="mt-0">
                    <div className="space-y-2">
                      {dryRunResult.matched.map((result, idx) => (
                        <MatchedResultRow key={idx} result={result} />
                      ))}
                      {dryRunResult.matched.length === 0 && (
                        <EmptyState message="No matched users" />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notfound" className="mt-0">
                    <div className="space-y-2">
                      {dryRunResult.notFound.map((result, idx) => (
                        <MismatchResultRow 
                          key={idx} 
                          result={result} 
                          users={users}
                          onLink={handleLinkUser}
                          onIgnore={handleIgnore}
                          linkedUserId={manualOverrides[result.mapping.name]}
                        />
                      ))}
                      {dryRunResult.notFound.length === 0 && (
                        <EmptyState message="All users found" icon={CheckCircle2} />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="ambiguous" className="mt-0">
                    <div className="space-y-2">
                      {dryRunResult.ambiguous.map((result, idx) => (
                        <MismatchResultRow 
                          key={idx} 
                          result={result} 
                          users={users}
                          onLink={handleLinkUser}
                          onIgnore={handleIgnore}
                          linkedUserId={manualOverrides[result.mapping.name]}
                        />
                      ))}
                      {dryRunResult.ambiguous.length === 0 && (
                        <EmptyState message="No ambiguous matches" icon={CheckCircle2} />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="skipped" className="mt-0">
                    <div className="space-y-2">
                      {dryRunResult.skipped.map((result, idx) => (
                        <div key={idx} className="p-2 rounded bg-muted/50 text-sm">
                          <span className="font-medium">{result.mapping.name || '(no name)'}</span>
                          <span className="text-muted-foreground ml-2">- {result.reason}</span>
                        </div>
                      ))}
                      {dryRunResult.skipped.length === 0 && (
                        <EmptyState message="No skipped records" icon={CheckCircle2} />
                      )}
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              {/* Export & Apply Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={exportMismatches} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Mismatches
                </Button>
                <Button 
                  onClick={handleApply}
                  disabled={dryRunMode || bulkUpdate.isPending || (hasBlockingErrors && Object.keys(manualOverrides).length === 0)}
                  className="bg-brand-primary hover:bg-brand-primary-hover"
                >
                  {bulkUpdate.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Apply Updates ({dryRunResult.matched.length + Object.keys(manualOverrides).length})
                    </>
                  )}
                </Button>
              </div>

              {hasBlockingErrors && !dryRunMode && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Resolve mismatches or turn off dry-run mode to proceed
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MatchedResultRow({ result }: { result: MatchResult }) {
  const hasChanges = result.changes && Object.keys(result.changes).length > 0;
  
  return (
    <div className={cn(
      "p-2 rounded border text-sm",
      hasChanges ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : "bg-muted/30"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="font-medium">{result.mapping.name}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{result.matchedUser?.full_name}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {result.matchType.replace('_', ' ')}
        </Badge>
      </div>
      {hasChanges && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Object.entries(result.changes!).map(([field, change]) => (
            <Badge key={field} variant="secondary" className="text-xs">
              {field}: {change.old || '∅'} → {change.new}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function MismatchResultRow({ 
  result, 
  users,
  onLink,
  onIgnore,
  linkedUserId
}: { 
  result: MatchResult;
  users: UserProfile[];
  onLink: (name: string, userId: string) => void;
  onIgnore: (name: string) => void;
  linkedUserId?: string;
}) {
  const [showCandidates, setShowCandidates] = useState(false);
  const linkedUser = linkedUserId ? users.find((u) => u.id === linkedUserId) : null;

  return (
    <div className={cn(
      "p-2 rounded border text-sm",
      linkedUser 
        ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
        : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {linkedUser ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : result.matchType === 'not_found' ? (
            <XCircle className="h-4 w-4 text-red-600" />
          ) : (
            <HelpCircle className="h-4 w-4 text-amber-600" />
          )}
          <span className="font-medium">{result.mapping.name}</span>
          {linkedUser && (
            <>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-green-700 dark:text-green-400">{linkedUser.full_name}</span>
            </>
          )}
        </div>
        {!linkedUser && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => setShowCandidates(!showCandidates)}
          >
            {showCandidates ? 'Hide' : 'Link'}
          </Button>
        )}
        {linkedUser && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-muted-foreground"
            onClick={() => onIgnore(result.mapping.name)}
          >
            Undo
          </Button>
        )}
      </div>
      
      {!linkedUser && (
        <p className="text-xs text-muted-foreground mt-1">{result.reason}</p>
      )}

      {showCandidates && !linkedUser && (
        <div className="mt-2 space-y-1">
          {result.candidates && result.candidates.length > 0 ? (
            result.candidates.map((candidate) => (
              <div 
                key={candidate.id}
                className="flex items-center justify-between p-1 rounded bg-background"
              >
                <span className="text-xs">{candidate.full_name} ({candidate.email})</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-5 text-xs px-2"
                  onClick={() => {
                    onLink(result.mapping.name, candidate.id);
                    setShowCandidates(false);
                  }}
                >
                  Link
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No similar candidates found</p>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message, icon: Icon = AlertTriangle }: { message: string; icon?: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Icon className="h-8 w-8 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
