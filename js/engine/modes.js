// Learning and assessment mode inventories by proficiency.
// Each level includes the levels below it. Picking a mode from a level above the persona's
// proficiency is allowed but flagged "Not Compliant with CDP Learning Framework"; unticking a
// suggested mode is never flagged.
import { LEVELS, MODE_GROUPS, ASSESS_GROUPS, ASSESS_DEFAULT } from '../rules/framework.js';

export const NON_COMPLIANT = 'Not Compliant with CDP Learning Framework';

export const MODES = MODE_GROUPS.reduce((all, g) => all.concat(g.modes.map(m => m[0]).filter(m => !all.includes(m))), []);

// The lowest level at which a mode is offered.
export function modeLevel(mode) {
  const g = MODE_GROUPS.find(gr => gr.modes.some(m => m[0] === mode));
  return g ? g.level : 'Advanced';
}

export function modeModel(prof) {
  const top = Math.max(0, LEVELS.indexOf(prof));
  const model = [], allowed = [];
  MODE_GROUPS.forEach((g, gi) => {
    if (gi > top) return;
    g.modes.forEach(([mode, inModel]) => {
      if (!allowed.includes(mode)) allowed.push(mode);
      if (inModel && !model.includes(mode)) model.push(mode);
    });
  });
  return { model, allowed };
}

export function defaultModes(prof) {
  const { model } = modeModel(prof);
  return MODES.filter(m => model.includes(m));
}

export function modeDeviations(prof, list) {
  const { allowed } = modeModel(prof);
  return (list || []).filter(m => !allowed.includes(m)).map(mode => ({
    mode, label: NON_COMPLIANT,
    text: `${mode} is not compliant with the CDP Learning Framework for ${prof} proficiency.`
  }));
}

// Modes from `selected` that are offered at `level` or below. Used to decide how a transaction of
// a given level is taught: an Essential transaction uses only the persona's Essential modes.
export function modesUpToLevel(selected, level) {
  const { allowed } = modeModel(level);
  return (selected || []).filter(m => allowed.includes(m));
}

// Assessment selections are keyed 'Level|Mode' because a mode can appear at more than one level.
export const ASSESS_INFO = {};
ASSESS_GROUPS.forEach(g => g.modes.forEach(([mode, evidence, source]) => {
  ASSESS_INFO[`${g.level}|${mode}`] = { key: `${g.level}|${mode}`, mode, level: g.level, evidence, source };
}));

export const ASSESS_MAX_ADVISED = 3;

export function defaultAssess(prof) {
  const top = LEVELS.indexOf(prof), out = [];
  LEVELS.forEach((l, i) => { if (i <= top) (ASSESS_DEFAULT[l] || []).forEach(m => out.push(`${l}|${m}`)); });
  return out;
}

export function assessDeviations(prof, keys) {
  const top = LEVELS.indexOf(prof);
  return (keys || []).filter(k => LEVELS.indexOf(k.split('|')[0]) > top).map(k => {
    const [level, mode] = k.split('|');
    return { key: k, mode, label: NON_COMPLIANT, text: `${mode} (${level}) is not compliant with the CDP Learning Framework for ${prof} proficiency.` };
  });
}

// Every level up to the persona's needs at least one assessment mode.
export function assessComplete(prof, keys) {
  const top = LEVELS.indexOf(prof);
  if (top < 0) return false;
  return LEVELS.slice(0, top + 1).every(l => (keys || []).some(k => k.startsWith(`${l}|`)));
}

export function assessUpToLevel(keys, level) {
  const top = LEVELS.indexOf(level);
  return (keys || []).filter(k => LEVELS.indexOf(k.split('|')[0]) <= top);
}
