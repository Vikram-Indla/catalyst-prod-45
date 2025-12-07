import { AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserAvatar } from '@/components/release/UserAvatar';
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
          ? "bg-red-50 border-red-300" 
          : "bg-white border-[#E8E8E8]"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn("w-4 h-4", isMajorIncident ? "text-red-600" : "text-[#8C8C8C]")} />
          <h4 className={cn(
            "text-sm font-semibold",
            isMajorIncident ? "text-red-700" : "text-[#172B4D]"
          )}>
            Major Incident
          </h4>
        </div>
        {isEditMode ? (
          <Switch 
            checked={isMajorIncident} 
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-red-600"
          />
        ) : (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded",
            isMajorIncident ? "bg-red-200 text-red-800" : "bg-gray-100 text-gray-600"
          )}>
            {isMajorIncident ? 'ON' : 'OFF'}
          </span>
        )}
      </div>

      {isMajorIncident && (
        <div className="space-y-3">
          <p className="text-xs text-red-600">
            This incident requires:
          </p>
          <ul className="text-xs text-red-600 space-y-1 ml-4 list-disc">
            <li>Incident Commander assignment</li>
            <li>War room coordination</li>
            <li>Enhanced notifications</li>
          </ul>

          <div className="pt-2 border-t border-red-200">
            <label className="text-[11px] font-semibold uppercase text-red-700 mb-2 block">
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
                <SelectTrigger className="w-full bg-white border-red-200">
                  <SelectValue placeholder="Select Commander..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {COMMANDERS.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <UserAvatar initials={user.initials} size="sm" />
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : commander ? (
              <div className="flex items-center gap-2">
                <UserAvatar initials={commander.initials} size="sm" />
                <span className="text-sm font-medium text-red-800">{commander.name}</span>
              </div>
            ) : (
              <span className="text-sm text-red-600 italic">Not assigned</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
