// Vendor hand-off email: initiative brief, personas with their paths, and what the vendor must build.
import { profiledPersonas, modesOf, assessOf, pathContext, processList } from './initiative.js';
import { generatePath, formatMinutes, formatDate } from './paths.js';
import { ASSESS_INFO } from './modes.js';

export function defaultEmail(init) {
  const n = init.needs, people = profiledPersonas(init);
  const name = n.name || 'the initiative';
  const generated = !!init.paths.generatedAt;
  const lines = people.map(p => {
    const modes = modesOf(init, p.persona, p.prof).join(', ') || 'none';
    const assess = assessOf(init, p.persona, p.prof).map(k => (ASSESS_INFO[k] || {}).mode || k.split('|')[1]).join(', ') || 'none';
    let s = `- ${p.title} (${p.prof}): learning modes: ${modes}; assessment modes: ${assess}`;
    if (generated) {
      const path = generatePath(init.paths, pathContext(init, p.persona), { durations: init.paths.durations?.[p.persona] });
      s += `; ${path.plan.length} transactions, about ${formatMinutes(path.totalMinutes)} of learning`;
    }
    return s + '.';
  });
  const subject = `Design Document hand-off: learning assets for ${name}`;
  const body = [
    'Dear [Vendor name],', '',
    `Please find attached the Initiative Design Document for ${name}, prepared with the CDP Learning Accelerator.`, '',
    'Initiative brief',
    `- Platform: ${n.name || '[name]'}`,
    `- Business outcome(s): ${processList(n.outcome).map((p, i) => `(${i + 1}) ${p}`).join(' ') || '[business outcome]'}`,
    `- Critical processes: ${processList(n.processes).map((p, i) => `(${i + 1}) ${p}`).join(' ') || '[critical processes]'}`,
    `- Started: ${init.started || '[start date]'}. Planned go-live: ${formatDate(n.goLive) || '[go-live date]'}.`,
    `- Personas in scope: ${people.length}.`, '',
    'What we need from you',
    'Please develop the learning assets in each persona\'s learning path, using the learning modes assigned to them and the transactions mapped to each persona, and make sure every asset meets the quality standards required for its asset type.',
    ...(lines.length ? lines : ['- [Personas and modes]']), '',
    'The assessment modes and readiness evidence in the Design Document show how readiness will be checked, so please design each asset to support that evidence.', '',
    'Next steps',
    '1. Confirm receipt of this email and the Design Document.',
    '2. Share your proposed asset list and delivery plan with milestones by [date].',
    '3. Raise any questions on the personas, transactions, modes or quality standards before development starts.', '',
    'Kind regards,', 'KE', 'CDP Learning Accelerator'
  ].join('\n');
  return { subject, body };
}

export function currentEmail(init) {
  const d = defaultEmail(init), h = init.handoff || {};
  return { subject: h.subject != null ? h.subject : d.subject, body: h.body != null ? h.body : d.body };
}

// Desktop mail apps cut off long mailto links, so the body is shortened past this length.
export const MAILTO_LIMIT = 1900;

export function mailtoUrl(to, subject, body, shortBody) {
  const make = b => 'mailto:' + encodeURIComponent(to || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(b.replace(/\r?\n/g, '\r\n'));
  let url = make(body);
  if (url.length > MAILTO_LIMIT && shortBody) url = make(shortBody);
  return url;
}

export function shortEmailBody(init) {
  const people = profiledPersonas(init);
  return defaultEmail(init).body.replace(/What we need from you[\s\S]*?\n\n/, 'What we need from you\nPlease develop the learning assets in each persona\'s learning path, to the quality standards required for each asset type. The personas, transactions, learning paths and assessment modes are in the attached Design Document:\n' + people.map(p => `- ${p.title} (${p.prof})`).join('\n') + '\n\n');
}
