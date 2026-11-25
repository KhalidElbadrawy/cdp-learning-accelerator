// Design Document hand-off: download the document and the vendor email. (The readiness check in engine/suggest.js is kept but hidden for now.)
import { esc, icon, each, when } from '../dom.js';
import { gates } from '../../engine/initiative.js';
import { buildDocument } from '../../engine/document.js';
import { currentEmail, mailtoUrl, shortEmailBody } from '../../engine/email.js';
import { flowHeader } from './shell.js';
import { documentHtml, DOC_CSS } from './document.js';

// "Complete before sending" (deviation decisions and measurement hand-off) is hidden for now; set true to bring it back.
const SHOW_COMPLETION = false;

export function handoffView(s, init) {
  const g = gates(init);
  const doc = buildDocument(init);
  const mail = currentEmail(init);
  const to = init.handoff.vendorEmail || '';
  return `${flowHeader(init, 'handoff')}
  <section class="stack" style="gap:18px">
    <div class="two-col">
      <div class="card wide" style="background:#0D0F10;background-image:radial-gradient(130% 62% at 108% 92%, rgba(0,149,255,.4) 0%, rgba(108,99,255,.2) 40%, rgba(13,15,16,0) 72%)">
        <span class="eyebrow">Design phase output · Design Document hand-off</span>
        <h2 style="font-size:26px;font-weight:300;line-height:1.2">Send the <span style="color:var(--blue)">Design Document</span> to the vendor</h2>
        <p class="lead">The document brings together the Capability Architecture, the learning and assessment modes and every persona's learning path in one hand-off pack for the vendor.</p>
        ${when(!g.handoff, `<div class="notice warn">${icon('alert', 16, '#F5A3F5')}<span>The learning paths are not confirmed yet, so the document is marked "Work in progress".</span></div>`)}
        <div class="row">
          <button class="btn" data-act="download-doc">${icon('download', 15)} Download Design Document</button>
          <button class="btn ghost" data-act="ui-toggle" data-key="emailOpen">${icon('mail', 15)} Send to vendor</button>
        </div>
        ${when(SHOW_COMPLETION, () => `<div class="row">${doc.final ? '<span class="chip done">Final for approval</span>' : `<span class="chip warn">Draft: ${doc.openItems.length} open item${doc.openItems.length === 1 ? '' : 's'}</span>`}</div>`)}
        <span class="tiny">The download is an HTML file. Open it in your browser to print it or save it as PDF; the print dialog opens by itself.</span>
      </div>
    </div>

    ${when(SHOW_COMPLETION, () => `    <div class="card">
      <div class="stack" style="gap:4px"><h3 class="h3">Complete before sending</h3>
        <span class="small">These answers go straight into the document, so it has no blanks to fill in by hand. Anything left empty is listed under "Open items" and the document stays a Draft.</span></div>
      ${when(doc.openItems.length, `<div class="notice warn">${icon('alert', 16, '#F5A3F5')}<span>${each(doc.openItems, x => `${esc(x)}<br>`)}</span></div>`, '<div class="notice">Everything is complete. The document is marked Final for approval.</div>')}
      <h4 style="margin:6px 0 0;font-weight:500">Deviation decisions</h4>
      ${doc.deviations.length ? each(doc.deviations, d => `<div class="dev-row">
        <div class="stack" style="gap:2px"><span class="chip warn" style="align-self:flex-start">${esc(d.id)}</span><b style="font-weight:500">${esc(d.persona)}</b><span class="small">${esc(d.kind)}: ${esc(d.item)}</span><span class="tiny">${esc(d.position)}</span>
          <button class="link" style="align-self:flex-start;padding:0;font-size:12px" data-act="go" data-screen="${d.kind === 'Learning mode' ? 'learning' : d.kind === 'Assessment mode' ? 'assess' : 'map'}">Remove it instead</button></div>
        <div class="field"><label for="dv-r-${d.id}">Why this persona needs it</label><textarea class="textarea" rows="3" id="dv-r-${d.id}" data-inp="decision" data-chg="handoff-refresh" data-dev="${esc(d.key)}" data-key="rationale">${esc(d.rationale)}</textarea></div>
        <div class="stack" style="gap:8px"><div class="field"><label for="dv-a-${d.id}">Accepted by</label><input class="input" id="dv-a-${d.id}" placeholder="Name, role" value="${esc(d.approver)}" data-inp="decision" data-chg="handoff-refresh" data-dev="${esc(d.key)}" data-key="approver"></div>
          <div class="field"><label for="dv-d-${d.id}">Date</label><input class="input" type="date" id="dv-d-${d.id}" value="${esc(d.date)}" data-inp="decision" data-chg="handoff-refresh" data-dev="${esc(d.key)}" data-key="date"></div></div>
      </div>`) : '<span class="small">No deviations to decide.</span>'}
      <h4 style="margin:10px 0 0;font-weight:500">Measurement hand-off</h4>
      <div class="grid-auto">
        <div class="field"><label for="ms-owner">Tracking owner</label><input class="input" id="ms-owner" placeholder="Name, role" value="${esc(init.handoff.measure?.owner || '')}" data-inp="measure" data-chg="handoff-refresh" data-key="owner"></div>
        <div class="field"><label for="ms-base">Baseline captured by</label><input class="input" type="date" id="ms-base" value="${esc(init.handoff.measure?.baseline || '')}" data-inp="measure" data-chg="handoff-refresh" data-key="baseline"></div>
        <div class="field"><label for="ms-rev">First readiness review</label><input class="input" type="date" id="ms-rev" value="${esc(init.handoff.measure?.review || '')}" data-inp="measure" data-chg="handoff-refresh" data-key="review"></div>
      </div>
    </div>`)}

    ${when(s.ui.emailOpen, () => `<div class="card" style="border-color:rgba(0,149,255,.35)">
      <div class="row between"><div class="stack" style="gap:4px"><h3 class="h3" style="font-size:18px;font-weight:400">Email to the vendor</h3>
        <span class="small">Check the draft, then open it in Outlook. Attach the Design Document file (from Download Design Document) before sending.</span></div>
        <div class="row">${when(init.handoff.subject != null || init.handoff.body != null, '<button class="btn small ghost" data-act="email-reset">Use the standard draft</button>')}
          <button class="btn small ghost" data-act="ui-toggle" data-key="emailOpen">Close</button></div></div>
      <div class="field" style="max-width:440px"><label for="vendor-email">Vendor email</label><input class="input" id="vendor-email" type="email" placeholder="name@vendor.com" value="${esc(to)}" data-inp="email-field" data-key="vendorEmail"></div>
      <div class="field"><label for="email-subject">Subject</label><input class="input" id="email-subject" value="${esc(mail.subject)}" data-inp="email-field" data-key="subject"></div>
      <div class="field"><label for="email-body">Message</label><textarea class="textarea" id="email-body" rows="16" data-inp="email-field" data-key="body">${esc(mail.body)}</textarea></div>
      <div class="row">
        <a class="btn" href="${esc(mailtoUrl(to, mail.subject, mail.body, init.handoff.body == null ? shortEmailBody(init) : null))}" target="_blank" rel="noopener" data-act="mail-opened">${icon('mail', 15)} Open draft in Outlook</a>
        <button class="btn ghost" data-act="copy-email">${icon('copy', 15)} Copy email text</button>
      </div>
      <span class="tiny">"Open draft in Outlook" opens a new email in your default email app (Outlook desktop if it is the default). If nothing opens, use Copy email text and paste it into Outlook.</span>
    </div>`)}

    <div class="card">
      <div class="row between"><h3 class="h3">Design Document preview</h3><span class="tiny">Same layout as the downloaded document.</span></div>
      <div class="paper-wrap"><div class="paper"><style>${DOC_CSS}</style>${documentHtml(doc, init)}</div></div>
    </div>
  </section>`;
}
