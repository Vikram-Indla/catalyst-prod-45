/**
 * Login Hero Panel
 * Left panel with animated geometric pattern and feature widgets
 */

import { GeometricCanvas } from './GeometricCanvas';
import './login-styles.css';

export function LoginHeroPanel() {
  return (
    <div className="hero-panel" aria-hidden="true">
      <GeometricCanvas />
      
      {/* Atmospheric Layers */}
      <div className="atmosphere atmo-gradient" />
      <div className="atmosphere atmo-vignette" />
      
      {/* Dust Particles */}
      <div className="dust-particle" aria-hidden="true" />
      <div className="dust-particle" aria-hidden="true" />
      <div className="dust-particle" aria-hidden="true" />
      <div className="dust-particle" aria-hidden="true" />
      <div className="dust-particle" aria-hidden="true" />
      <div className="dust-particle" aria-hidden="true" />

      <div className="hero-content">
        {/* Top Section */}
        <div className="hero-top">
          <div className="vision-badge">
            <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span className="badge-text">Enterprise Excellence</span>
          </div>
        </div>

        {/* Main Section */}
        <div className="hero-main">
          <h1 className="headline">
            <span className="headline-line">Where <span className="gold">vision</span></span>
            <span className="headline-line">becomes</span>
            <span className="headline-line"><span className="teal">execution</span></span>
          </h1>

          <p className="subheadline">
            Transform how your organization manages demand and delivery 
            with intelligent workflows and real-time insights.
          </p>

          {/* Feature Grid */}
          <div className="feature-grid" role="list">
            <div className="feature-widget" role="listitem">
              <div className="widget-header">
                <div className="widget-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <span className="widget-title">Portfolio Management</span>
              </div>
              <div className="widget-desc" style={{ paddingLeft: '58px' }}>Strategic oversight & program alignment</div>
            </div>

            <div className="feature-widget" role="listitem">
              <div className="widget-header">
                <div className="widget-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </div>
                <span className="widget-title">Dependency Management</span>
              </div>
              <div className="widget-desc" style={{ paddingLeft: '58px' }}>Cross-team visibility & risk mitigation</div>
            </div>

            <div className="feature-widget" role="listitem">
              <div className="widget-header">
                <div className="widget-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <span className="widget-title">Capacity Planning</span>
              </div>
              <div className="widget-desc" style={{ paddingLeft: '58px' }}>Resource optimization & forecasting</div>
            </div>

            <div className="feature-widget" role="listitem">
              <div className="widget-header">
                <div className="widget-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20 12a8 8 0 0 0-8-8v8h8z"/><circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <span className="widget-title">Product Management</span>
              </div>
              <div className="widget-desc" style={{ paddingLeft: '58px' }}>Roadmap & feature prioritization</div>
            </div>

            <div className="feature-widget" role="listitem">
              <div className="widget-header">
                <div className="widget-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/><circle cx="12" cy="12" r="4"/>
                  </svg>
                </div>
                <span className="widget-title">AI Use Cases</span>
              </div>
              <div className="widget-desc" style={{ paddingLeft: '58px' }}>Intelligent automation & insights</div>
            </div>

            <div className="feature-widget" role="listitem">
              <div className="widget-header">
                <div className="widget-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <span className="widget-title">Release Schedule</span>
              </div>
              <div className="widget-desc" style={{ paddingLeft: '58px' }}>Predictable & coordinated delivery</div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="hero-bottom">
          <div className="accent-bar" aria-hidden="true">
            <div className="bar-segment" />
            <div className="bar-segment" />
            <div className="bar-segment" />
          </div>
          <div className="copyright">© 2025 Catalyst. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
