/**
 * ProductNativeAllWorkPage — /product-hub/:key/allwork
 *
 * Entry-point for the product all-work route.
 * Delegates to ProductJiraLayout — structural clone of ProjectJiraLayout.
 * Same 3-panel split as /project-hub/:key/allwork:
 *   toolbar | left BrListPanel | right CatalystDetailRouter (business_request)
 *
 * Data source: business_requests (MDT — NOT ph_issues)
 */
export { default } from './jira-list/ProductJiraLayout';
