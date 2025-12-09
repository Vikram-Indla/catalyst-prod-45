import { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Checkbox from '@atlaskit/checkbox';
import { token } from '@atlaskit/tokens';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';

interface Column {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

interface ColumnsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onColumnsChange: (columns: Column[]) => void;
}

export function ColumnsConfigModal({ isOpen, onClose, columns, onColumnsChange }: ColumnsConfigModalProps) {
  const [localColumns, setLocalColumns] = useState<Column[]>(columns);

  const handleToggle = (key: string) => {
    setLocalColumns(prev => prev.map(col => 
      col.key === key && !col.required ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(localColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setLocalColumns(items);
  };

  const handleApply = () => {
    onColumnsChange(localColumns);
    onClose();
  };

  const handleReset = () => {
    setLocalColumns(columns.map(col => ({ ...col, visible: true })));
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader>
            <ModalTitle>Configure Columns</ModalTitle>
          </ModalHeader>
          
          <ModalBody>
            <p style={{ 
              marginBottom: token('space.200', '16px'),
              color: token('color.text.subtle', '#6B778C'),
              fontSize: '12px',
            }}>
              Drag to reorder. Check to show/hide columns.
            </p>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="columns">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {localColumns.map((column, index) => (
                      <Draggable key={column.key} draggableId={column.key} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              display: 'flex',
                              alignItems: 'center',
                              gap: token('space.100', '8px'),
                              padding: token('space.100', '8px'),
                              background: snapshot.isDragging 
                                ? token('color.background.selected', '#DEEBFF')
                                : token('elevation.surface', '#FFFFFF'),
                              borderRadius: '3px',
                              marginBottom: token('space.050', '4px'),
                              border: `1px solid ${token('color.border', '#DFE1E6')}`,
                            }}
                          >
                            <div {...provided.dragHandleProps} style={{ cursor: 'grab' }}>
                              <DragHandlerIcon label="Drag" size="small" />
                            </div>
                            <Checkbox
                              isChecked={column.visible}
                              onChange={() => handleToggle(column.key)}
                              isDisabled={column.required}
                            />
                            <span style={{ 
                              fontSize: '14px',
                              color: token('color.text', '#172B4D'),
                            }}>
                              {column.label}
                            </span>
                            {column.required && (
                              <span style={{ 
                                fontSize: '11px',
                                color: token('color.text.subtle', '#6B778C'),
                                marginLeft: 'auto',
                              }}>
                                Required
                              </span>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </ModalBody>
          
          <ModalFooter>
            <Button appearance="subtle" onClick={handleReset}>
              Reset to Default
            </Button>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleApply}>
              Apply
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default ColumnsConfigModal;
