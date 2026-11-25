// CDP Learning Framework rules: proficiency levels, capability domains, learning and assessment mode inventories.
// Pure data. Engine modules read these; nothing here has behaviour.

export const LEVELS = ['Essential', 'Proficient', 'Advanced'];

export const LEVEL_QUESTIONS = [
  'Does the persona need to understand the context and complete routine activities with guidance?',
  'Must the persona apply the capability independently in real scenarios?',
  'Must the persona use judgement in complex or non-routine situations?'
];

export const DOMAINS = [
  { key: 'platform', name: 'Platform usage', short: 'Platform usage', header: 'Platform knowledge' },
  { key: 'role', name: 'Role knowledge', short: 'Role', header: 'Role knowledge' },
  { key: 'process', name: 'End-to-end process knowledge', short: 'End-to-end process', header: 'Business process knowledge' },
  { key: 'support', name: 'Supporting others', short: 'Supporting others', header: 'Supporting others' }
];

// Framework phases. Deploy and Measure stay locked until their content is supplied.
export const PHASES = [
  { key: 'define', n: 1, label: 'Define', output: 'Capability Architecture' },
  { key: 'design', n: 2, label: 'Design', output: 'Learning modes and learning paths' },
  { key: 'assess', n: 3, label: 'Assess', output: 'Assessment modes' },
  { key: 'deploy', n: 4, label: 'Deploy', output: 'Deployment Plan', locked: true },
  { key: 'measure', n: 5, label: 'Measure', output: 'Effectiveness Tracking Plan', locked: true }
];

// Asset colours by level (CDP palette), used in chips, cells and the document.
export const LEVEL_COLOR = { Essential: '#D0DBE6', Proficient: '#0095FF', Advanced: '#E943E9' };

export const MODE_GROUPS = [
 {
  "level": "Essential",
  "note": "Users at this level need guidance and support.",
  "modes": [
   [
    "In-app guidance",
    true
   ],
   [
    "DAP workflows",
    true
   ],
   [
    "Support agent",
    true
   ]
  ]
 },
 {
  "level": "Proficient",
  "note": "Users at this level need Essential, plus practice and context.",
  "modes": [
   [
    "Scenario-based learning",
    true
   ],
   [
    "Practice environment",
    true
   ],
   [
    "Interactive eLearning",
    true
   ],
   [
    "Virtual training",
    false
   ],
   [
    "Case study learning",
    false
   ],
   [
    "System Microlearning",
    true
   ]
  ]
 },
 {
  "level": "Advanced",
  "note": "Users at this level need Proficient, plus enablement and influence.",
  "modes": [
   [
    "Virtual training",
    false
   ],
   [
    "Instructor-led workshop",
    true
   ],
   [
    "Case study learning",
    true
   ],
   [
    "Peer learning",
    false
   ],
   [
    "Coaching",
    false
   ],
   [
    "Community of practice",
    true
   ]
  ]
 }
];

export const ASSESS_GROUPS = [
 {
  "level": "Essential",
  "modes": [
   [
    "Log into platform",
    "Login recorded",
    "DAP usage / system telemetry"
   ],
   [
    "Complete guided workflow",
    "Completed guided workflow",
    "DAP usage"
   ],
   [
    "Complete target transaction",
    "Completed transaction",
    "System telemetry"
   ],
   [
    "Navigate platform without critical failures",
    "Clean navigation record (no critical failures)",
    "System telemetry"
   ],
   [
    "Complete guided task",
    "Completed guided task",
    "Guided checklist / DAP analytics"
   ],
   [
    "Use job aid",
    "Correct job aid use",
    "DAP analytics"
   ],
   [
    "Complete routine activity",
    "Completed routine activity",
    "Guided checklist"
   ],
   [
    "Review process map",
    "Process map reviewed",
    "DAP analytics"
   ],
   [
    "Identify key handoffs and escalation routes",
    "Correct knowledge check / reflection responses",
    "Guided knowledge check / reflection questionnaire"
   ],
   [
    "Locate support resources and direct colleagues to guidance",
    "Correct knowledge check responses",
    "Guided knowledge check"
   ],
   [
    "Use approved support channels",
    "Correct knowledge check responses",
    "Guided knowledge check"
   ]
  ]
 },
 {
  "level": "Proficient",
  "modes": [
   [
    "Meet all Essential evidence",
    "Essential evidence on record",
    "As per Essential"
   ],
   [
    "Complete scenario in sandbox",
    "Completed scenario",
    "Sandbox exercise"
   ],
   [
    "Complete practical exercise",
    "Practical exercise output",
    "Sandbox exercise"
   ],
   [
    "Complete end-to-end task",
    "Completed end-to-end task",
    "Usage data"
   ],
   [
    "Use platform without guidance",
    "Unassisted task completion",
    "Usage data / manager validation"
   ],
   [
    "Complete role simulation",
    "Simulation result",
    "Simulation"
   ],
   [
    "Complete tasks independently",
    "Work sample",
    "Manager validation"
   ],
   [
    "Prioritise work correctly",
    "Prioritisation shown in work sample",
    "Manager validation"
   ],
   [
    "Deliver consistently",
    "Delivery record over time",
    "Manager validation"
   ],
   [
    "Analyse upstream and downstream impacts",
    "Scenario assessment response",
    "Scenario assessment"
   ],
   [
    "Complete cross-functional scenario",
    "Completed case study",
    "Case study"
   ],
   [
    "Identify process issue",
    "Documented process issue",
    "Case study"
   ],
   [
    "Answer common questions and provide peer support",
    "Peer support record",
    "Peer feedback / observation"
   ],
   [
    "Share good practice",
    "Good practice examples shared",
    "Manager validation / observation"
   ],
   [
    "Escalate issues appropriately",
    "Escalation record",
    "Manager validation"
   ]
  ]
 },
 {
  "level": "Advanced",
  "modes": [
   [
    "Resolve complex platform scenarios",
    "Completed complex scenario",
    "Sandbox"
   ],
   [
    "Handle exceptions",
    "Exception resolved",
    "Practical challenge / SME validation"
   ],
   [
    "Complete troubleshooting exercise",
    "Fault diagnosed and resolved",
    "Practical challenge / observation"
   ],
   [
    "Identify platform improvement",
    "Improvement opportunity logged",
    "SME validation"
   ],
   [
    "Complete complex case study",
    "Case study response",
    "Case review"
   ],
   [
    "Resolve non-routine scenario",
    "Scenario resolution",
    "Facilitated assessment"
   ],
   [
    "Complete decision-making exercise",
    "Decision rationale",
    "Facilitated assessment / observation"
   ],
   [
    "Make improvement recommendations",
    "Improvement recommendations",
    "Case review"
   ],
   [
    "Analyse upstream and downstream impacts",
    "Scenario assessment response",
    "Scenario assessment"
   ],
   [
    "Complete cross-functional scenario / identify process issue",
    "Completed case study, documented issue",
    "Case study"
   ],
   [
    "Coach colleagues",
    "Coaching record",
    "Observation / leader validation"
   ],
   [
    "Facilitate sessions",
    "Sessions delivered",
    "Champion activity"
   ],
   [
    "Act as SME",
    "SME contributions",
    "Leader validation"
   ],
   [
    "Champion adoption",
    "Adoption uplift in own area",
    "Adoption metrics"
   ],
   [
    "Identify capability gaps",
    "Capability gaps logged",
    "Leader validation"
   ]
  ]
 }
];

export const ASSESS_DEFAULT = {
 "Essential": [
  "Log into platform",
  "Complete guided workflow",
  "Use job aid"
 ],
 "Proficient": [
  "Complete scenario in sandbox",
  "Use platform without guidance",
  "Answer common questions and provide peer support"
 ],
 "Advanced": [
  "Resolve complex platform scenarios",
  "Coach colleagues",
  "Champion adoption"
 ]
};
