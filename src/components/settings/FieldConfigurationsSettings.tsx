import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';

// Source: Field_Configurations.doc
// "AIO Tests allows you to configure the default fields in Cases, Sets, Cycles and Run"
// Toggle Enabled/Disabled and Mandatory/Optional per field

interface FieldConfig {
  id: string;
  name: string;
  enabled: boolean;
  required: boolean;
}

const DEFAULT_CASE_FIELDS: FieldConfig[] = [
  { id: 'title', name: 'Title', enabled: true, required: true },
  { id: 'description', name: 'Description', enabled: true, required: false },
  { id: 'status', name: 'Status', enabled: true, required: true },
  { id: 'priority', name: 'Priority', enabled: true, required: false },
  { id: 'type', name: 'Type', enabled: true, required: false },
  { id: 'folder', name: 'Folder', enabled: true, required: false },
  { id: 'labels', name: 'Labels', enabled: true, required: false },
  { id: 'owner', name: 'Owner', enabled: true, required: false },
  { id: 'estimate', name: 'Estimate', enabled: true, required: false },
];

const DEFAULT_SET_FIELDS: FieldConfig[] = [
  { id: 'title', name: 'Title', enabled: true, required: true },
  { id: 'description', name: 'Description', enabled: true, required: false },
  { id: 'folder', name: 'Folder', enabled: true, required: false },
];

const DEFAULT_CYCLE_FIELDS: FieldConfig[] = [
  { id: 'title', name: 'Title', enabled: true, required: true },
  { id: 'description', name: 'Description', enabled: true, required: false },
  { id: 'status', name: 'Status', enabled: true, required: true },
  { id: 'start_date', name: 'Start Date', enabled: true, required: false },
  { id: 'end_date', name: 'End Date', enabled: true, required: false },
  { id: 'folder', name: 'Folder', enabled: true, required: false },
];

const DEFAULT_RUN_FIELDS: FieldConfig[] = [
  { id: 'status', name: 'Status', enabled: true, required: true },
  { id: 'assignee', name: 'Assignee', enabled: true, required: false },
  { id: 'actual_time', name: 'Actual Time', enabled: true, required: false },
  { id: 'comments', name: 'Comments', enabled: true, required: false },
  { id: 'defects', name: 'Defects', enabled: true, required: false },
];

export function FieldConfigurationsSettings() {
  const [caseFields, setCaseFields] = useState<FieldConfig[]>(DEFAULT_CASE_FIELDS);
  const [setFields, setSetFields] = useState<FieldConfig[]>(DEFAULT_SET_FIELDS);
  const [cycleFields, setCycleFields] = useState<FieldConfig[]>(DEFAULT_CYCLE_FIELDS);
  const [runFields, setRunFields] = useState<FieldConfig[]>(DEFAULT_RUN_FIELDS);

  const updateField = (
    fields: FieldConfig[],
    setFields: React.Dispatch<React.SetStateAction<FieldConfig[]>>,
    fieldId: string,
    key: 'enabled' | 'required',
    value: boolean
  ) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f));
  };

  const renderFieldsTable = (
    fields: FieldConfig[],
    setFields: React.Dispatch<React.SetStateAction<FieldConfig[]>>
  ) => (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
        <span>Field Name</span>
        <span className="text-center">Enabled</span>
        <span className="text-center">Required</span>
      </div>
      {fields.map(field => (
        <div key={field.id} className="grid grid-cols-3 gap-4 items-center py-2">
          <Label className="text-sm">{field.name}</Label>
          <div className="flex justify-center">
            <Switch
              checked={field.enabled}
              onCheckedChange={(checked) => updateField(fields, setFields, field.id, 'enabled', checked)}
            />
          </div>
          <div className="flex justify-center">
            <Switch
              checked={field.required}
              onCheckedChange={(checked) => updateField(fields, setFields, field.id, 'required', checked)}
              disabled={!field.enabled}
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-brand-gold" />
          Field Configurations
        </CardTitle>
        <CardDescription>
          Configure which fields are enabled and required for Cases, Sets, Cycles, and Runs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cases">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cases">Cases</TabsTrigger>
            <TabsTrigger value="sets">Sets</TabsTrigger>
            <TabsTrigger value="cycles">Cycles</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
          </TabsList>
          <TabsContent value="cases" className="mt-4">
            {renderFieldsTable(caseFields, setCaseFields)}
          </TabsContent>
          <TabsContent value="sets" className="mt-4">
            {renderFieldsTable(setFields, setSetFields)}
          </TabsContent>
          <TabsContent value="cycles" className="mt-4">
            {renderFieldsTable(cycleFields, setCycleFields)}
          </TabsContent>
          <TabsContent value="runs" className="mt-4">
            {renderFieldsTable(runFields, setRunFields)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
