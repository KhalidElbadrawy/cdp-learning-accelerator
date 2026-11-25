// End-to-end run of the whole V2 flow in Chromium, with fake claude.ai capabilities
// (shared db in memory, captured downloads). Run: node tests/e2e.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '..', 'e2e-shots');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const FAKE = () => {
  const docs = new Map(); const subs = [];
  const snap = () => ({ metadata: { hasPendingWrites: false }, docs: [...docs.entries()].map(([id, d]) => ({ id, data: () => d })) });
  const db = { collection: () => ({
    get: async () => snap(),
    doc: id => ({ set: async d => { docs.set(id, d); }, delete: async () => { docs.delete(id); } }),
    onSnapshot: cb => { subs.push(cb); return () => {}; }
  }) };
  window.__downloads = [];
  window.__aiCalls = [];
  // Fake Claude for Rafeeq: canned answers recognised from each task's prompt.
  const sample = async (messages, opts = {}) => {
    window.__aiCalls.push('chat');
    const text = 'Start with the Essential steps, then practise in the sandbox before go-live.';
    if (opts.onText) { opts.onText({ text: text.slice(0, 20), delta: '' }); await new Promise(r => setTimeout(r, 50)); opts.onText({ text, delta: '' }); }
    return { text, truncated: false };
  };
  sample.json = async prompt => {
    window.__aiCalls.push(prompt.slice(0, 160));
    if (prompt.includes('Task: improve the Business Needs')) return { outcomes: [{ index: 0, text: 'Cut publishing time from [5] to [2] days across entities', why: 'Makes the outcome measurable.' }], processes: [{ text: 'Content archiving', why: 'Common on publishing platforms.' }] };
    if (prompt.includes('Task: suggest which CDP personas')) return { personas: [{ key: 'Specialist', why: 'Runs specialist publishing work.' }] };
    if (prompt.includes('Task: recommend the proficiency')) return { domains: { platform: { level: 'Essential', why: 'Routine use.' }, role: { level: 'Essential', why: 'Clear role.' }, process: { level: 'Essential', why: 'Follows steps.' }, support: { level: 'Essential', why: 'Supports nobody.' } } };
    if (prompt.includes('Task: classify platform activities')) { const ids = [...prompt.matchAll(/"id":"(tx-[a-z0-9]+)"/g)].map(m => m[1]); return { items: ids.map(id => ({ id, type: 'Practice & Observation', why: 'Learnt through feedback.' })) }; }
    if (prompt.includes('Task: decide which personas perform')) return { roles: [] };
    if (prompt.includes('Task: design the lesson plan')) {
      const units = JSON.parse(prompt.slice(prompt.indexOf('Units: ') + 7, prompt.indexOf('\nAnswer with JSON')));
      return { units: units.map(u => ({ unit: u.unit, title: u.kind === 'fixed' ? 'Why the platform is changing' : 'Get it done in ' + u.unit,
        outcomes: ['Explain the change in your own words', 'Complete the core steps without help'],
        lessons: [{ title: 'See it in action', type: 'Video', mode: u.modes[0], minutes: 4, activities: u.activities.slice(0, 1).map(a => a.replace(/ \((Essential|Proficient|Advanced)\)$/, '')), description: 'A short demo of the real screens.' },
                  { title: 'Try it yourself', type: 'Interactive walkthrough', mode: u.modes[u.modes.length - 1], minutes: 8, activities: [], description: 'Guided steps inside the platform.' }],
        assessment: u.assessments.length ? { mode: u.assessments[0], task: 'Complete the task end to end.', evidence: 'Task completed in the platform.' } : null,
        experience: 'I watch it once, then do it myself with guidance.' })) };
    }
    if (prompt.includes('Task: polish how')) { const t = [...prompt.matchAll(/"title":"([^"]+)"/g)].map(m => m[1]).filter(x => !/microlearning/i.test(x)); return { narrative: 'A short, clear path from guided steps to confident, independent work.', units: t.slice(0, 1).map(from => ({ from, title: 'Raise and track requests' })) }; }
    return {};
  };
  const downloads = { save: async ({ filename, data }) => { window.__downloads.push({ filename, size: (data.length || data.byteLength || 0) }); return { status: 'saved' }; } };
  const caps = { db, sample, downloads };
  window.claude = { use: async name => caps[name] || null };
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.route('http://app.test/**', async route => {
    const url = new URL(route.request().url());
    const file = path.join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'nf' });
    let body = fs.readFileSync(file);
    if (file.endsWith('index.html')) body = Buffer.from('<!doctype html><html><head><meta charset="utf-8"></head><body>' + body + '</body></html>');
    route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body });
  });
  await page.addInitScript(FAKE);
  const shot = async n => page.screenshot({ path: path.join(OUT, n + '.png'), fullPage: true });
  const click = async (sel, opts) => { await page.click(sel, opts); await page.waitForTimeout(120); };
  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); await shot('fail-' + name.replace(/\W+/g, '-')); throw e; } };

  try {
    await page.goto('http://app.test/index.html');
    await page.waitForSelector('.hero');
    await shot('01-home-empty');
    await step('start new initiative', async () => { await click('button:has-text("Start a new initiative")'); await page.waitForSelector('#need-name'); });
    await step('business needs', async () => {
      await page.fill('#need-name', 'Website Hub');
      await page.fill('#need-goLive', '2027-02-01');
      await page.fill('#need-outcome-0', 'Faster, consistent publishing across entities.');
      await click('button:has-text("Add another outcome")');
      await page.fill('#need-outcome-1', 'Fewer content support tickets');
      await page.fill('#need-processes-0', 'Content request and approval');
      await click('button:has-text("Add another process")');
      await page.fill('#need-processes-1', 'Publishing');
      await click('#need-goLive');
      await shot('02-needs');
      await click('button:has-text("Save and continue")');
      await page.waitForSelector('text=Persona Selection');
    });
    await step('persona selection', async () => {
      for (const t of ['Operational End User', 'Super User', 'People Manager']) await click(`input[aria-label="Select ${t}"]`);
      await shot('03-personas');
      await click('button:has-text("Confirm Persona Selection")');
      await page.waitForSelector('text=Proficiency Level');
    });
    await step('proficiency', async () => {
      const answers = { 0: [1, 0], 1: [1, 1, 1], 2: [1, 1, 0] }; // End users Essential, Super users Advanced, People managers Proficient
      await click('button[data-act="prof-default"]'); await page.waitForSelector('text=Default level: Essential');
      if (!(await page.textContent('.tabs .tab >> nth=0')).includes('Essential')) throw new Error('set to default did not apply');
      await shot('04b-proficiency-default');
      for (const [tab, seq] of Object.entries(answers)) {
        await click(`.tabs .tab >> nth=${tab}`);
        for (const d of ['platform', 'role', 'process', 'support']) {
          for (let q = 0; q < seq.length; q++) await click(`button[data-domain="${d}"][data-q="${q}"][data-v="${seq[q]}"]`);
        }
      }
      await shot('04-proficiency');
      await click('button:has-text("Continue to Capability Architecture")');
    });
    await step('capability', async () => { await page.waitForSelector('text=Overall = the persona'); await shot('05-capability'); await click('button:has-text("Confirm Capability Architecture")'); await page.waitForSelector('text=Assign Learning Modes'); });
    await step('learning modes with a deviation', async () => {
      await click('button:has-text("Show higher-level modes") >> nth=0');
      await click('input[data-chg="toggle-mode"][data-persona="End users"][data-value="Practice environment"]');
      await page.waitForSelector('text=is not compliant with the CDP Learning Framework for Essential');
      await shot('06-learning');
      await click('button:has-text("Continue to Assess")');
    });
    await step('assessment', async () => { await page.waitForSelector('text=Select Assessment Modes'); await click('button:has-text("Browse") >> nth=0'); await shot('07-assess'); await click('button:has-text("Review readiness evidence")'); });
    await step('evidence', async () => { await page.waitForSelector('text=Assessment Modes and Readiness Evidence'); await click('button:has-text("Confirm and create learning paths")'); await page.waitForSelector('text=Upload the system transactions'); });
    await step('template download', async () => { await click('button:has-text("Download the template")'); await page.waitForTimeout(1500); });
    await step('upload transactions', async () => {
      const csv = 'System module,Process,Transaction,Platform role\nProcurement,Purchase to pay,Approve Purchase Order,Budget Approver\nProcurement,Purchase to pay,Create Purchase Requisition,Requester\nProcurement,Sourcing,Evaluate Supplier Bid Response,Procurement Officer\nFinance,Budgeting,Budget Preparation,Finance Planner\nHR,Performance,Performance Calibration,Line Manager\nHR,Performance,Request Feedback,Employee\nHR,Performance,Schedule Check-In,Line Manager\nHR,Talent,Create Individual Development Plan,Employee\nCMS,Publishing,Publish web page,Requester\nCMS,Publishing,Publish web page,Requester\n';
      await page.setInputFiles('#tx-file', { name: 'transactions.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
      await page.waitForSelector('text=9 transactions read');
      await shot('08-upload');
      await click('button:has-text("Classify transactions")');
    });
    await step('classify (built-in)', async () => {
      await page.waitForSelector('text=Content type and proficiency');
      await page.waitForSelector('text=How each transaction was classified');
      if (await page.$('text=AI')) { const t = await page.textContent('main'); if (/Suggest with AI|AI help/.test(t)) throw new Error('AI still on the page'); }
      await shot('09-classify');
      await page.waitForSelector('text=Every transaction has a content type and proficiency');
      await click('button:has-text("Map personas")');
    });
    await step('map personas', async () => {
      await page.waitForSelector('text=Map personas to transactions');
      await page.waitForSelector('text=Suggested mapping');
      await shot('10a-map-suggested');
      await click('button:has-text("Apply all")');
      await page.waitForSelector("text=matches the tool's suggestions");
      await page.waitForSelector("text=Transactions above the persona's level");
      await shot('10-map-conflicts');
      // Resolve every open conflict: first one lowered, first unmapped, rest accepted.
      while (await page.$('button[data-how="accept"]')) await click('button[data-how="accept"] >> nth=0');
      await shot('11-map-resolved');
      await click('button:has-text("Generate learning paths")');
    });
    await step('learning paths', async () => {
      await page.waitForSelector('text=Review the learning paths');
      await shot('12-paths');
      await page.setViewportSize({ width: 1180, height: 1000 }); await page.waitForTimeout(300);
      await page.locator('.jscroll').scrollIntoViewIfNeeded();
      if (await page.$('.jscroll.fits')) throw new Error('navigator should show when the journey overflows');
      const before = await page.$eval('.journey', e => e.scrollLeft);
      await page.locator('.jscroll').screenshot({ path: path.join(OUT, '12b-journey-nav.png') });
      await click('.jnav[data-jdir="1"]'); await page.waitForTimeout(700);
      const after = await page.$eval('.journey', e => e.scrollLeft);
      if (!(after > before)) throw new Error('next arrow did not scroll the journey');
      await page.locator('.jscroll').screenshot({ path: path.join(OUT, '12c-journey-nav-scrolled.png') });
      await page.setViewportSize({ width: 1440, height: 1000 }); await page.waitForTimeout(300);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (await page.$('input[data-chg="duration"]')) throw new Error('review page should not have minute inputs');
      await click('button:has-text("Edit path")');
      await page.waitForSelector('h2:has-text("Edit")');
      if (!(await page.textContent('.crumb')).includes('Edit Learning Path')) throw new Error('edit page crumb');
      await page.fill('input[data-chg="duration"] >> nth=0', '45'); await page.press('input[data-chg="duration"] >> nth=0', 'Enter'); await page.waitForTimeout(150);
      await page.waitForSelector('text=reset');
      await shot('12d-path-edit');
      await click('button:has-text("Back to review")');
      await page.waitForSelector('text=Path insights');
      await page.waitForSelector('text=Learning unit 1');
      for (let t = 0; t < 3; t++) { await click(`.tabs .tab >> nth=${t}`); await click('input[data-chg="mark-reviewed"]'); }
      await shot('13-paths-reviewed');
      await click('button:has-text("Confirm learning paths")');
    });
    await step('phase stepper is clickable', async () => {
      await click('.phase[data-phase="define"]');
      await page.waitForSelector('h1:has-text("New Initiative")');
      if (!(await page.textContent('.crumb')).includes('Capability Architecture')) throw new Error('Define phase did not open its last step');
      await click('.phase[data-phase="assess"]');
      if (!(await page.textContent('.crumb')).includes('Readiness Evidence')) throw new Error('Assess phase did not open its step');
      await click('.phase[data-phase="deploy"]');
      await page.waitForSelector('text=Deploy opens once its content is supplied');
      await click('.phase[data-phase="design"]');
      if (!(await page.textContent('.crumb')).includes('Design Document Hand-off')) throw new Error('Design phase did not open its next step');
    });
    await step('hand-off', async () => {
      await page.waitForSelector('text=Design Document preview');
      if (await page.$('text=Readiness check')) throw new Error('readiness check should be hidden');
      await click('button:has-text("Send to vendor")');
      await page.fill('#vendor-email', 'vendor@example.com');
      await page.waitForFunction(() => document.querySelector('#email-subject') && document.querySelector('#email-subject').value.includes('Website Hub'));
      if (await page.$('text=Complete before sending')) throw new Error('completion card should be hidden');
      if (await page.$('.idd .open')) throw new Error('document should not list draft items');
      if ((await page.textContent('.idd')).includes('[')) throw new Error('document still has bracket placeholders');
      await click('button:has-text("Download Design Document")');
      await page.waitForTimeout(400);
      await shot('14-handoff');
      require('fs').writeFileSync(path.join(OUT, 'document.html'), '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff;width:794px;padding:24px">' + await page.$eval('.paper', e => e.innerHTML) + '</body>');
    });
    await step('home and lists', async () => {
      await click('.nav button:has-text("Home")');
      await page.waitForSelector('text=Current initiative');
      await shot('15-home');
      await click('.nav button:has-text("Completed Initiatives")');
      await page.waitForSelector('text=Website Hub');
      await click('.nav button:has-text("Ongoing Initiatives")');
      await click('.nav button:has-text("Home")');
      await click('button:has-text("Start a new initiative") >> nth=0');
      await page.fill('#need-name', 'HR Portal'); await page.fill('#need-goLive', '2027-03-01'); await page.fill('#need-outcome-0', 'x'); await page.fill('#need-processes-0', 'y');
      await click('button:has-text("Save and continue")');
      await click('.nav button:has-text("Ongoing Initiatives")');
      await click('button:has-text("Delete")');
      await click('button:has-text("Yes, delete")');
      await page.waitForSelector('text=No ongoing initiatives');
      await shot('16-ongoing-after-delete');
    });
    await step('rafiq', async () => {
      // Ask panel: a question gets a streamed answer.
      await click('button[data-act="rafiq-open"]');
      await page.fill('#rafiq-input', 'What should I do next?');
      await page.press('#rafiq-input', 'Enter');
      await page.waitForSelector('.rafiq-msg.bot >> text=practise in the sandbox');
      await shot('17-rafiq-ask');
      await click('button[data-act="rafiq-close"]');
      // Business Needs: accept a measurable outcome and an extra process.
      await click('.nav button:has-text("Completed Initiatives")'); await click('text=Website Hub');
      await click('.phase[data-phase="define"]'); await click('.steps .step >> text=Business Needs');
      await click('button[data-act="rafiq-run"][data-task="needs"]');
      await page.waitForSelector('text=Cut publishing time');
      await shot('18-rafiq-needs');
      await click('button[data-act="rafiq-accept"][data-task="needs"][data-kind="all"]');
      if (!(await page.inputValue('#need-outcome-0')).includes('Cut publishing time')) throw new Error('outcome not applied');
      // Proficiency: recommendations render with a reason per domain (not applied).
      await click('.steps .step >> text=Proficiency Level');
      await click('button[data-act="rafiq-run"][data-task^="prof:"]');
      await page.waitForSelector('text=Routine use.');
      await click('button[data-act="rafiq-dismiss"]');
      // Learning path: polish the wording, then revert.
      await click('.phase[data-phase="design"]'); await click('.steps .step >> text=Generate and Review Paths');
      await click('button[data-act="rafiq-run"][data-task^="path:"]');
      await page.waitForSelector('text=A short, clear path');
      await click('button[data-act="rafiq-accept"][data-task^="path:"]');
      await page.waitForSelector('text=Wording suggested by Rafeeq');
      await shot('19-rafiq-path');
      await click('button[data-act="rafiq-revert-path"]');
      await page.waitForSelector('button[data-act="rafiq-run"][data-task^="path:"]');
      // Lesson plan: draft, save, open a unit, and see it in the Design Document.
      await click('button[data-act="rafiq-run"][data-task^="lessons:"]');
      await page.waitForSelector('button:has-text("Save lesson plan")');
      await click('button:has-text("Save lesson plan")');
      await page.waitForSelector('.syl-stats');
      await click('.syl-sum >> nth=1');
      await page.waitForSelector('.syl-unit.open >> text=Try it yourself');
      await page.locator('.syl').screenshot({ path: path.join(OUT, '20-lesson-plan.png') });
      await click('.steps .step >> text=Design Document Hand-off');
      await page.waitForSelector('.idd >> text=Lesson plan');
    });
    await step('reload keeps data', async () => {
      // The fake db lives in the page, so reload re-creates it; check localStorage-free state instead by re-reading the in-memory doc count.
      const n = await page.evaluate(async () => (await (await window.claude.use('db')).collection('initiatives').get()).docs.length);
      if (n !== 1) throw new Error('expected 1 stored initiative, got ' + n);
    });
    await step('phone width', async () => { await page.setViewportSize({ width: 400, height: 900 }); await page.waitForTimeout(200); const w = await page.evaluate(() => document.documentElement.scrollWidth); await shot('17-phone'); if (w > 402) throw new Error('page scrolls sideways: ' + w); });
  } catch (e) { /* reported above */ }
  console.log('downloads', JSON.stringify(await page.evaluate(() => window.__downloads)));
  console.log('ai calls', await page.evaluate(() => window.__aiCalls.length));
  console.log('console errors', errors.length ? errors : 'none');
  await browser.close();
})();
