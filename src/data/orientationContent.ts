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
    title: "Foundations: Purpose & Standards",
    content: `
      <h3>Purpose of the Handbook</h3>
      <ul>
        <li>The handbook is a guide to agency policies, expectations, and standards.</li>
        <li>It is <strong>not a contract</strong> of employment and does not guarantee employment for any set period.</li>
        <li>Employment is <strong>at-will</strong>: the employee or the agency may end employment at any time, subject to law.</li>
        <li>Policies may be changed, modified, or updated by Home Care Network as needed.</li>
        <li>Employees are expected to know current policy and follow it every shift.</li>
      </ul>
      <h3>Our Standard of Care and Professional Conduct</h3>
      <ul>
        <li>Home Care Network is dedicated to competent, professional service for every client.</li>
        <li>Employees must act with respect, safety, honesty, and professionalism at all times.</li>
        <li>Every shift reflects on the agency, the client experience, and your job performance.</li>
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
        questionText: "Is the employee handbook a contract of employment?",
        options: ["Yes, it guarantees employment", "No, it is a guide to policies and expectations", "Only during probation", "Only for full-time employees"],
        correctAnswer: "No, it is a guide to policies and expectations",
        points: 1,
      },
      {
        questionText: "What type of employment does Home Care Network practice?",
        options: ["Contract-based", "At-will employment", "Union-based", "Fixed-term only"],
        correctAnswer: "At-will employment",
        points: 1,
      },
      {
        questionText: "What should you do if you are unsure about a policy?",
        options: ["Ask a coworker", "Guess and do your best", "Call the office", "Ignore it"],
        correctAnswer: "Call the office",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 2,
    title: "Hiring, Non-Discrimination & Harassment",
    content: `
      <h3>Selection, Hiring, and Non-Discrimination</h3>
      <ul>
        <li>Employees must meet applicable licensing and regulatory standards.</li>
        <li>Hiring and placement decisions are based on position-related criteria.</li>
        <li>The agency will not discriminate based on race, color, religion, sex, disability, age, marital status, or similar protected status.</li>
        <li>Job placement is based on fit for the work.</li>
      </ul>
      <h3>Harassment, Complaints, and Grievances</h3>
      <ul>
        <li>Harassment based on protected status, including sexual harassment, is <strong>prohibited</strong>.</li>
        <li>Unwelcome advances, offensive conduct, retaliation, or hostile behavior must not occur in the workplace.</li>
        <li>Employees who believe they experienced harassment should report it to the office immediately.</li>
        <li>Complaints may be put in writing and investigated by the agency.</li>
      </ul>
      <h3>Confidentiality and Client Privacy</h3>
      <ul>
        <li>Client and family information is confidential and protected by law and agency policy.</li>
        <li>Disclosing confidential information is grounds for <strong>immediate termination</strong>.</li>
        <li>Privacy applies in conversation, documentation, text messages, calls, and social settings.</li>
        <li>If someone is not authorized to know, do not share.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What is the consequence for disclosing confidential client information?",
        options: ["Written warning", "Suspension", "Immediate termination", "Probation"],
        correctAnswer: "Immediate termination",
        points: 1,
      },
      {
        questionText: "What should you do if you experience harassment?",
        options: ["Ignore it", "Report it to the office immediately", "Confront the person yourself", "Wait until your annual review"],
        correctAnswer: "Report it to the office immediately",
        points: 1,
      },
      {
        questionText: "Hiring decisions at Home Care Network are based on:",
        options: ["Personal connections", "Position-related criteria", "Seniority only", "Random selection"],
        correctAnswer: "Position-related criteria",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 3,
    title: "Probation, Evaluations & Employment Changes",
    content: `
      <h3>Probation, Evaluations, and In-Service Education</h3>
      <ul>
        <li>The first <strong>1040 hours</strong> of employment are probationary.</li>
        <li>Employees may be reviewed at the end of the 90-day probationary period.</li>
        <li>Annual evaluations are documented and kept in the employee personnel file.</li>
        <li><strong>Twelve hours</strong> of in-service education are required each year to maintain employment.</li>
        <li>Training may be delivered through lectures, videos, email, text, and quizzes.</li>
      </ul>
      <h3>Resignation, Termination, and Arbitration</h3>
      <ul>
        <li>Field staff are asked to give <strong>two weeks</strong> written notice; administrative staff: <strong>three weeks</strong>.</li>
        <li>Two no-call/no-shows may result in <strong>automatic termination</strong>.</li>
        <li>Grounds for termination include: dishonesty, theft, insubordination, abuse, falsification of records, intoxication on duty, and confidentiality violations.</li>
        <li>Employees terminated for disciplinary action are not eligible for rehire.</li>
      </ul>
      <h3>Leave of Absence</h3>
      <ul>
        <li>Leave requests must be submitted in writing at least <strong>two weeks</strong> in advance.</li>
        <li>If the employee does not return when leave expires, employment may be terminated.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "How many hours of in-service education are required each year?",
        options: ["6 hours", "8 hours", "12 hours", "24 hours"],
        correctAnswer: "12 hours",
        points: 1,
      },
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
    sectionNumber: 4,
    title: "Scheduling, Sick Calls & Health Policies",
    content: `
      <h3>Sick Calls, Cancelled Visits, and Replacement Staff</h3>
      <ul>
        <li>If you cannot work a scheduled shift, you must <strong>call the staffing department or Administrator directly</strong>.</li>
        <li>Do not leave sick call or cancellation messages by voicemail or text.</li>
        <li>A <strong>four-hour</strong> advance notice is requested whenever possible.</li>
        <li>If your replacement is 15 minutes late, call the office and remain with the client until arrangements are made.</li>
        <li>The client must not be left without arranged coverage.</li>
      </ul>
      <h3>Employee Health, Injury Reporting, and Appearance</h3>
      <ul>
        <li>If you become ill while on duty, call the office immediately and stay with the client until relief is arranged.</li>
        <li>On-the-job injuries must be reported right away.</li>
        <li>Employees must be clean, well-groomed, and dressed in approved professional attire.</li>
        <li><strong>Appropriate:</strong> Home Care Network T-shirt, scrubs, khaki pants, tennis shoes.</li>
        <li><strong>Not appropriate:</strong> jeans, shorts, flip flops, torn clothing.</li>
      </ul>
      <h3>Breaks, Gifts, Relationships, and No Smoking</h3>
      <ul>
        <li>You may not leave the client home during a break.</li>
        <li>You may not give or receive money or gifts to or from a client or family member.</li>
        <li>Smoking in the client's home is <strong>never</strong> allowed; alcohol and drug use on duty are strictly prohibited.</li>
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
        questionText: "Can you accept gifts from clients or their family members?",
        options: ["Yes, if small value", "Yes, during holidays", "No, gifts are not allowed", "Only cash gifts are prohibited"],
        correctAnswer: "No, gifts are not allowed",
        points: 1,
      },
      {
        questionText: "If your replacement is late, what should you do?",
        options: ["Leave after 5 minutes", "Call the office and remain with the client", "Call the replacement directly", "Leave a note for the client"],
        correctAnswer: "Call the office and remain with the client",
        points: 1,
      },
      {
        questionText: "Which of the following is NOT appropriate work attire?",
        options: ["Scrubs", "Khaki pants", "Flip flops", "Home Care Network T-shirt"],
        correctAnswer: "Flip flops",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 5,
    title: "Emergencies, Incidents & Payroll",
    content: `
      <h3>Emergencies, Incidents, Compensation, and Payroll</h3>
      <ul>
        <li>Call <strong>911</strong> for life-threatening emergencies and then notify the office.</li>
        <li>Accidents and incidents must be reported immediately and followed by required written reporting.</li>
        <li>Wages are determined at hire; overtime must be <strong>approved in advance</strong>.</li>
        <li>The pay week runs Sunday through Saturday.</li>
        <li>Payroll depends on accurate timekeeping and agency-approved hours.</li>
      </ul>
      <h3>Timesheets, Staffing Approval, and Reporting Requirements</h3>
      <ul>
        <li>Timesheets must be complete, accurate, signed, and submitted on time.</li>
        <li>All staffing must be done through the office; unauthorized time may not be paid.</li>
        <li>Do not change work hours with the client on your own.</li>
        <li>Call the office immediately for: client injury, illness, dangerous behavior, hospitalization, unsafe home conditions, police involvement, or exposure incidents.</li>
      </ul>
      <h4>Examples That Must Be Reported</h4>
      <ul>
        <li>Client not at home or not answering the door</li>
        <li>Change in condition or hospitalization</li>
        <li>Illegal activity, structural damage, or unsanitary conditions in the home</li>
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
      {
        questionText: "Can you change your work hours directly with the client?",
        options: ["Yes, if both agree", "No, all changes must go through the office", "Only for minor adjustments", "Yes, if you document it"],
        correctAnswer: "No, all changes must go through the office",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 6,
    title: "Care Delivery: Scope, Duties & Care Plans",
    content: `
      <h3>Abuse, Neglect, and Substance Abuse Reporting</h3>
      <ul>
        <li>All staff are instructed to <strong>report suspicions</strong> of abuse, neglect, or self-neglect.</li>
        <li>Client abuse or misuse is a <strong>termination-level</strong> issue.</li>
        <li>No employee may work under the influence of illegal drugs, alcohol, or controlled substances.</li>
      </ul>
      <h3>Caregiver Role and Scope of Service</h3>
      <ul>
        <li>Services may include personal assistance and homemaker activities.</li>
        <li>Care is performed under the direction of the <strong>care plan</strong>.</li>
        <li>The caregiver role is supportive and service-based, not independent clinical decision-making.</li>
      </ul>
      <h3>Examples of Allowed Caregiver Duties</h3>
      <ul>
        <li>Bathing, oral hygiene, hair care, dressing assistance</li>
        <li>Cooking, companionship, cleaning, transportation</li>
        <li>Mobility, nutrition, elimination assistance, medication reminders, safety support</li>
        <li>Tasks must always match the care plan</li>
      </ul>
      <h3>Care Plan Expectations</h3>
      <ul>
        <li>Provide care <strong>exactly</strong> as outlined in the care plan.</li>
        <li>If the client or family asks for care not listed, <strong>contact the office immediately</strong>.</li>
        <li>Do not provide unauthorized care without Home Care Network approval.</li>
        <li>Documentation must reflect the care plan goals and the services actually provided.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What should you do if a client asks for care not listed on the care plan?",
        options: ["Provide it anyway", "Contact the office immediately", "Ask the family for permission", "Document it and continue"],
        correctAnswer: "Contact the office immediately",
        points: 1,
      },
      {
        questionText: "Is client abuse considered a termination-level issue?",
        options: ["No, it results in a warning", "Only on the second offense", "Yes, it is termination-level", "It depends on the situation"],
        correctAnswer: "Yes, it is termination-level",
        points: 1,
      },
      {
        questionText: "Care is performed under the direction of:",
        options: ["The client's family", "The caregiver's judgment", "The care plan", "The client's preferences"],
        correctAnswer: "The care plan",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 7,
    title: "Medication, Documentation & Cell Phones",
    content: `
      <h3>Medication Policy: Strict Limits</h3>
      <ul>
        <li>Home Care Network staff are <strong>not authorized to administer medication</strong>.</li>
        <li>Allowed actions: bringing medication to the client, placing it on a level surface, opening the container, and offering water.</li>
        <li><strong>Not allowed:</strong> placing medication in the client's hand, removing from container, giving shots, placing in mouth, under tongue, or suppository form.</li>
        <li>Medication violations may result in <strong>immediate termination</strong>.</li>
        <li>Hand-over-hand medication support is <strong>not allowed</strong>.</li>
        <li>OTC items including cough drops, creams, and natural remedies are also restricted.</li>
      </ul>
      <h3>Documentation Rules</h3>
      <ul>
        <li>All care must be documented <strong>at the time</strong> it is provided.</li>
        <li>Review the care plan each time you enter the home.</li>
        <li>Write neatly; if an error is made, line through once, correct, date and initial.</li>
        <li><strong>Never</strong> erase, use white-out, or write over prior notes.</li>
        <li>Your notes are part of the <strong>legal care record</strong>.</li>
      </ul>
      <h3>Cell Phone Policy and Boundaries</h3>
      <ul>
        <li>Cell phone use is <strong>prohibited</strong> in the client home except for emergencies or office communication.</li>
        <li>Do not give clients your personal cell phone number unless agency-approved.</li>
        <li>Keep conversation centered on the client; avoid discussing personal life, finances, or other clients.</li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "Can Home Care Network caregivers administer medication to clients?",
        options: ["Yes, if prescribed", "Yes, for OTC medications", "No, caregivers are not authorized to administer medication", "Only with family permission"],
        correctAnswer: "No, caregivers are not authorized to administer medication",
        points: 1,
      },
      {
        questionText: "What should you do if you make an error in your documentation?",
        options: ["Use white-out", "Erase and rewrite", "Line through once, correct, date and initial", "Start a new page"],
        correctAnswer: "Line through once, correct, date and initial",
        points: 1,
      },
      {
        questionText: "When is cell phone use allowed in the client's home?",
        options: ["Anytime during breaks", "For personal calls if brief", "Only for emergencies or office communication", "Never"],
        correctAnswer: "Only for emergencies or office communication",
        points: 1,
      },
      {
        questionText: "Is hand-over-hand medication support allowed?",
        options: ["Yes, with training", "Yes, if the client requests it", "No, it is not allowed under agency policy", "Only for OTC medication"],
        correctAnswer: "No, it is not allowed under agency policy",
        points: 1,
      },
    ],
  },
  {
    sectionNumber: 8,
    title: "EVV Training & Closing Acknowledgment",
    content: `
      <h3>EVV Overview: Why It Matters</h3>
      <ul>
        <li>Electronic Visit Verification (EVV) confirms that the <strong>correct caregiver</strong> was at the <strong>correct client home</strong> at the <strong>correct time</strong>.</li>
        <li>EVV supports payroll accuracy, service verification, and agency compliance.</li>
        <li>EVV should match the work you actually performed, the shift you were approved to work, and the documentation you completed.</li>
        <li>Treat EVV with the same seriousness as your care notes and timesheets.</li>
      </ul>
      <h3>EVV: If You Cannot Clock In or Out</h3>
      <ul>
        <li>If you are unable to clock in or clock out, <strong>contact the office immediately at 870-290-7019</strong>.</li>
        <li>This applies <strong>regardless of the day and time</strong>.</li>
        <li>Do not wait until the next morning, business day, or end of the week.</li>
        <li>Do not create unauthorized time, guess at times, or assume the issue can be fixed later.</li>
      </ul>
      <h3>Closing Acknowledgment</h3>
      <ul>
        <li>By completing this orientation, you acknowledge that you received the handbook and understand it is a guide, not a contract.</li>
        <li>You acknowledge responsibility to follow policy and protect confidential information.</li>
        <li><strong>Key reminders:</strong> Follow the care plan, maintain confidentiality, keep professional boundaries, document accurately, use EVV correctly, and call the office when unsure.</li>
        <li><em>When in doubt, do not guess. Pause and ask for direction.</em></li>
      </ul>
    `,
    quizQuestions: [
      {
        questionText: "What does EVV stand for?",
        options: ["Employee Visit Verification", "Electronic Visit Verification", "Electronic Voice Verification", "Employee Value Verification"],
        correctAnswer: "Electronic Visit Verification",
        points: 1,
      },
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
      {
        questionText: "The employee handbook is:",
        options: ["A binding contract", "A guide to policies and expectations", "Optional reading", "Only for new hires"],
        correctAnswer: "A guide to policies and expectations",
        points: 1,
      },
    ],
  },
];
