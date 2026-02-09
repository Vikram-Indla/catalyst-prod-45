import { Eye, Pencil, Copy, FolderInput, Tag, Trash2 } from 'lucide-react';

interface TestCase {
  id: string;
  caseKey: string;
  title: string;
}

interface TestCaseContextMenuProps {
  x: number;
  y: number;
  testCase: TestCase;
  onView: () => void;
  onEdit: () => void;
  onClone: () => void;
  onMove: () => void;
  onChangeStatus: () => void;
  onDelete: () => void;
  onClose: () => void;
}

interface MenuItemProps {
  icon: any;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

function ContextMenuItem({ icon: Icon, children, onClick, danger }: MenuItemProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: 'transparent',
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
        color: danger ? '#DC2626' : '#334155',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = danger ? '#FEF2F2' : '#F8FAFC';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Icon style={{ width: 16, height: 16, color: danger ? '#DC2626' : '#64748B' }} />
      {children}
    </button>
  );
}

export function TestCaseContextMenu({
  x,
  y,
  onView,
  onEdit,
  onClone,
  onMove,
  onChangeStatus,
  onDelete,
}: TestCaseContextMenuProps) {
  // Adjust position to keep menu on screen
  const menuWidth = 180;
  const menuHeight = 280; // approximate
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return (
    <div
      style={{
        position: 'fixed',
        left: Math.max(8, adjustedX),
        top: Math.max(8, adjustedY),
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        minWidth: menuWidth,
        padding: 6,
        zIndex: 1001,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <ContextMenuItem icon={Eye} onClick={onView}>
        View
      </ContextMenuItem>
      <ContextMenuItem icon={Pencil} onClick={onEdit}>
        Edit
      </ContextMenuItem>
      <ContextMenuItem icon={Copy} onClick={onClone}>
        Clone
      </ContextMenuItem>
      
      <div style={{ height: 1, background: '#E2E8F0', margin: '6px 0' }} />
      
      <ContextMenuItem icon={FolderInput} onClick={onMove}>
        Move to...
      </ContextMenuItem>
      <ContextMenuItem icon={Tag} onClick={onChangeStatus}>
        Change Status
      </ContextMenuItem>
      
      <div style={{ height: 1, background: '#E2E8F0', margin: '6px 0' }} />
      
      <ContextMenuItem icon={Trash2} onClick={onDelete} danger>
        Delete
      </ContextMenuItem>
    </div>
  );
}

export default TestCaseContextMenu;
