export interface OrientationSection {
  sectionNumber: number;
  title: string;
  content: string; // HTML content
  quizQuestions: OrientationQuizQuestion[];
}

export interface OrientationQuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

export const orientationSections: OrientationSection[] = [
  {
    sectionNumber: 1,
    title: "Employee Handbook Orientation",
    content: `
      <h3>Home Care Headquarters</h3>
      <h2>Employee Handbook Orientation</h2>
      <p>Slide-by-slide training based on your employee handbook, with separate narration audio included.</p>
      <p>Includes a dedicated EVV section with the required escalation instruction:</p>
      <p><strong>Call the office immediately at 870-290-7019 if you cannot clock in or out, regardless of day or time.</strong></p>
      <p><em>Prepared for caregiver orientation and handbook review.</em></p>
    `,
    quizQuestions: [],
  },
  {
    sectionNumber: 2,
    title: "Training Roadmap & Orientation Overview",
    content: `
      <h3>Training Roadmap — Orientation Overview</h3>
      <h4>1. Foundations</h4>
      <ul>
        <li>Purpose of handbook</li>
        <li>Standards of care</li>
        <li>At-will employment</li>
      </ul>
      <h4>2. Work Rules</h4>
      <ul>
        <li>Scheduling and call-offs</li>
        <li>Professional conduct</li>
        <li>Reporting duties</li>
      </ul>
      <h4>3. Care Delivery</h4>
      <ul>
        <li>Care plan rules</li>
        <li>Medication limits</li>
        <li>Documentation</li>
      </ul>
      <h4>4. Compliance</h4>
      <ul>
        <li>EVV expectations</li>
        <li>Payroll accuracy</li>
        <li>Acknowledgment and close</li>
      </ul>
      <p>Use this deck together with the narration audio for a full handbook review. The slides highlight the key policy points; the voiceover explains what they mean in day-to-day practice.</p>
    `,
    quizQuestions: [],
  },
  {
    sectionNumber: 3,
    title: "Purpose of the Handbook",
    content: `
      <h3>Purpose of the Handbook</h3>
      <ul>
        <li>The handbook is a guide to agency policies, expectations, and standards.</li>
        <li>It is <strong>not a contract</strong> of employment and does not guarantee employment for any set period.</li>
        <li>Employment is <strong>at-will</strong>: the employee or the agency may end employment at any time, subject to law.</li>
        <li>Policies may be changed, modified, or updated by Home Care Headquarters as needed.</li>
        <li>Employees are expected to know current policy and follow it every shift.</li>
      </ul>
      <h4>Why this matters</h4>
      <ul>
        <li>The handbook sets the baseline for safe care and professional conduct.</li>
        <li>When questions come up, policy should guide your decisions.</li>
        <li>If you are unsure, call the office instead of guessing.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Is the employee handbook a contract of employment?",
        options: ["Yes, it guarantees employment", "No, it is a guide to policies and expectations", "Only during probation", "Only for full-time employees"],
        correctAnswer: "No, it is a guide to policies and expectations",
        points: 1,
      },
      {
        questionText: "What type of employment does Home Care Headquarters practice?",
        options: ["Contract-based", "At-will employment", "Union-based", "Fixed-term only"],
        correctAnswer: "At-will employment",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 4,
    title: "Our Standard of Care and Professional Conduct",
    content: `
      <h3>Our Standard of Care and Professional Conduct</h3>
      <ul>
        <li>Home Care Headquarters is dedicated to competent, professional service for every client.</li>
        <li>Employees must act with respect, safety, honesty, and professionalism at all times.</li>
        <li>Every shift reflects on the agency, the client experience, and your job performance.</li>
        <li>Infractions may be used as grounds for discipline when policy is not followed.</li>
      </ul>
      <h4>Professional Standard</h4>
      <ul>
        <li>Protect the client first.</li>
        <li>Represent the agency well.</li>
        <li>Document and report concerns immediately.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What should you do if you are unsure about a policy?",
        options: ["Ask a coworker", "Guess and do your best", "Call the office", "Ignore it"],
        correctAnswer: "Call the office",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 5,
    title: "Selection, Hiring, and Non-Discrimination",
    content: `
      <h3>Selection, Hiring, and Non-Discrimination</h3>
      <ul>
        <li>Employees must meet applicable licensing and regulatory standards.</li>
        <li>Hiring and placement decisions are based on position-related criteria.</li>
        <li>The agency states it will not discriminate based on race, color, religion, sex, disability, age, marital status, or similar protected status.</li>
        <li>The goal is to match employee skills and ability to the role that best fits the agency and client need.</li>
      </ul>
      <h4>Key Idea</h4>
      <ul>
        <li>Every employee is expected to meet role requirements.</li>
        <li>Fair treatment is part of the agency's employment practice.</li>
        <li>Job placement is based on fit for the work.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Hiring decisions at Home Care Headquarters are based on:",
        options: ["Personal connections", "Position-related criteria", "Seniority only", "Random selection"],
        correctAnswer: "Position-related criteria",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 6,
    title: "Harassment, Complaints, and Grievances",
    content: `
      <h3>Harassment, Complaints, and Grievances</h3>
      <ul>
        <li>Harassment based on protected status, including sexual harassment, is <strong>prohibited</strong>.</li>
        <li>Unwelcome advances, offensive conduct, retaliation, or hostile behavior must not occur in the workplace.</li>
        <li>Employees who believe they experienced harassment should report it to the office immediately.</li>
        <li>Complaints may be put in writing and investigated by the agency.</li>
        <li>Grievances should be filed in writing and reviewed by the Administrator.</li>
      </ul>
      <h4>Report Concerns Promptly</h4>
      <ul>
        <li>Do not stay silent about harassment or offensive behavior.</li>
        <li>Use the office complaint process.</li>
        <li>The agency may investigate based on the facts.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What should you do if you experience harassment?",
        options: ["Ignore it", "Report it to the office immediately", "Confront the person yourself", "Wait until your annual review"],
        correctAnswer: "Report it to the office immediately",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 7,
    title: "Confidentiality and Client Privacy",
    content: `
      <h3>Confidentiality and Client Privacy</h3>
      <ul>
        <li>Client and family information is confidential and protected by law and agency policy.</li>
        <li>Employees must not improperly discuss a client's condition, care, or family matters.</li>
        <li>Disclosing confidential information is grounds for <strong>immediate termination</strong> according to the handbook.</li>
        <li>Privacy applies in conversation, documentation, text messages, calls, and social settings.</li>
      </ul>
      <h4>Always Remember</h4>
      <ul>
        <li>If someone is not authorized to know, do not share.</li>
        <li>Avoid gossip, casual updates, or discussing clients in public.</li>
        <li>Respecting privacy is part of safe, ethical care.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What is the consequence for disclosing confidential client information?",
        options: ["Written warning", "Suspension", "Immediate termination", "Probation"],
        correctAnswer: "Immediate termination",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 8,
    title: "Probation, Evaluations, and In-Service Education",
    content: `
      <h3>Probation, Evaluations, and In-Service Education</h3>
      <ul>
        <li>The first <strong>1040 hours</strong> of employment are probationary.</li>
        <li>Employees may be reviewed at the end of the 90-day probationary period.</li>
        <li>Annual evaluations are documented and kept in the employee personnel file.</li>
        <li><strong>Twelve hours</strong> of in-service education are required each year to maintain employment.</li>
        <li>Training may be delivered through lectures, videos, email, text, and quizzes.</li>
      </ul>
      <h4>Performance Expectations</h4>
      <ul>
        <li>Reliability, policy compliance, and communication all matter during probation.</li>
        <li>Annual training is a condition of continued employment.</li>
        <li>Orientation is only the beginning of ongoing learning.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "How many hours of in-service education are required each year?",
        options: ["6 hours", "8 hours", "12 hours", "24 hours"],
        correctAnswer: "12 hours",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 9,
    title: "Resignation, Termination, and Arbitration",
    content: `
      <h3>Resignation, Termination, and Arbitration</h3>
      <ul>
        <li>Field staff are asked to give <strong>two weeks</strong> written notice; administrative staff are asked to give <strong>three weeks</strong>.</li>
        <li>Failure to request a new assignment after dismissal from a client may be treated as voluntary resignation.</li>
        <li>The handbook lists many grounds for termination, including dishonesty, theft, insubordination, abuse, falsification of records, intoxication on duty, and confidentiality violations.</li>
        <li>Two no-call/no-shows may result in <strong>automatic termination</strong> according to the handbook.</li>
        <li>Employment disputes may be subject to arbitration under the handbook policy.</li>
      </ul>
      <h4>High-Risk Behaviors</h4>
      <ul>
        <li>No call/no show, falsified records, abuse, and intoxication are major violations.</li>
        <li>Employees terminated for disciplinary action are not eligible for rehire.</li>
        <li>Always communicate with the office before a problem becomes a separation issue.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "How many no-call/no-shows may result in automatic termination?",
        options: ["One", "Two", "Three", "Five"],
        correctAnswer: "Two",
        points: 1,
      },
      {
        questionText: "How far in advance must field staff give written notice of resignation?",
        options: ["One week", "Two weeks", "Three weeks", "Four weeks"],
        correctAnswer: "Two weeks",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 10,
    title: "Leave of Absence, Maternity, and Parental Leave",
    content: `
      <h3>Leave of Absence, Maternity, and Parental Leave</h3>
      <ul>
        <li>Leave requests must be submitted in writing to the Director at least <strong>two weeks</strong> in advance.</li>
        <li>If the employee does not return when leave expires, employment may be terminated.</li>
        <li>Maternity leave and parental leave are addressed in the handbook.</li>
        <li>Employees should communicate early and clearly when time away from work is needed.</li>
      </ul>
      <h4>Why This Matters</h4>
      <ul>
        <li>Written notice helps the agency plan staffing and client coverage.</li>
        <li>Return dates matter in home care because missed coverage affects clients.</li>
        <li>Ask questions early if you are unsure of the leave process.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "How far in advance must leave requests be submitted in writing?",
        options: ["One week", "Two weeks", "Three weeks", "One month"],
        correctAnswer: "Two weeks",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 11,
    title: "Sick Calls, Cancelled Visits, and Replacement Staff",
    content: `
      <h3>Sick Calls, Cancelled Visits, and Replacement Staff</h3>
      <ul>
        <li>If you cannot work a scheduled shift, you must <strong>call the staffing department or Administrator directly</strong>.</li>
        <li>During office hours, you must speak to the Staffing Coordinator directly.</li>
        <li>Do not leave sick call or cancellation messages by voicemail or text.</li>
        <li>A <strong>four-hour</strong> advance notice is requested whenever possible.</li>
        <li>If your replacement is 15 minutes late, call the office and remain with the client until arrangements are made.</li>
      </ul>
      <h4>Client Safety First</h4>
      <ul>
        <li>The client must not be left without arranged coverage.</li>
        <li>Direct phone contact helps the office act quickly.</li>
        <li>Repeated late notice may lead to discipline.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "How should you report a sick call for a scheduled shift?",
        options: ["Send a text message", "Leave a voicemail", "Call the staffing department or Administrator directly", "Email your supervisor"],
        correctAnswer: "Call the staffing department or Administrator directly",
        points: 1,
      },
      {
        questionText: "If your replacement is late, what should you do?",
        options: ["Leave after 5 minutes", "Call the office and remain with the client", "Call the replacement directly", "Leave a note for the client"],
        correctAnswer: "Call the office and remain with the client",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 12,
    title: "Employee Health, Injury Reporting, and Appearance",
    content: `
      <h3>Employee Health, Injury Reporting, and Appearance</h3>
      <ul>
        <li>If you become ill while on duty, call the office immediately and stay with the client until relief is arranged.</li>
        <li>On-the-job injuries must be reported right away and may require a First Report of Injury and physician clearance.</li>
        <li>The agency has an after-hours number for emergencies and urgent visit-related issues.</li>
        <li>Employees must be clean, well-groomed, and dressed in approved professional attire.</li>
      </ul>
      <h4>Appearance Examples</h4>
      <ul>
        <li><strong>Appropriate:</strong> Home Care Headquarters T-shirt, scrubs, khaki pants, collared shirt, tennis shoes.</li>
        <li><strong>Not appropriate:</strong> jeans, shorts, flip flops, torn clothing, unkempt appearance.</li>
      </ul>
      <p>Your appearance affects client trust and agency image.</p>
    `,
    quizQuestions: [
      {
        questionText: "Which of the following is NOT appropriate work attire?",
        options: ["Scrubs", "Khaki pants", "Flip flops", "Home Care Headquarters T-shirt"],
        correctAnswer: "Flip flops",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 13,
    title: "Breaks, Gifts, Relationships, and No Smoking",
    content: `
      <h3>Breaks, Gifts, Relationships, and No Smoking</h3>
      <ul>
        <li>Breaks are limited and may not always occur at regular times because client care comes first.</li>
        <li>Employees may not leave the client home during a break.</li>
        <li>You may not give or receive money or gifts to or from a client or family member.</li>
        <li>Romantic or sexual relationships with clients are strongly discouraged and may create serious problems.</li>
        <li>Field staff may never smoke in the client's home or office; alcohol and drug use on duty are strictly prohibited.</li>
      </ul>
      <h4>Boundary Reminder</h4>
      <ul>
        <li>Stay professional even when relationships feel friendly or familiar.</li>
        <li>Do not accept cash, favors, or gifts.</li>
        <li>Report uncomfortable behavior or pressure to management.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Can you accept gifts from clients or their family members?",
        options: ["Yes, if small value", "Yes, during holidays", "No, gifts are not allowed", "Only cash gifts are prohibited"],
        correctAnswer: "No, gifts are not allowed",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 14,
    title: "Emergencies, Incidents, Compensation, and Payroll",
    content: `
      <h3>Emergencies, Incidents, Compensation, and Payroll</h3>
      <ul>
        <li>Call <strong>911</strong> for life-threatening emergencies and then notify the office.</li>
        <li>Accidents and incidents must be reported immediately and followed by required written reporting.</li>
        <li>Wages are determined at hire; overtime must be <strong>approved in advance</strong>.</li>
        <li>The pay week runs Sunday through Saturday.</li>
        <li>Payroll depends on accurate timekeeping and agency-approved hours.</li>
      </ul>
      <h4>Critical Mindset</h4>
      <ul>
        <li>Emergency first: stabilize, notify, document.</li>
        <li>Never assume extra time will be paid without approval.</li>
        <li>Accurate records protect both client and employee.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What is the first step in a life-threatening emergency?",
        options: ["Call the office", "Call 911", "Document the incident", "Contact the family"],
        correctAnswer: "Call 911",
        points: 1,
      },
      {
        questionText: "Must overtime be approved before working extra hours?",
        options: ["No, just log it on your timesheet", "Yes, overtime must be approved in advance", "Only if over 10 hours", "It depends on the client"],
        correctAnswer: "Yes, overtime must be approved in advance",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 15,
    title: "Timesheets, Staffing Approval, and Reporting Requirements",
    content: `
      <h3>Timesheets, Staffing Approval, and Reporting Requirements</h3>
      <ul>
        <li>Timesheets must be complete, accurate, signed, and submitted on time.</li>
        <li>All staffing must be done through the office; unauthorized time may not be paid.</li>
        <li>Do not change work hours with the client on your own.</li>
        <li>Call the office immediately for: client injury, illness, dangerous behavior, hospitalization, unsafe home conditions, police involvement, or exposure incidents.</li>
        <li>Document what happened and follow office instructions carefully.</li>
      </ul>
      <h4>Examples That Must Be Reported</h4>
      <ul>
        <li>Client not at home or not answering the door.</li>
        <li>Change in condition or hospitalization.</li>
        <li>Illegal activity, structural damage, or unsanitary conditions in the home.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Can you change your work hours directly with the client?",
        options: ["Yes, if both agree", "No, all changes must go through the office", "Only for minor adjustments", "Yes, if you document it"],
        correctAnswer: "No, all changes must go through the office",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 16,
    title: "Abuse, Neglect, and Substance Abuse Reporting",
    content: `
      <h3>Abuse, Neglect, and Substance Abuse Reporting</h3>
      <ul>
        <li>All staff are instructed to <strong>report suspicions</strong> of abuse, neglect, or self-neglect.</li>
        <li>Clients are vulnerable and must be protected under state rules and agency policy.</li>
        <li>Confidentiality is maintained during abuse or neglect investigations.</li>
        <li>Employees involved in abuse or neglect may face disciplinary action according to policy and law.</li>
        <li>No employee may work under the influence of illegal drugs, alcohol, or controlled substances that affect safe performance.</li>
      </ul>
      <h4>Zero-Tolerance Areas</h4>
      <ul>
        <li>Client abuse or misuse is a <strong>termination-level</strong> issue.</li>
        <li>Failure to report vulnerable adult concerns is also serious.</li>
        <li>Safe care requires clear judgment and fitness for duty.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Is client abuse considered a termination-level issue?",
        options: ["No, it results in a warning", "Only on the second offense", "Yes, it is termination-level", "It depends on the situation"],
        correctAnswer: "Yes, it is termination-level",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 17,
    title: "Emergency and Disaster Preparedness",
    content: `
      <h3>Emergency and Disaster Preparedness</h3>
      <ul>
        <li>Disasters may include tornadoes, floods, fire, utility failure, toxic release, explosion, or building collapse.</li>
        <li>Employees should stay calm, stop, look, and listen, then follow instructions.</li>
        <li>Reassure clients, know exits, and avoid obstructing doors or tying up phone lines.</li>
        <li>Know your role and communicate with the office when a disaster affects service delivery.</li>
      </ul>
      <h4>General Disaster Instructions</h4>
      <ul>
        <li>Do not panic.</li>
        <li>Reassure the client.</li>
        <li>Use emergency resources when needed and protect safe evacuation paths.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What is the first thing you should do during a disaster at a client's home?",
        options: ["Leave the home immediately", "Stay calm, stop, look, and listen", "Call your family", "Wait for office instructions before acting"],
        correctAnswer: "Stay calm, stop, look, and listen",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 18,
    title: "Caregiver Role and Scope of Service",
    content: `
      <h3>Caregiver Role and Scope of Service</h3>
      <ul>
        <li>Caregivers are a central part of the home care program and support safety, maintenance, and daily living in the home.</li>
        <li>Services may include a combination of personal assistance and homemaker activities.</li>
        <li>Care is performed under the direction of the <strong>care plan</strong>.</li>
        <li>The caregiver role is supportive and service-based, not independent clinical decision-making.</li>
      </ul>
      <p>Caregiving is relationship-based, but it must remain professional.</p>
      <h4>Scope in One Sentence</h4>
      <ul>
        <li>Provide the authorized support the client needs.</li>
        <li>Stay within the care plan and agency rules.</li>
        <li>Report when needs change.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Care is performed under the direction of:",
        options: ["The client's family", "The caregiver's judgment", "The care plan", "The client's preferences"],
        correctAnswer: "The care plan",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 19,
    title: "Examples of Allowed Caregiver Duties",
    content: `
      <h3>Examples of Allowed Caregiver Duties</h3>
      <ul>
        <li>Bathing, partial bathing, oral hygiene, hair care, and dressing assistance.</li>
        <li>Cooking, companionship, cleaning, transportation, and support with daily living tasks.</li>
        <li>Mobility, nutrition, elimination assistance, medication reminders, safety support, decluttering, and help with correspondence.</li>
        <li>Tasks must always match the care plan and the client's authorized needs.</li>
      </ul>
      <h4>Think of These as Authorized Support Tasks</h4>
      <ul>
        <li>Help the client do what they are allowed and able to do safely.</li>
        <li>Encourage dignity and independence when possible.</li>
        <li>Document what you provided.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Caregiver tasks must always match:",
        options: ["What the client requests", "The care plan and authorized needs", "What the family prefers", "Your own professional judgment"],
        correctAnswer: "The care plan and authorized needs",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 20,
    title: "Care Plan Expectations",
    content: `
      <h3>Care Plan Expectations</h3>
      <ul>
        <li>Provide care <strong>exactly</strong> as outlined in the care plan.</li>
        <li>If the client or family asks for care not listed, <strong>contact the office immediately</strong>.</li>
        <li>Do not provide unauthorized care without Home Care Headquarters approval.</li>
        <li>Documentation must reflect the care plan goals and the services actually provided.</li>
        <li>Records are legal documents.</li>
      </ul>
      <h4>Key Rules</h4>
      <ul>
        <li>If it is not on the care plan, call the office before doing it.</li>
        <li>The care plan protects the client, the employee, and the agency.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What should you do if a client asks for care not listed on the care plan?",
        options: ["Provide it anyway", "Contact the office immediately", "Ask the family for permission", "Document it and continue"],
        correctAnswer: "Contact the office immediately",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 21,
    title: "Medication Policy: Strict Limits",
    content: `
      <h3>Medication Policy: Strict Limits</h3>
      <ul>
        <li>Home Care Headquarters staff are <strong>not authorized to administer medication</strong>.</li>
        <li>Allowed actions are limited to bringing medication to the client, placing it on a level surface, opening the container, and offering water or fluid.</li>
        <li>Employees may not place medication in the client's hand, remove it from the container, give shots, place it in the mouth, under the tongue, or in suppository form.</li>
        <li>The handbook is strict: medication violations may result in <strong>immediate termination</strong>.</li>
      </ul>
      <h4>Medication Line You Must Not Cross</h4>
      <ul>
        <li>Reminder is not administration.</li>
        <li>Set-up is not giving the medication.</li>
        <li>If the client cannot self-administer, notify the office.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Can Home Care Headquarters caregivers administer medication to clients?",
        options: ["Yes, if prescribed", "Yes, for OTC medications", "No, caregivers are not authorized to administer medication", "Only with family permission"],
        correctAnswer: "No, caregivers are not authorized to administer medication",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 22,
    title: "Medication: Hand-over-Hand and OTC Limits",
    content: `
      <h3>Medication: Hand-over-Hand and OTC Limits</h3>
      <ul>
        <li>The handbook says Home Care Headquarters does <strong>not allow hand-over-hand medication support</strong> under agency policy.</li>
        <li>If a client cannot take their own medication, it is the caregiver's responsibility to inform the office.</li>
        <li>The policy also restricts over-the-counter and topical items such as cough drops, creams, salves, and natural remedies.</li>
        <li>Do not assume something is allowed just because it is common or sold without a prescription.</li>
      </ul>
      <h4>Safe Response</h4>
      <ul>
        <li>Pause when medication requests come up.</li>
        <li>Inform the office immediately if the client needs more than a reminder or set-up.</li>
        <li>When unsure, ask before acting.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Is hand-over-hand medication support allowed?",
        options: ["Yes, with training", "Yes, if the client requests it", "No, it is not allowed under agency policy", "Only for OTC medication"],
        correctAnswer: "No, it is not allowed under agency policy",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 23,
    title: "Documentation Rules",
    content: `
      <h3>Documentation Rules</h3>
      <ul>
        <li>All care must be documented <strong>at the time</strong> it is provided.</li>
        <li>Review the care plan or instruction summary each time you enter the home for updates or changes.</li>
        <li>Report condition changes, client absence, or failure to answer the door immediately.</li>
        <li>Write neatly and legibly; if an error is made, line through once, correct it, date and initial it.</li>
        <li><strong>Never</strong> erase, use white-out, or write over prior notes; use a late entry if needed.</li>
      </ul>
      <p>Accurate records support safe care, payroll, and compliance.</p>
      <h4>Documentation Mindset</h4>
      <ul>
        <li>Chart what happened, not what you wish happened.</li>
        <li>Document promptly while details are fresh.</li>
        <li>Your notes are part of the <strong>legal care record</strong>.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What should you do if you make an error in your documentation?",
        options: ["Use white-out", "Erase and rewrite", "Line through once, correct, date and initial", "Start a new page"],
        correctAnswer: "Line through once, correct, date and initial",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 24,
    title: "Background Checks and Employee Updates",
    content: `
      <h3>Background Checks and Employee Updates</h3>
      <ul>
        <li>Caregivers must complete a criminal background check through the Arkansas State Police before being eligible to provide services.</li>
        <li>Serious crimes, abuse or neglect findings, or related disqualifying issues may affect employment eligibility.</li>
        <li>Reference checks are conducted as part of hiring.</li>
        <li>Employees are required to document client hospitalization, cancellations, client not home, return from hospital, and double-booked staff situations.</li>
        <li>Time-off requests should be submitted at least two weeks in advance, and employees must report address, phone, or email changes to the office.</li>
      </ul>
      <h4>Why These Updates Matter</h4>
      <ul>
        <li>Hiring screens protect vulnerable clients.</li>
        <li>Operational updates help the office keep records, schedules, and services accurate.</li>
        <li>Communication gaps can quickly become payroll or compliance issues.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What background check is required before caregivers can provide services?",
        options: ["Federal FBI check", "Criminal background check through the Arkansas State Police", "Credit check", "No background check is required"],
        correctAnswer: "Criminal background check through the Arkansas State Police",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 25,
    title: "Cell Phone Policy and Boundaries",
    content: `
      <h3>Cell Phone Policy and Boundaries</h3>
      <ul>
        <li>Cell phone use of any kind is <strong>prohibited</strong> in the client home except for emergencies or communication with the office.</li>
        <li>Do not give clients your personal cell phone number unless agency-approved circumstances require temporary contact, such as reporting you are late or clarifying an errand.</li>
        <li>If a client calls you directly, the handbook instructs you to decline the call and direct the client back to the office.</li>
        <li>Keep the client relationship professional and avoid discussing your personal life, finances, health, other clients, complaints, or medical remedies.</li>
      </ul>
      <h4>Conversation Boundaries</h4>
      <ul>
        <li>Friendly is okay; personal is not.</li>
        <li>Redirect sensitive topics back to the office or to the client's physician when appropriate.</li>
        <li>Keep conversation centered on the client.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "When is cell phone use allowed in the client's home?",
        options: ["Anytime during breaks", "For personal calls if brief", "Only for emergencies or office communication", "Never"],
        correctAnswer: "Only for emergencies or office communication",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 26,
    title: "EVV Overview: Why It Matters",
    content: `
      <h3>EVV Overview: Why It Matters</h3>
      <ul>
        <li>Electronic Visit Verification, or EVV, confirms that the <strong>correct caregiver</strong> was at the <strong>correct client home</strong> at the <strong>correct time</strong>.</li>
        <li>EVV supports payroll accuracy, service verification, and agency compliance.</li>
        <li>EVV should match the work you actually performed, the shift you were actually approved to work, and the documentation you actually completed. EVV is part of the care record, not just a time clock.</li>
        <li>Treat EVV with the same seriousness as your care notes and timesheets.</li>
      </ul>
      <h4>EVV in Plain Language</h4>
      <ul>
        <li>Right client, right caregiver, right location, right time.</li>
        <li>Accurate EVV protects the employee and the agency.</li>
        <li>A missing EVV record creates bigger documentation problems.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What does EVV stand for?",
        options: ["Employee Visit Verification", "Electronic Visit Verification", "Electronic Voice Verification", "Employee Value Verification"],
        correctAnswer: "Electronic Visit Verification",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 27,
    title: "EVV: If You Cannot Clock In or Out",
    content: `
      <h3>EVV: If You Cannot Clock In or Out</h3>
      <ul>
        <li>If you are unable to clock in or clock out, <strong>contact the office immediately at 870-290-7019</strong>.</li>
        <li>This instruction applies <strong>regardless of the day and time</strong>.</li>
        <li>Do not wait until the next morning, the next business day, or the end of the week.</li>
        <li>Your EVV record should reflect the actual shift worked and should line up with office-approved hours.</li>
        <li>Do not create unauthorized time, guess at times, or assume the issue can be fixed later without reporting it.</li>
      </ul>
      <h4>Exact Required Instruction</h4>
      <ul>
        <li>Unable to clock in or out? Call <strong>870-290-7019</strong> immediately.</li>
        <li>Regardless of the day and time.</li>
        <li>Report first. Do not delay.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "If you cannot clock in or out, what number should you call immediately?",
        options: ["911", "870-290-7019", "Your supervisor's personal number", "The client's phone number"],
        correctAnswer: "870-290-7019",
        points: 1,
      },
      {
        questionText: "When should you call the office about an EVV issue?",
        options: ["The next business day", "At the end of the week", "Immediately, regardless of day or time", "Only during office hours"],
        correctAnswer: "Immediately, regardless of day or time",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 28,
    title: "Closing Acknowledgment",
    content: `
      <h3>Closing Acknowledgment</h3>
      <ul>
        <li>At the end of the handbook, employees acknowledge that they received the handbook and understand it is a guide, not a contract.</li>
        <li>By signing, employees also acknowledge responsibility to follow policy and protect confidential information.</li>
        <li>The key reminders are simple: follow the care plan, maintain confidentiality, keep professional boundaries, document accurately, use EVV correctly, and call the office when unsure.</li>
        <li><em>When in doubt, do not guess. Pause and ask for direction.</em></li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "The employee handbook is:",
        options: ["A binding contract", "A guide to policies and expectations", "Optional reading", "Only for new hires"],
        correctAnswer: "A guide to policies and expectations",
        points: 1,
      },
    ],
  },
];
