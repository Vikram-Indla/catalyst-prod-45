import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, UserPlus, CheckCircle, Archive, Trash2 } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { StatusLozenge as DefectStatusBadge } from '@/components/shared/StatusLozenge';
import CatalystAvatar from "@/components/shared/CatalystAvatar";
import { JiraTable, makeDateCell, makeRowActionsCell } from "@/components/shared/JiraTable";
import type { Column, SortOrder } from "@/components/shared/JiraTable/types";
import type { RowAction } from "@/components/shared/JiraTable";
import { Defect } from "@/data/defectsData";
import { token } from "@atlaskit/tokens";

interface DefectTableViewProps {
  defects: Defect[];
  onUpdateStatus: (defectId: string, status: string) => void;
  onDelete: (defectId: string) => void;
  onEdit?: (defect: Defect) => void;
  onReassign?: (defect: Defect) => void;
}

export function DefectTableView({ defects, onUpdateStatus, onDelete, onEdit, onReassign }: DefectTableViewProps) {
  const navigate = useNavigate();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  const dateCell = useMemo(() => makeDateCell((row: Defect) => row.createdAt), []);

  const actionsCell = useMemo(() => {
    const actions: RowAction<Defect>[] = [
      { id: 'view', label: 'View', icon: <Eye size={16} />, onClick: (row) => navigate(`/releases/defects/${row.id}`) },
      { id: 'edit', label: 'Edit', icon: <Pencil size={16} />, onClick: (row) => onEdit?.(row) },
      { id: 'reassign', label: 'Reassign', icon: <UserPlus size={16} />, onClick: (row) => onReassign?.(row) },
      { id: 'resolve', label: 'Mark Resolved', icon: <CheckCircle size={16} />, onClick: (row) => onUpdateStatus(row.id, 'resolved') },
      { id: 'close', label: 'Close', icon: <Archive size={16} />, onClick: (row) => onUpdateStatus(row.id, 'closed') },
      { id: 'delete', label: 'Delete', icon: <Trash2 size={16} />, danger: true, onClick: (row) => onDelete(row.id) },
    ];
    return makeRowActionsCell<Defect>({ actions });
  }, [navigate, onDelete, onEdit, onReassign, onUpdateStatus]);

  const columns: Column<Defect>[] = useMemo(
    () => [
      {
        id: 'id',
        label: 'ID',
        width: 8,
        sortable: true,
        accessor: (row) => row.id,
        cell: ({ row }) => (
          <span
            style={{
              fontFamily: 'var(--ds-font-family-monospace, monospace)',
              fontSize: 'var(--ds-font-size-300)',
              fontWeight: 500,
              color: token('color.text.brand', 'var(--ds-text-brand)'),
            }}
          >
            {row.id}
          </span>
        ),
      },
      {
        id: 'title',
        label: 'Title',
        flex: true,
        alwaysVisible: true,
        sortable: true,
        accessor: (row) => row.title,
        cell: ({ row }) => (
          <span
            style={{
              fontWeight: 500,
              color: token('color.text', 'var(--ds-text)'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              maxWidth: 320,
            }}
            title={row.title}
          >
            {row.title}
          </span>
        ),
      },
      {
        id: 'severity',
        label: 'Severity',
        width: 10,
        sortable: true,
        accessor: (row) => row.severity,
        cell: ({ row }) => <SeverityBadge severity={row.severity} />,
      },
      {
        id: 'status',
        label: 'Status',
        width: 10,
        sortable: true,
        accessor: (row) => row.status,
        cell: ({ row }) => <DefectStatusBadge status={row.status} />,
      },
      {
        id: 'releaseId',
        label: 'Release',
        width: 10,
        sortable: true,
        accessor: (row) => row.releaseId,
        cell: ({ row }) => (
          <span style={{ color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>
            {row.releaseId}
          </span>
        ),
      },
      {
        id: 'linkedTestId',
        label: 'Linked Test',
        width: 10,
        sortable: true,
        accessor: (row) => row.linkedTestId,
        cell: ({ row }) =>
          row.linkedTestId ? (
            <span
              style={{
                color: token('color.text.brand', 'var(--ds-text-brand)'),
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {row.linkedTestId}
            </span>
          ) : (
            <span style={{ color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>—</span>
          ),
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 12,
        sortable: true,
        accessor: (row) => row.assignee?.name ?? null,
        cell: ({ row }) =>
          row.assignee ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CatalystAvatar size="small" name={row.assignee.name} appearance="circle" />
              <span style={{ color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>
                {row.assignee.name}
              </span>
            </span>
          ) : (
            <span style={{ color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>—</span>
          ),
      },
      {
        id: 'reporter',
        label: 'Reporter',
        width: 12,
        sortable: true,
        accessor: (row) => row.reporter?.name ?? null,
        cell: ({ row }) =>
          row.reporter ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CatalystAvatar size="small" name={row.reporter.name} appearance="circle" />
              <span style={{ color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>
                {row.reporter.name}
              </span>
            </span>
          ) : (
            <span style={{ color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>—</span>
          ),
      },
      {
        id: 'createdAt',
        label: 'Created',
        width: 10,
        sortable: true,
        accessor: (row) => row.createdAt,
        cell: dateCell,
      },
      {
        id: '__actions',
        label: '',
        width: 4,
        alwaysVisible: true,
        cell: actionsCell,
      },
    ],
    [dateCell, actionsCell],
  );

  return (
    <div
      style={{
        background: token('elevation.surface', 'var(--ds-surface)'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <JiraTable<Defect>
        columns={columns}
        data={defects}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/releases/defects/${row.id}`)}
        selectable
        selection={selection}
        onSelectionChange={setSelection}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={(key, order) => {
          setSortKey(key);
          setSortOrder(order);
        }}
        showRowCount={false}
        density="compact"
        ariaLabel="Defects"
        emptyView={
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>
              No defects found matching your filters.
            </p>
          </div>
        }
      />
    </div>
  );
}
