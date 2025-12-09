import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import MoreIcon from '@atlaskit/icon/glyph/more';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';

// ============================================
// TYPES
// ============================================
interface KanbanCard {
  id: string;
  title: string;
  summary: string;
  status: string;
  priority?: 'highest' | 'high' | 'medium' | 'low' | 'lowest';
  assignee?: {
    name: string;
    avatar?: string;
  };
  labels?: string[];
  storyPoints?: number;
  daysInStatus: number;
  hasAttachments?: boolean;
  commentCount?: number;
}

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  wipLimit?: number;
  color: string;
}

interface KanbanBoardProps {
  initialData?: KanbanColumn[];
}

// ============================================
// INITIAL DATA
// ============================================
const defaultColumns: KanbanColumn[] = [
  {
    id: 'new-request',
    title: 'New Request',
    color: '#6554C0',
    wipLimit: 10,
    cards: [
      {
        id: 'MIM-499',
        title: 'MIM-499',
        summary: 'تأمل إضافة أيقونة أو خاصية تمكن مالك الخدمة من منح الموافقة تلقائياً لجميع الطلبات القائمة للمصانع',
        status: 'New Request',
        priority: 'high',
        daysInStatus: 3,
        storyPoints: 5,
        commentCount: 2,
      },
      {
        id: 'MIM-500',
        title: 'MIM-500',
        summary: 'تحسين رحلة الانضمام لبرنامج مصانع المستقبل',
        status: 'New Request',
        priority: 'medium',
        daysInStatus: 1,
        storyPoints: 3,
        commentCount: 0,
      },
      {
        id: 'MIM-502',
        title: 'MIM-502',
        summary: 'تهدف هذه المبادرة إلى تحسين كفاءة نظام رفع المعاملات الشركاء من خلال إنشاء منصة رقمية موحدة',
        status: 'New Request',
        priority: 'high',
        daysInStatus: 5,
        storyPoints: 8,
        commentCount: 1,
      },
    ],
  },
  {
    id: 'analyse',
    title: 'Analyse',
    color: '#0052CC',
    wipLimit: 5,
    cards: [
      {
        id: 'MIM-509',
        title: 'MIM-509',
        summary: 'تحديث تواريخ انتهاء المسودات -الحوافز العقارية',
        status: 'Analyse',
        priority: 'medium',
        daysInStatus: 2,
        storyPoints: 2,
        commentCount: 0,
      },
      {
        id: 'MIM-515',
        title: 'MIM-515',
        summary: 'إتاحة إمكانية التعديل على الترخيص الحالي و التصريح البيئي في طلبات التعديل',
        status: 'Analyse',
        priority: 'high',
        daysInStatus: 4,
        storyPoints: 5,
        commentCount: 3,
      },
    ],
  },
  {
    id: 'approved',
    title: 'Approved',
    color: '#00A3BF',
    cards: [
      {
        id: 'MIM-517',
        title: 'MIM-517',
        summary: 'الوصول السيبراني لمنصة تمكنها',
        status: 'Approved',
        priority: 'highest',
        daysInStatus: 1,
        storyPoints: 13,
        commentCount: 5,
      },
    ],
  },
  {
    id: 'ready-to-implement',
    title: 'Ready to Implement',
    color: '#FF991F',
    cards: [],
  },
  {
    id: 'implement',
    title: 'Implement',
    color: '#36B37E',
    wipLimit: 3,
    cards: [
      {
        id: 'MIM-519',
        title: 'MIM-519',
        summary: 'وثيقة تراخيص الاستشارات الصناعية',
        status: 'Implement',
        priority: 'high',
        daysInStatus: 7,
        storyPoints: 8,
        commentCount: 2,
      },
      {
        id: 'MIM-520',
        title: 'MIM-520',
        summary: 'تعديل آلية التعامل مع حقل "اسم الشركة" في نموذج تقديم - الحوافز العقارية',
        status: 'Implement',
        priority: 'medium',
        daysInStatus: 3,
        storyPoints: 5,
        commentCount: 1,
      },
    ],
  },
  {
    id: 'closed',
    title: 'Closed',
    color: '#5E6C84',
    cards: [
      {
        id: 'MIM-501',
        title: 'MIM-501',
        summary: 'إضافة التنبيه في نموذج الحوافز العقارية للقطاع الصناعي',
        status: 'Closed',
        priority: 'low',
        daysInStatus: 14,
        storyPoints: 3,
        commentCount: 4,
      },
    ],
  },
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function KanbanBoard({ initialData }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialData || defaultColumns);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    if (source.droppableId === destination.droppableId) {
      // Moving within same column
      const newCards = Array.from(sourceColumn.cards);
      const [removed] = newCards.splice(source.index, 1);
      newCards.splice(destination.index, 0, removed);

      setColumns(columns.map(col =>
        col.id === sourceColumn.id ? { ...col, cards: newCards } : col
      ));
    } else {
      // Moving to different column
      const sourceCards = Array.from(sourceColumn.cards);
      const destCards = Array.from(destColumn.cards);
      const [removed] = sourceCards.splice(source.index, 1);
      
      removed.status = destColumn.title;
      removed.daysInStatus = 0;
      
      destCards.splice(destination.index, 0, removed);

      setColumns(columns.map(col => {
        if (col.id === sourceColumn.id) return { ...col, cards: sourceCards };
        if (col.id === destColumn.id) return { ...col, cards: destCards };
        return col;
      }));
    }
  };

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  return (
    <div style={{
      background: token('color.background.neutral', '#F4F5F7'),
      padding: token('space.300', '24px'),
      minHeight: '500px',
      overflow: 'auto',
    }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{
          display: 'flex',
          gap: token('space.200', '16px'),
          minWidth: '100%',
          paddingBottom: token('space.400', '32px'),
        }}>
          {columns.map((column) => {
            const isCollapsed = collapsedColumns.includes(column.id);
            const isOverWipLimit = column.wipLimit && column.cards.length > column.wipLimit;

            return (
              <div
                key={column.id}
                style={{
                  width: isCollapsed ? '48px' : '280px',
                  minWidth: isCollapsed ? '48px' : '280px',
                  flexShrink: 0,
                  transition: 'width 200ms ease-in-out, min-width 200ms ease-in-out',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* COLUMN HEADER */}
                <div style={{
                  background: token('elevation.surface', '#FFFFFF'),
                  borderRadius: token('border.radius', '3px'),
                  padding: isCollapsed ? token('space.100', '8px') : token('space.200', '16px'),
                  marginBottom: token('space.200', '16px'),
                  boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: token('space.100', '8px'),
                  minHeight: '48px',
                  borderTop: `3px solid ${column.color}`,
                }}>
                  {isCollapsed ? (
                    <Tooltip content={`${column.title} (${column.cards.length})`}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <Button
                          appearance="subtle"
                          iconBefore={<ChevronRightIcon label="Expand" size="small" />}
                          onClick={() => toggleColumnCollapse(column.id)}
                        />
                        <div style={{
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: token('color.text', '#172B4D'),
                          transform: 'rotate(180deg)',
                        }}>
                          {column.title}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isOverWipLimit ? token('color.text.danger', '#DE350B') : token('color.text.subtle', '#5E6C84'),
                          background: isOverWipLimit ? token('color.background.danger', '#FFEBE6') : token('color.background.neutral', '#DFE1E6'),
                          padding: '2px 6px',
                          borderRadius: '10px',
                        }}>
                          {column.cards.length}
                        </div>
                      </div>
                    </Tooltip>
                  ) : (
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: token('space.100', '8px'),
                          marginBottom: token('space.050', '4px'),
                        }}>
                          <h3 style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: token('color.text', '#172B4D'),
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {column.title}
                          </h3>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: isOverWipLimit ? token('color.text.danger', '#DE350B') : token('color.text.subtle', '#5E6C84'),
                            background: isOverWipLimit ? token('color.background.danger', '#FFEBE6') : token('color.background.neutral', '#DFE1E6'),
                            padding: '2px 8px',
                            borderRadius: '10px',
                            minWidth: '20px',
                            textAlign: 'center',
                          }}>
                            {column.cards.length}
                          </div>
                        </div>
                        {column.wipLimit && (
                          <div style={{
                            fontSize: '11px',
                            color: isOverWipLimit 
                              ? token('color.text.danger', '#DE350B') 
                              : token('color.text.subtlest', '#6B778C'),
                            fontWeight: isOverWipLimit ? 600 : 400,
                          }}>
                            WIP limit: {column.wipLimit}
                          </div>
                        )}
                      </div>
                      <Button
                        appearance="subtle"
                        iconBefore={<ChevronLeftIcon label="Collapse" size="small" />}
                        onClick={() => toggleColumnCollapse(column.id)}
                      />
                    </>
                  )}
                </div>

                {/* COLUMN BODY */}
                {!isCollapsed && (
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          background: snapshot.isDraggingOver
                            ? token('color.background.selected', '#DEEBFF')
                            : 'transparent',
                          borderRadius: token('border.radius', '3px'),
                          padding: token('space.100', '8px'),
                          flex: 1,
                          minHeight: '200px',
                          transition: 'background 150ms',
                        }}
                      >
                        {column.cards.length === 0 ? (
                          <div style={{
                            padding: token('space.400', '32px'),
                            textAlign: 'center',
                            color: token('color.text.subtlest', '#6B778C'),
                            fontSize: '12px',
                            fontStyle: 'italic',
                            border: `2px dashed ${token('color.border', '#DFE1E6')}`,
                            borderRadius: token('border.radius', '3px'),
                          }}>
                            Drop cards here
                          </div>
                        ) : (
                          column.cards.map((card, index) => (
                            <Draggable key={card.id} draggableId={card.id} index={index}>
                              {(provided, snapshot) => (
                                <KanbanCardComponent
                                  card={card}
                                  provided={provided}
                                  isDragging={snapshot.isDragging}
                                />
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

// ============================================
// KANBAN CARD COMPONENT
// ============================================
function KanbanCardComponent({ card, provided, isDragging }: { card: KanbanCard; provided: any; isDragging: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...provided.draggableProps.style,
        background: token('elevation.surface', '#FFFFFF'),
        borderRadius: token('border.radius', '3px'),
        padding: token('space.200', '16px'),
        marginBottom: token('space.100', '8px'),
        boxShadow: isDragging
          ? token('elevation.shadow.overlay', '0 8px 16px -4px rgba(9, 30, 66, 0.25)')
          : token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25)'),
        border: `1px solid ${isDragging ? token('color.border.focused', '#4C9AFF') : token('color.border', '#DFE1E6')}`,
        cursor: 'grab',
        transition: 'box-shadow 150ms, border-color 150ms',
        transform: isDragging ? 'rotate(2deg)' : 'none',
      }}
    >
      {/* CARD HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: token('space.100', '8px'),
      }}>
        <a
          href={`/request/${card.id}`}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: token('color.link', '#0052CC'),
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          {card.id}
        </a>

        {isHovered && (
          <DropdownMenu
            trigger={({ triggerRef, ...props }) => (
              <Button
                {...props}
                ref={triggerRef}
                iconBefore={<MoreIcon label="More" size="small" />}
                appearance="subtle"
                spacing="compact"
              />
            )}
          >
            <DropdownItemGroup>
              <DropdownItem>View details</DropdownItem>
              <DropdownItem>Edit</DropdownItem>
              <DropdownItem>Clone</DropdownItem>
              <DropdownItem>Delete</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        )}
      </div>

      {/* CARD TITLE */}
      <div style={{
        fontSize: '14px',
        color: token('color.text', '#172B4D'),
        marginBottom: token('space.150', '12px'),
        lineHeight: '20px',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {card.summary}
      </div>

      {/* LABELS */}
      {card.labels && card.labels.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: token('space.050', '4px'),
          marginBottom: token('space.150', '12px'),
        }}>
          {card.labels.map((label, idx) => (
            <Lozenge key={idx} appearance="default">
              {label}
            </Lozenge>
          ))}
        </div>
      )}

      {/* CARD FOOTER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: token('space.150', '12px'),
      }}>
        {/* LEFT: Priority & Story Points */}
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
          {card.priority && (
            <Tooltip content={`Priority: ${card.priority}`}>
              <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getPriorityIcon(card.priority)}
              </div>
            </Tooltip>
          )}
          
          {card.storyPoints && (
            <Tooltip content="Story points">
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: token('color.text.subtle', '#5E6C84'),
                background: token('color.background.neutral', '#DFE1E6'),
                padding: '2px 6px',
                borderRadius: '3px',
              }}>
                {card.storyPoints}
              </div>
            </Tooltip>
          )}
        </div>

        {/* RIGHT: Metadata & Assignee */}
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
          {/* Days in status */}
          <Tooltip content={`${card.daysInStatus} days in status`}>
            <div style={{
              fontSize: '11px',
              color: card.daysInStatus > 7 ? token('color.text.warning', '#FF8B00') : token('color.text.subtlest', '#6B778C'),
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              🕐 {card.daysInStatus}d
            </div>
          </Tooltip>

          {/* Comment count */}
          {card.commentCount && card.commentCount > 0 && (
            <Tooltip content={`${card.commentCount} comments`}>
              <div style={{
                fontSize: '11px',
                color: token('color.text.subtlest', '#6B778C'),
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                💬 {card.commentCount}
              </div>
            </Tooltip>
          )}

          {/* Assignee avatar */}
          {card.assignee && (
            <Tooltip content={card.assignee.name}>
              <Avatar
                size="small"
                src={card.assignee.avatar}
                name={card.assignee.name}
              />
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PRIORITY ICON HELPER
// ============================================
function getPriorityIcon(priority: string) {
  const icons: Record<string, string> = {
    highest: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    lowest: '🔵',
  };
  return icons[priority] || '⚪';
}
