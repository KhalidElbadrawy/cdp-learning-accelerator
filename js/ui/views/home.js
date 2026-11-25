// Home dashboard and the Ongoing / Completed initiative lists.
import { esc, icon, each, when, plural } from '../dom.js';
import { summary } from '../../engine/initiative.js';
import { phaseStepper } from './shell.js';
import { formatDate } from '../../engine/paths.js';

const sorted = list => [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
const dot = sum => (sum.atRisk ? 'var(--quantum)' : (sum.done ? 'var(--done)' : 'var(--blue)'));

function mark() {
  return `<div class="mark" aria-hidden="true">
    <span class="glow"></span><span class="pulse"></span><span class="pulse b"></span>
    <span class="orbit"><span class="sat" style="top:-4px;left:50%;width:8px;height:8px;margin-left:-4px;background:#66BEFF;box-shadow:0 0 12px rgba(0,149,255,.95)"></span><span class="sat" style="bottom:-3px;left:50%;width:6px;height:6px;margin-left:-3px;background:#E943E9;box-shadow:0 0 10px rgba(233,67,233,.85)"></span></span>
    <span class="orbit in"><span class="sat" style="top:50%;right:-3.5px;width:7px;height:7px;margin-top:-3.5px;background:#8F88FF;box-shadow:0 0 10px rgba(108,99,255,.9)"></span></span>
    <img src="assets/learning-mark.svg" alt="">
  </div>`;
}

export function homeView(s, init) {
  const all = s.inits.map(i => ({ i, sum: summary(i) }));
  const ongoing = all.filter(x => !x.sum.done), done = all.filter(x => x.sum.done);
  const stats = [
    { k: 'Total initiatives', v: all.length, ic: 'layers', tone: '#66BEFF', bg: 'rgba(0,149,255,.16)', to: ongoing.length || !all.length ? 'ongoing' : 'done' },
    { k: 'Ongoing', v: ongoing.length, ic: 'clock', tone: '#66D0F7', bg: 'rgba(0,176,240,.14)', to: 'ongoing' },
    { k: 'Completed', v: done.length, ic: 'check', tone: '#66D0F7', bg: 'rgba(0,176,240,.16)', to: 'done' },
    { k: 'At risk', v: all.filter(x => x.sum.atRisk).length, ic: 'alert', tone: '#F19BF1', bg: 'rgba(233,67,233,.16)', to: 'ongoing' }
  ];
  const cur = init && init.created ? init : null;
  const sum = cur ? summary(cur) : null;
  return `<section class="stack" style="gap:20px">
    <div class="hero">
      <div class="hero-text">
        <span class="eyebrow">Common Digital Platforms</span>
        <h2 class="hero-title" aria-label="Turn platform change into user adoption."><span class="hm" aria-hidden="true"><span class="hw" style="--i:0">Turn</span></span> <span class="hm" aria-hidden="true"><span class="hw" style="--i:1">platform</span></span> <span class="hm" aria-hidden="true"><span class="hw" style="--i:2">change</span></span> <span class="hm" aria-hidden="true"><span class="hw" style="--i:3">into</span></span> <span class="hm" aria-hidden="true"><span class="hw" style="--i:4">user</span></span> <span class="hm hl-wrap" aria-hidden="true"><span class="hl">adoption.<span class="hline"></span></span><span class="hbox"></span></span></h2>
        <p class="lead">Define the people, capabilities and learning support every digital platform initiative needs, then turn its system transactions into a learning path for each persona.</p>
        <div class="row" style="gap:16px;margin-top:6px">
          <button class="btn" data-act="start-new">Start a new initiative ${icon('arrow', 15)}</button>
          ${when(cur, `<button class="link" data-act="continue">Resume active work →</button>`)}
        </div>
      </div>
      ${mark()}
      <div class="stats">${each(stats, x => `<button class="stat" data-act="go" data-screen="${x.to}" title="See ${esc(x.k.toLowerCase())}">
        <span class="ic" style="background:${x.bg};color:${x.tone}">${icon(x.ic, 21)}</span>
        <span><span class="v tabular">${x.v}</span><br><span class="k">${esc(x.k)}</span></span></button>`)}</div>
    </div>

    <div class="card ci" style="border-color:rgba(0,149,255,.3)">
      ${cur ? `
      <div class="ci-head">
        <div class="stack" style="gap:6px">
          <span class="eyebrow">Current Initiative</span>
          <div class="row"><h2 style="font-size:26px">${esc(cur.needs.name)}</h2><span class="chip info">New Platform</span></div>
          <span class="small">Started ${esc(cur.started || '—')} · Due ${esc(cur.due || '—')}${cur.needs.goLive ? ` · Go-live ${esc(formatDate(cur.needs.goLive))}` : ''}</span>
        </div>
        <div class="row">
          ${s.ui.confirmReset ? `<span class="small">Clear all progress on this initiative?</span>
            <button class="btn small solid-danger" data-act="reset-progress">Yes, reset</button>
            <button class="btn small ghost" data-act="ui" data-key="confirmReset" data-val="">Cancel</button>`
            : `<button class="btn ghost" data-act="ui" data-key="confirmReset" data-val="1">${icon('reset', 15)} Reset progress</button>`}
          <button class="btn" data-act="continue">Continue initiative ${icon('arrow', 15)}</button>
        </div>
      </div>
      <div class="ci-body">
        <div class="ci-status">
          <div class="donut" style="background:conic-gradient(var(--blue) ${sum.pct}%, rgba(255,255,255,.1) 0)"><span class="tabular">${sum.pct}%</span></div>
          <div class="stack" style="gap:10px">
            <div class="kv" style="border:0;padding:0"><span class="k">Current stage</span><span class="v">${esc(sum.stage)}</span></div>
            <div class="kv" style="border:0;padding:0"><span class="k">Next action</span><span class="v">${esc(sum.done ? 'Send the Design Document to the vendor' : sum.nextAction)}</span></div>
          </div>
        </div>
        <div class="ci-journey">
          <div class="row between"><b style="font-weight:500;font-size:13.5px">Enablement journey</b><button class="link" data-act="continue">View framework →</button></div>
          ${phaseStepper(cur, null, { embedded: true })}
        </div>
      </div>` : `
      <div class="empty">
        <span class="eyebrow">Current initiative</span>
        <h2>No initiative yet</h2>
        <p class="small" style="max-width:44ch">Start an initiative and save its Business Needs to track it here.</p>
        <button class="btn" data-act="start-new">Start a new initiative</button>
      </div>`}
    </div>

    <div class="two-col">
      <div class="card wide">
        <div class="row between"><h2 class="h3" style="font-size:18px;font-weight:400">Initiatives</h2><button class="link" data-act="go" data-screen="ongoing">View all initiatives →</button></div>
        ${all.length ? `<div class="table-wrap"><table class="data" style="min-width:620px">
          <thead><tr><th>Initiative</th><th>Type</th><th>Current stage</th><th>Start date</th><th>Due date</th><th>Progress</th></tr></thead>
          <tbody>${each(sorted(s.inits).slice(0, 6), i => { const sm = summary(i); return `<tr>
            <td><button class="link" style="color:#fff;text-decoration:underline;text-decoration-color:rgba(255,255,255,.3)" data-act="open" data-id="${esc(i.id)}">${esc(i.needs.name || 'Untitled initiative')}</button></td>
            <td class="small">New platform</td>
            <td><span class="row" style="gap:8px"><span style="width:9px;height:9px;border-radius:50%;background:${dot(sm)}"></span>${esc(sm.stage)} · ${esc(sm.atRisk ? 'Overdue' : sm.status)}</span></td>
            <td class="tabular">${esc(i.started || '—')}</td><td class="tabular">${esc(i.due || '—')}</td>
            <td><span class="row" style="gap:10px;flex-wrap:nowrap"><span class="bar"><span style="width:${sm.pct}%;background:${dot(sm)}"></span></span><span class="tabular small">${sm.pct}%</span></span></td></tr>`; })}</tbody></table></div>`
        : `<p class="small">Nothing in progress. Save Business Needs to start tracking an initiative.</p>`}
      </div>
      <div class="narrow stack" style="gap:20px">
        <div class="card tight">
          <h2 class="h3" style="font-size:18px;font-weight:400">Next actions</h2>
          ${ongoing.length ? each(sorted(ongoing.map(x => x.i)).slice(0, 4), i => { const sm = summary(i); return `<button class="row" style="flex-wrap:nowrap;gap:12px;padding:10px 0;border:0;border-bottom:1px solid var(--line-soft);background:none;text-align:left;color:inherit" data-act="open" data-id="${esc(i.id)}">
            <span class="stat ic" style="width:34px;height:34px;padding:0;border-radius:10px;background:rgba(0,149,255,.14);color:var(--blue-pale);border:0">${icon('doc', 16)}</span>
            <span style="flex:1;min-width:0"><span style="display:block;font-size:13px;font-weight:500">${esc(sm.nextAction)}</span><span class="tiny">${esc(i.needs.name)} · ${esc(sm.status)}</span></span>
            <span class="tiny" style="text-align:right;white-space:nowrap">Initiative due<br><span style="color:var(--muted)">${esc(i.due || '—')}</span></span></button>`; }) : `<p class="small">No actions yet.</p>`}
        </div>
      </div>
    </div>
  </section>`;
}

export function listView(s) {
  const doneTab = s.screen === 'done';
  const all = s.inits.map(i => ({ i, sum: summary(i) }));
  const list = sorted(all.filter(x => x.sum.done === doneTab).map(x => x.i));
  const counts = { ongoing: all.filter(x => !x.sum.done).length, done: all.filter(x => x.sum.done).length };
  return `<section class="stack" style="gap:18px">
    <div class="row between" style="align-items:flex-end">
      <div class="stack" style="gap:6px">
        <h2 style="font-size:22px">${doneTab ? 'Completed initiatives' : 'Ongoing initiatives'}</h2>
        <p class="lead">${doneTab ? 'Initiatives whose learning paths are reviewed and whose Design Document is ready for the vendor. Open one to review or download its Design Document.' : 'Initiatives still moving through Define, Design and Assess. Open one to continue, or delete an initiative you no longer need.'}</p>
      </div>
      <button class="btn" data-act="start-new">Start a new initiative ${icon('arrow', 15)}</button>
    </div>
    <div class="tabs" role="tablist" aria-label="Initiatives">
      ${each([['ongoing', 'Ongoing'], ['done', 'Completed']], ([k, l]) => `<button class="tab" role="tab" aria-selected="${s.screen === k}" data-act="go" data-screen="${k}">${l} <span class="chip soft" style="padding:1px 8px">${counts[k]}</span></button>`)}
    </div>
    <div class="card" style="padding:8px 24px 14px">
      ${list.length ? `<div class="table-wrap"><table class="data" style="min-width:860px">
        <thead><tr><th style="padding-top:14px">Initiative</th><th style="padding-top:14px">Current stage</th><th style="padding-top:14px">Start date</th><th style="padding-top:14px">Due date</th><th style="padding-top:14px">Progress</th><th class="num" style="padding-top:14px">Actions</th></tr></thead>
        <tbody>${each(list, i => {
          const sm = summary(i), asking = s.ui.confirmDelete === i.id;
          return `<tr class="${asking ? 'hl' : ''}">
            <td><button class="link" style="color:#fff;font-size:13.5px" data-act="open" data-id="${esc(i.id)}">${esc(i.needs.name || 'Untitled initiative')}</button><br><span class="tiny">New platform${i.id === s.activeId ? ' · Current initiative' : ''}</span></td>
            <td><span class="row" style="gap:8px;flex-wrap:nowrap"><span style="width:9px;height:9px;border-radius:50%;background:${dot(sm)};flex:none"></span>${esc(sm.stage)} · ${esc(sm.atRisk ? 'Overdue' : sm.status)}</span></td>
            <td class="tabular">${esc(i.started || '—')}</td>
            <td class="tabular" style="${sm.atRisk ? 'color:#F19BF1' : ''}">${esc(i.due || '—')}</td>
            <td><span class="row" style="gap:10px;flex-wrap:nowrap"><span class="bar"><span style="width:${sm.pct}%;background:${dot(sm)}"></span></span><span class="tabular small">${sm.pct}%</span></span></td>
            <td class="num" style="white-space:nowrap">${asking ? `<span class="small">Delete for good?</span>
              <button class="btn small solid-danger" data-act="delete-init" data-id="${esc(i.id)}">Yes, delete</button>
              <button class="btn small ghost" data-act="ui" data-key="confirmDelete" data-val="">Cancel</button>`
              : `<button class="btn small ghost" data-act="open" data-id="${esc(i.id)}">${sm.done ? 'Open' : 'Continue'}</button>
              ${when(!doneTab, `<button class="btn small danger" data-act="ui" data-key="confirmDelete" data-val="${esc(i.id)}" aria-label="Delete ${esc(i.needs.name)}">${icon('trash', 14)} Delete</button>`)}`}</td>
          </tr>`;
        })}</tbody></table></div>`
      : `<div class="empty"><b>${doneTab ? 'No completed initiatives yet' : 'No ongoing initiatives'}</b><p class="small" style="max-width:46ch">${doneTab ? 'An initiative moves here once its learning paths are reviewed and its Design Document is ready for the vendor.' : 'Start a new initiative to begin with Business Needs in the Define phase.'}</p></div>`}
    </div>
    <p class="tiny">${plural(all.length, 'initiative')} in total.</p>
  </section>`;
}
