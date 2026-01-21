/**
 * Module 5A-2: JUnit XML Parser Utility
 */

import type { ParsedResult, ResultStatus, SourceFormat } from '../types/import';

// Parse JUnit XML format
export function parseJUnitXML(xmlString: string): ParsedResult[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const results: ParsedResult[] = [];

  // Handle both single testsuite and testsuites root
  const testsuites = doc.querySelectorAll('testsuite');
  
  testsuites.forEach(testsuite => {
    const testcases = testsuite.querySelectorAll('testcase');
    
    testcases.forEach(testcase => {
      const className = testcase.getAttribute('classname') || '';
      const name = testcase.getAttribute('name') || 'Unknown Test';
      const time = parseFloat(testcase.getAttribute('time') || '0');
      
      // Determine status
      let status: ResultStatus = 'passed';
      let errorMessage: string | undefined;
      let stackTrace: string | undefined;

      const failure = testcase.querySelector('failure');
      const error = testcase.querySelector('error');
      const skipped = testcase.querySelector('skipped');

      if (failure) {
        status = 'failed';
        errorMessage = failure.getAttribute('message') || undefined;
        stackTrace = failure.textContent || undefined;
      } else if (error) {
        status = 'error';
        errorMessage = error.getAttribute('message') || undefined;
        stackTrace = error.textContent || undefined;
      } else if (skipped) {
        status = 'skipped';
        errorMessage = skipped.getAttribute('message') || undefined;
      }

      results.push({
        external_test_id: `${className}.${name}`,
        external_test_name: name,
        status,
        duration_ms: Math.round(time * 1000),
        error_message: errorMessage,
        stack_trace: stackTrace,
        metadata: { className },
        run_timestamp: new Date().toISOString()
      });
    });
  });

  return results;
}

// Parse Jest JSON format
export function parseJestJSON(jsonString: string): ParsedResult[] {
  const data = JSON.parse(jsonString);
  const results: ParsedResult[] = [];

  if (data.testResults) {
    data.testResults.forEach((testFile: { testFilePath?: string; assertionResults?: Array<{
      fullName: string;
      title: string;
      status: string;
      duration: number;
      failureMessages?: string[];
    }> }) => {
      const filePath = testFile.testFilePath || '';
      
      testFile.assertionResults?.forEach(assertion => {
        let status: ResultStatus = 'passed';
        if (assertion.status === 'failed') status = 'failed';
        else if (assertion.status === 'pending' || assertion.status === 'skipped') status = 'skipped';

        results.push({
          external_test_id: assertion.fullName,
          external_test_name: assertion.title,
          status,
          duration_ms: assertion.duration || 0,
          error_message: assertion.failureMessages?.join('\n'),
          metadata: { filePath },
          run_timestamp: new Date().toISOString()
        });
      });
    });
  }

  return results;
}

// Parse custom JSON format (array of results)
export function parseCustomJSON(jsonString: string): ParsedResult[] {
  const data = JSON.parse(jsonString);
  
  if (Array.isArray(data)) {
    return data.map(item => ({
      external_test_id: item.id || item.external_test_id || item.name,
      external_test_name: item.name || item.external_test_name || item.title,
      status: normalizeStatus(item.status || item.result),
      duration_ms: item.duration_ms || item.duration || 0,
      error_message: item.error_message || item.error || item.message,
      stack_trace: item.stack_trace || item.stackTrace,
      metadata: item.metadata || {},
      run_timestamp: item.run_timestamp || item.timestamp || new Date().toISOString()
    }));
  }
  
  return [];
}

// Normalize status string to ResultStatus
function normalizeStatus(status: string): ResultStatus {
  const normalized = status?.toLowerCase() || '';
  if (['pass', 'passed', 'success', 'ok'].includes(normalized)) return 'passed';
  if (['fail', 'failed', 'failure'].includes(normalized)) return 'failed';
  if (['skip', 'skipped', 'pending', 'ignored'].includes(normalized)) return 'skipped';
  if (['error', 'broken'].includes(normalized)) return 'error';
  return 'passed';
}

// Main parser dispatcher
export function parseResults(content: string, format: SourceFormat): ParsedResult[] {
  switch (format) {
    case 'junit':
    case 'testng':
    case 'pytest':
      return parseJUnitXML(content);
    case 'jest':
      return parseJestJSON(content);
    case 'mocha':
    case 'custom':
      return parseCustomJSON(content);
    default:
      return parseCustomJSON(content);
  }
}

// Detect format from file extension
export function detectFormat(fileName: string): SourceFormat {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'xml') return 'junit';
  if (ext === 'json') return 'jest';
  return 'custom';
}
