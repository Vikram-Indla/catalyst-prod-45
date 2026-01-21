/**
 * Module 3C-3: Change Preview Table Component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Minus } from 'lucide-react';
import type { TestCasePreview } from '../../types/batch-update';
import { FIELD_LABELS } from '../../types/batch-update';

interface ChangePreviewTableProps {
  previews: TestCasePreview[];
}

export function ChangePreviewTable({ previews }: ChangePreviewTableProps) {
  if (previews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No changes to preview
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Case #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-48">Field</TableHead>
            <TableHead className="w-40">Before</TableHead>
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-40">After</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {previews.map(preview => (
            <React.Fragment key={preview.test_case_id}>
              {preview.changes.map((change, idx) => (
                <TableRow key={`${preview.test_case_id}-${change.field}`}>
                  {idx === 0 ? (
                    <>
                      <TableCell
                        rowSpan={preview.changes.length}
                        className="font-mono text-sm align-top"
                      >
                        {preview.case_number}
                      </TableCell>
                      <TableCell
                        rowSpan={preview.changes.length}
                        className="align-top font-medium"
                      >
                        <span className="line-clamp-2">{preview.title}</span>
                      </TableCell>
                    </>
                  ) : null}
                  <TableCell>
                    <Badge variant="outline">
                      {FIELD_LABELS[change.field] || change.field}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {change.old_value ? (
                      <span className="line-through text-muted-foreground">
                        {change.old_value}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Minus className="w-3 h-3" />
                        empty
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-auto" />
                  </TableCell>
                  <TableCell>
                    {change.new_value ? (
                      <span className="font-medium text-primary">
                        {change.new_value}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Minus className="w-3 h-3" />
                        empty
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
