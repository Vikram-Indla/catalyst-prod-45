import { AlertTriangle } from '@/lib/atlaskit-icons';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystOwnerAvatar } from '@/components/ui/catalyst';
import { cn } from '@/lib/utils';
import type { Incident, Assignee } from '@/types/release';

interface MajorIncidentPanelProps {
  incident: Incident;
  isEditMode: boolean;
  editedData: Partial<Incident>;
  onFieldChange: (field: keyof Incident, value: any) => void;
}

const COMMANDERS: Assignee[] = [
  { id: 'c1', name: 'Sara Al-Fahad', initials: 'SF', email: 'sara@moi.gov.sa' },
  { id: 'c2', name: 'Ahmed Al-Rashid', initials: 'AA', email: 'ahmed@moi.gov.sa' },
  { id: 'c3', name: 'Mohammed Al-Hassan', initials: 'MH', email: 'm.hassan@moi.gov.sa' },
];

export function MajorIncidentPanel({
  incident,
  isEditMode,
  editedData,
  onFieldChange,
}: MajorIncidentPanelProps) {
  const isMajorIncident = editedData.isMajorIncident ?? incident.isMajorIncident ?? false;
  const commander = editedData.incidentCommander || incident.incidentCommander;

  const handleToggle = (checked: boolean) => {
    onFieldChange('isMajorIncident', checked);
    // Auto-set impact and urgency to high when major incident is flagged
    if (checked) {
      onFieldChange('impact', 'high');
      onFieldChange('urgency', 'high');
    }
  };

  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-colors",
        isMajorIncident
          ? "bg-[var(--ds-background-danger)] border-[var(--ds-border-danger)]"
          : "bg-white border-[var(--ds-border)]"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn("w-4 h-4", isMajorIncident ? "text-[var(--ds-text-danger)]" : "text-[var(--ds-text-subtlest)]")} />
          <h4 className={cn(
            "text-sm font-semibold",
            isMajorIncident ? "text-[var(--ds-text-danger)]" : "text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse)))]"
          )}>
            Major Incident
          </h4>
        </div>
        {isEditMode ? (
          <Switch
            checked={isMajorIncident}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-[var(--ds-background-danger)]"
          />
        ) : (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded",
            isMajorIncident ? "bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)]" : "bg-[var(--ds-background-neutral)] text-[var(--ds-text-subtle)]"
          )}>
            {isMajorIncident ? 'ON' : 'OFF'}
          </span>
        )}
      </div>

      {isMajorIncident && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--ds-text-danger)]">
            This incident requires:
          </p>
          <ul className="text-xs text-[var(--ds-text-danger)] space-y-1 ml-4 list-disc">
            <li>Incident Commander assignment</li>
            <li>War room coordination</li>
            <li>Enhanced notifications</li>
          </ul>

          <div className="pt-2 border-t border-[var(--ds-border-danger)]">
            <label className="text-[11px] font-semibold uppercase text-[var(--ds-text-danger)] mb-2 block">
              Incident Commander
            </label>
            {isEditMode ? (
              <Select
                value={commander?.id || ''}
                onValueChange={(v) => {
                  const user = COMMANDERS.find(u => u.id === v);
                  if (user) onFieldChange('incidentCommander', user);
                }}
              >
                <SelectTrigger className="w-full bg-white border-[var(--ds-border-danger)]">
                  <SelectValue placeholder="Select Commander..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {COMMANDERS.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <CatalystOwnerAvatar name={user.name} initials={user.initials} size="sm" />
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : commander ? (
              <div className="flex items-center gap-2">
                <CatalystOwnerAvatar name={commander.name} initials={commander.initials} size="sm" />
                <span className="text-sm font-medium text-[var(--ds-text-danger)]">{commander.name}</span>
              </div>
            ) : (
              <span className="text-sm text-[var(--ds-text-danger)] italic">Not assigned</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
