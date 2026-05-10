import { useState, useMemo } from 'react';
import Spinner from '@atlaskit/spinner';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import DownloadIcon from '@atlaskit/icon/core/download';
import InformationCircleIcon from '@atlaskit/icon/core/information-circle';
import UploadIcon from '@atlaskit/icon/core/upload';
import VideoPlayIcon from '@atlaskit/icon/core/video-play';
import WarningIcon from '@atlaskit/icon/core/warning';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import Button from '@atlaskit/button/new';
import TextArea from '@atlaskit/textarea';
import Toggle from '@atlaskit/toggle';
import { Lozenge } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
            <UploadIcon label="" size="small" />
            Bulk Update Users
          </SheetTitle>
          <SheetDescription>
            Update vendor, contract, and country metadata for multiple users at once.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* JSON Input */}
          <div className="space-y-2">
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Mapping Data (JSON)</label>
            <TextArea
              value={jsonInput}
              onChange={(e) => setJsonInput((e.target as HTMLTextAreaElement).value)}
              placeholder="Paste JSON mapping array..."
              minimumRows={6}
            />
            {parseError && (
              <p className="text-sm flex items-center gap-1" style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>
                <CrossCircleIcon label="" size="small" />
                {parseError}
              </p>
            )}
          </div>

          {/* Dry Run Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Toggle
                id="dry-run"
                isChecked={dryRunMode}
                onChange={() => setDryRunMode(m => !m)}
              />
              <label htmlFor="dry-run" style={{ fontSize: '14px', color: 'var(--ds-text, #172B4D)' }}>Dry Run Mode (Preview Only)</label>
            </div>
            <Button appearance="default" onClick={handleDryRun} iconBefore={VideoPlayIcon}>
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
                        <EmptyState message="All users found" icon={CheckCircleIcon} />
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
                        <EmptyState message="No ambiguous matches" icon={CheckCircleIcon} />
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
                        <EmptyState message="No skipped records" icon={CheckCircleIcon} />
                      )}
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              {/* Export & Apply Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button appearance="default" onClick={exportMismatches} iconBefore={DownloadIcon}>
                  Export Mismatches
                </Button>
                <Button
                  appearance="primary"
                  onClick={handleApply}
                  isDisabled={dryRunMode || bulkUpdate.isPending || (hasBlockingErrors && Object.keys(manualOverrides).length === 0)}
                >
                  {bulkUpdate.isPending ? (
                    <>
                      <Spinner size="small" />
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
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--ds-text-warning, #974F0C)' }}>
                  <WarningIcon label="" size="small" />
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
          <CheckCircleIcon label="" size="small" />
          <span className="font-medium">{result.mapping.name}</span>
          <ArrowRightIcon label="" size="small" />
          <span className="text-muted-foreground">{result.matchedUser?.full_name}</span>
        </div>
        <Lozenge appearance="default">
          {result.matchType.replace('_', ' ')}
        </Lozenge>
      </div>
      {hasChanges && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Object.entries(result.changes!).map(([field, change]) => (
            <Lozenge key={field} appearance="default">
              {field}: {change.old || '∅'} → {change.new}
            </Lozenge>
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
            <CheckCircleIcon label="" size="small" />
          ) : result.matchType === 'not_found' ? (
            <CrossCircleIcon label="" size="small" />
          ) : (
            <InformationCircleIcon label="" size="small" />
          )}
          <span className="font-medium">{result.mapping.name}</span>
          {linkedUser && (
            <>
              <ArrowRightIcon label="" size="small" />
              <span className="text-green-700 dark:text-green-400">{linkedUser.full_name}</span>
            </>
          )}
        </div>
        {!linkedUser && (
          <Button
            appearance="subtle"
            onClick={() => setShowCandidates(!showCandidates)}
          >
            {showCandidates ? 'Hide' : 'Link'}
          </Button>
        )}
        {linkedUser && (
          <Button
            appearance="subtle"
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
                  appearance="default"
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

function EmptyState({ message, icon: Icon = WarningIcon }: { message: string; icon?: React.ComponentType<{ label: string; size?: string; primaryColor?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
      <span style={{ marginBottom: '8px' }}><Icon label="" size="large" primaryColor="var(--ds-icon-subtle, #626F86)" /></span>
      <p className="text-sm">{message}</p>
    </div>
  );
}
