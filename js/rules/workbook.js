// CDP Learning Plan Builder (workbook) rules: signal words, content types, journey steps,
// indicative assets, timeline and recognition. Pure data, copied from the workbook's Setup and
// Signal Words sheets. Change the builder's behaviour here without touching the engine.

export const CONTENT_TYPES = {
  'Judgement & Governance': { level: 'Advanced', question: 'Needs a decision, approval or evaluation?' },
  'Practice & Observation': { level: 'Proficient', question: 'Depends on coaching, feedback or experience?' },
  'Procedures': { level: 'Essential', question: 'Repeatable, with defined steps?' }
};
export const MANUAL_REVIEW = 'Manual review';
export const CONTENT_TYPE_NAMES = Object.keys(CONTENT_TYPES);

// A word matches the start of a word in the transaction ("evaluat" matches "Evaluate", "Evaluation").
export const SIGNALS = {
  approval: ['approve', 'approval', 'authorise', 'authorize', 'sign off', 'sign-off'],
  'Judgement & Governance': ['review', 'evaluat', 'assess', 'calibrat', 'govern', 'determin', 'prioriti', 'decide', 'decision', 'plan', 'budget', 'forecast', 'strateg', 'control', 'monitor', 'risk', 'complian', 'segment', 'succession', 'recogni', 'award', 'audit', 'policy', 'policies', 'portfolio'],
  'Practice & Observation': ['coach', 'mentor', 'feedback', 'check-in', 'check in', 'conversation', 'facilitat', 'interview', 'counsel', 'collaborat', 'development', 'learning journey', 'learning initiative', 'grievance', 'survey', 'observ'],
  'Procedures': ['create', 'submit', 'process', 'request', 'generat', 'record', 'captur', 'receiv', 'transfer', 'import', 'export', 'initiat', 'maintain', 'update', 'withdraw', 'return', 'enrol', 'activat', 'deactivat', 'run', 'close', 'open', 'invoice', 'payroll', 'leave', 'timesheet', 'expense', 'inventory', 'payment', 'requisition']
};

// Extended signal words, built into the tool so most transactions classify without manual review.
// They follow the same three questions as the workbook lists and are checked with them.
export const EXTRA_SIGNALS = {
  approval: ['endorse', 'ratify', 'reject', 'decline request', 'authorisation', 'authorization'],
  'Judgement & Governance': ['appraise', 'adjudicat', 'arbitrat', 'oversee', 'oversight', 'investigat', 'analys', 'analyz', 'reconcil', 'allocat', 'set target', 'define target', 'define strategy', 'escalation decision', 'waiver', 'exception approval', 'evaluate', 'shortlist', 'award contract', 'select supplier', 'variance', 'benchmark', 'scorecard', 'kpi', 'dashboard review'],
  'Practice & Observation': ['negotiat', 'present', 'onboard', 'train ', 'guide colleague', 'support colleague', 'resolve', 'troubleshoot', 'handle exception', 'handle complaint', 'complaint', 'relationship', 'engage', 'consult', 'appraisal meeting', 'one-to-one', '1:1', 'workshop', 'moderate', 'mediat', 'handover', 'escalate'],
  'Procedures': ['add', 'edit', 'delete', 'remove', 'upload', 'download', 'view', 'search', 'find', 'print', 'register', 'book', 'schedule', 'track', 'log ', 'log in', 'login', 'sign in', 'enter', 'file', 'attach', 'publish', 'send', 'issue', 'cancel', 'amend', 'renew', 'raise', 'place order', 'order', 'apply', 'claim', 'reset', 'change password', 'notify', 'notification', 'complete', 'fill', 'check status', 'confirm', 'save', 'copy', 'archive', 'assign', 'configure', 'set up', 'setup', 'provision', 'change', 'modify', 'post ', 'pay', 'refund', 'receipt', 'purchase', 'quote', 'quotation', 'ticket', 'form', 'request status', 'report generation', 'generate report', 'export report']
};

// Platform role words that hint at the kind of work, used only when the transaction itself has no signal word.
export const ROLE_HINTS = {
  'Judgement & Governance': ['approver', 'director', 'head of', 'executive', 'committee', 'controller', 'auditor', 'board', 'governance', 'owner', 'sponsor', 'manager'],
  'Practice & Observation': ['coach', 'mentor', 'trainer', 'business partner', 'advisor', 'adviser', 'champion', 'facilitator', 'support'],
  'Procedures': ['requester', 'requestor', 'employee', 'clerk', 'assistant', 'user', 'officer', 'operator', 'agent', 'staff', 'applicant', 'publisher', 'editor', 'administrator', 'admin']
};

// Verbs that show the row is a real action even when no list matches; such rows default to Procedures,
// the workbook's routine type, with low confidence so they stand out for a quick check.
export const GENERIC_VERBS = ['do', 'make', 'manage', 'handle', 'perform', 'carry out', 'prepare', 'maintain', 'use', 'access', 'set', 'get', 'move', 'start', 'stop', 'begin', 'end', 'finish', 'close out', 'take', 'give', 'share', 'mark', 'select', 'choose', 'enable', 'disable', 'sync', 'import', 'migrate', 'map', 'link', 'merge', 'split', 'calculate', 'compute', 'measure', 'count', 'sort', 'filter', 'tag', 'label', 'flag', 'lock', 'unlock', 'release', 'submit', 'publish'];

// Phrases are checked before the single-word lists: the business object decides the type.
export const PHRASES = [
  ['development plan', 'Practice & Observation'],
  ['skill development', 'Practice & Observation'],
  ['manage conversation', 'Practice & Observation'],
  ['learning content', 'Procedures'],
  ['benefits enrol', 'Procedures'],
  ['safety incident', 'Procedures'],
  ['project cost', 'Procedures'],
  ['manage access', 'Procedures'],
  ['salary change', 'Judgement & Governance'],
  ['organisational goal', 'Judgement & Governance'],
  ['organizational goal', 'Judgement & Governance'],
  ['critical position', 'Judgement & Governance'],
  ['revenue recognition', 'Judgement & Governance'],
  ['performance calibration', 'Judgement & Governance'],
  ['manage contract', 'Judgement & Governance']
];

// Transaction upload template (shared with the platform vendor).
export const TEMPLATE_COLUMNS = ['System module', 'Process', 'Transaction', 'Platform role'];
export const TEMPLATE_EXAMPLES = [
  ['Procurement', 'Purchase to pay', 'Approve Purchase Order', 'Budget Approver'],
  ['Procurement', 'Purchase to pay', 'Create Purchase Requisition', 'Requester'],
  ['Procurement', 'Sourcing', 'Evaluate Supplier Bid Response', 'Procurement Officer'],
  ['Finance', 'Budgeting', 'Budget Preparation', 'Finance Planner'],
  ['HR', 'Performance', 'Performance Calibration', 'Line Manager'],
  ['HR', 'Performance', 'Request Feedback', 'Employee'],
  ['HR', 'Performance', 'Schedule Check-In', 'Line Manager'],
  ['HR', 'Talent', 'Create Individual Development Plan', 'Employee']
];

// The common journey every learning path follows (workbook Setup, section 4).
// `source` says what fills the step: fixed microlearning, the persona's learning modes, or its assessment modes.
export const JOURNEY = [
  { n: 1, key: 'understand', title: 'Understand the change', voice: 'I know what is changing and why it matters', source: 'fixed',
    fixed: { asset: 'Awareness microlearning', where: 'LMS', minutes: [3, 5] } },
  { n: 2, key: 'role', title: 'Clarify the role', voice: 'I know my part and what is expected of me', source: 'fixed',
    fixed: { asset: 'Role microlearning', where: 'LMS', minutes: [3, 5] } },
  { n: 3, key: 'build', title: 'Build proficiency', voice: 'I learn my transactions in small steps, then practise until they feel familiar', source: 'modes',
    indicative: { Essential: ['In-app walkthroughs, step-by-step guidance', 'In-app'], Proficient: ['Role-based eLearning, guided practice', 'LMS'], Advanced: ['Workshops, scenario discussions', 'Instructor-led'] } },
  { n: 4, key: 'confidence', title: 'Build confidence', voice: 'I handle my own processes without help', source: 'modes',
    indicative: { Essential: ['Contextual help, tooltips', 'In-app'], Proficient: ['Simulations, scenarios', 'LMS'], Advanced: ['SME clinics, coaching', 'Instructor-led'] } },
  { n: 5, key: 'prove', title: 'Prove readiness and proficiency', voice: 'I prove I am ready, then confirm my proficiency after go-live', source: 'assessment',
    indicative: { Essential: ['Knowledge and task check, then live work', 'LMS'], Proficient: ['Simulation assessment', 'LMS'], Advanced: ['Case-based assessment, expert reviewed', 'Instructor-led'] } },
  { n: 6, key: 'sustain', title: 'Sustain performance', voice: 'In-app help and refreshers keep me sharp', source: 'modes',
    indicative: { Essential: ['In-app guidance, embedded knowledge', 'In-app'], Proficient: ['Refreshers', 'LMS'], Advanced: ['Communities of practice', 'Instructor-led'] } }
];

// Timeline by path level, in weeks from go-live (workbook Setup, section 5).
// Negative weeks are before go-live, 1 to 4 are the first 30 days, 5 means ongoing.
export const TIMELINE = {
  Essential: { understand: [-3, -3], role: [-3, -3], build: [-2, -2], confidence: [-2, -1], prove: [-1, 4], sustain: [1, 5] },
  Proficient: { understand: [-4, -4], role: [-4, -4], build: [-3, -2], confidence: [-2, -1], prove: [-1, 4], sustain: [1, 5] },
  Advanced: { understand: [-6, -6], role: [-6, -5], build: [-5, -3], confidence: [-3, -1], prove: [-1, 4], sustain: [1, 5] }
};
export const TIMELINE_WEEKS = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5];

// Persona objective and recognition (workbook Setup, section 3), keyed by the tool's persona keys.
export const PERSONA_PLAN = {
  'Executive Leader': { objective: 'Approve key requests and review adoption dashboards', recognition: 'Persona badge' },
  'People managers': { objective: 'Approve team requests, handle exceptions and delegate approvals', recognition: 'Persona badge' },
  'Specialist': { objective: 'Run their function’s processes and transactions', recognition: 'Persona badge' },
  'Technical users': { objective: 'Configure settings, build integrations and maintain the platforms', recognition: 'Certification' },
  'Super users': { objective: 'Resolve colleagues’ issues and escalate what they cannot fix', recognition: 'Certification' },
  'End users': { objective: 'Create, submit and track their everyday transactions', recognition: 'Persona badge' },
  'System admins': { objective: 'Manage user access, roles, settings and master data', recognition: 'Certification' },
  'External User': { objective: 'Submit requests and track their status', recognition: 'Persona badge' }
};

// Built-in persona mapping rules: words in a platform role (or its transactions) that point to each
// persona. Used to suggest the persona mapping; the user applies or dismisses each suggestion.
export const PERSONA_ROLE_WORDS = {
  'Executive Leader': { role: ['director', 'executive', 'head of', 'chief', 'sponsor', 'leadership', 'board', 'deputy minister', 'undersecretary'], tx: ['dashboard', 'strategic', 'portfolio'] },
  'People managers': { role: ['line manager', 'manager', 'supervisor', 'team lead', 'team leader', 'section head', 'unit head'], tx: ['team', 'performance', 'calibrat', 'check-in', 'delegate'] },
  'System admins': { role: ['administrator', 'admin', 'access', 'security', 'master data', 'user management', 'configuration', 'system owner'], tx: ['access', 'role', 'permission', 'configure', 'master data', 'user account', 'provision'] },
  'Technical users': { role: ['developer', 'technical', 'integration', 'engineer', 'it ', 'architect', 'devops', 'database'], tx: ['integration', 'interface', 'api', 'deploy', 'release', 'environment', 'script'] },
  'Specialist': { role: ['officer', 'specialist', 'analyst', 'planner', 'accountant', 'buyer', 'advisor', 'adviser', 'coordinator', 'controller', 'publisher', 'editor', 'approver', 'processor', 'auditor'], tx: [] },
  'Super users': { role: ['super user', 'superuser', 'champion', 'key user', 'power user'], tx: ['support colleague', 'resolve', 'troubleshoot', 'coach'] },
  'End users': { role: ['employee', 'requester', 'requestor', 'staff', 'user', 'clerk', 'member', 'self-service', 'self service'], tx: ['submit', 'request', 'leave', 'expense', 'timesheet', 'my '] },
  'External User': { role: ['supplier', 'vendor', 'citizen', 'customer', 'external', 'applicant', 'public', 'contractor', 'partner'], tx: ['supplier portal', 'bid', 'tender response', 'application'] }
};
