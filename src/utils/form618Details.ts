// Every DMS-618 (8/23) answer the printing side can place on the form.
// Option strings must match the checkbox keys in form618Pdf.ts exactly.
import type { AdlLevel, Form618PdfInput, HelpLevel } from "./form618Pdf";
import { maskDateInput } from "@/components/forms/DateMaskInput";

export const PLAN_STATUS_OPTIONS = ["Initial", "Revision", "Renewal"] as const;

export const RESIDES_OPTIONS = [
  "Alone",
  "With Relatives",
  "Boarding Home",
  "Group Home",
  "Community-Based Residential Home",
  "Residential Care Facility",
  "Other",
] as const;

export const SERVICE_LOCATION_OPTIONS = [
  "Private Residence",
  "Residential Care Facility",
  "School",
  "DDS Facility",
  "Other",
] as const;

export const MENTAL_STATUS_OPTIONS = [
  "Clear",
  "Hyperactive",
  "Somewhat confused",
  "Withdrawn",
  "Moderately confused",
  "Needs restraint",
  "Markedly confused",
  "Needs supervision for personal safety",
] as const;

export const PHYSICAL_GROUPS: { group: string; options: string[] }[] = [
  {
    group: "Bedridden",
    options: [
      "Bedfast",
      "Requires turning in bed",
      "Bed to chair with help",
      "Bed to chair without help",
      "Must be lifted into chair",
    ],
  },
  {
    group: "Ambulation",
    options: [
      "Walks alone",
      "Walks with device",
      "Walks with help",
      "Wheelchair (self)",
      "Wheelchair (push)",
      "Motorized chair",
    ],
  },
  {
    group: "Continence",
    options: ["Catheter", "Colostomy", "Incontinent", "Bladder", "Bowels"],
  },
  {
    group: "Bowel / bladder training",
    options: ["Cannot Train", "Trained", "Needs Training"],
  },
];

export const BATHING_TYPE_OPTIONS = ["Tub", "Shower", "Bed"] as const;

export const GROOMING_ROWS = ["Bathing", "Dressing", "Shaving", "Care of hair"] as const;
export const HELP_LEVELS: HelpLevel[] = ["No Help", "Partial Help", "Total Help"];

export const EATING_PARENT = "Needs help with eating:";
export const EATING_OPTIONS = [
  "Has physical ability to eat without help.",
  "Needs partial help to eat.",
  EATING_PARENT,
] as const;
/** Only available when the parent option above is selected. */
export const EATING_SUB_OPTIONS = [
  "Special diet.",
  "Cannot cut food into bite-size pieces.",
  "Cannot bring food from plate to mouth.",
] as const;

export const MEALS_OPTIONS = [
  "Has physical ability to cook or prepare food without help.",
  "Needs partial help with meal preparation.",
  "Physically incapable of cooking or preparing meals.",
] as const;

export const ADL_COLUMNS = ["Laundry", "Housekeeping", "Shopping"] as const;
export const ADL_LEVELS: AdlLevel[] = [
  "Needs no help",
  "Needs partial help",
  "Physically incapable",
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const DIAGNOSIS_ROWS = 6;
export const PROCEDURE_ROWS = 3;

export interface Form618Details {
  medicaidId: string;
  dateOfBirth: string;
  county: string;
  phone: string;
  guardianName: string;
  mailingAddress: string;
  planStatus: string;
  residesType: string;
  residesOther1: string;
  residesOther2: string;
  pcpName: string;
  pcpProviderId: string;
  pcpLastExamDate: string;
  serviceLocationType: string;
  serviceLocationOther: string;
  serviceAddress1: string;
  serviceAddress2: string;
  startOfCareOriginal: string;
  startOfCarePlan: string;
  currentAssessmentDate: string;
  assessingRn: string;
  referralOrderDate: string;
  diagnoses: { icd_code: string; description: string }[];
  mentalStatus: string[];
  mentalStatusComments: string;
  procedures: { code: string; hours: string; minutes: string; frequency: string }[];
  physical: string[];
  bathingTypes: string[];
  grooming: Record<string, string>;
  eating: string[];
  meals: string[];
  adl: Record<string, string>;
  alternateResources: string;
  serviceTime: { max: string[]; min: string[]; weeklyMax: string; weeklyMin: string };
  sectionXIIIPlan: string;
  extensionRequested: boolean;
  extension: {
    additional_service_time_increments: string;
    begin_date_of_service: string;
    end_date_of_service: string;
  };
}

export function emptyForm618Details(): Form618Details {
  return {
    medicaidId: "",
    dateOfBirth: "",
    county: "",
    phone: "",
    guardianName: "",
    mailingAddress: "",
    planStatus: "",
    residesType: "",
    residesOther1: "",
    residesOther2: "",
    pcpName: "",
    pcpProviderId: "",
    pcpLastExamDate: "",
    serviceLocationType: "",
    serviceLocationOther: "",
    serviceAddress1: "",
    serviceAddress2: "",
    startOfCareOriginal: "",
    startOfCarePlan: "",
    currentAssessmentDate: "",
    assessingRn: "",
    referralOrderDate: "",
    diagnoses: Array.from({ length: DIAGNOSIS_ROWS }, () => ({ icd_code: "", description: "" })),
    mentalStatus: [],
    mentalStatusComments: "",
    procedures: Array.from({ length: PROCEDURE_ROWS }, () => ({
      code: "",
      hours: "",
      minutes: "",
      frequency: "",
    })),
    physical: [],
    bathingTypes: [],
    grooming: {},
    eating: [],
    meals: [],
    adl: {},
    alternateResources: "",
    serviceTime: { max: Array(7).fill(""), min: Array(7).fill(""), weeklyMax: "", weeklyMin: "" },
    sectionXIIIPlan: "",
    extensionRequested: false,
    extension: {
      additional_service_time_increments: "",
      begin_date_of_service: "",
      end_date_of_service: "",
    },
  };
}

const str = (v: any) => (typeof v === "string" ? v : "");

/** Date answers that must display and print as MM/DD/YYYY. */
const DATE_KEYS = [
  "dateOfBirth",
  "pcpLastExamDate",
  "startOfCareOriginal",
  "startOfCarePlan",
  "currentAssessmentDate",
  "referralOrderDate",
] as const;

/** Weekly totals are always the sum of the daily row — never typed by hand. */
function sumTimeRow(row: string[]): string {
  let total = 0;
  let any = false;
  for (const cell of row) {
    const n = Number(String(cell ?? "").replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(n) && String(cell ?? "").trim() !== "") {
      total += n;
      any = true;
    }
  }
  if (!any) return "";
  return String(Math.round(total * 100) / 100);
}

export function weeklyServiceTimeTotals(details: Form618Details): {
  weeklyMax: string;
  weeklyMin: string;
} {
  return {
    weeklyMax: sumTimeRow(details.serviceTime.max),
    weeklyMin: sumTimeRow(details.serviceTime.min),
  };
}
const strArray = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

export function normalizeForm618Details(value: any): Form618Details {
  const base = emptyForm618Details();
  if (!value || typeof value !== "object") return base;

  for (const key of [
    "medicaidId",
    "dateOfBirth",
    "county",
    "phone",
    "guardianName",
    "mailingAddress",
    "planStatus",
    "residesType",
    "residesOther1",
    "residesOther2",
    "pcpName",
    "pcpProviderId",
    "pcpLastExamDate",
    "serviceLocationType",
    "serviceLocationOther",
    "serviceAddress1",
    "serviceAddress2",
    "startOfCareOriginal",
    "startOfCarePlan",
    "currentAssessmentDate",
    "assessingRn",
    "referralOrderDate",
    "mentalStatusComments",
    "alternateResources",
    "sectionXIIIPlan",
  ] as const) {
    (base as any)[key] = str(value[key]);
  }

  // Values saved before date auto-formatting existed (e.g. "02011979") are repaired here.
  for (const key of DATE_KEYS) {
    base[key] = maskDateInput(base[key]);
  }

  base.diagnoses = base.diagnoses.map((row, i) => ({
    icd_code: str(value?.diagnoses?.[i]?.icd_code),
    description: str(value?.diagnoses?.[i]?.description),
  }));
  base.procedures = base.procedures.map((row, i) => ({
    code: str(value?.procedures?.[i]?.code),
    hours: str(value?.procedures?.[i]?.hours),
    minutes: str(value?.procedures?.[i]?.minutes),
    frequency: str(value?.procedures?.[i]?.frequency),
  }));

  base.mentalStatus = strArray(value.mentalStatus);
  base.physical = strArray(value.physical);
  base.bathingTypes = strArray(value.bathingTypes);
  base.eating = strArray(value.eating);
  base.meals = strArray(value.meals);

  for (const row of GROOMING_ROWS) base.grooming[row] = str(value?.grooming?.[row]);
  for (const col of ADL_COLUMNS) base.adl[col] = str(value?.adl?.[col]);

  base.serviceTime = {
    max: Array.from({ length: 7 }, (_, i) => str(value?.serviceTime?.max?.[i])),
    min: Array.from({ length: 7 }, (_, i) => str(value?.serviceTime?.min?.[i])),
    weeklyMax: "",
    weeklyMin: "",
  };
  // Weekly totals are always derived, never trusted from the saved record.
  base.serviceTime = { ...base.serviceTime, ...weeklyServiceTimeTotals(base) };

  base.extensionRequested = value.extensionRequested === true;
  base.extension = {
    additional_service_time_increments: str(
      value?.extension?.additional_service_time_increments,
    ),
    begin_date_of_service: str(value?.extension?.begin_date_of_service),
    end_date_of_service: str(value?.extension?.end_date_of_service),
  };
  return base;
}

/** Required fields, as specified by the agency. Everything else is optional. */
export function form618MissingRequired(
  details: Form618Details,
  clientName: string,
): string[] {
  const missing: string[] = [];
  if (!clientName.trim()) missing.push("Client Name");
  if (!details.medicaidId.trim()) missing.push("Medicaid ID");
  if (!details.dateOfBirth.trim()) missing.push("Date of Birth");
  if (!details.planStatus.trim()) missing.push("Service Plan Status");
  if (!details.startOfCareOriginal.trim()) missing.push("Start of Care Date (original)");
  if (!details.currentAssessmentDate.trim()) missing.push("Current Assessment Date");
  if (!details.assessingRn.trim()) missing.push("Assessing RN");
  return missing;
}

/** Map the on-screen answers onto the printing input. */
export function form618DetailsToPdfInput(
  details: Form618Details,
): Partial<Form618PdfInput> {
  const grooming: Record<string, HelpLevel> = {};
  for (const [row, level] of Object.entries(details.grooming)) {
    if (level) grooming[row] = level as HelpLevel;
  }
  const adl: Record<string, AdlLevel> = {};
  for (const [col, level] of Object.entries(details.adl)) {
    if (level) adl[col] = level as AdlLevel;
  }
  return {
    medicaidId: details.medicaidId,
    dateOfBirth: details.dateOfBirth,
    county: details.county,
    phone: details.phone,
    guardianName: details.guardianName,
    mailingAddress: details.mailingAddress,
    planStatus: (details.planStatus || undefined) as Form618PdfInput["planStatus"],
    residesType: details.residesType,
    residesOther1: details.residesOther1,
    residesOther2: details.residesOther2,
    pcpName: details.pcpName,
    pcpProviderId: details.pcpProviderId,
    pcpLastExamDate: details.pcpLastExamDate,
    serviceLocationType: details.serviceLocationType,
    serviceLocationOther: details.serviceLocationOther,
    serviceAddress1: details.serviceAddress1,
    serviceAddress2: details.serviceAddress2,
    startOfCareOriginal: details.startOfCareOriginal,
    startOfCarePlan: details.startOfCarePlan,
    referralOrderDate: details.referralOrderDate,
    diagnoses: details.diagnoses.filter((d) => d.icd_code.trim() || d.description.trim()),
    mentalStatus: details.mentalStatus,
    mentalStatusComments: details.mentalStatusComments,
    procedures: details.procedures.filter(
      (p) => p.code.trim() || p.hours.trim() || p.minutes.trim() || p.frequency.trim(),
    ),
    physical: details.physical,
    bathingTypes: details.bathingTypes,
    grooming: grooming as Form618PdfInput["grooming"],
    eating: details.eating,
    meals: details.meals,
    adl: adl as Form618PdfInput["adl"],
    alternateResources: details.alternateResources,
    serviceTime: { ...details.serviceTime, ...weeklyServiceTimeTotals(details) },
    sectionXIIIPlan: details.sectionXIIIPlan,
    extension: details.extensionRequested ? details.extension : null,
  };
}
