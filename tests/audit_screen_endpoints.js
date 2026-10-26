const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const htmlFiles = [
  'dashboard.html',
  'admin.html',
  'login.html',
  'register.html',
  'track-public.html',
  'index.html',
  'forgot-password.html'
];

const frontendCalls = [];

for (const file of htmlFiles) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');

  // Match fetch(('/api/... or fetch((window.origin||'') + '/api/ or ` /api/...
  // Look for any string starting with /api/
  const regex = /['"`](\/api\/[a-zA-Z0-9_\-\/]+)(\?[^'"`]*)?['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const apiPath = match[1];
    if (apiPath.includes('.php')) continue; // skip raw script calls if any
    
    // Look backwards or forwards up to 300 chars to find method
    const start = Math.max(0, match.index - 100);
    const end = Math.min(content.length, match.index + 300);
    const context = content.slice(start, end);
    
    let method = 'GET';
    const methodMatch = context.match(/method\s*:\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
    }
    
    // Line number calculation
    const lineNum = content.slice(0, match.index).split('\n').length;
    frontendCalls.push({
      file,
      line: lineNum,
      method,
      endpoint: apiPath.replace(/^\/api/, '')
    });
  }
}

// Deduplicate
const uniqueMap = new Map();
for (const c of frontendCalls) {
  const key = `${c.method} ${c.endpoint}`;
  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, c);
  }
}

console.log(`Found ${uniqueMap.size} unique Frontend API calls across all HTML screens.`);

// Now parse api/index.php routes
const indexPath = path.join(rootDir, 'api', 'index.php');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Match route cases: case ($endpoint === '/...' && $method === '...'):
// Also regex matches: preg_match('#^/...
const routeRegex = /case\s*\(([^)]+)\):/g;
const matchedCases = [];
let rc;
while ((rc = routeRegex.exec(indexContent)) !== null) {
  matchedCases.push(rc[1]);
}

function routeMatches(frontendMethod, frontendEndpoint) {
  for (const cond of matchedCases) {
    // Check if cond matches method
    const hasMethod = cond.includes(`$method === '${frontendMethod}'`) || 
                      cond.includes(`$method === "${frontendMethod}"`) ||
                      (!cond.includes('$method') && (frontendMethod === 'GET' || frontendMethod === 'POST'));

    if (!hasMethod) continue;

    // Direct endpoint comparison: $endpoint === '/orders'
    if (cond.includes(`$endpoint === '${frontendEndpoint}'`) || cond.includes(`$endpoint === "${frontendEndpoint}"`)) {
      return true;
    }

    // Direct starts_with comparison: str_starts_with($endpoint, '/...')
    const swMatch = cond.match(/str_starts_with\(\$endpoint,\s*['"`]([^'"`]+)['"`]\)/);
    if (swMatch && frontendEndpoint.startsWith(swMatch[1])) {
      return true;
    }

    // Regex comparison: preg_match('#^/orders/([^/]+)/...#', $endpoint, $m)
    const pmMatch = cond.match(/preg_match\(\s*['"]#\^([^#]+)#['"]/);
    if (pmMatch) {
      const reg = new RegExp('^' + pmMatch[1]);
      if (reg.test(frontendEndpoint)) {
        return true;
      }
    }
  }
  return false;
}

const missing = [];
const supported = [];

for (const [key, call] of uniqueMap.entries()) {
  const ok = routeMatches(call.method, call.endpoint);
  if (ok) {
    supported.push(key);
  } else {
    missing.push(call);
  }
}

console.log(`\n==================================================`);
console.log(`API COVERAGE REPORT FOR SCREENS`);
console.log(`==================================================`);
console.log(`✅ Fully supported routes: ${supported.length}`);
console.log(`❌ Missing or unmatched routes: ${missing.length}`);

if (missing.length > 0) {
  console.log(`\nMissing routes:`);
  for (const m of missing) {
    console.log(`  [${m.method}] /api${m.endpoint}  <-- Called in ${m.file}:${m.line}`);
  }
}

console.log(`==================================================\n`);
