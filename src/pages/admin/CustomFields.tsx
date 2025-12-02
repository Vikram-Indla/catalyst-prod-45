import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function CustomFields() {
  const [entityFilter, setEntityFilter] = useState<string>('');

  const { data: customFields } = useQuery({
    queryKey: ['custom-field-defs', entityFilter],
    queryFn: async () => {
      let query = supabase.from('custom_field_defs').select('*').order('entity_type');
      
      if (entityFilter) {
        query = query.eq('entity_type', entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getFieldTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      text: 'bg-info/10 text-info border-info/20',
      number: 'bg-success/10 text-success border-success/20',
      date: 'bg-primary/10 text-primary border-primary/20',
      select: 'bg-warning/10 text-warning border-warning/20',
      multi_select: 'bg-warning/10 text-warning border-warning/20',
      boolean: 'bg-info/10 text-info border-info/20',
    };
    
    return colors[type] || '';
  };

  const groupedFields = customFields?.reduce((acc, field) => {
    if (!acc[field.entity_type]) {
      acc[field.entity_type] = [];
    }
    acc[field.entity_type].push(field);
    return acc;
  }, {} as Record<string, typeof customFields>);

  return (
    <div className="px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s6)] space-y-[var(--s4)] sm:space-y-[var(--s6)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[var(--s3)] sm:gap-[var(--s4)]">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">Custom Fields</h1>
          <p className="text-muted-foreground">Extend work items with custom attributes</p>
        </div>
      </div>

      <div className="flex gap-[var(--s4)]">
        <Select value={entityFilter || undefined} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All Entity Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="initiative">Initiative</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="story">Story</SelectItem>
            <SelectItem value="theme">Theme</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {groupedFields && Object.entries(groupedFields).map(([entityType, fields]) => (
        <Card key={entityType}>
          <CardHeader>
            <CardTitle className="capitalize">{entityType} Fields</CardTitle>
            <CardDescription>Custom fields for {entityType} entities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getFieldTypeBadge(field.field_type)}>
                        {field.field_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Checkbox checked={field.required || false} disabled />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {field.options_json ? (
                        <span className="text-xs">
                          {JSON.stringify(field.options_json).substring(0, 50)}...
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {(!customFields || customFields.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No custom fields configured yet
          </CardContent>
        </Card>
      )}
    </div>
  );
}
