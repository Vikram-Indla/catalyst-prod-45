import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Avatar from '@atlaskit/avatar';
import TextArea from '@atlaskit/textarea';
import { X } from 'lucide-react';
import { WorkItem } from '../types';
import { WorkTypeIcon } from './WorkTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { StatusLozenge } from './StatusLozenge';

interface WorkItemDetailsDrawerProps {
  item: WorkItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (item: WorkItem) => void;
}

export const WorkItemDetailsDrawer: React.FC<WorkItemDetailsDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [comment, setComment] = useState('');

  if (!isOpen || !item) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '480px',
        backgroundColor: token('elevation.surface', '#FFFFFF'),
        boxShadow: token('elevation.shadow.overlay', '0 20px 32px -8px rgba(9, 30, 66, 0.25)'),
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${token('color.border', '#EBECF0')}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: token('space.200', '16px'),
          borderBottom: `1px solid ${token('color.border', '#EBECF0')}`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: token('space.200', '16px'),
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), marginBottom: token('space.100', '8px') }}>
            <WorkTypeIcon type={item.type} size="small" />
            <span style={{ 
              fontSize: '13px', 
              color: token('color.text.subtle', '#626F86'),
              fontWeight: 500
            }}>
              {item.key}
            </span>
          </div>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: token('color.text', '#172B4D'),
            margin: 0,
            lineHeight: 1.4
          }}>
            {item.summary}
          </h2>
        </div>
        <Button
          appearance="subtle"
          iconBefore={<X size={20} />}
          onClick={onClose}
        />
      </div>

      {/* Tabs */}
      <Tabs id="work-item-tabs" onChange={setSelectedTab} selected={selectedTab}>
        <TabList>
          <Tab>Details</Tab>
          <Tab>Activity</Tab>
        </TabList>
        
        <TabPanel>
          {/* Details Tab */}
          <div style={{ padding: token('space.200', '16px'), overflowY: 'auto', flex: 1 }}>
            {/* Status & Priority */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: token('space.200', '16px'),
              marginBottom: token('space.300', '24px')
            }}>
              <div>
                <label style={{ 
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: token('color.text.subtlest', '#8993A4'),
                  textTransform: 'uppercase',
                  marginBottom: token('space.050', '4px')
                }}>
                  Status
                </label>
                <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
              </div>
              <div>
                <label style={{ 
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: token('color.text.subtlest', '#8993A4'),
                  textTransform: 'uppercase',
                  marginBottom: token('space.050', '4px')
                }}>
                  Priority
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
                  <PriorityIcon priority={item.priority} />
                  <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                    {item.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Assignee & Reporter */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: token('space.200', '16px'),
              marginBottom: token('space.300', '24px')
            }}>
              <div>
                <label style={{ 
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: token('color.text.subtlest', '#8993A4'),
                  textTransform: 'uppercase',
                  marginBottom: token('space.050', '4px')
                }}>
                  Assignee
                </label>
                {item.assigneeId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
                    <Avatar size="small" name={item.assigneeName || 'Assignee'} />
                    <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                      {item.assigneeName || 'Assignee'}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '14px', color: token('color.text.subtlest', '#8993A4') }}>
                    Unassigned
                  </span>
                )}
              </div>
              <div>
                <label style={{ 
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: token('color.text.subtlest', '#8993A4'),
                  textTransform: 'uppercase',
                  marginBottom: token('space.050', '4px')
                }}>
                  Reporter
                </label>
                {item.reporterId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
                    <Avatar size="small" name={item.reporterName || 'Reporter'} />
                    <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                      {item.reporterName || 'Reporter'}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '14px', color: token('color.text.subtlest', '#8993A4') }}>
                    None
                  </span>
                )}
              </div>
            </div>

            {/* Quarter & Release */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: token('space.200', '16px'),
              marginBottom: token('space.300', '24px')
            }}>
              <div>
                <label style={{ 
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: token('color.text.subtlest', '#8993A4'),
                  textTransform: 'uppercase',
                  marginBottom: token('space.050', '4px')
                }}>
                  Quarter
                </label>
                <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                  {item.quarterId || 'None'}
                </span>
              </div>
              <div>
                <label style={{ 
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: token('color.text.subtlest', '#8993A4'),
                  textTransform: 'uppercase',
                  marginBottom: token('space.050', '4px')
                }}>
                  Release Version
                </label>
                <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                  {item.releaseVersionId || 'None'}
                </span>
              </div>
            </div>

            {/* Due Date */}
            <div style={{ marginBottom: token('space.300', '24px') }}>
              <label style={{ 
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: token('color.text.subtlest', '#8993A4'),
                textTransform: 'uppercase',
                marginBottom: token('space.050', '4px')
              }}>
                Due Date
              </label>
              <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                {item.dueDate ? formatDate(item.dueDate) : 'None'}
              </span>
            </div>

            {/* Description */}
            <div style={{ marginBottom: token('space.300', '24px') }}>
              <label style={{ 
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: token('color.text.subtlest', '#8993A4'),
                textTransform: 'uppercase',
                marginBottom: token('space.100', '8px')
              }}>
                Description
              </label>
              <p style={{ 
                fontSize: '14px', 
                color: token('color.text', '#172B4D'),
                lineHeight: 1.6,
                margin: 0
              }}>
                {item.description || 'No description provided.'}
              </p>
            </div>

            {/* Child Items Section (for Stories) */}
            {item.type === 'STORY' && (
              <>
                {/* Subtasks */}
                <div style={{ marginBottom: token('space.300', '24px') }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: token('space.100', '8px')
                  }}>
                    <label style={{ 
                      fontSize: '11px',
                      fontWeight: 600,
                      color: token('color.text.subtlest', '#8993A4'),
                      textTransform: 'uppercase',
                    }}>
                      Subtasks ({item.subtaskCount || 0})
                    </label>
                    <Button appearance="subtle" spacing="compact">+ Add</Button>
                  </div>
                  {(item.subtaskCount || 0) === 0 && (
                    <p style={{ fontSize: '13px', color: token('color.text.subtlest', '#8993A4') }}>
                      No subtasks
                    </p>
                  )}
                </div>

                {/* Defects */}
                <div style={{ marginBottom: token('space.300', '24px') }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: token('space.100', '8px')
                  }}>
                    <label style={{ 
                      fontSize: '11px',
                      fontWeight: 600,
                      color: token('color.text.subtlest', '#8993A4'),
                      textTransform: 'uppercase',
                    }}>
                      Defects ({item.defectCount || 0})
                    </label>
                    <Button appearance="subtle" spacing="compact">+ Log</Button>
                  </div>
                  {(item.defectCount || 0) === 0 && (
                    <p style={{ fontSize: '13px', color: token('color.text.subtlest', '#8993A4') }}>
                      No defects
                    </p>
                  )}
                </div>

                {/* Incidents */}
                <div style={{ marginBottom: token('space.300', '24px') }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: token('space.100', '8px')
                  }}>
                    <label style={{ 
                      fontSize: '11px',
                      fontWeight: 600,
                      color: token('color.text.subtlest', '#8993A4'),
                      textTransform: 'uppercase',
                    }}>
                      Incidents ({item.incidentCount || 0})
                    </label>
                    <Button appearance="subtle" spacing="compact">+ Log</Button>
                  </div>
                  {(item.incidentCount || 0) === 0 && (
                    <p style={{ fontSize: '13px', color: token('color.text.subtlest', '#8993A4') }}>
                      No incidents
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Dates */}
            <div style={{ 
              borderTop: `1px solid ${token('color.border', '#EBECF0')}`,
              paddingTop: token('space.200', '16px'),
              marginTop: token('space.200', '16px')
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: token('color.text.subtlest', '#8993A4') }}>
                <span>Created: {formatDate(item.createdAt)}</span>
                <span>Updated: {formatDate(item.updatedAt)}</span>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel>
          {/* Activity Tab */}
          <div style={{ padding: token('space.200', '16px'), overflowY: 'auto', flex: 1 }}>
            {/* Add Comment */}
            <div style={{ marginBottom: token('space.300', '24px') }}>
              <label style={{ 
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: token('color.text.subtlest', '#8993A4'),
                textTransform: 'uppercase',
                marginBottom: token('space.100', '8px')
              }}>
                Add Comment
              </label>
              <TextArea
                value={comment}
                onChange={(e) => setComment((e.target as HTMLTextAreaElement).value)}
                placeholder="Add a comment..."
                minimumRows={2}
              />
              <div style={{ marginTop: token('space.100', '8px'), textAlign: 'right' }}>
                <Button appearance="primary" isDisabled={!comment.trim()}>
                  Comment
                </Button>
              </div>
            </div>

            {/* Activity History */}
            <div>
              <label style={{ 
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: token('color.text.subtlest', '#8993A4'),
                textTransform: 'uppercase',
                marginBottom: token('space.150', '12px')
              }}>
                History
              </label>
              
              {/* Mock Activity Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
                <div style={{ display: 'flex', gap: token('space.100', '8px') }}>
                  <Avatar size="small" name="John Doe" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', color: token('color.text', '#172B4D'), margin: 0 }}>
                      <strong>John Doe</strong> created this item
                    </p>
                    <span style={{ fontSize: '11px', color: token('color.text.subtlest', '#8993A4') }}>
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};
