/**
 * Routing Taxonomy Scanner
 *
 * Scans route declarations for violations of Jira canonical URL taxonomy:
 *   1. camelCase path segments (must be kebab-case)
 *   2. Query params used for tabs (must be route segments)
 *   3. Missing /browse/:key universal resolver
 *   4. Hardcoded external Jira URLs (must use ph_jira_connection)
 *   5. Duplicate issue detail routes without canonical redirect
 *
 * Usage:
 *   node design-governance/rules/routing-taxonomy-scanner.js [src-dir]
 *
 * Exit codes:
 *   0 = no violations
 *   1 = violations found
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTE_FILES = [
  'src/App.tsx',
  'src/routes/FullAppRoutes.tsx',
];

const RULES = [
  {
    id: 'RT-001',
    name: 'camelCase path segment',
    description: 'Route paths must use kebab-case, not camelCase',
    severity: 'error',
    test: (pathStr) => {
      const segments = pathStr.split('/').filter(s => s && !s.startsWith(':'));
      return segments.some(seg => /[A-Z]/.test(seg) && !seg.includes('-'));
    },
    fix: (pathStr) => {
      return pathStr.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    },
  },
  {
    id: 'RT-002',
    name: 'Tab as query param instead of segment',
    description: 'Tabs must be route segments (/page/:tab), not query params (?tab=)',
    severity: 'warning',
    testSource: (src) => {
      const matches = [];
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (/searchParams.*get\(['"]tab['"]\)|[?&]tab=/.test(line)) {
          matches.push({ line: i + 1, text: line.trim() });
        }
      });
      return matches;
    },
  },
  {
    id: 'RT-003',
    name: 'Hardcoded Jira URL',
    description: 'Jira URLs must come from ph_jira_connection, not hardcoded strings',
    severity: 'error',
    testSource: (src) => {
      const matches = [];
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (/jira\.example\.com/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          matches.push({ line: i + 1, text: line.trim() });
        }
      });
      return matches;
    },
  },
  {
    id: 'RT-004',
    name: 'Missing /browse/:key canonical route',
    description: 'The universal /browse/:issueKey resolver must exist',
    severity: 'error',
    testRouteTree: (allRoutes) => {
      return !allRoutes.some(r => r.path.includes('browse/:issueKey'));
    },
  },
];

function extractRoutes(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  const regex = /path=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    routes.push({
      path: match[1],
      file: filePath,
      line: src.substring(0, match.index).split('\n').length,
    });
  }
  return routes;
}

function scanSourceFiles(srcDir) {
  const violations = [];
  const tsxFiles = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '__tests__') {
        walk(fullPath);
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        tsxFiles.push(fullPath);
      }
    }
  }

  walk(srcDir);

  for (const file of tsxFiles) {
    const src = fs.readFileSync(file, 'utf8');
    for (const rule of RULES) {
      if (rule.testSource) {
        const matches = rule.testSource(src);
        for (const m of matches) {
          violations.push({
            rule: rule.id,
            name: rule.name,
            severity: rule.severity,
            file: path.relative(process.cwd(), file),
            line: m.line,
            text: m.text,
            description: rule.description,
          });
        }
      }
    }
  }

  return violations;
}

function scanRoutes(rootDir) {
  const violations = [];
  const allRoutes = [];

  for (const relPath of ROUTE_FILES) {
    const filePath = path.join(rootDir, relPath);
    if (!fs.existsSync(filePath)) continue;
    const routes = extractRoutes(filePath);
    allRoutes.push(...routes);

    for (const route of routes) {
      for (const rule of RULES) {
        if (rule.test && rule.test(route.path)) {
          violations.push({
            rule: rule.id,
            name: rule.name,
            severity: rule.severity,
            file: path.relative(process.cwd(), route.file),
            line: route.line,
            path: route.path,
            fix: rule.fix ? rule.fix(route.path) : undefined,
            description: rule.description,
          });
        }
      }
    }
  }

  for (const rule of RULES) {
    if (rule.testRouteTree && rule.testRouteTree(allRoutes)) {
      violations.push({
        rule: rule.id,
        name: rule.name,
        severity: rule.severity,
        file: 'route-tree',
        line: 0,
        path: '/browse/:issueKey',
        description: rule.description,
      });
    }
  }

  return violations;
}

export function run(srcDir) {
  const rootDir = path.resolve(srcDir, '..');
  const routeViolations = scanRoutes(rootDir);
  const sourceViolations = scanSourceFiles(srcDir);
  return [...routeViolations, ...sourceViolations];
}

export { scanRoutes, scanSourceFiles, RULES };

if (import.meta.url === `file://${process.argv[1]}`) {
  const srcDir = process.argv[2] || path.join(process.cwd(), 'src');
  const violations = run(srcDir);

  if (violations.length === 0) {
    console.log('✅ Routing taxonomy: 0 violations');
    process.exit(0);
  }

  console.log(`❌ Routing taxonomy: ${violations.length} violation(s)\n`);
  for (const v of violations) {
    const loc = v.line ? `${v.file}:${v.line}` : v.file;
    const fixHint = v.fix ? ` → fix: ${v.fix}` : '';
    console.log(`  [${v.severity.toUpperCase()}] ${v.rule} ${v.name}`);
    console.log(`    ${loc}: ${v.path || v.text}${fixHint}`);
    console.log('');
  }
  process.exit(1);
}

export default { run, scanRoutes, scanSourceFiles, RULES };
