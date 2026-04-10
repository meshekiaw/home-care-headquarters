import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download, Save, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ========================================
// FIELD DEFINITIONS
// ========================================
// Coordinates: percentage-based (0-1), measured from BOTTOM-LEFT of PDF page (PDF native coords).
// yPct: 0 = bottom edge, 1 = top edge.

interface FormFieldDef {
  id: string;
  label: string;
  type: "text" | "date" | "checkbox" | "textarea" | "signature" | "multiCheckbox";
  options?: string[];
  page: number;
  xPct: number;
  yPct: number;
  widthPct?: number;
  fontSize?: number;
  section?: string;
  tags?: string[];
  profileField?: string;
  instructions?: string;
  hideOnPdf?: boolean;
}

const PDF_SKIP_FIELD_IDS = new Set(["p13_phone", "p13_email", "p22_sig_name_1", "p22_sig_name_2"]);

const W4_FILING_STATUS_MARKS = {
  single: { xPct: 0.155, yPct: 0.747 },
  married: { xPct: 0.155, yPct: 0.724 },
  head: { xPct: 0.155, yPct: 0.703 },
} as const;

const TB_Q5_OPTION_MARKS: Record<string, { xPct: number; yPct: number }> = {
  Hospital: { xPct: 0.388, yPct: 0.508 },
  "Nursing Home": { xPct: 0.479, yPct: 0.508 },
  "Correctional Facility": { xPct: 0.616, yPct: 0.508 },
  "Homeless Shelter": { xPct: 0.792, yPct: 0.508 },
  "Drug Treatment Center": { xPct: 0.261, yPct: 0.493 },
  "Home Care/Hospice": { xPct: 0.461, yPct: 0.493 },
};

// Full HCN Application field mapping across all 28 pages
// Coordinates calibrated from pdfplumber baseline analysis of HCN_Application.pdf
const APPLICATION_FIELDS: FormFieldDef[] = [
  // ============ PAGE 1 - Application for Employment ============
  { id: "legal_name", label: "Legal Name", type: "text", page: 1, xPct: 0.18, yPct: 0.678, section: "Application", tags: ["name_primary"], profileField: "full_name", fontSize: 10 },
  { id: "aliases", label: "Aliases", type: "text", page: 1, xPct: 0.64, yPct: 0.678, section: "Application", fontSize: 10 },
  { id: "p1_address", label: "Address", type: "text", page: 1, xPct: 0.13, yPct: 0.647, section: "Application", profileField: "full_address", fontSize: 10 },
  { id: "home_phone", label: "Home Phone", type: "text", page: 1, xPct: 0.19, yPct: 0.615, section: "Application", profileField: "phone", fontSize: 10 },
  { id: "cell_phone", label: "Cell Phone", type: "text", page: 1, xPct: 0.44, yPct: 0.615, section: "Application", profileField: "phone", fontSize: 10 },
  { id: "p1_email", label: "Email", type: "text", page: 1, xPct: 0.70, yPct: 0.615, section: "Application", profileField: "email", fontSize: 10 },
  { id: "ssn", label: "Social Security Number", type: "text", page: 1, xPct: 0.26, yPct: 0.569, section: "Application", tags: ["ssn_primary", "ssn_mirror"], profileField: "ssn", fontSize: 10 },
  { id: "dl_number", label: "DL/State ID Number", type: "text", page: 1, xPct: 0.62, yPct: 0.569, section: "Application", fontSize: 10 },
  { id: "dob", label: "Date of Birth", type: "text", page: 1, xPct: 0.18, yPct: 0.537, section: "Application", tags: ["dob_primary", "dob_mirror"], profileField: "date_of_birth", fontSize: 10 },
  { id: "certifications", label: "Certifications", type: "text", page: 1, xPct: 0.56, yPct: 0.506, section: "Application", fontSize: 10 },
  { id: "hours_sunday", label: "Hours NOT Available - Sunday", type: "text", page: 1, xPct: 0.42, yPct: 0.438, section: "Availability", fontSize: 9 },
  { id: "hours_monday", label: "Monday", type: "text", page: 1, xPct: 0.72, yPct: 0.438, section: "Availability", fontSize: 9 },
  { id: "hours_tuesday", label: "Tuesday", type: "text", page: 1, xPct: 0.17, yPct: 0.407, section: "Availability", fontSize: 9 },
  { id: "hours_wednesday", label: "Wednesday", type: "text", page: 1, xPct: 0.45, yPct: 0.407, section: "Availability", fontSize: 9 },
  { id: "hours_thursday", label: "Thursday", type: "text", page: 1, xPct: 0.72, yPct: 0.407, section: "Availability", fontSize: 9 },
  { id: "hours_friday", label: "Friday", type: "text", page: 1, xPct: 0.14, yPct: 0.376, section: "Availability", fontSize: 9 },
  { id: "hours_saturday", label: "Saturday", type: "text", page: 1, xPct: 0.44, yPct: 0.376, section: "Availability", fontSize: 9 },
  { id: "related_employees", label: "Related to current/former employees?", type: "text", page: 1, xPct: 0.05, yPct: 0.290, section: "Application", fontSize: 9 },
  { id: "how_heard", label: "How did you hear about HCN?", type: "text", page: 1, xPct: 0.50, yPct: 0.256, section: "Application", fontSize: 9 },
  { id: "p1_signature", label: "Applicant Signature", type: "signature", page: 1, xPct: 0.26, yPct: 0.062, section: "Application", fontSize: 10 },
  { id: "p1_date", label: "Date (Page 1)", type: "date", page: 1, xPct: 0.64, yPct: 0.062, section: "Application", tags: ["date_primary"], fontSize: 10 },

  // ============ PAGE 2 - Policy Acknowledgments ============
  { id: "p2_name_sig_1", label: "Printed Name (P&P Manual)", type: "text", page: 2, xPct: 0.36, yPct: 0.782, section: "P&P Manual Acknowledgment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p2_signature_1", label: "Signature (P&P Manual)", type: "signature", page: 2, xPct: 0.52, yPct: 0.782, section: "P&P Manual Acknowledgment", fontSize: 10 },
  { id: "p2_date_1", label: "Date", type: "date", page: 2, xPct: 0.83, yPct: 0.782, section: "P&P Manual Acknowledgment", tags: ["date_mirror"], fontSize: 10 },
  { id: "p2_name_sig_2", label: "Printed Name (Medication Policy)", type: "text", page: 2, xPct: 0.36, yPct: 0.579, section: "Medication Policy Acknowledgment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p2_signature_2", label: "Signature (Medication Policy)", type: "signature", page: 2, xPct: 0.52, yPct: 0.579, section: "Medication Policy Acknowledgment", fontSize: 10 },
  { id: "p2_date_2", label: "Date", type: "date", page: 2, xPct: 0.83, yPct: 0.579, section: "Medication Policy Acknowledgment", tags: ["date_mirror"], fontSize: 10 },
  { id: "p2_name_sig_3", label: "Printed Name (Confidentiality)", type: "text", page: 2, xPct: 0.36, yPct: 0.376, section: "Confidentiality Acknowledgment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p2_signature_3", label: "Signature (Confidentiality)", type: "signature", page: 2, xPct: 0.52, yPct: 0.376, section: "Confidentiality Acknowledgment", fontSize: 10 },
  { id: "p2_date_3", label: "Date", type: "date", page: 2, xPct: 0.83, yPct: 0.376, section: "Confidentiality Acknowledgment", tags: ["date_mirror"], fontSize: 10 },
  { id: "p2_position", label: "Position Title", type: "text", page: 2, xPct: 0.53, yPct: 0.251, section: "Job Description Acknowledgment", fontSize: 10 },
  { id: "p2_name_sig_4", label: "Printed Name (Job Description)", type: "text", page: 2, xPct: 0.36, yPct: 0.095, section: "Job Description Acknowledgment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p2_signature_4", label: "Signature (Job Description)", type: "signature", page: 2, xPct: 0.52, yPct: 0.095, section: "Job Description Acknowledgment", fontSize: 10 },
  { id: "p2_date_4", label: "Date", type: "date", page: 2, xPct: 0.83, yPct: 0.095, section: "Job Description Acknowledgment", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 3 - Business Reference 1 ============
  { id: "ref1_company", label: "Company Name", type: "text", page: 3, xPct: 0.18, yPct: 0.633, section: "Reference 1", fontSize: 10 },
  { id: "ref1_address", label: "Company Address/Phone/Fax/Email", type: "text", page: 3, xPct: 0.40, yPct: 0.585, section: "Reference 1", fontSize: 9 },

  // ============ PAGE 4 - Business Reference 2 ============
  { id: "ref2_company", label: "Company Name", type: "text", page: 4, xPct: 0.18, yPct: 0.633, section: "Reference 2", fontSize: 10 },
  { id: "ref2_address", label: "Company Address/Phone/Fax/Email", type: "text", page: 4, xPct: 0.40, yPct: 0.585, section: "Reference 2", fontSize: 9 },

  // ============ PAGE 5 - Employment Agreement ============
  { id: "p5_day", label: "Day", type: "text", page: 5, xPct: 0.30, yPct: 0.784, section: "Employment Agreement", fontSize: 10 },
  { id: "p5_month", label: "Month", type: "text", page: 5, xPct: 0.42, yPct: 0.784, section: "Employment Agreement", fontSize: 10 },
  { id: "p5_year", label: "Year (20__)", type: "text", page: 5, xPct: 0.63, yPct: 0.784, section: "Employment Agreement", fontSize: 10 },
  { id: "p5_employee_name", label: "Employee Name", type: "text", page: 5, xPct: 0.27, yPct: 0.732, section: "Employment Agreement", tags: ["name_mirror"], fontSize: 10 },
  { id: "p5_employee_address", label: "Employee Address", type: "text", page: 5, xPct: 0.06, yPct: 0.681, section: "Employment Agreement", profileField: "full_address", fontSize: 9 },
  { id: "p5_position_title", label: "Position Title", type: "text", page: 5, xPct: 0.11, yPct: 0.340, section: "Employment Agreement", fontSize: 10 },
  { id: "p5_rate", label: "Compensation Rate", type: "text", page: 5, xPct: 0.78, yPct: 0.221, section: "Employment Agreement", fontSize: 10 },

  // ============ PAGE 8 - Agreement Signatures ============
  { id: "p8_printed_name", label: "Printed Name of Employee", type: "text", page: 8, xPct: 0.088, yPct: 0.700, section: "Agreement Signatures", tags: ["name_mirror"], fontSize: 10 },
  { id: "p8_signature", label: "Signature of Employee", type: "signature", page: 8, xPct: 0.088, yPct: 0.598, section: "Agreement Signatures", fontSize: 10 },
  { id: "p8_date", label: "Date", type: "date", page: 8, xPct: 0.55, yPct: 0.700, section: "Agreement Signatures", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 9 - Acceptance of Assignment ============
  { id: "p9_patient_name", label: "Patient Name", type: "text", page: 9, xPct: 0.28, yPct: 0.659, section: "Acceptance of Assignment", fontSize: 10 },
  { id: "p9_patient_addr", label: "Patient Address", type: "text", page: 9, xPct: 0.22, yPct: 0.610, section: "Acceptance of Assignment", fontSize: 10 },
  { id: "p9_patient_phone", label: "Patient Phone", type: "text", page: 9, xPct: 0.20, yPct: 0.561, section: "Acceptance of Assignment", fontSize: 10 },
  { id: "p9_care_summary", label: "Plan of Care Summary", type: "text", page: 9, xPct: 0.37, yPct: 0.511, widthPct: 0.60, section: "Acceptance of Assignment", fontSize: 9 },
  { id: "p9_employee_name", label: "Employee Printed Name", type: "text", page: 9, xPct: 0.118, yPct: 0.310, section: "Acceptance of Assignment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p9_signature", label: "Employee Signature", type: "signature", page: 9, xPct: 0.412, yPct: 0.310, section: "Acceptance of Assignment", fontSize: 10 },
  { id: "p9_date", label: "Date", type: "date", page: 9, xPct: 0.706, yPct: 0.310, section: "Acceptance of Assignment", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 12 - Job Description Signature ============
  { id: "p11_signature", label: "Employee Signature", type: "signature", page: 12, xPct: 0.103, yPct: 0.822, section: "Job Description Signature", fontSize: 10 },
  { id: "p11_date", label: "Date", type: "date", page: 12, xPct: 0.622, yPct: 0.822, section: "Job Description Signature", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 13 - Employee Handbook Receipt ============
  { id: "p12_name", label: "Employee Name", type: "text", page: 13, xPct: 0.14, yPct: 0.828, section: "Handbook Receipt", tags: ["name_mirror"], fontSize: 10 },
  { id: "p12_printed_name", label: "Applicant's Printed Name", type: "text", page: 13, xPct: 0.314, yPct: 0.312, section: "Handbook Receipt", tags: ["name_mirror"], fontSize: 10 },
  { id: "p12_signature", label: "Applicant's Signature", type: "signature", page: 13, xPct: 0.286, yPct: 0.248, section: "Handbook Receipt", fontSize: 10 },
  { id: "p12_date", label: "Date", type: "date", page: 13, xPct: 0.75, yPct: 0.248, section: "Handbook Receipt", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 14 - Practitioner ID Request ============
  { id: "p13_name", label: "Practitioner Name", type: "text", page: 14, xPct: 0.20, yPct: 0.642, section: "Practitioner ID", tags: ["name_mirror"], fontSize: 10 },
  { id: "p13_ssn", label: "Social Security Number", type: "text", page: 14, xPct: 0.29, yPct: 0.574, section: "Practitioner ID", tags: ["ssn_mirror"], profileField: "ssn", fontSize: 10 },
  { id: "p13_dob", label: "Date of Birth", type: "text", page: 14, xPct: 0.57, yPct: 0.574, section: "Practitioner ID", tags: ["dob_mirror"], profileField: "date_of_birth", fontSize: 10 },
  { id: "p13_phone", label: "Phone Number", type: "text", page: 14, xPct: 0.55, yPct: 0.335, section: "Practitioner ID", profileField: "phone", fontSize: 9, hideOnPdf: true },
  { id: "p13_email", label: "Email Address", type: "text", page: 14, xPct: 0.30, yPct: 0.304, section: "Practitioner ID", profileField: "email", fontSize: 9, hideOnPdf: true },
  { id: "p13_signature", label: "Practitioner's Signature", type: "signature", page: 14, xPct: 0.39, yPct: 0.200, section: "Practitioner ID", fontSize: 10 },
  { id: "p13_date", label: "Date", type: "date", page: 14, xPct: 0.76, yPct: 0.200, section: "Practitioner ID", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 15 - Direct Deposit ============
  { id: "p14_employee_name", label: "Employee/Worker Name", type: "text", page: 15, xPct: 0.30, yPct: 0.891, section: "Direct Deposit", tags: ["name_mirror"], fontSize: 10 },
  { id: "p14_account_name", label: "Accountholder's Name", type: "text", page: 15, xPct: 0.50, yPct: 0.800, section: "Direct Deposit", tags: ["name_mirror"], fontSize: 9 },
  { id: "p14_routing", label: "Routing/Transit Number", type: "text", page: 15, xPct: 0.30, yPct: 0.775, section: "Direct Deposit", fontSize: 9 },
  { id: "p14_account_num", label: "Account Number", type: "text", page: 15, xPct: 0.30, yPct: 0.748, section: "Direct Deposit", fontSize: 9 },
  { id: "p14_bank_name", label: "Bank Name", type: "text", page: 15, xPct: 0.30, yPct: 0.722, section: "Direct Deposit", fontSize: 9 },
  { id: "p14_signature", label: "Employee/Worker Signature", type: "signature", page: 15, xPct: 0.351, yPct: 0.251, section: "Direct Deposit", fontSize: 10 },
  { id: "p14_date", label: "Date", type: "date", page: 15, xPct: 0.806, yPct: 0.251, section: "Direct Deposit", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 16 - W-4 Form ============
  // Step 1: Personal Information
  { id: "w4_first_name", label: "First Name & Middle Initial", type: "text", page: 16, xPct: 0.16, yPct: 0.855, section: "W-4 Form – Step 1: Personal Info", fontSize: 9 },
  { id: "w4_last_name", label: "Last Name", type: "text", page: 16, xPct: 0.46, yPct: 0.855, section: "W-4 Form – Step 1: Personal Info", fontSize: 9 },
  { id: "w4_ssn", label: "Social Security Number", type: "text", page: 16, xPct: 0.79, yPct: 0.855, section: "W-4 Form – Step 1: Personal Info", tags: ["ssn_mirror"], profileField: "ssn", fontSize: 9 },
  { id: "w4_address", label: "Address", type: "text", page: 16, xPct: 0.16, yPct: 0.824, section: "W-4 Form – Step 1: Personal Info", profileField: "address", fontSize: 9 },
  { id: "w4_city_state_zip", label: "City, State, ZIP", type: "text", page: 16, xPct: 0.16, yPct: 0.794, section: "W-4 Form – Step 1: Personal Info", profileField: "city_state_zip", fontSize: 9 },
  { id: "w4_filing_status", label: "Filing Status (Single / Married filing jointly / Head of household)", type: "text", page: 16, xPct: 0.16, yPct: 0.783, section: "W-4 Form – Step 1: Personal Info", fontSize: 9, instructions: "Enter one: Single, Married filing jointly, or Head of household" },
  // Step 2: Multiple Jobs or Spouse Works
  { id: "w4_step2_checkbox", label: "Step 2(c) – Two jobs total checkbox (enter X if applicable)", type: "text", page: 16, xPct: 0.90, yPct: 0.482, section: "W-4 Form – Step 2: Multiple Jobs", fontSize: 9, instructions: "If there are only two jobs total, enter X. Otherwise leave blank." },
  // Step 3: Claim Dependents and Other Credits
  { id: "w4_step3a", label: "3(a) Qualifying children under 17 × $2,200", type: "text", page: 16, xPct: 0.70, yPct: 0.370, section: "W-4 Form – Step 3: Dependents", fontSize: 9, instructions: "Multiply number of qualifying children under 17 by $2,200" },
  { id: "w4_step3b", label: "3(b) Other dependents × $500", type: "text", page: 16, xPct: 0.70, yPct: 0.355, section: "W-4 Form – Step 3: Dependents", fontSize: 9, instructions: "Multiply number of other dependents by $500" },
  { id: "w4_step3_total", label: "Step 3 Total (3a + 3b + other credits)", type: "text", page: 16, xPct: 0.84, yPct: 0.325, section: "W-4 Form – Step 3: Dependents", fontSize: 9, instructions: "Add 3(a) and 3(b) plus any other credits" },
  // Step 4: Other Adjustments
  { id: "w4_step4a", label: "4(a) Other income (not from jobs)", type: "text", page: 16, xPct: 0.84, yPct: 0.279, section: "W-4 Form – Step 4: Other Adjustments", fontSize: 9, instructions: "Interest, dividends, retirement income, etc." },
  { id: "w4_step4b", label: "4(b) Deductions", type: "text", page: 16, xPct: 0.84, yPct: 0.234, section: "W-4 Form – Step 4: Other Adjustments", fontSize: 9, instructions: "Use Deductions Worksheet on page 4 if applicable" },
  { id: "w4_step4c", label: "4(c) Extra withholding per pay period", type: "text", page: 16, xPct: 0.84, yPct: 0.211, section: "W-4 Form – Step 4: Other Adjustments", fontSize: 9, instructions: "Additional tax to withhold each pay period" },
  // Step 5: Sign
  { id: "w4_signature", label: "Employee Signature", type: "signature", page: 16, xPct: 0.20, yPct: 0.104, section: "W-4 Form – Step 5: Sign", fontSize: 10 },
  { id: "w4_date", label: "Date", type: "date", page: 16, xPct: 0.80, yPct: 0.104, section: "W-4 Form – Step 5: Sign", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 19 - I-9 Section 1 ============
  { id: "i9_last_name", label: "Last Name", type: "text", page: 19, xPct: 0.064, yPct: 0.736, section: "I-9 Form", fontSize: 9 },
  { id: "i9_first_name", label: "First Name", type: "text", page: 19, xPct: 0.345, yPct: 0.736, section: "I-9 Form", fontSize: 9 },
  { id: "i9_middle", label: "Middle Initial", type: "text", page: 19, xPct: 0.592, yPct: 0.736, section: "I-9 Form", fontSize: 9 },
  { id: "i9_other_names", label: "Other Last Names Used", type: "text", page: 19, xPct: 0.693, yPct: 0.736, section: "I-9 Form", fontSize: 9 },
  { id: "i9_address", label: "Address", type: "text", page: 19, xPct: 0.063, yPct: 0.697, section: "I-9 Form", profileField: "address", fontSize: 9 },
  { id: "i9_apt", label: "Apt. Number", type: "text", page: 19, xPct: 0.398, yPct: 0.697, section: "I-9 Form", fontSize: 9 },
  { id: "i9_city", label: "City", type: "text", page: 19, xPct: 0.497, yPct: 0.697, section: "I-9 Form", profileField: "city", fontSize: 9 },
  { id: "i9_state", label: "State", type: "text", page: 19, xPct: 0.743, yPct: 0.697, section: "I-9 Form", profileField: "state", fontSize: 9 },
  { id: "i9_zip", label: "ZIP Code", type: "text", page: 19, xPct: 0.806, yPct: 0.697, section: "I-9 Form", profileField: "zip_code", fontSize: 9 },
  { id: "i9_dob", label: "Date of Birth", type: "text", page: 19, xPct: 0.065, yPct: 0.678, section: "I-9 Form", tags: ["dob_mirror"], profileField: "date_of_birth", fontSize: 9 },
  { id: "i9_ssn", label: "SSN", type: "text", page: 19, xPct: 0.25, yPct: 0.678, section: "I-9 Form", tags: ["ssn_mirror"], profileField: "ssn", fontSize: 9 },
  { id: "i9_email", label: "Email", type: "text", page: 19, xPct: 0.442, yPct: 0.678, section: "I-9 Form", profileField: "email", fontSize: 9 },
  { id: "i9_phone", label: "Phone", type: "text", page: 19, xPct: 0.725, yPct: 0.678, section: "I-9 Form", profileField: "phone", fontSize: 9 },
  // Citizenship Attestation
  { id: "i9_citizen", label: "1. A citizen of the United States", type: "checkbox", page: 19, xPct: 0.07, yPct: 0.589, section: "I-9 Form – Citizenship Status", instructions: "Check if you are a U.S. citizen", fontSize: 9 },
  { id: "i9_noncitizen_national", label: "2. A noncitizen national of the United States", type: "checkbox", page: 19, xPct: 0.07, yPct: 0.567, section: "I-9 Form – Citizenship Status", instructions: "Check if you are a noncitizen national", fontSize: 9 },
  { id: "i9_permanent_resident", label: "3. A lawful permanent resident", type: "checkbox", page: 19, xPct: 0.07, yPct: 0.547, section: "I-9 Form – Citizenship Status", instructions: "Check if you are a lawful permanent resident", fontSize: 9 },
  { id: "i9_alien_reg_number", label: "Alien Reg. Number/USCIS Number (if #3)", type: "text", page: 19, xPct: 0.50, yPct: 0.547, section: "I-9 Form – Citizenship Status", fontSize: 9 },
  { id: "i9_authorized_alien", label: "4. An alien authorized to work", type: "checkbox", page: 19, xPct: 0.07, yPct: 0.525, section: "I-9 Form – Citizenship Status", instructions: "Check if you are an alien authorized to work", fontSize: 9 },
  { id: "i9_work_expiration", label: "Work Auth. Expiration Date (if #4)", type: "text", page: 19, xPct: 0.55, yPct: 0.525, section: "I-9 Form – Citizenship Status", instructions: "mm/dd/yyyy or N/A", fontSize: 9 },
  // Alien document numbers
  { id: "i9_alien_uscis", label: "Alien Reg. Number/USCIS Number", type: "text", page: 19, xPct: 0.55, yPct: 0.455, section: "I-9 Form – Document Numbers (if #3 or #4)", instructions: "Complete one of these three fields", fontSize: 9 },
  { id: "i9_i94_number", label: "Form I-94 Admission Number", type: "text", page: 19, xPct: 0.55, yPct: 0.422, section: "I-9 Form – Document Numbers (if #3 or #4)", fontSize: 9 },
  { id: "i9_foreign_passport", label: "Foreign Passport Number", type: "text", page: 19, xPct: 0.50, yPct: 0.390, section: "I-9 Form – Document Numbers (if #3 or #4)", fontSize: 9 },
  { id: "i9_country_issuance", label: "Country of Issuance", type: "text", page: 19, xPct: 0.25, yPct: 0.370, section: "I-9 Form – Document Numbers (if #3 or #4)", fontSize: 9 },
  // Signature & Date
  { id: "i9_signature", label: "Signature of Employee", type: "signature", page: 19, xPct: 0.16, yPct: 0.330, section: "I-9 Form – Employee Signature", fontSize: 9 },
  { id: "i9_date", label: "Today's Date", type: "date", page: 19, xPct: 0.84, yPct: 0.330, section: "I-9 Form – Employee Signature", tags: ["date_mirror"], fontSize: 9 },

  // ============ PAGE 22 - Background Check ============
  { id: "bg_last_name", label: "Last Name", type: "text", page: 22, xPct: 0.103, yPct: 0.448, section: "Background Check", fontSize: 9 },
  { id: "bg_first_name", label: "First Name", type: "text", page: 22, xPct: 0.397, yPct: 0.448, section: "Background Check", fontSize: 9 },
  { id: "bg_middle", label: "Middle Name", type: "text", page: 22, xPct: 0.574, yPct: 0.448, section: "Background Check", fontSize: 9 },
  { id: "bg_maiden", label: "Maiden Name", type: "text", page: 22, xPct: 0.691, yPct: 0.448, section: "Background Check", fontSize: 9 },
  { id: "bg_dob", label: "Date of Birth", type: "text", page: 22, xPct: 0.103, yPct: 0.406, section: "Background Check", tags: ["dob_mirror"], profileField: "date_of_birth", fontSize: 9 },
  { id: "bg_race", label: "Race", type: "text", page: 22, xPct: 0.282, yPct: 0.406, section: "Background Check", fontSize: 9 },
  { id: "bg_sex", label: "Sex", type: "text", page: 22, xPct: 0.413, yPct: 0.406, section: "Background Check", fontSize: 9 },
  { id: "bg_ssn", label: "Social Security Number", type: "text", page: 22, xPct: 0.574, yPct: 0.406, section: "Background Check", tags: ["ssn_mirror"], profileField: "ssn", fontSize: 9 },
  { id: "bg_dl", label: "Driver's License #", type: "text", page: 22, xPct: 0.103, yPct: 0.366, section: "Background Check", fontSize: 9 },
  { id: "bg_dl_state", label: "State of Issue", type: "text", page: 22, xPct: 0.456, yPct: 0.366, section: "Background Check", fontSize: 9 },
  { id: "bg_address", label: "Mailing Address", type: "text", page: 22, xPct: 0.103, yPct: 0.321, section: "Background Check", profileField: "address", fontSize: 9 },
  { id: "bg_city", label: "City", type: "text", page: 22, xPct: 0.397, yPct: 0.321, section: "Background Check", profileField: "city", fontSize: 9 },
  { id: "bg_state", label: "State", type: "text", page: 22, xPct: 0.576, yPct: 0.321, section: "Background Check", profileField: "state", fontSize: 9 },
  { id: "bg_zip", label: "ZIP Code", type: "text", page: 22, xPct: 0.811, yPct: 0.321, section: "Background Check", profileField: "zip_code", fontSize: 9 },

  // ============ PAGE 23 - Privacy Statement & Statement of Oath ============
  { id: "p22_sig_name_1", label: "Printed Name (Privacy Statement)", type: "text", page: 23, xPct: 0.35, yPct: 0.570, section: "Privacy Right Statement", tags: ["name_mirror"], fontSize: 10, hideOnPdf: true },
  { id: "p22_signature_1", label: "Signature (Privacy Statement)", type: "signature", page: 23, xPct: 0.30, yPct: 0.547, section: "Privacy Right Statement", fontSize: 10 },
  { id: "p22_sig_date_1", label: "Date (Privacy Statement)", type: "date", page: 23, xPct: 0.83, yPct: 0.547, section: "Privacy Right Statement", tags: ["date_mirror"], fontSize: 10 },
  // Applicant Initials Boxes
  { id: "p22_initial_1", label: "Initial – Consent for Criminal Record Check", type: "text", page: 23, xPct: 0.835, yPct: 0.377, section: "Applicant Initials", instructions: "Initial inside box: consent for AR State Police & FBI criminal record check", fontSize: 9 },
  { id: "p22_initial_2", label: "Initial – Directions for Changes/Correcting", type: "text", page: 23, xPct: 0.835, yPct: 0.306, section: "Applicant Initials", instructions: "Initial inside box: received directions for changes/correcting FBI record", fontSize: 9 },
  { id: "p22_initial_3", label: "Initial – Directions to Obtain Copy", type: "text", page: 23, xPct: 0.835, yPct: 0.233, section: "Applicant Initials", instructions: "Initial inside box: received directions to obtain copy of FBI record", fontSize: 9 },
  { id: "p22_initial_4", label: "Initial – Directions to Appeal Accuracy", type: "text", page: 23, xPct: 0.835, yPct: 0.160, section: "Applicant Initials", instructions: "Initial inside box: received directions on how to appeal accuracy/disposition", fontSize: 9 },
  // Statement of Oath
  { id: "p22_sig_name_2", label: "Printed Name (Statement of Oath)", type: "text", page: 23, xPct: 0.35, yPct: 0.130, section: "Statement of Oath", tags: ["name_mirror"], fontSize: 10, hideOnPdf: true },
  { id: "p22_signature_2", label: "Signature (Statement of Oath)", type: "signature", page: 23, xPct: 0.30, yPct: 0.107, section: "Statement of Oath", fontSize: 10 },
  { id: "p22_sig_date_2", label: "Date (Statement of Oath)", type: "date", page: 23, xPct: 0.83, yPct: 0.107, section: "Statement of Oath", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 24 - Medication Policy ============
  { id: "p23_signature", label: "Employee Signature", type: "signature", page: 24, xPct: 0.07, yPct: 0.127, section: "Medication Policy", fontSize: 10 },
  { id: "p23_date", label: "Date", type: "date", page: 24, xPct: 0.54, yPct: 0.127, section: "Medication Policy", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 25 - Lifting Restrictions ============
  { id: "p24_signature", label: "Employee Signature", type: "signature", page: 25, xPct: 0.07, yPct: 0.481, section: "Lifting Restrictions", fontSize: 10 },
  { id: "p24_date", label: "Date", type: "date", page: 25, xPct: 0.54, yPct: 0.481, section: "Lifting Restrictions", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 26 - Documentation/Orientation Checklist ============
  { id: "p25_position", label: "Position Applied For", type: "text", page: 26, xPct: 0.64, yPct: 0.792, section: "Orientation Checklist", fontSize: 10 },
  { id: "p25_printed_name", label: "Applicant's Printed Name", type: "text", page: 26, xPct: 0.30, yPct: 0.208, section: "Orientation Checklist", tags: ["name_mirror"], fontSize: 10 },
  { id: "p25_alias", label: "Applicant's Alias", type: "text", page: 26, xPct: 0.20, yPct: 0.161, section: "Orientation Checklist", fontSize: 10 },
  { id: "p25_signature", label: "Applicant's Signature", type: "signature", page: 26, xPct: 0.26, yPct: 0.115, section: "Orientation Checklist", fontSize: 10 },
  { id: "p25_date", label: "Date", type: "date", page: 26, xPct: 0.70, yPct: 0.115, section: "Orientation Checklist", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 27 - TB Risk Assessment ============
  { id: "tb_name", label: "Employee Name", type: "text", page: 27, xPct: 0.24, yPct: 0.734, section: "TB Assessment", tags: ["name_mirror"], fontSize: 10 },
  { id: "tb_dob", label: "Date of Birth", type: "text", page: 27, xPct: 0.65, yPct: 0.734, section: "TB Assessment", fontSize: 10 },
  { id: "tb_date", label: "Date", type: "date", page: 27, xPct: 0.24, yPct: 0.711, section: "TB Assessment", tags: ["date_mirror"], fontSize: 10 },
  { id: "tb_job_title", label: "Job Title", type: "text", page: 27, xPct: 0.65, yPct: 0.711, section: "TB Assessment", fontSize: 10 },

  // Part 1 — TB Risk Factors
  { id: "tb_q1_yes", label: "1. Positive TB skin/blood test – Yes", type: "checkbox", page: 27, xPct: 0.66, yPct: 0.635, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q1_no", label: "1. Positive TB skin/blood test – No", type: "checkbox", page: 27, xPct: 0.70, yPct: 0.635, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q1_date", label: "1. If yes, date", type: "text", page: 27, xPct: 0.82, yPct: 0.635, section: "TB Part 1 – Risk Factors", fontSize: 9 },

  { id: "tb_q2_yes", label: "2. Diagnosed/treated for active TB – Yes", type: "checkbox", page: 27, xPct: 0.62, yPct: 0.598, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q2_no", label: "2. Diagnosed/treated for active TB – No", type: "checkbox", page: 27, xPct: 0.67, yPct: 0.598, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q2_detail", label: "2. If yes, where/when", type: "text", page: 27, xPct: 0.20, yPct: 0.584, section: "TB Part 1 – Risk Factors", fontSize: 9 },

  { id: "tb_q3_yes", label: "3. BCG (TB) vaccine – Yes", type: "checkbox", page: 27, xPct: 0.45, yPct: 0.561, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q3_no", label: "3. BCG (TB) vaccine – No", type: "checkbox", page: 27, xPct: 0.51, yPct: 0.561, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q3_date", label: "3. If yes, date/year", type: "text", page: 27, xPct: 0.70, yPct: 0.561, section: "TB Part 1 – Risk Factors", fontSize: 9 },

  { id: "tb_q4_yes", label: "4. Lived in TB-common country – Yes", type: "checkbox", page: 27, xPct: 0.65, yPct: 0.538, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q4_no", label: "4. Lived in TB-common country – No", type: "checkbox", page: 27, xPct: 0.71, yPct: 0.538, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q4_where", label: "4. If yes, where", type: "text", page: 27, xPct: 0.20, yPct: 0.524, section: "TB Part 1 – Risk Factors", fontSize: 9 },

  { id: "tb_q5", label: "5. Have you worked in any of the following?", type: "multiCheckbox", page: 27, xPct: 0.39, yPct: 0.498, section: "TB Part 1 – Risk Factors", fontSize: 10, options: ["Hospital", "Nursing Home", "Correctional Facility", "Homeless Shelter", "Drug Treatment Center", "Home Care/Hospice"] },

  { id: "tb_q6_yes", label: "6. Close contact with active TB – Yes", type: "checkbox", page: 27, xPct: 0.75, yPct: 0.463, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q6_no", label: "6. Close contact with active TB – No", type: "checkbox", page: 27, xPct: 0.80, yPct: 0.463, section: "TB Part 1 – Risk Factors", fontSize: 10 },
  { id: "tb_q6_detail", label: "6. If yes, describe", type: "text", page: 27, xPct: 0.25, yPct: 0.449, section: "TB Part 1 – Risk Factors", fontSize: 9 },

  // Part 2 — Symptoms of Active TB Disease
  { id: "tb_sym_cough", label: "Persistent cough >3 weeks", type: "checkbox", page: 27, xPct: 0.13, yPct: 0.376, section: "TB Part 2 – Symptoms", fontSize: 10 },
  { id: "tb_sym_blood", label: "Coughing up blood or sputum", type: "checkbox", page: 27, xPct: 0.13, yPct: 0.360, section: "TB Part 2 – Symptoms", fontSize: 10 },
  { id: "tb_sym_weight", label: "Unexplained weight loss", type: "checkbox", page: 27, xPct: 0.13, yPct: 0.345, section: "TB Part 2 – Symptoms", fontSize: 10 },
  { id: "tb_sym_sweats", label: "Night sweats", type: "checkbox", page: 27, xPct: 0.13, yPct: 0.330, section: "TB Part 2 – Symptoms", fontSize: 10 },
  { id: "tb_sym_fever", label: "Fever or chills", type: "checkbox", page: 27, xPct: 0.13, yPct: 0.315, section: "TB Part 2 – Symptoms", fontSize: 10 },
  { id: "tb_sym_chest", label: "Chest pain or shortness of breath", type: "checkbox", page: 27, xPct: 0.13, yPct: 0.300, section: "TB Part 2 – Symptoms", fontSize: 10 },
  { id: "tb_sym_fatigue", label: "Fatigue or weakness", type: "checkbox", page: 27, xPct: 0.13, yPct: 0.285, section: "TB Part 2 – Symptoms", fontSize: 10 },

  // ============ PAGE 28 - TB Assessment Results ============
  { id: "p27_emp_signature", label: "Employee Signature", type: "signature", page: 28, xPct: 0.35, yPct: 0.802, section: "TB Results", fontSize: 10 },
  { id: "p27_emp_date", label: "Employee Signature Date", type: "date", page: 28, xPct: 0.70, yPct: 0.802, section: "TB Results", tags: ["date_mirror"], fontSize: 10 },
];

// ========================================
// COMPONENT
// ========================================

interface ApplicationFormFillerProps {
  fileUrl: string;
  caregiverId: string | null;
  caregiverData: any;
  className?: string;
}

export function ApplicationFormFiller({ fileUrl, caregiverId, caregiverData, className }: ApplicationFormFillerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Load PDF ----
  useEffect(() => {
    fetch(fileUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => setPdfBytes(buf.slice(0)))
      .catch(() => toast({ title: "Failed to load application PDF", variant: "destructive" }));
  }, [fileUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setContainerWidth(container.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // ---- Pre-populate from caregiver profile ----
  useEffect(() => {
    if (!caregiverData) return;

    const initial: Record<string, string> = {};
    const fullName = `${caregiverData.first_name || ""} ${caregiverData.last_name || ""}`.trim();
    const today = format(new Date(), "MM/dd/yyyy");
    const cityStateZip = [caregiverData.city, caregiverData.state, caregiverData.zip_code].filter(Boolean).join(", ");
    const fullAddress = [caregiverData.address, caregiverData.city, caregiverData.state, caregiverData.zip_code].filter(Boolean).join(", ");

    APPLICATION_FIELDS.forEach((f) => {
      // Profile pre-population
      if (f.profileField === "full_name") initial[f.id] = fullName;
      else if (f.profileField === "full_address") initial[f.id] = fullAddress;
      else if (f.profileField === "city_state_zip") initial[f.id] = cityStateZip;
      else if (f.profileField === "date_of_birth" && caregiverData.date_of_birth) {
        initial[f.id] = format(new Date(caregiverData.date_of_birth + "T00:00:00"), "MM/dd/yyyy");
      }
      else if (f.profileField && caregiverData[f.profileField]) initial[f.id] = caregiverData[f.profileField];

      // Name mirrors
      if (f.tags?.includes("name_mirror")) initial[f.id] = fullName;

      // Date fields
      if (f.type === "date" || f.tags?.includes("date_mirror") || f.tags?.includes("date_primary")) {
        initial[f.id] = today;
      }
    });

    // Also pre-populate W-4 name fields from caregiver data
    if (caregiverData.first_name) initial["w4_first_name"] = caregiverData.first_name;
    if (caregiverData.last_name) initial["w4_last_name"] = caregiverData.last_name;
    if (caregiverData.last_name) initial["i9_last_name"] = caregiverData.last_name;
    if (caregiverData.first_name) initial["i9_first_name"] = caregiverData.first_name;
    if (caregiverData.last_name) initial["bg_last_name"] = caregiverData.last_name;
    if (caregiverData.first_name) initial["bg_first_name"] = caregiverData.first_name;

    // Load saved data from DB (overrides defaults)
    if (caregiverId) {
      supabase
        .from("caregiver_applications")
        .select("form_data")
        .eq("caregiver_id", caregiverId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.form_data && typeof data.form_data === "object") {
            const saved = data.form_data as Record<string, string>;
            // Only use saved values that are non-empty; profile pre-population wins for blank saved fields
            const filtered: Record<string, string> = {};
            for (const [k, v] of Object.entries(saved)) {
              if (v && String(v).trim() !== "") filtered[k] = v;
            }
            setFormValues({ ...initial, ...filtered });
          } else {
            setFormValues(initial);
          }
          setInitialized(true);
        });
    } else {
      setFormValues(initial);
      setInitialized(true);
    }
  }, [caregiverData, caregiverId]);

  // ---- Auto-save on field changes (debounced) ----
  useEffect(() => {
    if (!initialized || !caregiverId || !user) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const { data: existing } = await supabase
          .from("caregiver_applications")
          .select("id")
          .eq("caregiver_id", caregiverId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("caregiver_applications")
            .update({ form_data: formValues as any, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("caregiver_applications")
            .insert({
              caregiver_id: caregiverId,
              user_id: user.id,
              form_data: formValues as any,
              status: "draft",
            });
        }
      } catch {
        // Silent auto-save failure; manual save still available
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formValues, initialized, caregiverId, user]);

  // ---- Render current page on canvas ----
  useEffect(() => {
    if (!pdfBytes) return;

    const render = async () => {
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
      setNumPages(pdf.numPages);

      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });

      const availableWidth = Math.max((containerWidth || containerRef.current?.clientWidth || 800) - 32, 320);
      const fitScale = Math.max(availableWidth / viewport.width, 0.35);
      const scale = fitScale * zoom;
      const scaledViewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    };

    render();
  }, [pdfBytes, currentPage, zoom, containerWidth]);

  // ---- Field change handler with mirroring ----
  const handleFieldChange = (fieldId: string, value: string) => {
    const field = APPLICATION_FIELDS.find((f) => f.id === fieldId);
    const updated = { ...formValues, [fieldId]: value };

    // Name propagation
    if (field?.tags?.includes("name_primary")) {
      APPLICATION_FIELDS.forEach((f) => {
        if (f.tags?.includes("name_mirror") && f.id !== fieldId) updated[f.id] = value;
      });
    }

    // Date propagation
    if (field?.tags?.includes("date_primary")) {
      APPLICATION_FIELDS.forEach((f) => {
        if (f.tags?.includes("date_mirror") && f.id !== fieldId) updated[f.id] = value;
      });
    }

    // SSN propagation
    if (field?.tags?.includes("ssn_primary")) {
      APPLICATION_FIELDS.forEach((f) => {
        if (f.tags?.includes("ssn_mirror") && f.id !== fieldId) updated[f.id] = value;
      });
    }

    // DOB propagation
    if (field?.tags?.includes("dob_primary")) {
      APPLICATION_FIELDS.forEach((f) => {
        if (f.tags?.includes("dob_mirror") && f.id !== fieldId) updated[f.id] = value;
      });
    }

    setFormValues(updated);
  };

  // ---- Fields for current page ----
  const pageFields = useMemo(() => APPLICATION_FIELDS.filter((f) => f.page === currentPage), [currentPage]);

  const sectionGroups = useMemo(() => {
    const groups: Record<string, FormFieldDef[]> = {};
    pageFields.forEach((f) => {
      const section = f.section || "General";
      if (!groups[section]) groups[section] = [];
      groups[section].push(f);
    });
    return groups;
  }, [pageFields]);

  // ---- Save progress ----
  const handleSave = async () => {
    if (!caregiverId || !user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("caregiver_applications")
        .select("id")
        .eq("caregiver_id", caregiverId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("caregiver_applications")
          .update({ form_data: formValues as any, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("caregiver_applications")
          .insert({
            caregiver_id: caregiverId,
            user_id: user.id,
            form_data: formValues as any,
            status: "draft",
          });
      }
      toast({ title: "Application saved" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ---- Download filled PDF ----
  const handleDownload = async () => {
    if (!pdfBytes) return;
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      APPLICATION_FIELDS.forEach((field) => {
        const value = formValues[field.id];
        const page = pages[field.page - 1];
        if (!page || PDF_SKIP_FIELD_IDS.has(field.id) || field.hideOnPdf) return;

        const { width, height } = page.getSize();
        const drawMark = (xPct: number, yPct: number, size = field.fontSize || 10) => {
          page.drawText("X", {
            x: width * xPct,
            y: height * yPct,
            size,
            font,
            color: rgb(0, 0, 0),
          });
        };

        if (field.type === "checkbox") {
          if (value === "true") drawMark(field.xPct, field.yPct, (field.fontSize || 10) + 1);
          return;
        }

        if (field.id === "w4_filing_status") {
          const normalized = (value || "").trim().toLowerCase();
          if (!normalized) return;

          if (normalized.includes("single")) drawMark(W4_FILING_STATUS_MARKS.single.xPct, W4_FILING_STATUS_MARKS.single.yPct, 11);
          else if (normalized.includes("married")) drawMark(W4_FILING_STATUS_MARKS.married.xPct, W4_FILING_STATUS_MARKS.married.yPct, 11);
          else if (normalized.includes("head")) drawMark(W4_FILING_STATUS_MARKS.head.xPct, W4_FILING_STATUS_MARKS.head.yPct, 11);
          return;
        }

        if (field.type === "multiCheckbox") {
          if (!value) return;

          if (field.id === "tb_q5") {
            value
              .split(",")
              .map((option) => option.trim())
              .filter(Boolean)
              .forEach((option) => {
                const mark = TB_Q5_OPTION_MARKS[option];
                if (mark) drawMark(mark.xPct, mark.yPct, 10);
              });
          }

          return;
        }

        if (!value) return;

        const x = width * field.xPct;
        const y = height * field.yPct;
        const fontSize = field.fontSize || 10;

        page.drawText(value, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
      });

      const filledBytes = await pdfDoc.save();
      const blob = new Blob([filledBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "HCN_Application_Filled.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Download error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className={cn("flex h-full min-h-0 w-full overflow-hidden", className)}>
      {/* PDF Viewer */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 border-b bg-card shrink-0 flex-wrap">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Page {currentPage} of {numPages || "..."}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage >= numPages} onClick={() => setCurrentPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-14 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="default" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex flex-1 justify-center overflow-auto bg-muted/30 p-3 sm:p-4">
          <canvas ref={canvasRef} className="shadow-md" />
        </div>
      </div>

      {/* Side Panel */}
      <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l bg-card">
        <div className="p-3 border-b shrink-0">
          <h3 className="font-semibold text-sm">Application Fields</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Employee name &amp; date auto-populate across all pages. Profile data is pre-filled.
          </p>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-3 space-y-4">
            {Object.entries(sectionGroups).map(([section, fields]) => (
              <div key={section}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {section}
                </h4>
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={field.id} className="text-xs">
                        {field.label}
                        {field.tags?.includes("name_primary") && (
                          <span className="ml-1 text-primary text-[10px]">(fills all name fields)</span>
                        )}
                        {field.tags?.includes("date_primary") && (
                          <span className="ml-1 text-primary text-[10px]">(fills all date fields)</span>
                        )}
                      </Label>
                      {field.instructions && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 mb-1">{field.instructions}</p>
                      )}
                      {field.type === "multiCheckbox" && field.options ? (
                        <div className="mt-1 space-y-1.5">
                          {field.options.map((opt) => {
                            const selected = (formValues[field.id] || "").split(",").filter(Boolean);
                            const isChecked = selected.includes(opt);
                            return (
                              <div key={opt} className="flex items-center gap-2">
                                <Checkbox
                                  id={`${field.id}_${opt}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const updated = checked
                                      ? [...selected, opt]
                                      : selected.filter((s) => s !== opt);
                                    handleFieldChange(field.id, updated.join(","));
                                  }}
                                />
                                <label htmlFor={`${field.id}_${opt}`} className="text-xs text-muted-foreground">{opt}</label>
                              </div>
                            );
                          })}
                        </div>
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Checkbox
                            id={field.id}
                            checked={formValues[field.id] === "true"}
                            onCheckedChange={(checked) => handleFieldChange(field.id, checked ? "true" : "")}
                          />
                          <label htmlFor={field.id} className="text-xs text-muted-foreground">{field.label}</label>
                        </div>
                      ) : field.type === "signature" ? (
                        <div className="mt-1">
                          <Input
                            id={field.id}
                            value={formValues[field.id] || ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder="Type full name as signature"
                            className="h-8 text-sm italic"
                          />
                          <p className="text-[10px] text-muted-foreground mt-0.5">Type your full legal name as your electronic signature</p>
                        </div>
                      ) : (
                        <Input
                          id={field.id}
                          value={formValues[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.type === "date" ? "MM/DD/YYYY" : ""}
                          className="h-8 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {pageFields.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No fillable fields on this page.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This page contains read-only content.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
