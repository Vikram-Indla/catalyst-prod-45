# Epic Backlog E2E Tests

## Overview
Comprehensive end-to-end tests for the Epic Backlog feature using Playwright.

## Test Coverage

### epic-backlog.spec.ts
- Page layout and structure validation
- Sidebar navigation verification
- Toolbar buttons and controls
- Theme Backlog/Backlog tabs
- Section headers and item counts
- Action buttons (Prioritize, Export)
- List/Kanban view toggling
- Filters and columns dialogs
- Portfolio filtering
- Sidebar collapse/expand

### epic-details-panel.spec.ts
- Epic details panel opening
- All tabs visibility (Full Details, Children, Intake, Benefits, Value, Milestones, Spend, Forecast)
- Panel closing functionality

### epic-search-filter.spec.ts
- Search functionality
- Search clearing
- Program Increment filtering
- PI Progress display

## Running Tests

### Install Dependencies
```bash
npm install
npx playwright install
```

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test e2e/epic-backlog.spec.ts
```

### Run in UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test --debug
```

### View Test Report
```bash
npx playwright show-report
```

## Test Strategy

1. **Visual Verification**: Validates that UI elements match Jira Align reference screenshots
2. **Interaction Testing**: Tests user interactions like clicking, filtering, searching
3. **State Management**: Verifies state changes (view toggling, filtering)
4. **Accessibility**: Uses semantic selectors (roles, labels) for robust tests

## Future Enhancements

- Drag-drop ranking tests (requires actual epics in database)
- Context menu actions tests
- WSJF prioritization workflow
- Pull rank operations
- Export functionality validation
- Epic CRUD operations with authentication
