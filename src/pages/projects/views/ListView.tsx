import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import SearchIcon from '@atlaskit/icon/glyph/search';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import MoreIcon from '@atlaskit/icon/glyph/more';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { ProjectData } from '../../../types/project.types';

interface ListViewProps {
  project: ProjectData;
}

export default function ListView({ project }: ListViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['FEAT-1', 'FEAT-3', 'STORY-1', 'STORY-6']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getStatusAppearance = (status: string): 'success' | 'inprogress' | 'default' => {
    switch (status) {
      case 'DONE': return 'success';
      case 'IN PROGRESS': return 'inprogress';
      case 'TO DO': return 'default';
      default: return 'default';
    }
  };

  return (
    <div style={{
      padding: '24px',
      background: token('elevation.surface'),
      minHeight: 'calc(100vh - 180px)',
    }}>
      {/* TOOLBAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ width: '280px' }}>
          <Textfield
            placeholder="Search..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            elemBeforeInput={
              <span style={{ marginLeft: '8px', display: 'flex' }}>
                <SearchIcon label="Search" size="small" />
              </span>
            }
          />
        </div>
        <Button appearance="subtle" iconBefore={<FilterIcon label="Filter" size="small" />}>
          Filter
        </Button>
      </div>

      {/* TABLE */}
      <div style={{
        border: `1px solid ${token('color.border')}`,
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        {/* TABLE HEADER */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 50px 90px 1fr 120px 100px 80px 100px 50px',
          background: token('color.background.neutral'),
          borderBottom: `1px solid ${token('color.border')}`,
          padding: '8px 12px',
        }}>
          <div><Checkbox /></div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: token('color.text.subtlest') }}>Type</div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: token('color.text.subtlest') }}>Key</div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: token('color.text.subtlest') }}>Summary</div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: token('color.text.subtlest') }}>Status</div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: token('color.text.subtlest') }}>Assignee</div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: token('color.text.subtlest') }}>Priority</div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: token('color.text.subtlest') }}>Created</div>
          <div></div>
        </div>

        {/* TABLE BODY */}
        <div>
          {project.features.map((feature) => {
            const isFeatureExpanded = expandedRows.has(feature.key);
            
            return (
              <React.Fragment key={feature.key}>
                {/* FEATURE ROW */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 50px 90px 1fr 120px 100px 80px 100px 50px',
                  padding: '10px 12px',
                  borderBottom: `1px solid ${token('color.border')}`,
                  background: token('elevation.surface'),
                  alignItems: 'center',
                }}>
                  <div><Checkbox /></div>
                  <div style={{ fontSize: '18px' }}>📦</div>
                  <a href={`/browse/${feature.key}`} style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: token('color.link'),
                    textDecoration: 'none',
                  }}>
                    {feature.key}
                  </a>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {feature.stories.length > 0 && (
                      <button
                        onClick={(e) => toggleExpand(feature.key, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {isFeatureExpanded ? (
                          <ChevronDownIcon label="Collapse" size="small" />
                        ) : (
                          <ChevronRightIcon label="Expand" size="small" />
                        )}
                      </button>
                    )}
                    <span style={{ fontSize: '14px', color: token('color.text') }}>{feature.summary}</span>
                  </div>
                  <div><Lozenge appearance={getStatusAppearance(feature.status)}>{feature.status}</Lozenge></div>
                  <div><Avatar size="small" name={feature.assignee} /></div>
                  <div style={{ fontSize: '14px', color: token('color.text') }}>{feature.priority}</div>
                  <div style={{ fontSize: '14px', color: token('color.text.subtlest') }}>{feature.created}</div>
                  <div>
                    <DropdownMenu trigger={({ triggerRef, ...props }) => (
                      <Button {...props} ref={triggerRef} appearance="subtle" iconBefore={<MoreIcon label="More" size="small" />} />
                    )}>
                      <DropdownItemGroup>
                        <DropdownItem>Edit</DropdownItem>
                        <DropdownItem>Delete</DropdownItem>
                      </DropdownItemGroup>
                    </DropdownMenu>
                  </div>
                </div>

                {/* STORY ROWS */}
                {isFeatureExpanded && feature.stories.map((story) => {
                  const isStoryExpanded = expandedRows.has(story.key);
                  
                  return (
                    <React.Fragment key={story.key}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 50px 90px 1fr 120px 100px 80px 100px 50px',
                        padding: '10px 12px',
                        borderBottom: `1px solid ${token('color.border')}`,
                        background: token('elevation.surface'),
                        alignItems: 'center',
                      }}>
                        <div><Checkbox /></div>
                        <div style={{ fontSize: '18px', paddingLeft: '24px' }}>📗</div>
                        <a href={`/browse/${story.key}`} style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: token('color.link'),
                          textDecoration: 'none',
                        }}>
                          {story.key}
                        </a>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '24px' }}>
                          {story.subtasks.length > 0 && (
                            <button
                              onClick={(e) => toggleExpand(story.key, e)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {isStoryExpanded ? (
                                <ChevronDownIcon label="Collapse" size="small" />
                              ) : (
                                <ChevronRightIcon label="Expand" size="small" />
                              )}
                            </button>
                          )}
                          <span style={{ fontSize: '14px', color: token('color.text') }}>{story.summary}</span>
                        </div>
                        <div><Lozenge appearance={getStatusAppearance(story.status)}>{story.status}</Lozenge></div>
                        <div><Avatar size="small" name={story.assignee} /></div>
                        <div style={{ fontSize: '14px', color: token('color.text') }}>{story.priority}</div>
                        <div style={{ fontSize: '14px', color: token('color.text.subtlest') }}>{story.created}</div>
                        <div>
                          <DropdownMenu trigger={({ triggerRef, ...props }) => (
                            <Button {...props} ref={triggerRef} appearance="subtle" iconBefore={<MoreIcon label="More" size="small" />} />
                          )}>
                            <DropdownItemGroup>
                              <DropdownItem>Edit</DropdownItem>
                              <DropdownItem>Delete</DropdownItem>
                            </DropdownItemGroup>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* SUBTASK ROWS */}
                      {isStoryExpanded && story.subtasks.map((subtask) => (
                        <div 
                          key={subtask.key}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '40px 50px 90px 1fr 120px 100px 80px 100px 50px',
                            padding: '10px 12px',
                            borderBottom: `1px solid ${token('color.border')}`,
                            background: token('elevation.surface'),
                            alignItems: 'center',
                          }}
                        >
                          <div><Checkbox /></div>
                          <div style={{ fontSize: '18px', paddingLeft: '48px' }}>☑️</div>
                          <a href={`/browse/${subtask.key}`} style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: token('color.link'),
                            textDecoration: 'none',
                          }}>
                            {subtask.key}
                          </a>
                          <div style={{ paddingLeft: '48px' }}>
                            <span style={{ fontSize: '14px', color: token('color.text') }}>{subtask.summary}</span>
                          </div>
                          <div><Lozenge appearance={getStatusAppearance(subtask.status)}>{subtask.status}</Lozenge></div>
                          <div><Avatar size="small" name={subtask.assignee} /></div>
                          <div style={{ fontSize: '14px', color: token('color.text') }}>{subtask.priority}</div>
                          <div style={{ fontSize: '14px', color: token('color.text.subtlest') }}>{subtask.created}</div>
                          <div>
                            <DropdownMenu trigger={({ triggerRef, ...props }) => (
                              <Button {...props} ref={triggerRef} appearance="subtle" iconBefore={<MoreIcon label="More" size="small" />} />
                            )}>
                              <DropdownItemGroup>
                                <DropdownItem>Edit</DropdownItem>
                                <DropdownItem>Delete</DropdownItem>
                              </DropdownItemGroup>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
