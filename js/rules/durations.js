// Indicative learning time per learning mode, and the journey step each mode serves.
// These are editable defaults (the workbook gives no per-mode times): users can override the
// minutes for any mode on a persona's learning path.
//
// Duration model, all in minutes:
//   perTx       × transactions taught through the mode
//   perWorkflow × workflows those transactions belong to
//   fixed       added once
//   session     minutes per session, with one session per `perSessions` workflows
//   ongoing     true: available on demand after go-live, not counted in learning time

export const MODE_RULES = {
  'In-app guidance':         { step: 'confidence', where: 'In-app', perTx: 2 },
  'DAP workflows':           { step: 'build', where: 'In-app', perTx: 5 },
  'Support agent':           { step: 'sustain', where: 'In-app', ongoing: true },
  'Scenario-based learning': { step: 'confidence', where: 'LMS', perWorkflow: 15 },
  'Practice environment':    { step: 'build', where: 'Sandbox', perTx: 8 },
  'Interactive eLearning':   { step: 'build', where: 'LMS', perWorkflow: 10, perTx: 2 },
  'Virtual training':        { step: 'build', where: 'Virtual classroom', session: 90, perSessions: 4 },
  'Case study learning':     { step: 'confidence', where: 'Instructor-led', session: 45, perSessions: 3 },
  'System Microlearning':    { step: 'sustain', where: 'LMS', perWorkflow: 4 },
  'Instructor-led workshop': { step: 'build', where: 'Instructor-led', session: 180, perSessions: 5 },
  'Peer learning':           { step: 'confidence', where: 'On the job', fixed: 30 },
  'Coaching':                { step: 'confidence', where: 'On the job', fixed: 60 },
  'Community of practice':   { step: 'sustain', where: 'Community', ongoing: true }
};

// Assessment time per assessment mode, by the mode's level. Assessments run once per persona.
export const ASSESS_MINUTES = { Essential: 10, Proficient: 20, Advanced: 40 };

// Fallback for a mode added later without a rule: counted per workflow.
export const DEFAULT_MODE_RULE = { step: 'build', where: 'LMS', perWorkflow: 10 };
