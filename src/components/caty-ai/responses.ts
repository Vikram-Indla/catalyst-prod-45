/**
 * Caty AI V7 — Response Templates (Fallback)
 */

export const RESPONSES = {
  forecast: (dept: string, period: string) => `
<div class="caty-bubble">
  <p>The following is the <strong>${period} capacity forecast</strong> for the ${dept}:</p>
  <ul>
    <li><strong>April 2026:</strong> 97% projected utilization with 3 anticipated resource gaps due to contract expirations.</li>
    <li><strong>May 2026:</strong> 94% projected utilization. Reduced availability expected during the Ramadan period.</li>
    <li><strong>June 2026:</strong> 98% projected utilization following the completion of the planned summer hiring cycle.</li>
  </ul>
  <p><strong>Key Risk:</strong> 5 contracts are scheduled to expire in April. Extension decisions are required by March 15 to maintain project continuity.</p>
  <p>Would you like me to prepare a detailed risk mitigation report?</p>
</div>`,

  contracts: () => `
<div class="caty-bubble">
  <p>I have identified <strong>3 contracts</strong> scheduled to expire within the next 7 days:</p>
</div>
<div class="caty-card">
  <div class="caty-card-header">
    <span class="caty-card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>
    <span class="caty-card-title">Expiring Contracts — 7 Day Window</span>
  </div>
  <div class="caty-card-body">
    <div class="caty-resource-row">
      <div class="caty-resource-initials">AY</div>
      <div class="caty-resource-details">
        <div class="caty-resource-name">Ahmed Yousry</div>
        <div class="caty-resource-meta">.NET Developer • Tahommena 2.0</div>
      </div>
      <div class="caty-resource-value">3 days</div>
    </div>
    <div class="caty-resource-row">
      <div class="caty-resource-initials">SK</div>
      <div class="caty-resource-details">
        <div class="caty-resource-name">Sara Khaled</div>
        <div class="caty-resource-meta">QA Engineer • Senaei 3.0</div>
      </div>
      <div class="caty-resource-value">5 days</div>
    </div>
    <div class="caty-resource-row">
      <div class="caty-resource-initials">RH</div>
      <div class="caty-resource-details">
        <div class="caty-resource-name">Rami Hassan</div>
        <div class="caty-resource-meta">DevOps Engineer • Data Platform</div>
      </div>
      <div class="caty-resource-value">7 days</div>
    </div>
    <div class="caty-card-actions">
      <button class="caty-btn primary" onclick="window.catyAction('extend-all')">Extend All Contracts</button>
      <button class="caty-btn secondary" onclick="window.catyAction('review')">Review Individually</button>
    </div>
  </div>
</div>`,

  resources: () => `
<div class="caty-bubble">
  <p>I have identified <strong>2 available .NET developers</strong> who meet the required qualifications:</p>
</div>
<div class="caty-card">
  <div class="caty-card-header success">
    <span class="caty-card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>
    <span class="caty-card-title">Available Resources</span>
  </div>
  <div class="caty-card-body">
    <div class="caty-resource-row">
      <div class="caty-resource-initials">MK</div>
      <div class="caty-resource-details">
        <div class="caty-resource-name">Mohamed Khalil</div>
        <div class="caty-resource-meta">Senior .NET Developer • ELM • Egypt</div>
      </div>
      <div class="caty-resource-value success">75%</div>
    </div>
    <div class="caty-resource-row">
      <div class="caty-resource-initials">FA</div>
      <div class="caty-resource-details">
        <div class="caty-resource-name">Fatima Al-Rashid</div>
        <div class="caty-resource-meta">.NET Developer • Elm Co. • Saudi Arabia</div>
      </div>
      <div class="caty-resource-value success">60%</div>
    </div>
    <div class="caty-card-actions">
      <button class="caty-btn primary" onclick="window.catyAction('assign')">Assign to Project</button>
      <button class="caty-btn secondary" onclick="window.catyAction('compare')">Compare Skills</button>
    </div>
  </div>
</div>
<div class="caty-bubble">
  <p>Both resources have confirmed availability and possess the required technical certifications. Would you like me to initiate an allocation request?</p>
</div>`,

  escalation: () => `
<div class="caty-bubble">
  <p>I understand you would like to speak with a Capacity Planning Specialist.</p>
  <p><strong>Available Options:</strong></p>
  <ul>
    <li><strong>Live Chat:</strong> A specialist is available now. Estimated wait time: 2 minutes.</li>
    <li><strong>Schedule Call:</strong> Book a 30-minute consultation at your convenience.</li>
    <li><strong>Email Support:</strong> capacity-support@moim.gov.sa</li>
  </ul>
</div>
<div class="caty-card">
  <div class="caty-card-header success">
    <span class="caty-card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
    <span class="caty-card-title">Specialist Available Now</span>
  </div>
  <div class="caty-card-body">
    <div class="caty-resource-row">
      <div class="caty-resource-initials">AS</div>
      <div class="caty-resource-details">
        <div class="caty-resource-name">Ahmad Al-Saud</div>
        <div class="caty-resource-meta">Senior Capacity Planning Analyst • MoIM</div>
      </div>
      <div class="caty-resource-value success">Online</div>
    </div>
    <div class="caty-card-actions">
      <button class="caty-btn primary" onclick="window.catyAction('live-chat')">Start Live Chat</button>
      <button class="caty-btn secondary" onclick="window.catyAction('schedule')">Schedule Call</button>
    </div>
  </div>
</div>`,

  fallback: (query: string) =>
    `I understand you are inquiring about "${query}". I am able to assist with capacity planning, contract management, resource allocation, and utilization analysis. Please specify what information you require, and I will provide a detailed response.`,
};
