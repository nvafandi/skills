#!/usr/bin/env node
/**
 * Split Cucumber JSON report into 3 separate HTML files:
 *   1. cucumber-failed.html - only FAILED scenarios
 *   2. cucumber-passed.html - only PASSED scenarios
 *   3. cucumber-all.html    - ALL scenarios
 *
 * Also generates PDF versions of each HTML report using headless Edge/Chrome:
 *   1. cucumber-failed.pdf
 *   2. cucumber-passed.pdf
 *   3. cucumber-all.pdf
 *
 * Usage:
 *   node scripts/split-cucumber-report.js            # HTML only
 *   node scripts/split-cucumber-report.js --pdf      # HTML + PDF
 *   node scripts/split-cucumber-report.js --pdf-only # PDF only
 *
 * Reads:  target/cucumber-reports/cucumber.json
 * Writes: target/cucumber-reports/cucumber-{all,passed,failed}.{html,pdf}
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPORT_DIR = path.join(process.cwd(), 'target', 'cucumber-reports');
const JSON_REPORT = path.join(REPORT_DIR, 'cucumber.json');

// Parse CLI flags: --pdf, --pdf-only
const args = process.argv.slice(2);
const WANT_PDF = args.includes('--pdf') || args.includes('--pdf-only');
const PDF_ONLY = args.includes('--pdf-only');

// Common headless browser locations on Windows / macOS / Linux
const BROWSER_CANDIDATES = [
  // Windows - Microsoft Edge
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  // Windows - Google Chrome
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  // Linux
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/microsoft-edge'
];

function findBrowser() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function convertHtmlToPdf(browser, htmlFile, pdfFile) {
  const htmlUrl = path.resolve(htmlFile).replace(/\\/g, '/');
  const outPdf = path.resolve(pdfFile);
  try {
    execFileSync(browser, [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--print-to-pdf=' + outPdf,
      'file:///' + htmlUrl
    ], { stdio: 'ignore', timeout: 60000 });
    return true;
  } catch (e) {
    console.warn(`[split-cucumber-report] PDF conversion failed for ${path.basename(htmlFile)}: ${e.message.split('\n')[0]}`);
    return false;
  }
}

if (!fs.existsSync(JSON_REPORT)) {
  console.error(`[split-cucumber-report] JSON report not found: ${JSON_REPORT}`);
  console.error('Run tests first: mvn test -Dtest=CampaignTestRunner');
  process.exit(1);
}

const raw = fs.readFileSync(JSON_REPORT, 'utf-8');
const features = JSON.parse(raw);

// Flatten all scenarios across features
const scenarios = [];
for (const feature of features) {
  for (const element of feature.elements || []) {
    if (element.type !== 'scenario' && element.type !== 'background') continue;
    if (element.type === 'background') continue;

    const steps = element.steps || [];
    const failedSteps = steps.filter(s => s.result && s.result.status === 'failed');
    const passedSteps = steps.filter(s => s.result && s.result.status === 'passed');
    const skippedSteps = steps.filter(s => s.result && s.result.status === 'skipped');
    const undefinedSteps = steps.filter(s => s.result && s.result.status === 'undefined');
    const pendingSteps = steps.filter(s => s.result && s.result.status === 'pending');

    const status = failedSteps.length > 0
      ? 'FAILED'
      : undefinedSteps.length > 0
        ? 'UNDEFINED'
        : pendingSteps.length > 0
          ? 'PENDING'
          : 'PASSED';

    scenarios.push({
      featureName: feature.name,
      featureUri: feature.uri,
      name: element.name,
      line: element.line,
      tags: (element.tags || []).map(t => t.name),
      status,
      steps,
      failedSteps,
      passedSteps,
      skippedSteps,
      undefinedSteps,
      pendingSteps,
      duration: element.steps.reduce((sum, s) => sum + ((s.result && s.result.duration) || 0), 0)
    });
  }
}

const passed = scenarios.filter(s => s.status === 'PASSED');
const failed = scenarios.filter(s => s.status !== 'PASSED');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function formatDuration(ns) {
  if (!ns) return '0ms';
  const ms = ns / 1e6;
  if (ms < 1000) return ms.toFixed(0) + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

function renderScenario(s) {
  const tagHtml = s.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
  const stepRows = s.steps.map(step => {
    const status = (step.result && step.result.status) || 'unknown';
    const statusClass = status === 'passed' ? 'pass' : status === 'failed' ? 'fail' : status === 'skipped' ? 'skip' : 'warn';
    const error = step.result && step.result.error_message
      ? `<pre class="error">${escapeHtml(step.result.error_message)}</pre>`
      : '';
    return `<tr class="${statusClass}">
      <td class="status">${status.toUpperCase()}</td>
      <td>${escapeHtml(step.keyword)} ${escapeHtml(step.name)}</td>
      <td class="duration">${formatDuration(step.result && step.result.duration)}</td>
    </tr>${error ? `<tr class="${statusClass}"><td colspan="3">${error}</td></tr>` : ''}`;
  }).join('');

  return `<div class="scenario ${s.status.toLowerCase()}">
    <div class="scenario-header">
      <span class="scenario-status ${s.status.toLowerCase()}">${s.status}</span>
      <span class="scenario-name">${escapeHtml(s.name)}</span>
      <span class="scenario-duration">${formatDuration(s.duration)}</span>
    </div>
    <div class="scenario-meta">
      <span class="feature">${escapeHtml(s.featureName)}</span>
      <span class="line">line ${s.line}</span>
      ${tagHtml}
    </div>
    <table class="steps">
      <thead><tr><th>Status</th><th>Step</th><th>Duration</th></tr></thead>
      <tbody>${stepRows}</tbody>
    </table>
  </div>`;
}

function renderPage(title, scenarios, summary) {
  const body = scenarios.map(renderScenario).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f6fa; color: #2d3436; padding: 20px; }
  h1 { margin-bottom: 8px; }
  .summary { display: flex; gap: 16px; margin: 16px 0 24px; flex-wrap: wrap; }
  .summary .stat { background: #fff; border-radius: 8px; padding: 12px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .summary .stat .num { font-size: 24px; font-weight: 700; }
  .summary .stat .label { font-size: 12px; color: #636e72; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat.pass .num { color: #00b894; }
  .stat.fail .num { color: #d63031; }
  .stat.total .num { color: #0984e3; }
  .scenario { background: #fff; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
  .scenario-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #eee; }
  .scenario-status { font-weight: 700; font-size: 12px; padding: 3px 8px; border-radius: 4px; color: #fff; }
  .scenario-status.passed { background: #00b894; }
  .scenario-status.failed { background: #d63031; }
  .scenario-status.undefined, .scenario-status.pending { background: #fdcb6e; color: #2d3436; }
  .scenario-name { font-weight: 600; flex: 1; }
  .scenario-duration { color: #636e72; font-size: 13px; }
  .scenario-meta { display: flex; gap: 12px; padding: 8px 16px; background: #fafafa; font-size: 12px; color: #636e72; flex-wrap: wrap; }
  .tag { background: #dfe6e9; border-radius: 4px; padding: 2px 6px; font-size: 11px; }
  .steps { width: 100%; border-collapse: collapse; }
  .steps th { text-align: left; font-size: 11px; text-transform: uppercase; color: #636e72; padding: 8px 16px; background: #f8f9fa; }
  .steps td { padding: 8px 16px; border-top: 1px solid #f0f0f0; font-size: 13px; }
  .steps .status { font-weight: 700; font-size: 11px; width: 80px; }
  .steps .duration { color: #636e72; width: 100px; text-align: right; }
  tr.pass .status { color: #00b894; }
  tr.fail .status { color: #d63031; }
  tr.skip .status { color: #636e72; }
  tr.warn .status { color: #fdcb6e; }
  .error { background: #ffeaea; color: #d63031; padding: 8px; border-radius: 4px; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
  .empty { text-align: center; color: #636e72; padding: 40px; font-size: 16px; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="summary">
    <div class="stat total"><div class="num">${summary.total}</div><div class="label">Total</div></div>
    <div class="stat pass"><div class="num">${summary.passed}</div><div class="label">Passed</div></div>
    <div class="stat fail"><div class="num">${summary.failed}</div><div class="label">Failed</div></div>
  </div>
  ${body || '<div class="empty">No scenarios in this category.</div>'}
</body>
</html>`;
}

const summary = {
  total: scenarios.length,
  passed: passed.length,
  failed: failed.length
};

const files = [];

// 1. All scenarios
if (!PDF_ONLY) {
  files.push({ type: 'html', name: 'cucumber-all.html', data: renderPage('Cucumber Report - All Scenarios', scenarios, summary) });
  console.log(`[split-cucumber-report] Wrote cucumber-all.html (${scenarios.length} scenarios)`);
}

// 2. Passed scenarios
if (!PDF_ONLY) {
  files.push({ type: 'html', name: 'cucumber-passed.html', data: renderPage('Cucumber Report - Passed Scenarios', passed, { total: passed.length, passed: passed.length, failed: 0 }) });
  console.log(`[split-cucumber-report] Wrote cucumber-passed.html (${passed.length} scenarios)`);
}

// 3. Failed scenarios
if (!PDF_ONLY) {
  files.push({ type: 'html', name: 'cucumber-failed.html', data: renderPage('Cucumber Report - Failed Scenarios', failed, { total: failed.length, passed: 0, failed: failed.length }) });
  console.log(`[split-cucumber-report] Wrote cucumber-failed.html (${failed.length} scenarios)`);
}

// Write HTML files
for (const f of files) {
  fs.writeFileSync(path.join(REPORT_DIR, f.name), f.data);
}

// Generate PDF versions
if (WANT_PDF) {
  if (!PDF_ONLY) {
    console.log('[split-cucumber-report] Generating PDF versions...');
  }
  const browser = findBrowser();
  if (!browser) {
    console.warn('[split-cucumber-report] No headless browser found (Edge/Chrome). PDF generation skipped.');
    console.warn('Install Edge or Chrome, or use an alternative PDF tool.');
  } else {
    console.log(`[split-cucumber-report] Using browser: ${browser}`);
    // Ensure HTML exists for PDF conversion
    for (const f of files) {
      fs.writeFileSync(path.join(REPORT_DIR, f.name), f.data);
    }
    const pdfResults = [];
    for (const f of files) {
      const pdfName = f.name.replace('.html', '.pdf');
      const ok = convertHtmlToPdf(browser, path.join(REPORT_DIR, f.name), path.join(REPORT_DIR, pdfName));
      pdfResults.push(ok);
      console.log(`[split-cucumber-report] ${ok ? 'Wrote' : 'SKIPPED'} ${pdfName}`);
    }
    if (pdfResults.every(Boolean)) {
      console.log('[split-cucumber-report] All PDF reports generated successfully.');
    } else {
      console.warn('[split-cucumber-report] Some PDF reports failed to generate.');
    }
  }
}

console.log('[split-cucumber-report] Done.');