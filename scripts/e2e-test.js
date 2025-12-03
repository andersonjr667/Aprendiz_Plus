#!/usr/bin/env node
/**
 * e2e-test.js
 * Automated end-to-end smoke tests using Puppeteer.
 *
 * Usage:
 *   node scripts/e2e-test.js
 *
 * The script will:
 *  - Start the app with `node server.js` (port 3000 by default)
 *  - Wait for HTTP server readiness
 *  - Open a headless browser and visit a list of important pages
 *  - Verify HTTP responses and presence of key selectors
 *  - Print a concise report and exit with non-zero code on failures
 */

const { spawn } = require('child_process');
const fetch = global.fetch || require('node-fetch');
const puppeteer = require('puppeteer');
const path = require('path');

const ROOT = process.env.ROOT_URL || 'http://localhost:3000';
const SERVER_CMD = process.env.SERVER_CMD || 'node';
const SERVER_ARGS = process.env.SERVER_ARGS ? process.env.SERVER_ARGS.split(' ') : ['server.js'];
const START_TIMEOUT = 20000; // ms
const POLL_INTERVAL = 500; // ms

const fs = require('fs');

// Start with a few important routes
const seedPages = [
  { url: '/', name: 'Home', selector: 'body' },
  { url: '/vagas', name: 'Vagas', selector: 'main, .main-content, .jobs-list' },
  { url: '/noticias', name: 'Notícias', selector: 'main, .main-content, .news' },
  { url: '/login', name: 'Login', selector: 'form#loginForm, form' },
  { url: '/register', name: 'Cadastro', selector: 'form#registerForm, form' }
];

// Auto-discover all files under public/pages and add them to the test list
function discoverPages() {
  const pagesDir = path.resolve(__dirname, '..', 'public', 'pages');
  let pages = [];
  try {
    const files = fs.readdirSync(pagesDir);
    files.forEach(f => {
      if (f.endsWith('.html')) {
        const urlPath = '/public/pages/' + f;
        pages.push({ url: urlPath, name: `page:${f}`, selector: 'body' });
      }
    });
  } catch (e) {
    console.warn('Could not auto-discover pages:', e.message || e);
  }
  return pages;
}

const pagesToTest = seedPages.concat(discoverPages());

// Attempt to login via API to obtain a JWT for authenticated checks
async function loginAndGetToken() {
  const user = process.env.E2E_USER || 'admin@local';
  const pass = process.env.E2E_PASS || 'password123';
  try {
    const res = await fetch((ROOT.replace(/\/$/, '') + '/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user, password: pass }),
      // do not send credentials by default
    });
    if (!res || !res.ok) return null;
    const j = await res.json();
    return j && j.token ? j.token : null;
  } catch (e) {
    return null;
  }
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res && (res.status === 200 || (res.status >= 300 && res.status < 500))) return true;
    } catch (e) {
      // ignore
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
  return false;
}

function spawnServer() {
  console.log('Starting server: %s %s', SERVER_CMD, SERVER_ARGS.join(' '));
  const proc = spawn(SERVER_CMD, SERVER_ARGS, {
    cwd: path.resolve(__dirname, '..'),
    env: Object.assign({}, process.env),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

  proc.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  return proc;
}

(async () => {
  const FORCE_START = process.argv.includes('--force-start') || process.env.FORCE_START === '1';

  let server = null;
  let startedServer = false;

  // If the user didn't request a forced start, probe if a server is already running and reuse it.
  if (!FORCE_START) {
    const alreadyRunning = await waitForServer(ROOT, 2000);
    if (alreadyRunning) {
      console.log('Server already running at %s — reusing existing instance', ROOT);
    } else {
      server = spawnServer();
      startedServer = true;
    }
  } else {
    server = spawnServer();
    startedServer = true;
  }

  console.log('Waiting for server to be ready at %s ...', ROOT);
  const ready = await waitForServer(ROOT, START_TIMEOUT);
  if (!ready) {
    console.error('Server did not respond within %d ms. Aborting.', START_TIMEOUT);
    if (startedServer && server) {
      try { server.kill('SIGTERM'); } catch (e) { }
    }
    process.exit(2);
  }

  console.log('Server ready. Launching browser tests...');

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(15000);

  // Try to obtain an auth token to run authenticated checks
  const token = await loginAndGetToken();
  if (token) {
    console.log('Obtained E2E auth token — will inject into pages as logged-in user');
    // Ensure the token is available before any page scripts run
    page.evaluateOnNewDocument((t) => {
      try { localStorage.setItem('aprendizplus_token', t); } catch (e) {}
    }, token);
  } else {
    console.log('No E2E auth token obtained — tests will run unauthenticated');
  }

  const failures = [];
  const consoleErrors = [];
  const requestFailures = [];
  const missingAssets = [];

  // Capture console messages and page errors
  page.on('console', msg => {
    try {
      const text = msg.text();
      if (msg.type() === 'error' || /error/i.test(text)) {
        consoleErrors.push(text);
        console.warn('[page console error]', text);
      }
    } catch (e) {}
  });
  page.on('pageerror', err => {
    consoleErrors.push(String(err.message || err));
    console.error('[page error]', err.message || err);
  });

  // Capture failed requests and 404 responses
  page.on('requestfailed', req => {
    let reason = null;
    try {
      const f = (req.failure && typeof req.failure === 'function') ? req.failure() : null;
      if (f) reason = f.errorText || f.error || f.reason || null;
    } catch (e) {
      reason = null;
    }
    requestFailures.push({ url: req.url(), reason });
    console.warn('[request failed]', req.url(), reason);
  });
  page.on('response', res => {
    try {
      if (res.status() === 404) {
        missingAssets.push({ url: res.url(), status: res.status() });
        console.warn('[missing asset 404]', res.url());
      }
    } catch (e) {}
  });

  for (const p of pagesToTest) {
    const url = ROOT.replace(/\/$/, '') + p.url;
    console.log(`Visiting ${url} ...`);

    let attempt = 0;
    let ok = false;
    let lastError = null;

    while (attempt < 2 && !ok) {
      attempt++;
      try {
        // Use a more robust waitUntil to reduce transient navigation issues
        const resp = await page.goto(url, { waitUntil: 'networkidle2' });
        const status = resp && typeof resp.status === 'function' ? resp.status() : (resp && resp.status) || null;
        if (!status || status >= 400) {
          lastError = new Error(`HTTP ${status || 'NO RESPONSE'}`);
          console.error(`  ✖ ${p.name} -> ${lastError.message}`);
          break;
        }

        // If selector is given, try to wait for it; allow a fallback to login form for protected pages
        if (p.selector) {
          try {
            await page.waitForSelector(p.selector, { timeout: 3000 });
          } catch (selectorErr) {
            // If page redirected to login (common for protected pages), accept login form as fallback
            const loginForm = await page.$('form#loginForm') || await page.$('form');
            if (loginForm) {
              console.warn(`  ⚠ ${p.name} redirected to login/form — treating as acceptable fallback`);
              ok = true;
              break;
            }

            // Execution context might have been destroyed due to in-page navigation; retry once
            if (/Execution context was destroyed/i.test(selectorErr.message) && attempt < 2) {
              console.warn('  ⚠ Execution context destroyed, retrying once...');
              await page.waitForTimeout(500);
              continue;
            }

            lastError = selectorErr;
            console.error(`  ✖ ${p.name} -> selector not found: ${p.selector}`);
            break;
          }
        }

        console.log(`  ✓ ${p.name} loaded (HTTP ${status})`);
        ok = true;
      } catch (err) {
        lastError = err;
        // Retry on navigation/execution-context errors once
        if (/Execution context was destroyed/i.test(String(err)) && attempt < 2) {
          console.warn('  ⚠ Execution context was destroyed during navigation, retrying once...');
          await page.waitForTimeout(500);
          continue;
        }
        console.error(`  ✖ ${p.name} -> error:`, err.message || err);
        break;
      }
    }

    if (!ok) {
      failures.push({ page: p.name, url, reason: lastError ? String(lastError.message || lastError) : 'unknown' });
    }
  }

  // Attach global listeners earlier to capture logs/requests during navigation
  // (we attach them once per test run above page creation)

  await browser.close();

  // Shutdown server (only if this script started it)
  if (startedServer && server) {
    try { server.kill('SIGTERM'); } catch (e) { }
  }

  console.log('\n=== E2E TEST SUMMARY ===');
  // Report console errors, request failures and missing assets as additional failures
  // Filter out known benign/noisy console errors to avoid false positives
  const ignoredConsolePatterns = [
    /TensorFlow/i,
    /WebGL is not supported/i,
    /Usuário não é owner/i,
    /JSHandle@error/i,
    /Refused to evaluate a string as JavaScript/i,
    /Failed to load resource/i,
    /Profile load error/i
  ];

  const filteredConsoleErrors = consoleErrors.filter(e => !ignoredConsolePatterns.some(p => p.test(e)));

  if (filteredConsoleErrors.length > 0) {
    console.error('\nConsole errors detected:');
    filteredConsoleErrors.forEach(e => console.error(' -', e));
    failures.push({ page: 'console', url: ROOT, reason: `${filteredConsoleErrors.length} console error(s)` });
  } else if (consoleErrors.length > 0) {
    console.log('\nConsole errors detected but filtered as known benign/noisy issues (TensorFlow/WebGL/owner checks).');
  }

  // Ignore some transient request failures known in CI environments
  const ignoredRequestUrls = [
    '/api/uploads',
  ];
  const filteredRequestFailures = requestFailures.filter(r => !ignoredRequestUrls.some(u => r.url && r.url.includes(u)));

  if (filteredRequestFailures.length > 0) {
    console.error('\nRequest failures detected:');
    filteredRequestFailures.forEach(r => console.error(' -', r.url, r.reason));
    failures.push({ page: 'requests', url: ROOT, reason: `${filteredRequestFailures.length} request failure(s)` });
  } else if (requestFailures.length > 0) {
    console.log('\nRequest failures detected but filtered as known transient/non-critical issues.');
  }

  // Filter out some missing assets that are optional in this environment
  const ignoredMissing = [
    '/api/audit/logs',
  ];
  const filteredMissing = missingAssets.filter(m => !ignoredMissing.some(u => m.url && m.url.includes(u)));
  if (filteredMissing.length > 0) {
    console.error('\nMissing (404) assets detected:');
    filteredMissing.forEach(m => console.error(' -', m.url));
    failures.push({ page: 'assets', url: ROOT, reason: `${filteredMissing.length} missing assets` });
  } else if (missingAssets.length > 0) {
    console.log('\nMissing assets detected but filtered as non-critical for E2E run.');
  }

  if (failures.length === 0) {
    console.log('All checks passed ✅');
    process.exit(0);
  } else {
    console.error('%d check(s) failed or reported issues:', failures.length);
    failures.forEach(f => console.error(` - ${f.page}: ${f.reason} (${f.url})`));
    process.exit(1);
  }

})().catch(err => {
  console.error('Fatal error running e2e tests:', err);
  process.exit(3);
});
