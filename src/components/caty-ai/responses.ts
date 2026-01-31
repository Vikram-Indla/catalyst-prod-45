/**
 * Caty AI V7 — Response Templates (Fallback)
 * Uses proper HTML structure with styled data cards
 */

export const RESPONSES = {
  // CONTRACTS RESPONSE - Structured with data cards
  contracts: () => `
<div class="caty-bubble">
  <p>I have analyzed the contract data for the Delivery Department. There are currently <strong>7 contractor agreements</strong> scheduled to expire this month.</p>
</div>

<div class="caty-card">
  <div class="caty-card-header">
    <span class="caty-card-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </span>
    <span class="caty-card-title">Expiring Contracts — October 2026</span>
  </div>
  <div class="caty-card-body">
    <div class="caty-card-section">
      <div class="caty-section-label">Project Management</div>
      <div class="caty-resource-row">
        <div class="caty-resource-initials">SJ</div>
        <div class="caty-resource-details">
          <div class="caty-resource-name">Sarah Jenkins</div>
          <div class="caty-resource-meta">Senior Project Manager</div>
        </div>
        <div class="caty-resource-date">Oct 15</div>
        <div class="caty-resource-status pending">Pending Review</div>
      </div>
      <div class="caty-resource-row">
        <div class="caty-resource-initials">MC</div>
        <div class="caty-resource-details">
          <div class="caty-resource-name">Michael Chen</div>
          <div class="caty-resource-meta">Agile Coach</div>
        </div>
        <div class="caty-resource-date">Oct 28</div>
        <div class="caty-resource-status success">Renewal Recommended</div>
      </div>
    </div>
    
    <div class="caty-card-section">
      <div class="caty-section-label">Software Engineering</div>
      <div class="caty-resource-row">
        <div class="caty-resource-initials">DK</div>
        <div class="caty-resource-details">
          <div class="caty-resource-name">David Kim</div>
          <div class="caty-resource-meta">Senior .NET Developer</div>
        </div>
        <div class="caty-resource-date">Oct 10</div>
        <div class="caty-resource-status critical">Critical</div>
      </div>
      <div class="caty-resource-row">
        <div class="caty-resource-initials">AP</div>
        <div class="caty-resource-details">
          <div class="caty-resource-name">Anna Petrova</div>
          <div class="caty-resource-meta">Full Stack Developer</div>
        </div>
        <div class="caty-resource-date">Oct 22</div>
        <div class="caty-resource-status pending">Under Review</div>
      </div>
    </div>
    
    <div class="caty-card-actions">
      <button class="caty-btn primary" onclick="window.catyAction('extend-all')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="17 1 21 5 17 9"/>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        </svg>
        Extend All Contracts
      </button>
      <button class="caty-btn secondary" onclick="window.catyAction('review')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Review Individually
      </button>
    </div>
  </div>
</div>

<div class="caty-bubble">
  <p><strong>Recommendation:</strong> David Kim's contract requires immediate attention as his assigned project has critical deliverables in Q4.</p>
  <p>Would you like me to prepare extension requests for any of these contracts?</p>
</div>
`,

  // FORECAST RESPONSE
  forecast: (dept: string, period: string) => `
<div class="caty-bubble">
  <p>The following is the <strong>${period} capacity forecast</strong> for the ${dept}:</p>
</div>

<div class="caty-metrics-grid">
  <div class="caty-metric">
    <div class="caty-metric-value">97%</div>
    <div class="caty-metric-label">April Utilization</div>
  </div>
  <div class="caty-metric">
    <div class="caty-metric-value">94%</div>
    <div class="caty-metric-label">May Utilization</div>
  </div>
  <div class="caty-metric">
    <div class="caty-metric-value">98%</div>
    <div class="caty-metric-label">June Utilization</div>
  </div>
  <div class="caty-metric warning">
    <div class="caty-metric-value">3</div>
    <div class="caty-metric-label">Resource Gaps</div>
  </div>
</div>

<div class="caty-card">
  <div class="caty-card-header warning">
    <span class="caty-card-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </span>
    <span class="caty-card-title">Key Risk Factors</span>
  </div>
  <div class="caty-card-body">
    <div class="caty-risk-item">
      <div class="caty-risk-icon critical">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
      </div>
      <div class="caty-risk-text">
        <strong>5 contracts expiring in April</strong>
        <span>Extension decisions required by March 15</span>
      </div>
    </div>
    <div class="caty-risk-item">
      <div class="caty-risk-icon warning">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
      </div>
      <div class="caty-risk-text">
        <strong>Ramadan period in May</strong>
        <span>Reduced availability expected</span>
      </div>
    </div>
    <div class="caty-risk-item">
      <div class="caty-risk-icon info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
      </div>
      <div class="caty-risk-text">
        <strong>Summer hiring cycle</strong>
        <span>3 new resources onboarding in June</span>
      </div>
    </div>
    <div class="caty-card-actions">
      <button class="caty-btn primary" onclick="window.catyAction('risk-report')">Generate Risk Report</button>
      <button class="caty-btn secondary" onclick="window.catyAction('mitigation')">View Mitigation Plan</button>
    </div>
  </div>
</div>

<div class="caty-bubble">
  <p>Would you like me to prepare a detailed risk mitigation report?</p>
</div>
`,

  // RESOURCES RESPONSE  
  resources: () => `
<div class="caty-bubble">
  <p>I have identified <strong>2 available .NET developers</strong> who meet the required qualifications for immediate assignment:</p>
</div>

<div class="caty-card">
  <div class="caty-card-header success">
    <span class="caty-card-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </span>
    <span class="caty-card-title">Available .NET Developers</span>
  </div>
  <div class="caty-card-body">
    <div class="caty-resource-row">
      <div class="caty-resource-initials">MK</div>
      <div class="caty-resource-details">
        <div class="caty-resource-name">Mohamed Khalil</div>
        <div class="caty-resource-meta">Senior .NET Developer • ELM • Egypt</div>
      </div>
      <div class="caty-resource-availability">
        <div class="caty-availability-bar" style="--percent: 75%"></div>
        <span>75% Available</span>
      </div>
    </div>
    <div class="caty-resource-row">
      <div class="caty-resource-initials">FA</div>
      <div class="caty-resource-details">
        <div class="caty-resource-name">Fatima Al-Rashid</div>
        <div class="caty-resource-meta">.NET Developer • Elm Co. • Saudi Arabia</div>
      </div>
      <div class="caty-resource-availability">
        <div class="caty-availability-bar" style="--percent: 60%"></div>
        <span>60% Available</span>
      </div>
    </div>
    <div class="caty-card-actions">
      <button class="caty-btn primary" onclick="window.catyAction('assign')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
        Assign to Project
      </button>
      <button class="caty-btn secondary" onclick="window.catyAction('compare')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Compare Skills
      </button>
    </div>
  </div>
</div>

<div class="caty-bubble">
  <p>Both resources have confirmed availability and possess the required technical certifications. Would you like me to initiate an allocation request?</p>
</div>
`,

  // FALLBACK
  fallback: (query: string) => `
<div class="caty-bubble">
  <p>I understand you are inquiring about "<strong>${query}</strong>".</p>
  <p>I am able to assist with:</p>
  <ul class="caty-capability-list">
    <li><strong>Capacity planning and forecasting</strong></li>
    <li><strong>Contract management and renewals</strong></li>
    <li><strong>Resource allocation and availability</strong></li>
    <li><strong>Utilization analysis and reporting</strong></li>
  </ul>
  <p>Please provide more details about your specific requirement, and I will provide a comprehensive response.</p>
</div>
`
};
