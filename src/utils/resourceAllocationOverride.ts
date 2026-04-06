/**
 * Resource Allocation Grid — Strategy D Override
 * Injects horizontal bars and neutralizes colors via DOM manipulation
 */

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // Bar styling
  barHeight: '4px',
  barRadius: '2px',
  barBottom: '4px',
  barLeftRight: '6px',
  
  // Neutral colors
  neutralAvatar: '#64748b',
  neutralBadge: '#64748b',
  neutralText: 'rgba(237,237,237,0.53)',
  
  // Track background (gray bar behind colored bar)
  trackColor: '#e2e8f0',
  
  // Injected element markers
  barClass: 'ra-injected-bar',
  trackClass: 'ra-injected-track',
  processedAttr: 'data-ra-processed',
};

// Project color mapping (match by text content)
const PROJECT_COLORS: Record<string, string> = {
  'Sectorial Services': '#3b82f6',
  'Sectorial': '#3b82f6',
  'Data Platform': '#10b981',
  'DataPlatform': '#10b981',
  'Senaei 3.0': '#f59e0b',
  'Senaei': '#f59e0b',
  'Tahommena 2.0': '#ec4899',
  'Tahommena': '#ec4899',
  'Inspection Project': '#8b5cf6',
  'Inspection': '#8b5cf6',
  'IR Platform': '#06b6d4',
  'IR Platform - Phase 1': '#06b6d4',
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Extract project name from cell text content
 */
function extractProjectName(text: string): string | null {
  const cleanText = text.replace(/\d+%/g, '').trim();
  
  for (const projectName of Object.keys(PROJECT_COLORS)) {
    if (cleanText.includes(projectName)) {
      return projectName;
    }
  }
  
  // Partial match fallback
  const lowerText = cleanText.toLowerCase();
  if (lowerText.includes('sectorial')) return 'Sectorial';
  if (lowerText.includes('data platform')) return 'Data Platform';
  if (lowerText.includes('senaei')) return 'Senaei';
  if (lowerText.includes('tahommena')) return 'Tahommena';
  if (lowerText.includes('inspection')) return 'Inspection';
  if (lowerText.includes('ir platform')) return 'IR Platform';
  
  return null;
}

/**
 * Extract allocation percentage from cell text
 */
function extractPercent(text: string): number {
  const match = text.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 100;
}

/**
 * Check if cell is an END/empty cell
 */
function isEndCell(text: string): boolean {
  const cleanText = text.trim().toUpperCase();
  return cleanText === 'END' || cleanText === '';
}

// ============================================================
// INJECTION FUNCTIONS
// ============================================================

/**
 * Inject horizontal bar into a single cell
 */
function injectBar(cell: HTMLElement): void {
  // Skip if already processed
  if (cell.hasAttribute(CONFIG.processedAttr)) return;
  
  const text = cell.textContent || '';
  
  // Skip END cells
  if (isEndCell(text)) {
    styleEndCell(cell);
    cell.setAttribute(CONFIG.processedAttr, 'end');
    return;
  }
  
  // Skip non-allocation cells (no percentage)
  if (!text.includes('%')) return;
  
  // Extract project and percentage
  const projectName = extractProjectName(text);
  if (!projectName) return;
  
  const percent = extractPercent(text);
  const barColor = PROJECT_COLORS[projectName] || '#3b82f6';
  
  // Ensure cell has relative positioning
  cell.style.position = 'relative';
  cell.style.paddingBottom = '14px';
  
  // Create track (gray background)
  const track = document.createElement('div');
  track.className = CONFIG.trackClass;
  track.style.cssText = `
    position: absolute;
    bottom: ${CONFIG.barBottom};
    left: ${CONFIG.barLeftRight};
    right: ${CONFIG.barLeftRight};
    height: ${CONFIG.barHeight};
    background: ${CONFIG.trackColor};
    border-radius: ${CONFIG.barRadius};
    pointer-events: none;
  `;
  
  // Create colored bar
  const bar = document.createElement('div');
  bar.className = CONFIG.barClass;
  bar.style.cssText = `
    position: absolute;
    bottom: ${CONFIG.barBottom};
    left: ${CONFIG.barLeftRight};
    width: calc(${percent}% - ${parseInt(CONFIG.barLeftRight) * 2}px);
    max-width: calc(100% - ${parseInt(CONFIG.barLeftRight) * 2}px);
    height: ${CONFIG.barHeight};
    background: ${barColor};
    border-radius: ${CONFIG.barRadius};
    pointer-events: none;
    z-index: 1;
    transition: width 0.3s ease;
  `;
  
  // Remove any existing injected elements
  cell.querySelectorAll(`.${CONFIG.barClass}, .${CONFIG.trackClass}`).forEach(el => el.remove());
  
  // Inject elements
  cell.appendChild(track);
  cell.appendChild(bar);
  
  // Mark as processed
  cell.setAttribute(CONFIG.processedAttr, projectName);
}

/**
 * Style END cell with diagonal stripes
 */
function styleEndCell(cell: HTMLElement): void {
  cell.style.background = `repeating-linear-gradient(
    -45deg,
    #f1f5f9,
    #f1f5f9 4px,
    #e2e8f0 4px,
    #e2e8f0 8px
  )`;
  cell.style.color = '#94a3b8';
}

/**
 * Neutralize avatar colors - ONLY in resource info column
 * IMPORTANT: Do NOT touch utilization bars or other colored elements
 */
function neutralizeAvatars(container: Element): void {
  // ONLY target avatars in the sticky resource info column (first TD)
  // This prevents interference with utilization bar colors
  const resourceCells = container.querySelectorAll('td:first-child, td.sticky');
  
  resourceCells.forEach(cell => {
    // Find avatar-like elements ONLY within the resource info cell
    const avatarSelectors = [
      '[class*="avatar"]',
      '[class*="Avatar"]',
      '.rounded-full',
    ];
    
    avatarSelectors.forEach(selector => {
      try {
        cell.querySelectorAll(selector).forEach((avatar) => {
          const el = avatar as HTMLElement;
          
          // Skip if already processed
          if (el.hasAttribute('data-ra-avatar-processed')) return;
          
          // Skip small elements (likely icons, not avatars)
          const width = el.offsetWidth;
          if (width < 24 || width > 60) return;
          
          // Check if it has text content (initials)
          const hasInitials = el.textContent?.trim().length === 2;
          
          if (hasInitials) {
            // Override background to neutral gray
            el.style.setProperty('background', CONFIG.neutralAvatar, 'important');
            el.style.setProperty('background-color', CONFIG.neutralAvatar, 'important');
            el.style.setProperty('color', '#ffffff', 'important');
            el.setAttribute('data-ra-avatar-processed', 'true');
          }
        });
      } catch (e) {
        // Selector might not be valid
      }
    });
  });
}

/**
 * Neutralize ONSITE/OFFSHORE badges
 */
function neutralizeBadges(container: Element): void {
  container.querySelectorAll('*').forEach((el) => {
    const text = el.textContent?.trim().toUpperCase();
    
    // Find ONSITE/OFFSHORE text elements
    if (text === 'ONSITE' || text === 'OFF-SHORE' || text === 'OFFSHORE' || text === 'OFF-\nSHORE' || text === 'HYBRID') {
      const htmlEl = el as HTMLElement;
      
      // Check if this is the actual badge element or a child
      if (el.children.length === 0 || el.children.length === 1) {
        // Override badge styling
        htmlEl.style.setProperty('background', 'transparent', 'important');
        htmlEl.style.setProperty('background-color', 'transparent', 'important');
        htmlEl.style.setProperty('color', CONFIG.neutralBadge, 'important');
        htmlEl.style.setProperty('border', 'none', 'important');
        htmlEl.style.setProperty('padding', '0', 'important');
        htmlEl.style.setProperty('font-weight', '500', 'important');
        
        // Also style parent if it's a badge container
        const parent = htmlEl.parentElement;
        if (parent && parent.children.length === 1) {
          parent.style.setProperty('background', 'transparent', 'important');
          parent.style.setProperty('border', 'none', 'important');
        }
      }
    }
  });
}

// ============================================================
// MAIN PROCESS FUNCTION
// ============================================================

/**
 * Process all allocation cells in a container
 */
function processAllocationGrid(container: Element): void {
  // Find all table cells
  const cells = container.querySelectorAll('td');
  
  cells.forEach((cell) => {
    injectBar(cell as HTMLElement);
  });
  
  // Also try div-based grid cells
  const divCells = container.querySelectorAll('[class*="cell"], [class*="Cell"], [role="gridcell"]');
  divCells.forEach((cell) => {
    const text = cell.textContent || '';
    if (text.includes('%') && cell.tagName !== 'TD') {
      injectBar(cell as HTMLElement);
    }
  });
  
  // Neutralize avatars and badges
  neutralizeAvatars(container);
  neutralizeBadges(container);
}

// ============================================================
// OBSERVER & INITIALIZATION
// ============================================================

let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize the resource allocation override
 * Call this once when component mounts
 */
export function initResourceAllocationOverride(containerSelector?: string): () => void {
  const container = containerSelector 
    ? document.querySelector(containerSelector) 
    : document.body;
  
  if (!container) {
    console.warn('[RA Override] Container not found:', containerSelector);
    return () => {};
  }
  
  console.log('[RA Override] Initializing Strategy D injection...');
  
  // Initial processing
  processAllocationGrid(container);
  
  // Set up MutationObserver for dynamic content
  observer = new MutationObserver((mutations) => {
    // Debounce to avoid excessive processing
    if (debounceTimer) clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      // Check if any relevant changes occurred
      const hasRelevantChanges = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      );
      
      if (hasRelevantChanges) {
        processAllocationGrid(container);
      }
    }, 100);
  });
  
  observer.observe(container, {
    childList: true,
    subtree: true,
  });
  
  console.log('[RA Override] Observer active. Processing complete.');
  
  // Return cleanup function
  return () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    console.log('[RA Override] Cleanup complete.');
  };
}

/**
 * Force re-process (call after major data changes)
 */
export function reprocessAllocationGrid(containerSelector?: string): void {
  const container = containerSelector 
    ? document.querySelector(containerSelector) 
    : document.body;
  
  if (container) {
    // Remove processed markers to allow re-processing
    container.querySelectorAll(`[${CONFIG.processedAttr}]`).forEach(el => {
      el.removeAttribute(CONFIG.processedAttr);
    });
    container.querySelectorAll('[data-ra-avatar-processed]').forEach(el => {
      el.removeAttribute('data-ra-avatar-processed');
    });
    
    // Remove injected elements
    container.querySelectorAll(`.${CONFIG.barClass}, .${CONFIG.trackClass}`).forEach(el => {
      el.remove();
    });
    
    // Re-process
    processAllocationGrid(container);
  }
}

/**
 * Add a new project color dynamically
 */
export function addProjectColor(projectName: string, color: string): void {
  PROJECT_COLORS[projectName] = color;
}
