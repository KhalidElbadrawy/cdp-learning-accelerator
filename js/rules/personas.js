// Generated from V1 rule data (persona definitions, learning model, assessment standards). Edit here, not in the engine.
export const PERSONAS = ["Executive Leader","Super users","People managers","System admins","Technical users","Specialist","End users","External User"];

export const PROFILES = {
 "Executive Leader": {
  "code": "PR-01",
  "title": "Executive Leader",
  "archetype": "Decision Maker",
  "tags": [
   "Enterprise-wide",
   "Outcome Focused",
   "Governance Conscious"
  ],
  "quote": "I need confidence that the Common Digital Platforms are delivering measurable business value, enabling my workforce, reducing strategic operational risk and supporting objectives.",
  "roles": "Director · Executive Sponsor · Functional Director · Senior Leader · Entity Leader",
  "frame": [
   [
    "Focus",
    "Strategy, performance and transformation outcomes"
   ],
   [
    "Scope",
    "Enterprise / multiple entities and business functions"
   ],
   [
    "Time Horizon",
    "Medium to long term"
   ],
   [
    "Success Measure",
    "Business value, adoption, readiness, risk reduction"
   ]
  ],
  "drivers": [
   "Deliver transformation outcomes",
   "Increase platform adoption and usage",
   "Improve workforce capability and productivity",
   "Reduce organisational risk and cost",
   "Demonstrate value from CDP investments",
   "Support strategic objectives and service excellence"
  ],
  "behaviors": [
   "Consumes information rather than transactions",
   "Reviews dashboards and performance reports",
   "Makes governance and investment decisions",
   "Sponsors change and transformation initiatives",
   "Challenges performance and asks “why”",
   "Delegates operational activity to teams"
  ],
  "cares": [
   "Business outcomes and ROI",
   "Adoption and usage levels",
   "Workforce readiness and capability",
   "Risk, compliance and assurance",
   "Governance and accountability",
   "Benefit realisation",
   "Customer and stakeholder impact"
  ],
  "success": [
   "Adoption targets achieved across CDPs",
   "Workforce is ready and productive",
   "Reduced support demand and operational risk",
   "Strong governance and compliance posture",
   "Clear visibility of performance and business impact",
   "Demonstrable return on investment"
  ],
  "meters": [
   [
    "Technology Confidence",
    "High"
   ],
   [
    "Learning Need (Priority)",
    "Medium"
   ],
   [
    "DAP Need",
    "Low"
   ],
   [
    "Change Impact Exposure",
    "High"
   ]
  ],
  "cap": "Understand processes",
  "prof": "Essential",
  "summary": "A senior decision-maker who sponsors platform adoption and uses platform insights and approvals to steer entity performance.",
  "definition": "A senior decision-maker, such as a director general, executive director or head of sector, who sponsors platform adoption in their entity. Executive leaders use the platform less often than other personas, but their approvals, decisions and visible commitment shape how it is used across the organisation. Their focus is on outcomes, performance insight and accountability rather than transactional detail.",
  "domains": {
   "platform": [
    "Accesses the platform selectively and on demand, mainly to act on approvals, view dashboards and consult executive reports.",
    "Uses mobile and simplified interfaces, and expects to complete tasks in a few steps.",
    "Relies on intuitive design, notifications and in-app guidance rather than structured training. Short briefings and executive walkthroughs suit their learning needs.",
    "Retrieves the information needed for decisions directly, without depending on staff to extract it offline.",
    "Delegates routine actions where appropriate, but uses the platform directly for decisions that require their authority."
   ],
   "role": [
    "Understands their approval authority, financial and administrative limits, and the decisions that must be taken on the platform rather than offline.",
    "Knows the delegation rules that apply when they are unavailable, and how to set and revoke delegations.",
    "Understands the governance and accountability expectations attached to their role, including the audit trail their actions create.",
    "Recognises the performance and compliance indicators the platform makes available for their entity."
   ],
   "process": [
    "Holds a strategic view of the main processes the platform enables, such as finance, HR, procurement, correspondence and service delivery.",
    "Understands where executive decisions sit within those processes, and how delays at their level affect cycle times and service outcomes.",
    "Understands the outcomes each process is expected to deliver and the indicators that show whether it is working.",
    "Identifies where processes need policy or structural change rather than individual workarounds."
   ],
   "support": [
    "Acts as the visible sponsor of adoption, using the platform personally and expecting leadership teams to do the same.",
    "Sets a clear expectation that work is completed on the platform and discourages parallel offline processes.",
    "Endorses training participation, certification and recognition of capable users, including super users.",
    "Allocates time and resources for super users and local training coordination, and reviews adoption progress in leadership forums."
   ]
  }
 },
 "Super users": {
  "code": "PR-02",
  "title": "Super User",
  "archetype": "Decision Influencer",
  "tags": [
   "Governance Conscious",
   "Risk Focused",
   "Cross Functional"
  ],
  "quote": "I need confidence that digital platforms are being used correctly, risks are being managed, and governance decisions are supported by reliable evidence.",
  "roles": "Governance Committee Member · Chairperson · Risk Lead · Internal Control Owner · Compliance Manager · Audit Representative",
  "frame": [
   [
    "Focus",
    "Governance, compliance and assurance outcomes"
   ],
   [
    "Scope",
    "Cross-functional processes and governance forums"
   ],
   [
    "Time Horizon",
    "Medium to long term"
   ],
   [
    "Success Measure",
    "Compliance, assurance, decision quality, risk reduction"
   ]
  ],
  "drivers": [
   "Ensure appropriate controls are in place",
   "Reduce compliance and operational risk",
   "Support informed approvals and decisions",
   "Monitor governance effectiveness",
   "Improve accountability and transparency",
   "Maintain stakeholder confidence"
  ],
  "behaviors": [
   "Reviews evidence before approving decisions",
   "Uses reports and dashboards frequently",
   "Participates in governance forums",
   "Escalates risks and exceptions",
   "Challenges non-compliance",
   "Focuses on assurance rather than delivery"
  ],
  "cares": [
   "Compliance and controls",
   "Audit readiness",
   "Risk exposure",
   "Decision traceability",
   "Policy adherence",
   "Governance effectiveness"
  ],
  "success": [
   "Regulatory requirements satisfied",
   "Risks identified and mitigated",
   "Decisions supported by evidence",
   "Audit findings reduced",
   "Strong governance reporting",
   "Clear accountability across CDPs"
  ],
  "meters": [
   [
    "Technology Confidence",
    "Medium"
   ],
   [
    "Learning Need (Priority)",
    "Medium"
   ],
   [
    "DAP Need",
    "Low"
   ],
   [
    "Change Impact Exposure",
    "Medium"
   ]
  ],
  "cap": "Support others",
  "prof": "Advanced",
  "summary": "A designated platform champion within an entity who supports colleagues and acts as the link to CDP.",
  "definition": "A designated platform champion within an entity who combines strong platform skills with broad process knowledge. Super users are typically experienced specialist users nominated by their entity to support colleagues, and they act as the link between their entity and CDP. They are the first point of contact for platform questions, a channel for updates and feedback, and a key enabler of adoption at entity level.",
  "domains": {
   "platform": [
    "Has deep command of platform functionality across the modules and features their entity uses, beyond their own job role.",
    "Understands how processes, permissions and settings shape what different users see, without necessarily administering them.",
    "Takes part in user acceptance testing and early access for new releases, and learns new functionality ahead of colleagues.",
    "Tells defects apart from user error, reproduces issues and documents them clearly.",
    "Uses reports and usage information to identify adoption gaps in their entity."
   ],
   "role": [
    "Understands every role in their entity's use of the platform, including what each role can see and do.",
    "Understands how roles interact, including who initiates, reviews and approves, and where segregation of duties applies.",
    "Advises colleagues on which role performs which task, and flags access or role-mapping issues to the administrator.",
    "Understands the policies and controls behind the main transactions in their entity."
   ],
   "process": [
    "Holds the full end-to-end view of the processes their entity runs on the platform, including hand-offs across teams, entities and connected platforms.",
    "Traces transactions across stages, diagnoses where and why they are stuck, and guides users to resolve them.",
    "Identifies recurring process issues, workarounds and improvement opportunities, and raises them with the platform owner.",
    "Understands how process changes introduced through releases affect users in their entity."
   ],
   "support": [
    "Acts as the first point of contact for platform queries in their entity and resolves first-line issues directly.",
    "Triages issues they cannot resolve and escalates them to the help desk with complete information.",
    "Provides floor support during go-live, releases and peak periods.",
    "Cascades updates and release communications, and reinforces centrally designed training back on the job through coaching and short demonstrations.",
    "Gathers user feedback, common questions and recurring issues, and channels them to CDP Learning and the platform owner."
   ]
  }
 },
 "People managers": {
  "code": "PR-03",
  "title": "People Manager",
  "archetype": "Team Leader & Enabler",
  "tags": [
   "Operationally Accountable",
   "Oversight Responsibilities",
   "Drives Compliance & Adoption"
  ],
  "quote": "I need my team to be capable, compliant and productive. I balance operational delivery with developing my people and ensuring they have the skills and knowledge to succeed on our platforms.",
  "roles": "Team Leader · Functional Manager · Service Manager · Department Manager · Project Lead / Workstream Lead",
  "frame": [
   [
    "Focus",
    "Team performance, capability development and operational delivery"
   ],
   [
    "Scope",
    "Team / department within an entity or business unit"
   ],
   [
    "Time Horizon",
    "Short to medium term"
   ],
   [
    "Success Measure",
    "Team readiness, compliance, performance and adoption"
   ]
  ],
  "drivers": [
   "Deliver business objectives through my team",
   "Ensure compliance and mandatory learning completion",
   "Build capability and confidence across my team",
   "Prepare team for change and effective platform use",
   "Reduce risk and support operational continuity",
   "Meet performance commitments and KPIs"
  ],
  "behaviors": [
   "Monitors team learning progress and completion",
   "Approves and allocates learning requests",
   "Plans and coordinates training time",
   "Escalates blockers and readiness issues",
   "Provides guidance and support to team members",
   "Reviews reports and dashboards regularly"
  ],
  "cares": [
   "Team readiness and confidence",
   "Operational delivery",
   "Compliance and audit requirements",
   "Skill gaps and capability levels",
   "Adoption of new processes and systems",
   "Team productivity and efficiency",
   "Workforce engagement and retention"
  ],
  "success": [
   "Team completes required learning on time",
   "Team is confident and capable using the platforms",
   "Reduced errors and rework",
   "Lower support demand",
   "Smooth go-lives and transitions",
   "Visibility of team performance and readiness"
  ],
  "meters": [
   [
    "Technology Confidence",
    "Medium"
   ],
   [
    "Learning Need (Priority)",
    "High"
   ],
   [
    "DAP Need",
    "High"
   ],
   [
    "Change Impact Exposure",
    "High"
   ]
  ],
  "cap": "Support others",
  "prof": "Proficient",
  "summary": "A line manager who leads a team on the platform, approving their requests and building their platform capability.",
  "definition": "A line manager at any level, such as a section head, team leader or unit manager, who is accountable for a team whose work runs through the platform. People managers perform their own transactions, review and approve requests submitted by their team, and use platform information to manage performance, workload and resources. They play a central role in making sure their team builds and applies the capability needed to use the platform well.",
  "domains": {
   "platform": [
    "Uses manager functions regularly to review, approve, reject or return requests submitted by team members.",
    "Monitors team activity through dashboards, worklists and team-level reports, such as pending approvals, leave balances, task status and workload.",
    "Manages notifications and worklists efficiently so that approvals do not become bottlenecks.",
    "Sets up delegations when unavailable and checks that delegated actions are completed.",
    "Completes their own self-service transactions with full confidence."
   ],
   "role": [
    "Understands their approval responsibilities and limits for each type of team request.",
    "Knows the policies behind team transactions, such as leave, attendance, overtime, performance and purchase requests, so that approval decisions are informed rather than automatic.",
    "Understands their accountability for the accuracy of the team data they review and approve.",
    "Knows which actions belong to them, which belong to HR, finance or other functions, and which need escalation."
   ],
   "process": [
    "Understands the processes their team takes part in and where managerial review and approval sit within each.",
    "Understands how their decisions and response times affect team members, downstream functions and service timelines.",
    "Recognises common errors and incomplete submissions from their team, and guides corrections before approval.",
    "Identifies recurring process issues affecting their team and raises them through super users or the appropriate channel."
   ],
   "support": [
    "Coordinates their team's training locally by nominating members, scheduling time for learning and following up on completion.",
    "Encourages consistent platform use and reinforces learning on the job through coaching and feedback.",
    "Directs team queries to super users and in-app guidance rather than informal workarounds.",
    "Recognises team members who build strong platform capability and identifies potential super users."
   ]
  }
 },
 "System admins": {
  "code": "PR-04",
  "title": "Administrator",
  "archetype": "Process Owner",
  "tags": [
   "Platform Expert",
   "Service Focused",
   "Operationally Critical"
  ],
  "quote": "I need platforms, users, permissions and support processes to operate effectively so the business can work without disruption.",
  "roles": "System Administrator · Learning Administrator · Platform Administrator · Service Administrator · Support Lead",
  "frame": [
   [
    "Focus",
    "Platform administration and operational continuity"
   ],
   [
    "Scope",
    "Platform, users and support processes"
   ],
   [
    "Time Horizon",
    "Immediate to medium term"
   ],
   [
    "Success Measure",
    "Operational stability and support effectiveness"
   ]
  ],
  "drivers": [
   "Maintain service continuity",
   "Ensure accurate configuration",
   "Improve user experience",
   "Reduce support issues",
   "Enable adoption",
   "Support governance requirements"
  ],
  "behaviors": [
   "Performs platform configuration",
   "Manages user access",
   "Resolves incidents",
   "Reviews support trends",
   "Maintains data quality",
   "Supports release activities"
  ],
  "cares": [
   "Platform performance",
   "Service availability",
   "User access",
   "Support demand",
   "Data quality",
   "Process consistency"
  ],
  "success": [
   "Stable platform operations",
   "Reduced support tickets",
   "Accurate user provisioning",
   "Effective release deployment",
   "Fast issue resolution",
   "Positive user experience"
  ],
  "meters": [
   [
    "Technology Confidence",
    "High"
   ],
   [
    "Learning Need (Priority)",
    "Medium"
   ],
   [
    "DAP Need",
    "Medium"
   ],
   [
    "Change Impact Exposure",
    "High"
   ]
  ],
  "cap": "Use system",
  "prof": "Advanced",
  "summary": "A designated user who controls who can do what on the platform by managing users, roles, access and configuration.",
  "definition": "A designated user responsible for managing users, roles, access and functional configuration of the platform for their entity. Administrators act as custodians of who can do what on the platform. Their work directly affects security, compliance and the experience of every other persona, so it requires precision and strong governance awareness.",
  "domains": {
   "platform": [
    "Uses administrative consoles to create, modify, deactivate and maintain user accounts.",
    "Assigns roles, permissions and access in line with approved requests.",
    "Configures processes, approval hierarchies, notifications, settings and master data within their authority.",
    "Runs access, audit and usage reports to monitor activity and compliance.",
    "Tests configuration changes before applying them in the live environment where required."
   ],
   "role": [
    "Understands the full role and permission model of the platform and what each role allows.",
    "Applies segregation of duties, access policies and least-privilege principles.",
    "Knows the boundary between entity-level configuration and central configuration owned by the platform team.",
    "Understands the approval, documentation and audit requirements attached to every administrative action.",
    "Processes joiner, mover and leaver changes promptly and accurately."
   ],
   "process": [
    "Understands how configuration choices shape process flow, approval routes, notifications and user experience end to end.",
    "Assesses the impact of configuration and access changes on processes and users before applying them.",
    "Translates organisational changes, such as restructures or new roles, into the right platform configuration.",
    "Identifies where process problems stem from configuration and corrects them within their authority."
   ],
   "support": [
    "Resolves access, role and configuration issues raised by users, super users and the help desk.",
    "Works closely with super users to understand user needs, and with technical users on issues beyond functional configuration.",
    "Communicates configuration and access changes to affected users.",
    "Maintains accurate records of roles, access and configuration to support audits and continuity."
   ]
  }
 },
 "Technical users": {
  "code": "PR-05",
  "title": "Technical User",
  "archetype": "Technical Expert",
  "tags": [
   "Solution Focused",
   "Platform Owner",
   "Innovation Driven"
  ],
  "quote": "I need secure, scalable and well-integrated platforms that support business needs without creating technical debt or operational risk.",
  "roles": "Platform Owner · Solution Architect · Developer · Technical Specialist · Integration Lead · Product Engineer",
  "frame": [
   [
    "Focus",
    "Technical capability and platform sustainability"
   ],
   [
    "Scope",
    "Platform architecture and technology ecosystem"
   ],
   [
    "Time Horizon",
    "Medium to long term"
   ],
   [
    "Success Measure",
    "System quality, scalability and reliability"
   ]
  ],
  "drivers": [
   "Deliver technical excellence",
   "Enable platform innovation",
   "Reduce technical risk",
   "Improve integration and automation",
   "Support platform performance",
   "Future-proof solutions"
  ],
  "behaviors": [
   "Reviews technical roadmaps",
   "Designs solutions",
   "Configures integrations",
   "Analyses technical issues",
   "Optimises performance",
   "Supports release planning"
  ],
  "cares": [
   "Architecture",
   "Security",
   "Integrations",
   "Reliability",
   "Scalability",
   "Technical governance"
  ],
  "success": [
   "Stable technical environment",
   "High system performance",
   "Secure architecture",
   "Effective integrations",
   "Reduced technical debt",
   "Sustainable platform roadmap"
  ],
  "meters": [
   [
    "Technology Confidence",
    "Very High"
   ],
   [
    "Learning Need (Priority)",
    "Low"
   ],
   [
    "DAP Need",
    "Low"
   ],
   [
    "Change Impact Exposure",
    "Medium"
   ]
  ],
  "cap": "Use system",
  "prof": "Advanced",
  "summary": "An IT professional who keeps the platform secure and reliable through integrations, data management and technical support.",
  "definition": "An IT or digital professional, such as a systems analyst, integration specialist, security engineer or application support analyst, who manages the technical side of the platform. Technical users are responsible for integrations, data, security, technical configuration and technical issue resolution rather than business transactions. Their work keeps the platform reliable, secure and aligned with entity and government technical standards.",
  "domains": {
   "platform": [
    "Works with back-end and technical functions, such as integration settings, data flows, logs, monitoring tools, technical configuration and test environments.",
    "Supports release management, including testing, deployment checks and post-release validation.",
    "Uses diagnostic and monitoring tools to identify, investigate and resolve technical issues.",
    "Understands business-facing functionality well enough to reproduce issues reported by users.",
    "Applies security settings, technical policies and data management functions in line with standards."
   ],
   "role": [
    "Understands the platform's technical architecture, hosting model, integrations and dependencies.",
    "Knows the security, data protection and information management standards that apply, including government standards.",
    "Understands where their responsibilities end and those of administrators, vendors, the platform owner and the central platform team begin.",
    "Follows incident, change and release management processes."
   ],
   "process": [
    "Understands how business processes are supported technically, including data flows across platforms and with entity systems.",
    "Traces transactions through integrations to identify where and why technical failures occur.",
    "Assesses the technical impact of process, configuration and release changes on connected processes and platforms.",
    "Knows which processes are business-critical, so that technical issues are prioritised by business impact."
   ],
   "support": [
    "Provides second-line technical support, resolving issues escalated by super users, administrators and the help desk.",
    "Works with vendors and the central platform team to resolve complex or platform-wide issues.",
    "Advises business teams on the technical implications of requested changes.",
    "Documents technical solutions and known issues so that first-line support resolves recurring issues faster."
   ]
  }
 },
 "Specialist": {
  "code": "PR-06",
  "title": "Specialist User",
  "archetype": "Process Expert",
  "tags": [
   "High Transaction Volume",
   "Business Critical",
   "Process Driven"
  ],
  "quote": "I need to complete specialist business processes accurately and efficiently without having to remember every step.",
  "roles": "HR Specialist · Finance Specialist · Procurement Specialist · Project Specialist · Payroll Specialist · Case Worker",
  "frame": [
   [
    "Focus",
    "Process execution and quality"
   ],
   [
    "Scope",
    "Functional business processes"
   ],
   [
    "Time Horizon",
    "Day-to-day and medium term"
   ],
   [
    "Success Measure",
    "Accuracy, compliance and throughput"
   ]
  ],
  "drivers": [
   "Complete complex transactions",
   "Maintain compliance",
   "Reduce errors",
   "Improve efficiency",
   "Meet service standards",
   "Deliver quality outputs"
  ],
  "behaviors": [
   "Uses systems regularly",
   "Follows defined processes",
   "Handles exceptions",
   "Relies on guidance when processes change",
   "Seeks efficient ways of working",
   "Escalates unusual scenarios"
  ],
  "cares": [
   "Process accuracy",
   "Efficiency",
   "Compliance",
   "Quality outputs",
   "User support",
   "Practical guidance"
  ],
  "success": [
   "Fewer process errors",
   "Faster transaction completion",
   "Improved productivity",
   "Reduced rework",
   "Consistent process execution",
   "Confidence handling exceptions"
  ],
  "meters": [
   [
    "Technology Confidence",
    "High"
   ],
   [
    "Learning Need (Priority)",
    "High"
   ],
   [
    "DAP Need",
    "High"
   ],
   [
    "Change Impact Exposure",
    "Medium"
   ]
  ],
  "cap": "Do my role",
  "prof": "Advanced",
  "summary": "A hands-on practitioner who performs specialised transactions on the platform as a core part of their daily role.",
  "definition": "A hands-on practitioner whose core job depends on performing specialised transactions on the platform, such as a finance officer, procurement specialist, HR officer, correspondence controller or service agent. Specialist users work on the platform intensively and in depth within a defined functional area. They handle complex and exception scenarios and are accountable for the accuracy and completeness of the records they create and maintain.",
  "domains": {
   "platform": [
    "Performs the full range of transactions in their functional area independently, including complex, infrequent and exception scenarios.",
    "Uses advanced features within their scope, such as bulk actions, templates, advanced search, filters, saved views and standard reports.",
    "Works efficiently through optimised navigation and shortcuts, handling high transaction volumes.",
    "Validates data before submission and corrects errors in their own records.",
    "Uses in-app guidance mainly for new functions or changes introduced through releases."
   ],
   "role": [
    "Knows their role in depth, including responsibilities, access rights, approval limits and the data they own.",
    "Understands the policies, regulations, business rules and controls that govern each transaction they perform.",
    "Understands the consequences of their actions on records, reporting, compliance and audit.",
    "Knows the boundaries of their role and the hand-offs to other roles and functions."
   ],
   "process": [
    "Has detailed knowledge of their own process steps and a working understanding of the full process they contribute to.",
    "Understands the inputs they receive from upstream roles and the outputs they pass downstream, including the quality standards each requires.",
    "Handles exceptions within their steps and resolves standard issues without escalation.",
    "Knows when, how and to whom to escalate issues that fall outside their scope.",
    "Understands how their work feeds reporting and decision-making."
   ],
   "support": [
    "Shares functional and platform know-how informally with colleagues in the same function.",
    "Models correct usage and data quality standards for less experienced colleagues.",
    "Points colleagues to in-app guidance, job aids and approved resources.",
    "Contributes process issues and improvement ideas to super users, without carrying formal support accountability."
   ]
  }
 },
 "End users": {
  "code": "PR-07",
  "title": "Operational End User",
  "archetype": "Task Focused",
  "tags": [
   "High Population",
   "Learning Dependent",
   "Adoption Critical"
  ],
  "quote": "I need to complete everyday tasks quickly and easily so I can focus on my job rather than figuring out new systems.",
  "roles": "Employee · Frontline Worker · Business User · Team Member · Administrative Staff",
  "frame": [
   [
    "Focus",
    "Completing day-to-day activities"
   ],
   [
    "Scope",
    "Individual role responsibilities"
   ],
   [
    "Time Horizon",
    "Immediate and short term"
   ],
   [
    "Success Measure",
    "Ease of use, efficiency and task completion"
   ]
  ],
  "drivers": [
   "Complete tasks quickly",
   "Avoid mistakes",
   "Access support when needed",
   "Minimise disruption",
   "Build confidence",
   "Understand new processes"
  ],
  "behaviors": [
   "Uses systems to complete transactions",
   "Learns by doing",
   "Prefers simple guidance",
   "Relies on managers and support resources",
   "Uses DAP guidance frequently",
   "Focuses on immediate tasks"
  ],
  "cares": [
   "Ease of use",
   "Simplicity",
   "Speed",
   "Clear instructions",
   "Reliable support",
   "Minimal disruption"
  ],
  "success": [
   "Tasks completed successfully",
   "Fewer errors",
   "Reduced frustration",
   "Confidence using platforms",
   "Less reliance on helpdesk",
   "Positive user experience"
  ],
  "meters": [
   [
    "Technology Confidence",
    "Low-Medium"
   ],
   [
    "Learning Need (Priority)",
    "Very High"
   ],
   [
    "DAP Need",
    "High"
   ],
   [
    "Change Impact Exposure",
    "High"
   ]
  ],
  "cap": "Use system",
  "prof": "Essential",
  "summary": "An employee who uses the platform for routine, everyday tasks that support their work rather than define it.",
  "definition": "An employee who uses the platform for routine, everyday tasks that support their work rather than define it. Operational end users are typically the largest user group, covering activities such as submitting requests, completing forms, responding to tasks, viewing information and tracking status. Their use is often occasional or limited to a small set of functions, so ease of use and in-the-moment guidance matter more than in-depth training.",
  "domains": {
   "platform": [
    "Uses a defined set of common functions with ease, such as logging in, submitting requests, completing forms, responding to assigned tasks and tracking status.",
    "Uses self-service functions to view and update their own information.",
    "Relies on in-app guidance, job aids and short learning resources for less frequent tasks.",
    "Enters required information correctly and attaches the right documents, avoiding common errors that cause requests to be returned."
   ],
   "role": [
    "Knows which requests and actions are available to them.",
    "Understands the basic rules that apply to their transactions, such as eligibility, required information, supporting documents and deadlines.",
    "Understands their responsibility for the accuracy of the information they submit.",
    "Knows the data privacy and acceptable use expectations attached to their access."
   ],
   "process": [
    "Knows their own touchpoints in the process and what happens after they act.",
    "Understands who reviews or approves their requests and the typical timelines involved.",
    "Tracks progress and responds promptly when a request is returned or more information is required.",
    "Has a general awareness of why the process exists and the outcome it delivers."
   ],
   "support": [
    "Helps peers with basic tasks informally where they are confident.",
    "Uses in-app guidance and super users as the first sources of help, rather than offline workarounds.",
    "Shares feedback on usability, unclear steps and recurring difficulties through the available channels."
   ]
  }
 },
 "External User": {
  "code": "PR-08",
  "title": "External User",
  "archetype": "Self-Service User",
  "tags": [
   "Occasional User",
   "Low Training Appetite",
   "Experience Driven"
  ],
  "quote": "I need confidence that digital platforms are being used correctly, risks are being managed, and governance decisions are supported by reliable evidence.",
  "roles": "Supplier · Vendor · Contractor · Partner · External Stakeholder",
  "frame": [
   [
    "Focus",
    "Completing required interactions and transactions"
   ],
   [
    "Scope",
    "Specific external services and processes"
   ],
   [
    "Time Horizon",
    "Immediate and transactional"
   ],
   [
    "Success Measure",
    "Ease of access and completion"
   ]
  ],
  "drivers": [
   "Complete required transactions",
   "Minimise effort",
   "Avoid delays",
   "Meet obligations",
   "Access information easily",
   "Maintain business relationship"
  ],
  "behaviors": [
   "Uses platform infrequently",
   "Requires intuitive experiences",
   "Avoids extensive training",
   "Relies on guidance when needed",
   "Focuses on task completion",
   "Expects self-service support"
  ],
  "cares": [
   "Simplicity",
   "Accessibility",
   "Speed",
   "Transparency",
   "Reliability",
   "Ease of support"
  ],
  "success": [
   "Transactions completed successfully",
   "Minimal onboarding required",
   "Low support demand",
   "Positive user experience",
   "Strong stakeholder satisfaction",
   "Efficient external engagement"
  ],
  "meters": [
   [
    "Technology Confidence",
    "High"
   ],
   [
    "Learning Need (Priority)",
    "Low-Medium"
   ],
   [
    "DAP Need",
    "Low"
   ],
   [
    "Change Impact Exposure",
    "Low"
   ]
  ],
  "cap": "Use system",
  "prof": "Essential",
  "summary": "A user outside the government entity who accesses platform services or completes transactions through limited, external-facing access.",
  "definition": "An individual or organisation outside the government entity, such as a supplier, contractor, partner or member of the public, who uses the platform to access services or complete transactions. External users have limited, permission-based access to specific functions, typically through external-facing portals. As they sit outside the entity's workforce, they are not expected to attend formal training and depend on clear design, instructions and self-service support.",
  "domains": {
   "platform": [
    "Uses external-facing functions intermittently to register, log in securely, submit information, respond to requests and track status.",
    "Completes forms and uploads documents in line with the instructions provided.",
    "Relies on self-service guidance, FAQs, clear instructions and intuitive design rather than formal training.",
    "Monitors notifications and responds within required timeframes."
   ],
   "role": [
    "Understands what they are permitted to do on the platform and the services available to them.",
    "Knows the information, documents and eligibility requirements for each transaction.",
    "Understands their obligations under the terms of use, including data accuracy, confidentiality and data privacy.",
    "Keeps their account and credentials secure."
   ],
   "process": [
    "Knows their own steps in the process and the status stages visible to them.",
    "Understands expected response times and what happens after submission.",
    "Knows how to respond when a submission is returned or additional information is requested.",
    "Understands the overall journey from submission to outcome, without needing visibility of internal processes."
   ],
   "support": [
    "Carries no responsibility for supporting other platform users.",
    "Uses self-service resources and official help channels when support is needed.",
    "Provides feedback on their experience through surveys and feedback channels, helping to improve the external user journey.",
    "May guide colleagues within their own organisation who also interact with the platform."
   ]
  }
 }
};
