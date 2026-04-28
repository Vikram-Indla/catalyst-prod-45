/**
 * HeaderOverflowMenu — Jira 4-item overflow: Hide done · Sort › · Bulk edit · View in search.
 *
 * Primary: @atlaskit/dropdown-menu
 * Sort submenu: nested @atlaskit/popup anchored to the "Sort" item
 *
 * @atlaskit/dropdown-menu doesn't ship a slide-out submenu primitive (the
 * canonical Atlaskit pattern is to keep menus flat). We emulate Jira's
 * slide-out by opening a Popup positioned to the right when the Sort row
 * is interacted with.
 */
import React from 'react';
import DropdownMenu, {
  DropdownItem,
  DropdownItemCheckbox,
  DropdownItemCheckboxGroup,
  DropdownItemGroup,
} from '@atlaskit/dropdown-menu';
import Popup from '@atlaskit/popup';
import { MoreHorizontal, Edit3, Search, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { SORT_FIELDS, type SortField, type SortState } from './sort';

interface HeaderOverflowMenuProps {
  hideDone: boolean;
  onToggleHideDone: () => void;
  bulkEditMode: boolean;
  onEnterBulkEdit: () => void;
  onViewInSearch: () => void;
  sort: SortState;
  onCycleSort: (field: SortField) => void;
}

export function HeaderOverflowMenu({
  hideDone,
  onToggleHideDone,
  bulkEditMode,
  onEnterBulkEdit,
  onViewInSearch,
  sort,
  onCycleSort,
}: HeaderOverflowMenuProps) {
  const [sortOpen, setSortOpen] = React.useState(false);
  const sortAnchorRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <DropdownMenu
      placement="bottom-end"
      trigger={({ triggerRef, ...triggerProps }) => {
        /* jira-compare S-64 (2026-04-28): Atlaskit DropdownMenu spreads
           camelCase props (isSelected, testId) onto the trigger. When
           the trigger is a native <button> React warns. Strip the
           Atlaskit-only props before passing through. */
        const { isSelected: _isSelected, testId: _testId, ...nativeProps } = triggerProps as any;
        return (
        <button
          {...nativeProps}
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          type="button"
          className="sp-icon-btn"
          aria-label="Subtasks actions"
          data-testid={_testId}
        >
          <MoreHorizontal size={16} />
        </button>
        );
      }}
    >
      <DropdownItemCheckboxGroup id="sp-hide-done" title="">
        <DropdownItemCheckbox
          id="sp-hide-done-toggle"
          isSelected={hideDone}
          onClick={() => onToggleHideDone()}
        >
          Hide done
        </DropdownItemCheckbox>
      </DropdownItemCheckboxGroup>

      <DropdownItemGroup>
        {/* Sort row — opens nested Popup to the right */}
        <DropdownItem
          elemBefore={
            sort.field
              ? (sort.dir === 'asc'
                  ? <ArrowUp size={14} color="#0052CC" />
                  : <ArrowDown size={14} color="#0052CC" />)
              : undefined
          }
          elemAfter={<ChevronRight size={14} color="#6B778C" />}
          onClick={(e) => {
            e.preventDefault();
            // Close the dropdown by returning focus, then open the sort popup.
            sortAnchorRef.current = e.currentTarget as unknown as HTMLButtonElement;
            setSortOpen(true);
          }}
        >
          Sort
        </DropdownItem>
      </DropdownItemGroup>

      <DropdownItemGroup>
        <DropdownItem
          elemBefore={<Edit3 size={14} color="#44546F" />}
          isDisabled={bulkEditMode}
          onClick={() => onEnterBulkEdit()}
        >
          Bulk edit
        </DropdownItem>
        <DropdownItem
          elemBefore={<Search size={14} color="#44546F" />}
          onClick={() => onViewInSearch()}
        >
          View in search
        </DropdownItem>
      </DropdownItemGroup>

      {/* Nested Sort popup — rendered as a sibling so it survives the parent
          closing. Anchored to the Sort row via the captured button ref. */}
      <Popup
        isOpen={sortOpen}
        onClose={() => setSortOpen(false)}
        placement="right-start"
        content={() => (
          <div className="sp-pop" style={{ width: 220, padding: 6 }} onClick={(e) => e.stopPropagation()}>
            {SORT_FIELDS.map(({ field, label }) => {
              const active = sort.field === field;
              const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
              return (
                <button
                  key={field}
                  type="button"
                  className="sp-pop-row"
                  onClick={() => onCycleSort(field)}
                >
                  <span className="sp-pop-label">{label}</span>
                  {active && <Arrow size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
            {sort.field && (
              <>
                <div className="sp-pop-divider" />
                <div className="sp-pop-hint">Click again to flip direction or clear.</div>
              </>
            )}
          </div>
        )}
        trigger={() => <span ref={sortAnchorRef as unknown as React.Ref<HTMLSpanElement>} />}
      />
    </DropdownMenu>
  );
}
