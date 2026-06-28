import { describe, it, expect } from 'vitest';
import { buildAllUserProjects } from './useAllUserProjects';

describe('buildAllUserProjects', () => {
  const catalystProjects = [
    { id: 'u1', key: 'BAU', name: 'Senaei BAU', avatar_url: null, color: 'var(--ds-text, #172B4D)' },
    { id: 'u2', key: 'IP', name: 'IP Implementation', avatar_url: '/ip.png', color: null },
  ];
  const phIcons = [{ key: 'BAU', icon: 'rocket', color: '#222' }]; // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  const jiraNames = [{ project_key: 'MWR', name: 'MWR Project' }];

  it('maps catalyst projects and overlays ph_projects icon/color', () => {
    const out = buildAllUserProjects({ catalystProjects, phIcons, jiraNames, userIssueProjectKeys: [] });
    const bau = out.find(p => p.key === 'BAU')!;
    expect(bau).toMatchObject({ id: 'u1', name: 'Senaei BAU', icon: 'rocket', color: '#222' }); // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  });

  it('falls back to projects.color when ph_projects has no row', () => {
    const out = buildAllUserProjects({ catalystProjects, phIcons, jiraNames, userIssueProjectKeys: [] });
    expect(out.find(p => p.key === 'IP')!.color).toBeNull(); // IP color null, no ph row → null
  });

  it('appends jira-only project keys not already in catalyst set, named via jiraNames', () => {
    const out = buildAllUserProjects({ catalystProjects, phIcons, jiraNames, userIssueProjectKeys: ['MWR', 'BAU'] });
    const mwr = out.find(p => p.key === 'MWR')!;
    expect(mwr).toMatchObject({ id: 'MWR', key: 'MWR', name: 'MWR Project', avatar_url: null, icon: null, color: null });
    expect(out.filter(p => p.key === 'BAU')).toHaveLength(1); // BAU not duplicated
  });

  it('falls back to the key as name when jiraNames has no entry', () => {
    const out = buildAllUserProjects({ catalystProjects, phIcons, jiraNames, userIssueProjectKeys: ['ZZZ'] });
    expect(out.find(p => p.key === 'ZZZ')!.name).toBe('ZZZ');
  });

  it('sorts alphabetically by name', () => {
    const out = buildAllUserProjects({ catalystProjects, phIcons, jiraNames, userIssueProjectKeys: ['MWR'] });
    expect(out.map(p => p.name)).toEqual(['IP Implementation', 'MWR Project', 'Senaei BAU']);
  });
});
