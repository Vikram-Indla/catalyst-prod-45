/**
 * Responsive Audit Detectors
 * Runtime detection functions for responsive issues
 */

import { responsiveThresholds, responsiveSelectors } from './responsiveConfig';
import type {
  DetectionResult,
  OverflowElement,
  OverlapElement,
  TouchTargetIssue,
  TextOverflowIssue,
  TableIssue,
  ModalDrawerIssue,
  NavigationIssue,
  HeaderIssue,
} from './responsiveTypes';

/**
 * Run all responsive detectors on the current page
 */
export function runAllDetectors(): DetectionResult {
  return {
    hasOverflow: false,
    overflowElements: detectHorizontalOverflow(),
    hasOverlap: false,
    overlapElements: detectOverlap(),
    touchTargetIssues: detectTouchTargets(),
    textOverflowIssues: detectTextOverflow(),
    tableIssues: detectTableIssues(),
    modalDrawerIssues: detectModalDrawerIssues(),
    navigationIssues: detectNavigationIssues(),
    headerIssues: detectHeaderIssues(),
  };
}

/**
 * Detect horizontal overflow issues
 */
export function detectHorizontalOverflow(): OverflowElement[] {
  const issues: OverflowElement[] = [];
  
  // Check body/html for overflow
  const body = document.body;
  const html = document.documentElement;
  
  if (body.scrollWidth > body.clientWidth) {
    issues.push({
      selector: 'body',
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
      overflow: body.scrollWidth - body.clientWidth,
      element: 'Document Body',
    });
  }
  
  // Check all visible elements
  const allElements = document.querySelectorAll('*');
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (isVisible(htmlEl) && htmlEl.scrollWidth > htmlEl.clientWidth + 1) {
      // Check if intentional scroll container
      const style = window.getComputedStyle(htmlEl);
      const hasOverflowX = style.overflowX === 'auto' || style.overflowX === 'scroll';
      
      if (!hasOverflowX) {
        const selector = getSelector(htmlEl);
        issues.push({
          selector,
          scrollWidth: htmlEl.scrollWidth,
          clientWidth: htmlEl.clientWidth,
          overflow: htmlEl.scrollWidth - htmlEl.clientWidth,
          element: getElementDescription(htmlEl),
        });
      }
    }
  });
  
  return issues.slice(0, 20); // Limit to top 20
}

/**
 * Detect overlapping elements
 */
export function detectOverlap(): OverlapElement[] {
  const issues: OverlapElement[] = [];
  
  // Check header/nav overlap with content
  const headers = document.querySelectorAll(responsiveSelectors.header);
  const mainContent = document.querySelector(responsiveSelectors.mainContent);
  
  headers.forEach((header) => {
    const headerRect = header.getBoundingClientRect();
    const headerEl = header as HTMLElement;
    const style = window.getComputedStyle(headerEl);
    
    if (style.position === 'fixed' || style.position === 'sticky') {
      if (mainContent) {
        const contentRect = mainContent.getBoundingClientRect();
        if (headerRect.bottom > contentRect.top) {
          issues.push({
            selector: getSelector(headerEl),
            overlappingWith: 'main content',
            zIndex: parseInt(style.zIndex) || 0,
            position: style.position,
          });
        }
      }
    }
  });
  
  // Check sidebar overlap
  const sidebars = document.querySelectorAll(responsiveSelectors.sideNav);
  sidebars.forEach((sidebar) => {
    const sidebarEl = sidebar as HTMLElement;
    const style = window.getComputedStyle(sidebarEl);
    const sidebarRect = sidebarEl.getBoundingClientRect();
    
    if (mainContent) {
      const contentRect = mainContent.getBoundingClientRect();
      if (sidebarRect.right > contentRect.left && sidebarRect.left < contentRect.right) {
        const overlapping = sidebarRect.right - contentRect.left;
        if (overlapping > 10) { // Allow small tolerance
          issues.push({
            selector: getSelector(sidebarEl),
            overlappingWith: 'main content',
            zIndex: parseInt(style.zIndex) || 0,
            position: style.position,
          });
        }
      }
    }
  });
  
  return issues;
}

/**
 * Detect touch target issues (< 44px)
 */
export function detectTouchTargets(): TouchTargetIssue[] {
  const issues: TouchTargetIssue[] = [];
  const minSize = responsiveThresholds.minTouchTarget;
  
  const interactiveSelectors = `${responsiveSelectors.buttons}, ${responsiveSelectors.links}, ${responsiveSelectors.inputs}`;
  const elements = document.querySelectorAll(interactiveSelectors);
  
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (!isVisible(htmlEl)) return;
    
    const rect = htmlEl.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    if (width < minSize || height < minSize) {
      issues.push({
        selector: getSelector(htmlEl),
        width: Math.round(width),
        height: Math.round(height),
        minRequired: minSize,
        element: getElementDescription(htmlEl),
      });
    }
  });
  
  return issues.slice(0, 30); // Limit results
}

/**
 * Detect text overflow issues
 */
export function detectTextOverflow(): TextOverflowIssue[] {
  const issues: TextOverflowIssue[] = [];
  
  const textSelectors = `${responsiveSelectors.headings}, ${responsiveSelectors.paragraphs}, ${responsiveSelectors.labels}`;
  const elements = document.querySelectorAll(textSelectors);
  
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (!isVisible(htmlEl)) return;
    
    const style = window.getComputedStyle(htmlEl);
    const hasEllipsis = style.textOverflow === 'ellipsis';
    const isOverflowing = htmlEl.scrollWidth > htmlEl.clientWidth;
    
    if (isOverflowing && !hasEllipsis) {
      issues.push({
        selector: getSelector(htmlEl),
        text: htmlEl.textContent?.slice(0, 50) || '',
        containerWidth: htmlEl.clientWidth,
        textWidth: htmlEl.scrollWidth,
        hasEllipsis,
      });
    }
  });
  
  return issues.slice(0, 20);
}

/**
 * Detect table layout issues
 */
export function detectTableIssues(): TableIssue[] {
  const issues: TableIssue[] = [];
  const viewportWidth = window.innerWidth;
  
  const tables = document.querySelectorAll(responsiveSelectors.tables);
  
  tables.forEach((table) => {
    const tableEl = table as HTMLElement;
    const tableRect = tableEl.getBoundingClientRect();
    const parent = tableEl.parentElement;
    
    // Check if table has scroll container
    const hasScrollContainer = parent ? 
      window.getComputedStyle(parent).overflowX === 'auto' || 
      window.getComputedStyle(parent).overflowX === 'scroll' : false;
    
    // Get columns
    const headers = tableEl.querySelectorAll('th, [role="columnheader"]');
    const columnCount = headers.length;
    
    // Find narrow columns
    const narrowColumns: number[] = [];
    headers.forEach((header, index) => {
      const headerRect = (header as HTMLElement).getBoundingClientRect();
      if (headerRect.width < responsiveThresholds.minColumnWidth) {
        narrowColumns.push(index);
      }
    });
    
    // Check if table is wider than viewport without scroll
    if (tableRect.width > viewportWidth && !hasScrollContainer) {
      issues.push({
        selector: getSelector(tableEl),
        tableWidth: Math.round(tableRect.width),
        viewportWidth,
        hasScrollContainer,
        columnCount,
        narrowColumns,
      });
    }
  });
  
  return issues;
}

/**
 * Detect modal/drawer responsiveness issues
 */
export function detectModalDrawerIssues(): ModalDrawerIssue[] {
  const issues: ModalDrawerIssue[] = [];
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const modalSelectors = `${responsiveSelectors.modals}, ${responsiveSelectors.drawers}`;
  const overlays = document.querySelectorAll(modalSelectors);
  
  overlays.forEach((overlay) => {
    const overlayEl = overlay as HTMLElement;
    if (!isVisible(overlayEl)) return;
    
    const rect = overlayEl.getBoundingClientRect();
    const isDrawer = overlayEl.classList.contains('drawer') || 
                     overlayEl.classList.contains('sheet') ||
                     overlayEl.getAttribute('data-side');
    
    // Check if exceeds viewport
    const exceedsWidth = rect.width > viewportWidth;
    const exceedsHeight = rect.height > viewportHeight * 0.95;
    
    // Check if footer is visible
    const footer = overlayEl.querySelector('[class*="footer"], [class*="actions"]');
    const footerVisible = footer ? isElementInViewport(footer as HTMLElement) : true;
    
    if (exceedsWidth || exceedsHeight || !footerVisible) {
      issues.push({
        selector: getSelector(overlayEl),
        type: isDrawer ? 'drawer' : 'modal',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        viewportWidth,
        viewportHeight,
        footerVisible,
      });
    }
  });
  
  return issues;
}

/**
 * Detect navigation responsiveness issues
 */
export function detectNavigationIssues(): NavigationIssue[] {
  const issues: NavigationIssue[] = [];
  const viewportWidth = window.innerWidth;
  const isMobile = viewportWidth < 768;
  
  const navElements = document.querySelectorAll(responsiveSelectors.sideNav);
  
  navElements.forEach((nav) => {
    const navEl = nav as HTMLElement;
    if (!isVisible(navEl)) return;
    
    const rect = navEl.getBoundingClientRect();
    const isCollapsed = rect.width <= 80; // Collapsed sidebar threshold
    
    // On mobile, nav should be collapsed or hidden
    if (isMobile && !isCollapsed && rect.width > 100) {
      issues.push({
        selector: getSelector(navEl),
        issue: 'not-collapsed',
        width: Math.round(rect.width),
        isCollapsed,
      });
    }
  });
  
  return issues;
}

/**
 * Detect header responsiveness issues
 */
export function detectHeaderIssues(): HeaderIssue[] {
  const issues: HeaderIssue[] = [];
  
  const headers = document.querySelectorAll(responsiveSelectors.header);
  
  headers.forEach((header) => {
    const headerEl = header as HTMLElement;
    if (!isVisible(headerEl)) return;
    
    const rect = headerEl.getBoundingClientRect();
    const isOverflowing = headerEl.scrollWidth > headerEl.clientWidth;
    
    // Check if action buttons are visible
    const actions = headerEl.querySelectorAll('button, [role="button"]');
    let actionsVisible = true;
    actions.forEach((action) => {
      if (!isElementInViewport(action as HTMLElement)) {
        actionsVisible = false;
      }
    });
    
    if (isOverflowing || !actionsVisible) {
      issues.push({
        selector: getSelector(headerEl),
        issue: isOverflowing ? 'overflow' : 'truncation',
        height: Math.round(rect.height),
        actionsVisible,
      });
    }
  });
  
  return issues;
}

// Helper functions
function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         el.offsetWidth > 0 &&
         el.offsetHeight > 0;
}

function isElementInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(' ').filter(c => c && !c.includes(':'));
    if (classes.length > 0) {
      return `${el.tagName.toLowerCase()}.${classes.slice(0, 2).join('.')}`;
    }
  }
  return el.tagName.toLowerCase();
}

function getElementDescription(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const text = el.textContent?.slice(0, 30)?.trim() || '';
  const ariaLabel = el.getAttribute('aria-label');
  
  if (ariaLabel) return `${tag}: "${ariaLabel}"`;
  if (text) return `${tag}: "${text}..."`;
  return tag;
}
