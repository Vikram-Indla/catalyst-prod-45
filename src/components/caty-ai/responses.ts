// ============================================================================
// CATY AI RESPONSE TEMPLATES
// HTML response templates for capacity planning assistant
// ============================================================================

export const CATY_RESPONSES = {
  forecast: (dept: string, period: string) => `
<p>The following is the ${period} capacity forecast for the ${dept}:</p>
<ul>
  <li><strong>April 2026:</strong> 97% projected utilization with 3 anticipated resource gaps due to contract expirations.</li>
  <li><strong>May 2026:</strong> 94% projected utilization. Reduced availability expected during the Ramadan period.</li>
  <li><strong>June 2026:</strong> 98% projected utilization following the completion of the planned summer hiring cycle.</li>
</ul>
<p><strong>Key Risk:</strong> 5 contracts are scheduled to expire in April. Extension decisions are required by March 15 to maintain project continuity.</p>
<p>Would you like me to prepare a detailed risk mitigation report?</p>
`,

  contracts: () => `
<p>I have identified 3 contracts scheduled to expire within the next 7 days:</p>
<div class="caty-card">
  <div class="caty-card-header warning">
    <span class="caty-card-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
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
      <button class="caty-btn primary">Extend All Contracts</button>
      <button class="caty-btn secondary">Review Individually</button>
    </div>
  </div>
</div>
`,

  resources: () => `
<p>I have identified 2 available .NET developers who meet the required qualifications:</p>
<div class="caty-card">
  <div class="caty-card-header success">
    <span class="caty-card-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></span>
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
      <button class="caty-btn primary">Assign to Project</button>
      <button class="caty-btn secondary">Compare Skills</button>
    </div>
  </div>
</div>
<p>Both resources have confirmed availability. Would you like me to initiate an allocation request?</p>
`,

  escalation: () => `
<p>I understand you would like to speak with a Capacity Planning Specialist.</p>
<p><strong>Available Options:</strong></p>
<ul>
  <li><strong>Live Chat:</strong> A specialist is available now. Estimated wait time: 2 minutes.</li>
  <li><strong>Schedule Call:</strong> Book a 30-minute consultation at your convenience.</li>
  <li><strong>Email Support:</strong> capacity-support@moim.gov.sa</li>
</ul>
<div class="caty-card">
  <div class="caty-card-header info">
    <span class="caty-card-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg></span>
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
      <button class="caty-btn primary">Start Live Chat</button>
      <button class="caty-btn secondary">Schedule Call</button>
    </div>
  </div>
</div>
`,

  fallback: (query: string) => `I understand you are inquiring about "${query}". I am able to assist with capacity planning, contract management, resource allocation, and utilization analysis. Please specify what information you require.`,
};
