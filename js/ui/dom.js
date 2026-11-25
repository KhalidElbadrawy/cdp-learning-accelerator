// Small helpers for building HTML strings safely. Every value from the user or from storage goes
// through esc() (or attr()) before it reaches the page.
export function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export const attr = esc;
export const when = (cond, html, alt = '') => (cond ? (typeof html === 'function' ? html() : html) : alt);
export const each = (list, fn) => (list || []).map(fn).join('');
export const initials = t => String(t || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const lvlClass = l => (['Essential', 'Proficient', 'Advanced'].includes(l) ? 'lvl-' + l : 'lvl-none');
export const levelChip = (l, extra = '') => `<span class="chip ${lvlClass(l)}">${esc(extra ? extra + l : (l || 'Pending'))}</span>`;
export const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.4 2.4 4.6-4.9"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  alert: '<path d="M10.7 4.2 2.9 17.6A1.5 1.5 0 0 0 4.2 20h15.6a1.5 1.5 0 0 0 1.3-2.4L13.3 4.2a1.5 1.5 0 0 0-2.6 0z"/><path d="M12 9.5v4"/><path d="M12 17h.01"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  back: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>',
  download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  doc: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/>',
  cube: '<path d="M12 2.8 20 7v10l-8 4.2L4 17V7z"/><path d="M4 7l8 4.2L20 7"/><path d="M12 11.2V21"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/><path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2M11 17h2"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z"/>',
  pointer: '<path d="m5 3 14 7-6 2-2 6z"/>',
  flask: '<path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.4c2.2.2 3.6 1.7 4 4.1"/>',
  quiz: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8"/><path d="M14 9.5h2.5"/><path d="m8 15 1.5 1.5L12 14"/><path d="M14 15.5h2.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/><path d="M3 12h18"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'
};
export function icon(name, size = 16, color = 'currentColor') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
