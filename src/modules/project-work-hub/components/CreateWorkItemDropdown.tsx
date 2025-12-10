import React from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Plus, ChevronDown, Zap, Bookmark, CheckSquare, Bug, AlertTriangle } from 'lucide-react';
import { WorkItemType } from '../types';

interface CreateWorkItemDropdownProps {
  onSelect: (type: WorkItemType) => void;
}

export const CreateWorkItemDropdown: React.FC<CreateWorkItemDropdownProps> = ({ onSelect }) => {
  return (
    <DropdownMenu
      trigger={({ triggerRef, ...props }) => (
        <Button
          ref={triggerRef as any}
          {...props}
          appearance="primary"
          iconBefore={<Plus size={16} />}
          iconAfter={<ChevronDown size={16} />}
        >
          Create
        </Button>
      )}
    >
      <DropdownItemGroup>
        <DropdownItem
          onClick={() => onSelect('FEATURE')}
          elemBefore={<Zap size={16} color="#36B37E" />}
        >
          Create Feature
        </DropdownItem>
        <DropdownItem
          onClick={() => onSelect('STORY')}
          elemBefore={<Bookmark size={16} color="#36B37E" />}
        >
          Create Story
        </DropdownItem>
        <DropdownItem
          onClick={() => onSelect('SUBTASK')}
          elemBefore={<CheckSquare size={16} color="#2684FF" />}
        >
          Create Subtask
        </DropdownItem>
      </DropdownItemGroup>
      <DropdownItemGroup title="Log Issue">
        <DropdownItem
          onClick={() => onSelect('DEFECT')}
          elemBefore={<Bug size={16} color="#FF5630" />}
        >
          Log Defect
        </DropdownItem>
        <DropdownItem
          onClick={() => onSelect('INCIDENT')}
          elemBefore={<AlertTriangle size={16} color="#FF991F" />}
        >
          Log Incident
        </DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
};
