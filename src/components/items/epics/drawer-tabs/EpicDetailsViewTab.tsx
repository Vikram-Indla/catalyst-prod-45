/**
 * EpicDetailsViewTab - Cloned from DemandDetailsViewTab
 * 
 * Changes from BusinessRequest:
 * - Summary* (required)
 * - Description (rich text, empty by default)
 * - Reporter* (required)
 * - Assignee* (required)
 * - REMOVED: Department, Business Owner
 * 
 * Conditional fields (ONLY if Business Request is linked):
 * - Strategic Theme (editable dropdown)
 * - Linked Business Request (editable dropdown)
 * 
 * Planning & Delivery:
 * - Start Date
 * - Target Complete with lock icon
 * - Delivery Track (same values)
 * - MVP checkbox (boolean)
 * - Delivery Platform
 * - Quarter
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Check, ChevronsUpDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { UserPicker } from '@/components/ui/user-picker';
import { 
  DeliveryPlatformSelect, 
  DeliveryTrackSelect, 
  PlannedQuarterSelect 
} from '@/components/ui/lookup-select';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface EpicDetailsViewTabProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function EpicDetailsViewTab({ data, onChange }: EpicDetailsViewTabProps) {
  const [targetDateLocked, setTargetDateLocked] = useState(data.date_locked || false);
  const [themePopoverOpen, setThemePopoverOpen] = useState(false);
  const [brPopoverOpen, setBrPopoverOpen] = useState(false);
  const currentUser = 'Current User';

  // Fetch strategic themes
  const { data: themes = [] } = useQuery({
    queryKey: ['strategic-themes-for-epic-drawer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name, status')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch business requests for linking
  const { data: businessRequests = [] } = useQuery({
    queryKey: ['business-requests-for-epic-drawer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, request_key, title, rank, business_score')
        .is('deleted_at', null)
        .order('request_key');
      if (error) throw error;
      return data;
    },
  });

  // Get selected theme and BR
  const selectedTheme = themes.find(t => t.id === data.theme_id);
  const selectedBR = businessRequests.find(br => br.id === data.linked_business_request_id);

  const handleLockToggle = () => {
    if (targetDateLocked) {
      setTargetDateLocked(false);
      onChange('date_locked', false);
      toast.info('Target Completion Date unlocked');
    } else {
      if (!data.start_date) {
        toast.error('Cannot lock: Start Date must be populated first');
        return;
      }
      if (!data.target_completion_date && !data.end_date) {
        toast.error('Cannot lock: Target Completion Date must be populated first');
        return;
      }
      setTargetDateLocked(true);
      onChange('date_locked', true);
      toast.success(`Target Completion Date locked by ${currentUser}`);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-5 bg-muted/30 p-1">
      {/* DETAILS Section */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Details</h3>
          
        {/* Summary - required */}
        <div>
          <Label className="text-xs font-medium">
            Summary <span className="text-destructive">*</span>
          </Label>
          <Input
            value={data.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Enter epic summary"
            className="mt-1 h-9 text-sm"
          />
        </div>

        {/* Description - empty by default, no prefilled template */}
        <div>
          <Label className="text-xs font-medium">Description</Label>
          <div className="mt-1">
            <RichTextEditor
              value={data.description || ''}
              onChange={(value) => onChange('description', value)}
              placeholder="Describe the epic..."
            />
          </div>
        </div>

        {/* People - 2 column (Reporter, Assignee only - removed Department, Business Owner) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium">
              Reporter <span className="text-destructive">*</span>
            </Label>
            <div className="mt-1">
              <UserPicker
                value={data.reporter_id || null}
                onChange={(value) => onChange('reporter_id', value as string | null)}
                placeholder="Select reporter..."
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">
              Assignee <span className="text-destructive">*</span>
            </Label>
            <div className="mt-1">
              <UserPicker
                value={data.assignee_id || null}
                onChange={(value) => onChange('assignee_id', value as string | null)}
                placeholder="Select assignee..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* STRATEGIC ALIGNMENT Section */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Strategic Alignment</h3>
        
        {/* Strategic Theme - Editable dropdown */}
        <div>
          <Label className="text-xs font-medium">Strategic Theme</Label>
          <Popover open={themePopoverOpen} onOpenChange={setThemePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={themePopoverOpen}
                className="w-full justify-between font-normal h-9 mt-1"
              >
                {selectedTheme ? selectedTheme.name : 'Select strategic theme...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 z-[400]" align="start">
              <Command>
                <CommandInput placeholder="Search themes..." />
                <CommandList>
                  <CommandEmpty>No themes found.</CommandEmpty>
                  <CommandGroup>
                    {/* Clear option */}
                    {data.theme_id && (
                      <CommandItem
                        value="clear"
                        onSelect={() => {
                          onChange('theme_id', null);
                          setThemePopoverOpen(false);
                        }}
                        className="text-muted-foreground"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear selection
                      </CommandItem>
                    )}
                    {themes.map((theme) => (
                      <CommandItem
                        key={theme.id}
                        value={theme.name}
                        onSelect={() => {
                          onChange('theme_id', theme.id);
                          setThemePopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            data.theme_id === theme.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span>{theme.name}</span>
                        {theme.status && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {theme.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Linked Business Request - Editable dropdown */}
        <div>
          <Label className="text-xs font-medium">Linked Business Request</Label>
          <Popover open={brPopoverOpen} onOpenChange={setBrPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={brPopoverOpen}
                className="w-full justify-between font-normal h-9 mt-1"
              >
                {selectedBR ? (
                  <span className="flex items-center gap-2 truncate">
                    <span className="font-mono text-brand-gold">{selectedBR.request_key}</span>
                    <span className="truncate">{selectedBR.title}</span>
                  </span>
                ) : (
                  'Select business request (optional)...'
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0 z-[400]" align="start">
              <Command>
                <CommandInput placeholder="Search by ID or title..." />
                <CommandList>
                  <CommandEmpty>No business requests found.</CommandEmpty>
                  <CommandGroup>
                    {/* Clear option */}
                    {data.linked_business_request_id && (
                      <CommandItem
                        value="clear"
                        onSelect={() => {
                          onChange('linked_business_request_id', null);
                          setBrPopoverOpen(false);
                        }}
                        className="text-muted-foreground"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear selection
                      </CommandItem>
                    )}
                    {businessRequests.map((br) => (
                      <CommandItem
                        key={br.id}
                        value={`${br.request_key} ${br.title}`}
                        onSelect={() => {
                          onChange('linked_business_request_id', br.id);
                          setBrPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            data.linked_business_request_id === br.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-mono text-brand-gold shrink-0">
                            {br.request_key}
                          </span>
                          <span className="truncate">{br.title}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {br.rank && (
                            <Badge variant="outline" className="text-[10px]">
                              Rank #{br.rank}
                            </Badge>
                          )}
                          {br.business_score && (
                            <Badge variant="secondary" className="text-[10px]">
                              Score: {br.business_score}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* PLANNING & DELIVERY Section */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm flex-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Planning & Delivery</h3>
          
        {/* Dates - 2-column (Start Date, Target Complete) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Start Date</Label>
            <CatalystDatePicker
              value={data.start_date || null}
              onChange={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select"
            />
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Target Complete</Label>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <CatalystDatePicker
                  value={data.target_completion_date || data.end_date || null}
                  onChange={(date) => onChange('target_completion_date', date ? format(date, 'yyyy-MM-dd') : null)}
                  placeholder="Select"
                  disabled={targetDateLocked}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleLockToggle}
                className={cn(
                  "shrink-0 h-9 w-9",
                  targetDateLocked && "bg-muted border-brand-gold text-brand-gold"
                )}
                title={targetDateLocked ? 'Unlock date' : 'Lock date'}
              >
                {targetDateLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Delivery context - 3-column + MVP */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-medium">Delivery Track</Label>
            <div className="mt-1">
              <DeliveryTrackSelect
                value={data.delivery_track || null}
                onChange={(value) => onChange('delivery_track', value)}
              />
            </div>
          </div>
          
          <div>
            <Label className="text-xs font-medium">Delivery Platform</Label>
            <div className="mt-1">
              <DeliveryPlatformSelect
                value={data.delivery_platform || null}
                onChange={(value) => onChange('delivery_platform', value)}
              />
            </div>
          </div>
          
          <div>
            <Label className="text-xs font-medium">Quarter</Label>
            <div className="mt-1">
              <PlannedQuarterSelect
                value={data.quarters?.[0] || null}
                onChange={(value) => onChange('quarters', value ? [value] : [])}
              />
            </div>
          </div>
        </div>

        {/* MVP Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="mvp"
            checked={data.mvp || false}
            onCheckedChange={(checked) => onChange('mvp', checked)}
          />
          <Label htmlFor="mvp" className="text-sm font-medium cursor-pointer">
            MVP (Minimum Viable Product)
          </Label>
        </div>
      </div>
    </div>
  );
}
