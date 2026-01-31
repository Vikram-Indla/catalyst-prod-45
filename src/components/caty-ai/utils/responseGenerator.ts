/**
 * CATY AI V7 — Response Generator Utilities
 */

import { ResourceWithUtilization, ContractExpiring, OffshoreTeam } from '../types/database';
import { CatyStats } from '../hooks/useCatyStats';

const getInitials = (name: string) => 
  name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

const getUtilClass = (u: number) => 
  u > 100 ? 'danger' : u >= 90 ? 'warning' : u < 30 ? 'success' : '';

const getLocClass = (loc: string) => 
  loc === 'On-Site' ? 'onsite' : 'offshore';

const resourceRow = (r: ResourceWithUtilization) => `
<div class="caty-data-row">
  <div class="caty-data-avatar">${getInitials(r.name)}</div>
  <div class="caty-data-info">
    <div class="caty-data-name">${r.name}</div>
    <div class="caty-data-meta">${r.role_name || 'Resource'} • ${r.department_name || 'Unknown'} • ${r.vendor_name || 'Unknown'}</div>
  </div>
  <div class="caty-data-tags">
    <span class="caty-tag location ${getLocClass(r.location)}">${r.location}</span>
    <span class="caty-tag util ${getUtilClass(r.current_utilization)}">${r.current_utilization}% Util</span>
  </div>
</div>`;

export const generateUtilizationResponse = (
  resources: ResourceWithUtilization[],
  stats: CatyStats,
  dept: string
) => {
  const over = resources.filter(r => r.current_utilization > 100);
  const avail = resources.filter(r => r.current_utilization < 30);
  
  let html = `<div class="caty-bubble"><p>Here is the utilization for <strong>${dept}</strong>:</p></div>
<div class="caty-metrics-row">
  <div class="caty-metric-card"><div class="caty-metric-value">${stats.avgUtilization}%</div><div class="caty-metric-label">Avg Util</div></div>
  <div class="caty-metric-card"><div class="caty-metric-value">${stats.totalResources}</div><div class="caty-metric-label">Resources</div></div>
  <div class="caty-metric-card ${stats.overUtilized > 0 ? 'danger' : ''}"><div class="caty-metric-value">${stats.overUtilized}</div><div class="caty-metric-label">Over 100%</div></div>
  <div class="caty-metric-card ${stats.available > 0 ? 'success' : ''}"><div class="caty-metric-value">${stats.available}</div><div class="caty-metric-label">Available</div></div>
</div>`;
  
  if (over.length > 0) {
    html += `<div class="caty-data-card">
      <div class="caty-data-card-header danger">
        <span class="caty-data-card-title">Over-Utilized</span>
        <span class="caty-data-card-badge danger">${over.length} critical</span>
      </div>
      <div class="caty-data-card-body">
        ${over.slice(0, 5).map(resourceRow).join('')}
        ${over.length > 5 ? `<div class="caty-show-more">+${over.length - 5} more</div>` : ''}
      </div>
    </div>`;
  }
  
  if (avail.length > 0) {
    html += `<div class="caty-data-card">
      <div class="caty-data-card-header success">
        <span class="caty-data-card-title">Available</span>
        <span class="caty-data-card-badge success">${avail.length} resources</span>
      </div>
      <div class="caty-data-card-body">
        ${avail.slice(0, 3).map(resourceRow).join('')}
      </div>
    </div>`;
  }
  
  return html;
};

export const generateContractsResponse = (contracts: ContractExpiring[], dept: string) => {
  if (contracts.length === 0) {
    return '<div class="caty-bubble"><p>No contracts expiring in the next 30 days.</p></div>';
  }
  
  const critical = contracts.filter(c => c.status === 'critical');
  const others = contracts.filter(c => c.status !== 'critical');
  
  let html = `<div class="caty-bubble"><p>Found <strong>${contracts.length} contracts</strong> expiring soon${dept !== 'All Departments' ? ' in ' + dept : ''}:</p></div>`;
  
  if (critical.length > 0) {
    html += `<div class="caty-data-card">
      <div class="caty-data-card-header danger">
        <span class="caty-data-card-title">Expiring This Week</span>
        <span class="caty-data-card-badge danger">${critical.length} critical</span>
      </div>
      <div class="caty-data-card-body">
        ${critical.slice(0, 5).map(c => `
          <div class="caty-data-row">
            <div class="caty-data-avatar">${getInitials(c.resource.name)}</div>
            <div class="caty-data-info">
              <div class="caty-data-name">${c.resource.name}</div>
              <div class="caty-data-meta">${c.resource.role_name || 'Resource'} • ${c.resource.department_name || 'Unknown'}</div>
            </div>
            <div class="caty-data-tags">
              <span class="caty-tag location ${getLocClass(c.resource.location)}">${c.resource.location}</span>
              <span class="caty-tag util danger">${c.days_until_expiry}d left</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }
  
  if (others.length > 0) {
    html += `<div class="caty-data-card">
      <div class="caty-data-card-header warning">
        <span class="caty-data-card-title">Later This Month</span>
        <span class="caty-data-card-badge">${others.length} contracts</span>
      </div>
      <div class="caty-data-card-body">
        ${others.slice(0, 4).map(c => `
          <div class="caty-data-row">
            <div class="caty-data-avatar">${getInitials(c.resource.name)}</div>
            <div class="caty-data-info">
              <div class="caty-data-name">${c.resource.name}</div>
              <div class="caty-data-meta">${c.resource.role_name || 'Resource'} • ${c.resource.department_name || 'Unknown'}</div>
            </div>
            <div class="caty-data-tags">
              <span class="caty-tag util">${c.days_until_expiry}d left</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }
  
  return html;
};

export const generateOffshoreResponse = (teams: OffshoreTeam[], dept: string) => {
  if (teams.length === 0) {
    return '<div class="caty-bubble"><p>No off-shore resources found.</p></div>';
  }
  
  const total = teams.reduce((s, t) => s + t.resource_count, 0);
  
  return `<div class="caty-bubble"><p>Off-shore teams${dept !== 'All Departments' ? ' for ' + dept : ''}:</p></div>
<div class="caty-data-card">
  <div class="caty-data-card-header info">
    <span class="caty-data-card-title">Off-Shore Teams</span>
    <span class="caty-data-card-badge">${total} resources</span>
  </div>
  <div class="caty-data-card-body">
    ${teams.map(t => `
      <div class="caty-team-row">
        <div class="caty-team-flag">${t.flag}</div>
        <div class="caty-team-info">
          <div class="caty-team-name">${t.country_name}</div>
        </div>
        <div class="caty-team-stats">
          <span class="caty-team-count">${t.resource_count}</span>
          <span class="caty-team-util">${t.avg_utilization}% avg</span>
        </div>
      </div>
    `).join('')}
  </div>
</div>`;
};

export const generateOnsiteResponse = (
  resources: ResourceWithUtilization[],
  stats: CatyStats,
  dept: string
) => {
  const onsite = resources.filter(r => r.location === 'On-Site');
  
  if (onsite.length === 0) {
    return '<div class="caty-bubble"><p>No on-site resources found.</p></div>';
  }
  
  return `<div class="caty-bubble"><p><strong>${onsite.length}</strong> resources are on-site${dept !== 'All Departments' ? ' in ' + dept : ''}:</p></div>
<div class="caty-metrics-row">
  <div class="caty-metric-card">
    <div class="caty-metric-value">${stats.onSite}</div>
    <div class="caty-metric-label">On-Site</div>
  </div>
  <div class="caty-metric-card">
    <div class="caty-metric-value">${stats.offShore}</div>
    <div class="caty-metric-label">Off-Shore</div>
  </div>
</div>
<div class="caty-data-card">
  <div class="caty-data-card-header info">
    <span class="caty-data-card-title">On-Site Resources</span>
    <span class="caty-data-card-badge">${onsite.length}</span>
  </div>
  <div class="caty-data-card-body">
    ${onsite.slice(0, 5).map(resourceRow).join('')}
    ${onsite.length > 5 ? `<div class="caty-show-more">+${onsite.length - 5} more</div>` : ''}
  </div>
</div>`;
};

export const generateFallback = () => `<div class="caty-bubble">
  <p>I can help with capacity queries. Try:</p>
  <ul class="caty-help-list">
    <li><strong>Utilization</strong> — "Show utilization"</li>
    <li><strong>Contracts</strong> — "Expiring contracts"</li>
    <li><strong>On-Site</strong> — "Who is on-site?"</li>
    <li><strong>Off-Shore</strong> — "Off-shore teams"</li>
  </ul>
</div>`;
