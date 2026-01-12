/**
 * EnvironmentSelector - Enhanced environment selection for test execution
 */

import { useState } from 'react';
import { Check, ChevronDown, Globe, Server, Plus, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

export interface Environment {
  id: string;
  name: string;
  description?: string;
  url?: string;
  type: 'development' | 'staging' | 'uat' | 'production' | 'custom';
  isDefault?: boolean;
  status?: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastChecked?: string;
}

interface EnvironmentSelectorProps {
  environments: Environment[];
  selectedEnvironmentId?: string;
  onSelect: (environmentId: string) => void;
  onCreateNew?: () => void;
  onManage?: () => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showStatus?: boolean;
}

const typeConfig = {
  development: { label: 'Dev', color: 'bg-blue-500' },
  staging: { label: 'Staging', color: 'bg-purple-500' },
  uat: { label: 'UAT', color: 'bg-amber-500' },
  production: { label: 'Prod', color: 'bg-red-500' },
  custom: { label: 'Custom', color: 'bg-gray-500' },
};

const statusConfig = {
  healthy: { label: 'Healthy', color: 'text-green-500', bgColor: 'bg-green-500' },
  degraded: { label: 'Degraded', color: 'text-amber-500', bgColor: 'bg-amber-500' },
  down: { label: 'Down', color: 'text-red-500', bgColor: 'bg-red-500' },
  unknown: { label: 'Unknown', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

function EnvironmentBadge({ type }: { type: Environment['type'] }) {
  const config = typeConfig[type];
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white',
      config.color
    )}>
      {config.label}
    </span>
  );
}

function StatusIndicator({ status }: { status: Environment['status'] }) {
  if (!status) return null;
  const config = statusConfig[status];
  return (
    <span className={cn('h-2 w-2 rounded-full', config.bgColor)} />
  );
}

export function EnvironmentSelector({
  environments,
  selectedEnvironmentId,
  onSelect,
  onCreateNew,
  onManage,
  disabled = false,
  className,
  placeholder = 'Select environment...',
  showStatus = true,
}: EnvironmentSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedEnvironment = environments.find(e => e.id === selectedEnvironmentId);

  // Group environments by type
  const groupedEnvironments = environments.reduce((acc, env) => {
    if (!acc[env.type]) acc[env.type] = [];
    acc[env.type].push(env);
    return acc;
  }, {} as Record<string, Environment[]>);

  const typeOrder: Environment['type'][] = ['development', 'staging', 'uat', 'production', 'custom'];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('justify-between min-w-[200px]', className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedEnvironment ? (
              <>
                <span className="truncate">{selectedEnvironment.name}</span>
                <EnvironmentBadge type={selectedEnvironment.type} />
                {showStatus && selectedEnvironment.status && (
                  <StatusIndicator status={selectedEnvironment.status} />
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search environments..." />
          <CommandList>
            <CommandEmpty>No environment found.</CommandEmpty>
            
            {typeOrder.map(type => {
              const envs = groupedEnvironments[type];
              if (!envs?.length) return null;

              return (
                <CommandGroup key={type} heading={typeConfig[type].label}>
                  {envs.map((env) => (
                    <HoverCard key={env.id} openDelay={500}>
                      <HoverCardTrigger asChild>
                        <CommandItem
                          value={`${env.name}-${env.id}`}
                          onSelect={() => {
                            onSelect(env.id);
                            setOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                'h-4 w-4',
                                selectedEnvironmentId === env.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span>{env.name}</span>
                            {env.isDefault && (
                              <Badge variant="secondary" className="text-[10px] px-1">
                                Default
                              </Badge>
                            )}
                          </div>
                          {showStatus && env.status && (
                            <StatusIndicator status={env.status} />
                          )}
                        </CommandItem>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" className="w-64">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{env.name}</h4>
                            <EnvironmentBadge type={env.type} />
                          </div>
                          {env.description && (
                            <p className="text-sm text-muted-foreground">{env.description}</p>
                          )}
                          {env.url && (
                            <a 
                              href={env.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {new URL(env.url).hostname}
                            </a>
                          )}
                          {env.status && (
                            <div className="flex items-center gap-2 text-sm">
                              <StatusIndicator status={env.status} />
                              <span className={statusConfig[env.status].color}>
                                {statusConfig[env.status].label}
                              </span>
                              {env.lastChecked && (
                                <span className="text-muted-foreground text-xs">
                                  • Checked {env.lastChecked}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </CommandGroup>
              );
            })}

            {(onCreateNew || onManage) && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {onCreateNew && (
                    <CommandItem onSelect={onCreateNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Environment
                    </CommandItem>
                  )}
                  {onManage && (
                    <CommandItem onSelect={onManage}>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Environments
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
