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
  type: "text" | "date" | "checkbox" | "textarea" | "signature";
  page: number;
  xPct: number;
  yPct: number;
  widthPct?: number;
  fontSize?: number;
  section?: string;
  tags?: string[];
  profileField?: string;
  instructions?: string;
}

// Full HCN Application field mapping across all 27 pages
const APPLICATION_FIELDS: FormFieldDef[] = [
  // ============ PAGE 1 - Application for Employment ============
  { id: "legal_name", label: "Legal Name", type: "text", page: 1, xPct: 0.16, yPct: 0.645, section: "Application", tags: ["name_primary"], profileField: "full_name", fontSize: 10 },
  { id: "aliases", label: "Aliases", type: "text", page: 1, xPct: 0.56, yPct: 0.645, section: "Application", fontSize: 10 },
  { id: "p1_address", label: "Address", type: "text", page: 1, xPct: 0.12, yPct: 0.615, section: "Application", profileField: "full_address", fontSize: 10 },
  { id: "home_phone", label: "Home Phone", type: "text", page: 1, xPct: 0.17, yPct: 0.585, section: "Application", profileField: "phone", fontSize: 10 },
  { id: "cell_phone", label: "Cell Phone", type: "text", page: 1, xPct: 0.42, yPct: 0.585, section: "Application", profileField: "phone", fontSize: 10 },
  { id: "p1_email", label: "Email", type: "text", page: 1, xPct: 0.68, yPct: 0.585, section: "Application", profileField: "email", fontSize: 10 },
  { id: "ssn", label: "Social Security Number", type: "text", page: 1, xPct: 0.26, yPct: 0.545, section: "Application", tags: ["ssn_mirror"], profileField: "ssn", fontSize: 10 },
  { id: "dl_number", label: "DL/State ID Number", type: "text", page: 1, xPct: 0.62, yPct: 0.545, section: "Application", fontSize: 10 },
  { id: "dob", label: "Date of Birth", type: "text", page: 1, xPct: 0.17, yPct: 0.515, section: "Application", tags: ["dob_mirror"], profileField: "date_of_birth", fontSize: 10 },
  { id: "certifications", label: "Certifications", type: "text", page: 1, xPct: 0.56, yPct: 0.485, section: "Application", fontSize: 10 },
  { id: "hours_sunday", label: "Hours NOT Available - Sunday", type: "text", page: 1, xPct: 0.42, yPct: 0.435, section: "Availability", fontSize: 9 },
  { id: "hours_monday", label: "Monday", type: "text", page: 1, xPct: 0.68, yPct: 0.435, section: "Availability", fontSize: 9 },
  { id: "hours_tuesday", label: "Tuesday", type: "text", page: 1, xPct: 0.14, yPct: 0.41, section: "Availability", fontSize: 9 },
  { id: "hours_wednesday", label: "Wednesday", type: "text", page: 1, xPct: 0.42, yPct: 0.41, section: "Availability", fontSize: 9 },
  { id: "hours_thursday", label: "Thursday", type: "text", page: 1, xPct: 0.68, yPct: 0.41, section: "Availability", fontSize: 9 },
  { id: "hours_friday", label: "Friday", type: "text", page: 1, xPct: 0.14, yPct: 0.385, section: "Availability", fontSize: 9 },
  { id: "hours_saturday", label: "Saturday", type: "text", page: 1, xPct: 0.42, yPct: 0.385, section: "Availability", fontSize: 9 },
  { id: "related_employees", label: "Related to current/former employees?", type: "text", page: 1, xPct: 0.05, yPct: 0.34, section: "Application", fontSize: 9 },
  { id: "how_heard", label: "How did you hear about HCN?", type: "text", page: 1, xPct: 0.45, yPct: 0.305, section: "Application", fontSize: 9 },
  { id: "p1_date", label: "Date (Page 1)", type: "date", page: 1, xPct: 0.62, yPct: 0.075, section: "Application", tags: ["date_primary"], fontSize: 10 },

  // ============ PAGE 2 - Policy Acknowledgments ============
  { id: "p2_name_sig_1", label: "Printed Name (P&P Manual)", type: "text", page: 2, xPct: 0.30, yPct: 0.79, section: "P&P Manual Acknowledgment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p2_date_1", label: "Date", type: "date", page: 2, xPct: 0.65, yPct: 0.72, section: "P&P Manual Acknowledgment", tags: ["date_mirror"], fontSize: 10 },
  { id: "p2_name_sig_2", label: "Printed Name (Medication Policy)", type: "text", page: 2, xPct: 0.30, yPct: 0.555, section: "Medication Policy Acknowledgment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p2_date_2", label: "Date", type: "date", page: 2, xPct: 0.65, yPct: 0.49, section: "Medication Policy Acknowledgment", tags: ["date_mirror"], fontSize: 10 },
  { id: "p2_name_sig_3", label: "Printed Name (Confidentiality)", type: "text", page: 2, xPct: 0.30, yPct: 0.36, section: "Confidentiality Acknowledgment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p2_date_3", label: "Date", type: "date", page: 2, xPct: 0.65, yPct: 0.295, section: "Confidentiality Acknowledgment", tags: ["date_mirror"], fontSize: 10 },
  { id: "p2_position", label: "Position Title", type: "text", page: 2, xPct: 0.52, yPct: 0.215, section: "Job Description Acknowledgment", fontSize: 10 },
  { id: "p2_name_sig_4", label: "Printed Name (Job Description)", type: "text", page: 2, xPct: 0.30, yPct: 0.10, section: "Job Description Acknowledgment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p2_date_4", label: "Date", type: "date", page: 2, xPct: 0.65, yPct: 0.035, section: "Job Description Acknowledgment", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 3 - Business Reference 1 ============
  { id: "ref1_company", label: "Company Name", type: "text", page: 3, xPct: 0.05, yPct: 0.72, section: "Reference 1", fontSize: 10 },
  { id: "ref1_address", label: "Company Address/Phone/Fax/Email", type: "text", page: 3, xPct: 0.05, yPct: 0.66, section: "Reference 1", fontSize: 9 },

  // ============ PAGE 4 - Business Reference 2 ============
  { id: "ref2_company", label: "Company Name", type: "text", page: 4, xPct: 0.05, yPct: 0.72, section: "Reference 2", fontSize: 10 },
  { id: "ref2_address", label: "Company Address/Phone/Fax/Email", type: "text", page: 4, xPct: 0.05, yPct: 0.66, section: "Reference 2", fontSize: 9 },

  // ============ PAGE 5 - Employment Agreement ============
  { id: "p5_day", label: "Day", type: "text", page: 5, xPct: 0.38, yPct: 0.72, section: "Employment Agreement", fontSize: 10 },
  { id: "p5_month", label: "Month", type: "text", page: 5, xPct: 0.52, yPct: 0.72, section: "Employment Agreement", fontSize: 10 },
  { id: "p5_year", label: "Year (20__)", type: "text", page: 5, xPct: 0.68, yPct: 0.72, section: "Employment Agreement", fontSize: 10 },
  { id: "p5_employee_name", label: "Employee Name", type: "text", page: 5, xPct: 0.33, yPct: 0.695, section: "Employment Agreement", tags: ["name_mirror"], fontSize: 10 },
  { id: "p5_employee_address", label: "Employee Address", type: "text", page: 5, xPct: 0.65, yPct: 0.695, section: "Employment Agreement", profileField: "full_address", fontSize: 9 },
  { id: "p5_position_title", label: "Position Title", type: "text", page: 5, xPct: 0.10, yPct: 0.42, section: "Employment Agreement", fontSize: 10 },
  { id: "p5_rate", label: "Compensation Rate", type: "text", page: 5, xPct: 0.55, yPct: 0.30, section: "Employment Agreement", fontSize: 10 },

  // ============ PAGE 8 - Agreement Signatures ============
  { id: "p8_printed_name", label: "Printed Name of Employee", type: "text", page: 8, xPct: 0.05, yPct: 0.62, section: "Agreement Signatures", tags: ["name_mirror"], fontSize: 10 },
  { id: "p8_date", label: "Date", type: "date", page: 8, xPct: 0.55, yPct: 0.62, section: "Agreement Signatures", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 9 - Acceptance of Assignment ============
  { id: "p9_patient_name", label: "Patient Name", type: "text", page: 9, xPct: 0.25, yPct: 0.32, section: "Acceptance of Assignment", fontSize: 10 },
  { id: "p9_patient_addr", label: "Patient Address", type: "text", page: 9, xPct: 0.25, yPct: 0.37, section: "Acceptance of Assignment", fontSize: 10 },
  { id: "p9_patient_phone", label: "Patient Phone", type: "text", page: 9, xPct: 0.25, yPct: 0.42, section: "Acceptance of Assignment", fontSize: 10 },
  { id: "p9_care_summary", label: "Plan of Care Summary", type: "text", page: 9, xPct: 0.10, yPct: 0.52, widthPct: 0.80, section: "Acceptance of Assignment", fontSize: 9 },
  { id: "p9_employee_name", label: "Employee Printed Name", type: "text", page: 9, xPct: 0.35, yPct: 0.82, section: "Acceptance of Assignment", tags: ["name_mirror"], fontSize: 10 },
  { id: "p9_date", label: "Date", type: "date", page: 9, xPct: 0.72, yPct: 0.82, section: "Acceptance of Assignment", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 12 - Job Description Signature ============
  { id: "p11_date", label: "Date", type: "date", page: 12, xPct: 0.60, yPct: 0.56, section: "Job Description Signature", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 13 - Employee Handbook Receipt ============
  { id: "p12_name", label: "Employee Name", type: "text", page: 13, xPct: 0.30, yPct: 0.77, section: "Handbook Receipt", tags: ["name_mirror"], fontSize: 10 },
  { id: "p12_printed_name", label: "Applicant's Printed Name", type: "text", page: 13, xPct: 0.26, yPct: 0.175, section: "Handbook Receipt", tags: ["name_mirror"], fontSize: 10 },
  { id: "p12_date", label: "Date", type: "date", page: 13, xPct: 0.52, yPct: 0.14, section: "Handbook Receipt", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 14 - Practitioner ID Request ============
  { id: "p13_name", label: "Practitioner Name", type: "text", page: 14, xPct: 0.05, yPct: 0.615, section: "Practitioner ID", tags: ["name_mirror"], fontSize: 10 },
  { id: "p13_ssn", label: "Social Security Number", type: "text", page: 14, xPct: 0.05, yPct: 0.535, section: "Practitioner ID", tags: ["ssn_mirror"], profileField: "ssn", fontSize: 10 },
  { id: "p13_dob", label: "Date of Birth", type: "text", page: 14, xPct: 0.05, yPct: 0.49, section: "Practitioner ID", tags: ["dob_mirror"], profileField: "date_of_birth", fontSize: 10 },
  { id: "p13_phone", label: "Phone Number", type: "text", page: 14, xPct: 0.05, yPct: 0.18, section: "Practitioner ID", profileField: "phone", fontSize: 9 },
  { id: "p13_email", label: "Email Address", type: "text", page: 14, xPct: 0.05, yPct: 0.14, section: "Practitioner ID", profileField: "email", fontSize: 9 },
  { id: "p13_date", label: "Date", type: "date", page: 14, xPct: 0.55, yPct: 0.075, section: "Practitioner ID", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 15 - Direct Deposit ============
  { id: "p14_employee_name", label: "Employee/Worker Name", type: "text", page: 15, xPct: 0.28, yPct: 0.845, section: "Direct Deposit", tags: ["name_mirror"], fontSize: 10 },
  { id: "p14_account_name", label: "Accountholder's Name", type: "text", page: 15, xPct: 0.30, yPct: 0.665, section: "Direct Deposit", tags: ["name_mirror"], fontSize: 9 },
  { id: "p14_routing", label: "Routing/Transit Number", type: "text", page: 15, xPct: 0.30, yPct: 0.64, section: "Direct Deposit", fontSize: 9 },
  { id: "p14_account_num", label: "Account Number", type: "text", page: 15, xPct: 0.30, yPct: 0.615, section: "Direct Deposit", fontSize: 9 },
  { id: "p14_bank_name", label: "Bank Name", type: "text", page: 15, xPct: 0.30, yPct: 0.59, section: "Direct Deposit", fontSize: 9 },
  { id: "p14_date", label: "Date", type: "date", page: 15, xPct: 0.72, yPct: 0.195, section: "Direct Deposit", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 16 - W-4 Form ============
  // Step 1: Personal Information
  { id: "w4_first_name", label: "First Name & Middle Initial", type: "text", page: 16, xPct: 0.06, yPct: 0.785, section: "W-4 Form – Step 1: Personal Info", fontSize: 9 },
  { id: "w4_last_name", label: "Last Name", type: "text", page: 16, xPct: 0.38, yPct: 0.785, section: "W-4 Form – Step 1: Personal Info", fontSize: 9 },
  { id: "w4_ssn", label: "Social Security Number", type: "text", page: 16, xPct: 0.72, yPct: 0.785, section: "W-4 Form – Step 1: Personal Info", tags: ["ssn_mirror"], profileField: "ssn", fontSize: 9 },
  { id: "w4_address", label: "Address", type: "text", page: 16, xPct: 0.06, yPct: 0.755, section: "W-4 Form – Step 1: Personal Info", profileField: "address", fontSize: 9 },
  { id: "w4_city_state_zip", label: "City, State, ZIP", type: "text", page: 16, xPct: 0.06, yPct: 0.725, section: "W-4 Form – Step 1: Personal Info", profileField: "city_state_zip", fontSize: 9 },
  { id: "w4_filing_status", label: "Filing Status (Single / Married filing jointly / Head of household)", type: "text", page: 16, xPct: 0.06, yPct: 0.66, section: "W-4 Form – Step 1: Personal Info", fontSize: 9, instructions: "Enter one: Single, Married filing jointly, or Head of household" },
  // Step 2: Multiple Jobs or Spouse Works
  { id: "w4_step2_checkbox", label: "Step 2(c) – Two jobs total checkbox (enter X if applicable)", type: "text", page: 16, xPct: 0.06, yPct: 0.46, section: "W-4 Form – Step 2: Multiple Jobs", fontSize: 9, instructions: "If there are only two jobs total, enter X. Otherwise leave blank." },
  // Step 3: Claim Dependents and Other Credits
  { id: "w4_step3a", label: "3(a) Qualifying children under 17 × $2,200", type: "text", page: 16, xPct: 0.82, yPct: 0.345, section: "W-4 Form – Step 3: Dependents", fontSize: 9, instructions: "Multiply number of qualifying children under 17 by $2,200" },
  { id: "w4_step3b", label: "3(b) Other dependents × $500", type: "text", page: 16, xPct: 0.82, yPct: 0.32, section: "W-4 Form – Step 3: Dependents", fontSize: 9, instructions: "Multiply number of other dependents by $500" },
  { id: "w4_step3_total", label: "Step 3 Total (3a + 3b + other credits)", type: "text", page: 16, xPct: 0.82, yPct: 0.29, section: "W-4 Form – Step 3: Dependents", fontSize: 9, instructions: "Add 3(a) and 3(b) plus any other credits" },
  // Step 4: Other Adjustments
  { id: "w4_step4a", label: "4(a) Other income (not from jobs)", type: "text", page: 16, xPct: 0.82, yPct: 0.225, section: "W-4 Form – Step 4: Other Adjustments", fontSize: 9, instructions: "Interest, dividends, retirement income, etc." },
  { id: "w4_step4b", label: "4(b) Deductions", type: "text", page: 16, xPct: 0.82, yPct: 0.185, section: "W-4 Form – Step 4: Other Adjustments", fontSize: 9, instructions: "Use Deductions Worksheet on page 4 if applicable" },
  { id: "w4_step4c", label: "4(c) Extra withholding per pay period", type: "text", page: 16, xPct: 0.82, yPct: 0.145, section: "W-4 Form – Step 4: Other Adjustments", fontSize: 9, instructions: "Additional tax to withhold each pay period" },
  // Step 5: Sign
  { id: "w4_signature", label: "Employee Signature", type: "signature", page: 16, xPct: 0.15, yPct: 0.075, section: "W-4 Form – Step 5: Sign", fontSize: 10 },
  { id: "w4_date", label: "Date", type: "date", page: 16, xPct: 0.72, yPct: 0.075, section: "W-4 Form – Step 5: Sign", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 19 - I-9 Section 1 ============
  { id: "i9_last_name", label: "Last Name", type: "text", page: 19, xPct: 0.05, yPct: 0.72, section: "I-9 Form", fontSize: 9 },
  { id: "i9_first_name", label: "First Name", type: "text", page: 19, xPct: 0.28, yPct: 0.72, section: "I-9 Form", fontSize: 9 },
  { id: "i9_middle", label: "Middle Initial", type: "text", page: 19, xPct: 0.50, yPct: 0.72, section: "I-9 Form", fontSize: 9 },
  { id: "i9_other_names", label: "Other Last Names Used", type: "text", page: 19, xPct: 0.64, yPct: 0.72, section: "I-9 Form", fontSize: 9 },
  { id: "i9_address", label: "Address", type: "text", page: 19, xPct: 0.05, yPct: 0.69, section: "I-9 Form", profileField: "address", fontSize: 9 },
  { id: "i9_apt", label: "Apt. Number", type: "text", page: 19, xPct: 0.28, yPct: 0.69, section: "I-9 Form", fontSize: 9 },
  { id: "i9_city", label: "City", type: "text", page: 19, xPct: 0.38, yPct: 0.69, section: "I-9 Form", profileField: "city", fontSize: 9 },
  { id: "i9_state", label: "State", type: "text", page: 19, xPct: 0.62, yPct: 0.69, section: "I-9 Form", profileField: "state", fontSize: 9 },
  { id: "i9_zip", label: "ZIP Code", type: "text", page: 19, xPct: 0.72, yPct: 0.69, section: "I-9 Form", profileField: "zip_code", fontSize: 9 },
  { id: "i9_dob", label: "Date of Birth", type: "text", page: 19, xPct: 0.05, yPct: 0.66, section: "I-9 Form", tags: ["dob_mirror"], profileField: "date_of_birth", fontSize: 9 },
  { id: "i9_ssn", label: "SSN", type: "text", page: 19, xPct: 0.28, yPct: 0.66, section: "I-9 Form", tags: ["ssn_mirror"], profileField: "ssn", fontSize: 9 },
  { id: "i9_email", label: "Email", type: "text", page: 19, xPct: 0.48, yPct: 0.66, section: "I-9 Form", profileField: "email", fontSize: 9 },
  { id: "i9_phone", label: "Phone", type: "text", page: 19, xPct: 0.72, yPct: 0.66, section: "I-9 Form", profileField: "phone", fontSize: 9 },
  { id: "i9_date", label: "Date (Employee)", type: "date", page: 19, xPct: 0.72, yPct: 0.42, section: "I-9 Form", tags: ["date_mirror"], fontSize: 9 },

  // ============ PAGE 21-22 - Background Check ============
  { id: "bg_last_name", label: "Last Name", type: "text", page: 22, xPct: 0.22, yPct: 0.725, section: "Background Check", fontSize: 9 },
  { id: "bg_first_name", label: "First Name", type: "text", page: 22, xPct: 0.22, yPct: 0.695, section: "Background Check", fontSize: 9 },
  { id: "bg_middle", label: "Middle Name", type: "text", page: 22, xPct: 0.22, yPct: 0.665, section: "Background Check", fontSize: 9 },
  { id: "bg_maiden", label: "Maiden Name", type: "text", page: 22, xPct: 0.22, yPct: 0.635, section: "Background Check", fontSize: 9 },
  { id: "bg_dob", label: "Date of Birth", type: "text", page: 22, xPct: 0.22, yPct: 0.595, section: "Background Check", tags: ["dob_mirror"], profileField: "date_of_birth", fontSize: 9 },
  { id: "bg_race", label: "Race", type: "text", page: 22, xPct: 0.22, yPct: 0.565, section: "Background Check", fontSize: 9 },
  { id: "bg_sex", label: "Sex", type: "text", page: 22, xPct: 0.22, yPct: 0.535, section: "Background Check", fontSize: 9 },
  { id: "bg_ssn", label: "Social Security Number", type: "text", page: 22, xPct: 0.22, yPct: 0.505, section: "Background Check", tags: ["ssn_mirror"], profileField: "ssn", fontSize: 9 },
  { id: "bg_dl", label: "Driver's License #", type: "text", page: 22, xPct: 0.22, yPct: 0.475, section: "Background Check", fontSize: 9 },
  { id: "bg_dl_state", label: "State of Issue", type: "text", page: 22, xPct: 0.22, yPct: 0.445, section: "Background Check", fontSize: 9 },
  { id: "bg_address", label: "Mailing Address", type: "text", page: 22, xPct: 0.22, yPct: 0.405, section: "Background Check", profileField: "address", fontSize: 9 },
  { id: "bg_city", label: "City", type: "text", page: 22, xPct: 0.22, yPct: 0.375, section: "Background Check", profileField: "city", fontSize: 9 },
  { id: "bg_state", label: "State", type: "text", page: 22, xPct: 0.22, yPct: 0.345, section: "Background Check", profileField: "state", fontSize: 9 },
  { id: "bg_zip", label: "ZIP Code", type: "text", page: 22, xPct: 0.22, yPct: 0.315, section: "Background Check", profileField: "zip_code", fontSize: 9 },

  // ============ PAGE 23 - Background Check Signatures ============
  { id: "p22_sig_date_1", label: "Date (Privacy Statement)", type: "date", page: 23, xPct: 0.40, yPct: 0.595, section: "Background Signatures", tags: ["date_mirror"], fontSize: 10 },
  { id: "p22_sig_date_2", label: "Date (Statement of Oath)", type: "date", page: 23, xPct: 0.40, yPct: 0.215, section: "Background Signatures", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 24 - Medication Policy ============
  { id: "p23_date", label: "Date", type: "date", page: 24, xPct: 0.52, yPct: 0.11, section: "Medication Policy", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 25 - Lifting Restrictions ============
  { id: "p24_date", label: "Date", type: "date", page: 25, xPct: 0.55, yPct: 0.42, section: "Lifting Restrictions", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 26 - Documentation/Orientation Checklist ============
  { id: "p25_position", label: "Position Applied For", type: "text", page: 26, xPct: 0.32, yPct: 0.73, section: "Orientation Checklist", fontSize: 10 },
  { id: "p25_printed_name", label: "Applicant's Printed Name", type: "text", page: 26, xPct: 0.27, yPct: 0.115, section: "Orientation Checklist", tags: ["name_mirror"], fontSize: 10 },
  { id: "p25_alias", label: "Applicant's Alias", type: "text", page: 26, xPct: 0.20, yPct: 0.09, section: "Orientation Checklist", fontSize: 10 },
  { id: "p25_date", label: "Date", type: "date", page: 26, xPct: 0.75, yPct: 0.065, section: "Orientation Checklist", tags: ["date_mirror"], fontSize: 10 },

  // ============ PAGE 27 - TB Risk Assessment ============
  { id: "tb_name", label: "Employee Name", type: "text", page: 27, xPct: 0.28, yPct: 0.86, section: "TB Assessment", tags: ["name_mirror"], fontSize: 10 },
  { id: "tb_dob", label: "Date of Birth", type: "text", page: 27, xPct: 0.20, yPct: 0.835, section: "TB Assessment", fontSize: 10 },
  { id: "tb_date", label: "Date", type: "date", page: 27, xPct: 0.55, yPct: 0.835, section: "TB Assessment", tags: ["date_mirror"], fontSize: 10 },
  { id: "tb_job_title", label: "Job Title", type: "text", page: 27, xPct: 0.18, yPct: 0.81, section: "TB Assessment", fontSize: 10 },

  // ============ PAGE 28 - TB Assessment Results ============
  { id: "p27_emp_date", label: "Employee Signature Date", type: "date", page: 28, xPct: 0.65, yPct: 0.58, section: "TB Results", tags: ["date_mirror"], fontSize: 10 },
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
            setFormValues({ ...initial, ...(data.form_data as Record<string, string>) });
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
        if (f.tags?.includes("name_mirror")) updated[f.id] = value;
      });
    }

    // Date propagation
    if (field?.tags?.includes("date_primary")) {
      APPLICATION_FIELDS.forEach((f) => {
        if (f.tags?.includes("date_mirror")) updated[f.id] = value;
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
        if (!value || field.type === "checkbox") return;

        const page = pages[field.page - 1];
        if (!page) return;
        const { width, height } = page.getSize();

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
                      {field.type === "checkbox" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Checkbox
                            id={field.id}
                            checked={formValues[field.id] === "true"}
                            onCheckedChange={(checked) => handleFieldChange(field.id, checked ? "true" : "")}
                          />
                          <label htmlFor={field.id} className="text-xs text-muted-foreground">{field.label}</label>
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
