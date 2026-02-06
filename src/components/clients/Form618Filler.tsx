import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PdfSignatureMarker } from "@/components/clients/PdfSignatureMarker";
import { SignatureRequestDialog } from "@/components/clients/SignatureRequestDialog";
import { ChevronLeft, ChevronRight, Download, Send, ZoomIn, ZoomOut } from "lucide-react";

// Configure worker
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export interface Form618FillerHandle {
  downloadFilledPdf: () => Promise<void>;
  reset: () => void;
}

export type Form618FillerProps = {
  fileUrl: string;
  fileName?: string;
  className?: string;
  onError?: (message: string) => void;
};

// Define form field structure for the 618 form
// Coordinates are percentage-based (0-1) where 0,0 is bottom-left of PDF page
interface FormFieldDef {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "checkbox" | "signature";
  page: number;
  // Position as percentage of page dimensions (measured from bottom-left)
  xPct: number;
  yPct: number; // This is inverted - 0 = bottom, 1 = top
  // Optional width percentage for text fields
  widthPct?: number;
  fontSize?: number;
  section?: string;
}

// DMS-618 Form Field Definitions - mapped to actual PDF positions
// Page dimensions are approximately 612x792 points (8.5x11 inches)
// yPct is measured from BOTTOM of page (PDF coordinate system)
const FORM_618_FIELDS: FormFieldDef[] = [
  // ======================
  // PAGE 1 - Client and Provider Information
  // ======================
  // Section I - Client and Provider Information (table at top)
  { id: "client_name", label: "Client Name (Last/First/Middle)", type: "text", page: 1, xPct: 0.05, yPct: 0.815, section: "I. Client Information", fontSize: 9 },
  { id: "medicaid_id", label: "Medicaid ID #", type: "text", page: 1, xPct: 0.35, yPct: 0.815, section: "I. Client Information", fontSize: 9 },
  { id: "service_plan_initial", label: "Initial", type: "checkbox", page: 1, xPct: 0.575, yPct: 0.855, section: "I. Client Information" },
  { id: "service_plan_revision", label: "Revision", type: "checkbox", page: 1, xPct: 0.70, yPct: 0.855, section: "I. Client Information" },
  { id: "service_plan_renewal", label: "Renewal", type: "checkbox", page: 1, xPct: 0.82, yPct: 0.855, section: "I. Client Information" },
  { id: "client_dob", label: "Date of Birth (MM/DD/YYYY)", type: "date", page: 1, xPct: 0.60, yPct: 0.815, section: "I. Client Information", fontSize: 9 },
  
  { id: "county_residence", label: "County of Residence", type: "text", page: 1, xPct: 0.05, yPct: 0.77, section: "I. Client Information", fontSize: 9 },
  { id: "telephone", label: "Telephone Number(s)", type: "text", page: 1, xPct: 0.28, yPct: 0.77, section: "I. Client Information", fontSize: 9 },
  { id: "parent_guardian", label: "Parent(s) / Guardian(s) Name(s)", type: "text", page: 1, xPct: 0.52, yPct: 0.77, section: "I. Client Information", fontSize: 9 },
  
  { id: "mailing_address", label: "Complete Mailing Address", type: "text", page: 1, xPct: 0.05, yPct: 0.725, section: "I. Client Information", fontSize: 9, widthPct: 0.90 },
  
  // Client Resides checkboxes
  { id: "resides_alone", label: "Alone", type: "checkbox", page: 1, xPct: 0.17, yPct: 0.68, section: "I. Client Residence" },
  { id: "resides_relatives", label: "With Relatives", type: "checkbox", page: 1, xPct: 0.27, yPct: 0.68, section: "I. Client Residence" },
  { id: "resides_boarding", label: "Boarding Home", type: "checkbox", page: 1, xPct: 0.42, yPct: 0.68, section: "I. Client Residence" },
  { id: "resides_group", label: "Group Home", type: "checkbox", page: 1, xPct: 0.56, yPct: 0.68, section: "I. Client Residence" },
  { id: "resides_cbr", label: "Community-Based Residential", type: "checkbox", page: 1, xPct: 0.69, yPct: 0.68, section: "I. Client Residence" },
  { id: "resides_rcf", label: "Residential Care Facility (RCF)", type: "checkbox", page: 1, xPct: 0.05, yPct: 0.655, section: "I. Client Residence" },
  { id: "resides_other", label: "Other", type: "checkbox", page: 1, xPct: 0.28, yPct: 0.655, section: "I. Client Residence" },
  { id: "resides_other_desc", label: "Other (Describe)", type: "text", page: 1, xPct: 0.40, yPct: 0.655, section: "I. Client Residence", fontSize: 9 },
  
  // PCP Information
  { id: "pcp_name", label: "PCP Name", type: "text", page: 1, xPct: 0.05, yPct: 0.605, section: "I. PCP Information", fontSize: 9 },
  { id: "pcp_provider_id", label: "Provider ID Number/Taxonomy Code", type: "text", page: 1, xPct: 0.35, yPct: 0.605, section: "I. PCP Information", fontSize: 9 },
  { id: "pcp_last_exam", label: "Date of Last Exam", type: "date", page: 1, xPct: 0.70, yPct: 0.605, section: "I. PCP Information", fontSize: 9 },
  
  // Personal Care Provider (pre-filled but editable)
  { id: "provider_name", label: "Personal Care Provider Name", type: "text", page: 1, xPct: 0.28, yPct: 0.555, section: "I. Provider Information", fontSize: 9 },
  { id: "provider_id", label: "Provider ID Number", type: "text", page: 1, xPct: 0.05, yPct: 0.515, section: "I. Provider Information", fontSize: 9 },
  { id: "provider_address", label: "Mailing Address", type: "text", page: 1, xPct: 0.35, yPct: 0.515, section: "I. Provider Information", fontSize: 9 },
  
  // Section II - Service Locations
  { id: "location_private", label: "Private Residence", type: "checkbox", page: 1, xPct: 0.31, yPct: 0.445, section: "II. Service Locations" },
  { id: "location_rcf", label: "Residential Care Facility", type: "checkbox", page: 1, xPct: 0.46, yPct: 0.445, section: "II. Service Locations" },
  { id: "location_school", label: "School", type: "checkbox", page: 1, xPct: 0.61, yPct: 0.445, section: "II. Service Locations" },
  { id: "location_dds", label: "DDS Facility", type: "checkbox", page: 1, xPct: 0.71, yPct: 0.445, section: "II. Service Locations" },
  { id: "location_other", label: "Other (describe)", type: "checkbox", page: 1, xPct: 0.82, yPct: 0.445, section: "II. Service Locations" },
  { id: "service_location_address", label: "Service Location(s) Address(es)", type: "text", page: 1, xPct: 0.05, yPct: 0.405, section: "II. Service Locations", fontSize: 9, widthPct: 0.90 },
  
  // Section III - Dates of Service
  { id: "start_date_original", label: "Start of Care - Original (Required)", type: "date", page: 1, xPct: 0.27, yPct: 0.34, section: "III. Dates of Service", fontSize: 9 },
  { id: "start_date_per_plan", label: "Per this Service Plan", type: "date", page: 1, xPct: 0.55, yPct: 0.34, section: "III. Dates of Service", fontSize: 9 },
  { id: "projected_end_date", label: "Projected End Date (if <6 months)", type: "date", page: 1, xPct: 0.05, yPct: 0.295, section: "III. Dates of Service", fontSize: 9 },
  { id: "current_assessment_date", label: "Current Assessment Date", type: "date", page: 1, xPct: 0.38, yPct: 0.295, section: "III. Dates of Service", fontSize: 9 },
  { id: "assessing_rn", label: "Assessing RN", type: "text", page: 1, xPct: 0.60, yPct: 0.295, section: "III. Dates of Service", fontSize: 9 },
  { id: "attending_physician", label: "Attending Physician (if other than PCP)", type: "text", page: 1, xPct: 0.05, yPct: 0.255, section: "III. Dates of Service", fontSize: 9 },
  { id: "attending_physician_id", label: "Attending Physician Provider ID", type: "text", page: 1, xPct: 0.05, yPct: 0.215, section: "III. Dates of Service", fontSize: 9 },
  { id: "order_referral_date", label: "Date of Order/Referral for Assessment", type: "date", page: 1, xPct: 0.42, yPct: 0.215, section: "III. Dates of Service", fontSize: 9 },
  { id: "referral_source", label: "Referral Source", type: "text", page: 1, xPct: 0.70, yPct: 0.215, section: "III. Dates of Service", fontSize: 9 },
  
  // ======================
  // PAGE 2 - Freedom of Choice, Medical Diagnoses, Mental Status
  // ======================
  // Header fields (repeat on each page)
  { id: "p2_client_name", label: "Client's Name (Page 2)", type: "text", page: 2, xPct: 0.18, yPct: 0.94, section: "Page 2 Header", fontSize: 9 },
  { id: "p2_medicaid_id", label: "Medicaid ID # (Page 2)", type: "text", page: 2, xPct: 0.60, yPct: 0.94, section: "Page 2 Header", fontSize: 9 },
  
  // Section IV - Freedom of Choice Signature
  { id: "freedom_choice_signature", label: "Client/Representative Signature", type: "signature", page: 2, xPct: 0.05, yPct: 0.77, section: "IV. Freedom of Choice" },
  { id: "freedom_choice_date", label: "Date", type: "date", page: 2, xPct: 0.75, yPct: 0.77, section: "IV. Freedom of Choice", fontSize: 9 },
  { id: "witness_signature_1", label: "Witness Signature 1", type: "signature", page: 2, xPct: 0.05, yPct: 0.715, section: "IV. Freedom of Choice" },
  { id: "witness_signature_2", label: "Witness Signature 2", type: "signature", page: 2, xPct: 0.60, yPct: 0.715, section: "IV. Freedom of Choice" },
  
  // Section V - Medical Diagnoses (ICD codes)
  { id: "diagnosis_1_code", label: "ICD Code 1", type: "text", page: 2, xPct: 0.05, yPct: 0.575, section: "V. Medical Diagnoses", fontSize: 9 },
  { id: "diagnosis_1_desc", label: "Description 1", type: "text", page: 2, xPct: 0.22, yPct: 0.575, section: "V. Medical Diagnoses", fontSize: 9, widthPct: 0.73 },
  { id: "diagnosis_2_code", label: "ICD Code 2", type: "text", page: 2, xPct: 0.05, yPct: 0.545, section: "V. Medical Diagnoses", fontSize: 9 },
  { id: "diagnosis_2_desc", label: "Description 2", type: "text", page: 2, xPct: 0.22, yPct: 0.545, section: "V. Medical Diagnoses", fontSize: 9, widthPct: 0.73 },
  { id: "diagnosis_3_code", label: "ICD Code 3", type: "text", page: 2, xPct: 0.05, yPct: 0.515, section: "V. Medical Diagnoses", fontSize: 9 },
  { id: "diagnosis_3_desc", label: "Description 3", type: "text", page: 2, xPct: 0.22, yPct: 0.515, section: "V. Medical Diagnoses", fontSize: 9, widthPct: 0.73 },
  { id: "diagnosis_4_code", label: "ICD Code 4", type: "text", page: 2, xPct: 0.05, yPct: 0.485, section: "V. Medical Diagnoses", fontSize: 9 },
  { id: "diagnosis_4_desc", label: "Description 4", type: "text", page: 2, xPct: 0.22, yPct: 0.485, section: "V. Medical Diagnoses", fontSize: 9, widthPct: 0.73 },
  
  // Section VI - Mental Status checkboxes
  { id: "mental_clear", label: "Clear", type: "checkbox", page: 2, xPct: 0.06, yPct: 0.39, section: "VI. Mental Status" },
  { id: "mental_hyperactive", label: "Hyperactive", type: "checkbox", page: 2, xPct: 0.50, yPct: 0.39, section: "VI. Mental Status" },
  { id: "mental_somewhat_confused", label: "Somewhat confused", type: "checkbox", page: 2, xPct: 0.06, yPct: 0.365, section: "VI. Mental Status" },
  { id: "mental_withdrawn", label: "Withdrawn", type: "checkbox", page: 2, xPct: 0.50, yPct: 0.365, section: "VI. Mental Status" },
  { id: "mental_moderately_confused", label: "Moderately confused", type: "checkbox", page: 2, xPct: 0.06, yPct: 0.34, section: "VI. Mental Status" },
  { id: "mental_needs_restraint", label: "Needs restraint", type: "checkbox", page: 2, xPct: 0.50, yPct: 0.34, section: "VI. Mental Status" },
  { id: "mental_markedly_confused", label: "Markedly confused", type: "checkbox", page: 2, xPct: 0.06, yPct: 0.315, section: "VI. Mental Status" },
  { id: "mental_needs_supervision", label: "Needs supervision for personal safety", type: "checkbox", page: 2, xPct: 0.50, yPct: 0.315, section: "VI. Mental Status" },
  { id: "mental_comments", label: "Comments", type: "textarea", page: 2, xPct: 0.14, yPct: 0.285, section: "VI. Mental Status", fontSize: 9 },
  
  // ======================
  // PAGE 3 - Physical Dependency Status and ADLs
  // ======================
  { id: "p3_client_name", label: "Client's Name (Page 3)", type: "text", page: 3, xPct: 0.18, yPct: 0.94, section: "Page 3 Header", fontSize: 9 },
  { id: "p3_medicaid_id", label: "Medicaid ID # (Page 3)", type: "text", page: 3, xPct: 0.60, yPct: 0.94, section: "Page 3 Header", fontSize: 9 },
  
  // Section VII - Physical Dependency - Bedridden
  { id: "bedfast", label: "Bedfast", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.815, section: "VII. Bedridden Status" },
  { id: "requires_turning", label: "Requires turning in bed", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.79, section: "VII. Bedridden Status" },
  { id: "bed_to_chair_help", label: "Bed to chair with help", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.765, section: "VII. Bedridden Status" },
  { id: "bed_to_chair_no_help", label: "Bed to chair without help", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.74, section: "VII. Bedridden Status" },
  { id: "must_be_lifted", label: "Must be lifted into chair", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.715, section: "VII. Bedridden Status" },
  
  // Section VII - Ambulation
  { id: "walks_alone", label: "Walks alone", type: "checkbox", page: 3, xPct: 0.35, yPct: 0.815, section: "VII. Ambulation" },
  { id: "walks_with_device", label: "Walks with device", type: "checkbox", page: 3, xPct: 0.35, yPct: 0.79, section: "VII. Ambulation" },
  { id: "walks_with_help", label: "Walks with help", type: "checkbox", page: 3, xPct: 0.35, yPct: 0.765, section: "VII. Ambulation" },
  { id: "wheelchair_self", label: "Wheelchair (self)", type: "checkbox", page: 3, xPct: 0.35, yPct: 0.74, section: "VII. Ambulation" },
  { id: "wheelchair_push", label: "Wheelchair (push)", type: "checkbox", page: 3, xPct: 0.35, yPct: 0.715, section: "VII. Ambulation" },
  { id: "motorized_chair", label: "Motorized chair", type: "checkbox", page: 3, xPct: 0.35, yPct: 0.69, section: "VII. Ambulation" },
  
  // Section VII - Continence Status
  { id: "catheter", label: "Catheter", type: "checkbox", page: 3, xPct: 0.65, yPct: 0.815, section: "VII. Continence" },
  { id: "colostomy", label: "Colostomy", type: "checkbox", page: 3, xPct: 0.78, yPct: 0.815, section: "VII. Continence" },
  { id: "incontinent", label: "Incontinent", type: "checkbox", page: 3, xPct: 0.65, yPct: 0.79, section: "VII. Continence" },
  { id: "incontinent_bladder", label: "Bladder", type: "checkbox", page: 3, xPct: 0.65, yPct: 0.765, section: "VII. Continence" },
  { id: "incontinent_bowels", label: "Bowels", type: "checkbox", page: 3, xPct: 0.78, yPct: 0.765, section: "VII. Continence" },
  { id: "cannot_train", label: "Cannot Train", type: "checkbox", page: 3, xPct: 0.65, yPct: 0.715, section: "VII. Continence" },
  { id: "trained", label: "Trained", type: "checkbox", page: 3, xPct: 0.65, yPct: 0.69, section: "VII. Continence" },
  { id: "needs_training", label: "Needs Training", type: "checkbox", page: 3, xPct: 0.65, yPct: 0.665, section: "VII. Continence" },
  
  // Grooming section - Bathing
  { id: "bathing_tub", label: "Bathing: Tub", type: "checkbox", page: 3, xPct: 0.15, yPct: 0.585, section: "VII. Grooming" },
  { id: "bathing_shower", label: "Bathing: Shower", type: "checkbox", page: 3, xPct: 0.23, yPct: 0.585, section: "VII. Grooming" },
  { id: "bathing_bed", label: "Bathing: Bed", type: "checkbox", page: 3, xPct: 0.33, yPct: 0.585, section: "VII. Grooming" },
  { id: "bathing_no_help", label: "Bathing: No Help", type: "checkbox", page: 3, xPct: 0.55, yPct: 0.585, section: "VII. Grooming" },
  { id: "bathing_partial", label: "Bathing: Partial Help", type: "checkbox", page: 3, xPct: 0.68, yPct: 0.585, section: "VII. Grooming" },
  { id: "bathing_total", label: "Bathing: Total Help", type: "checkbox", page: 3, xPct: 0.82, yPct: 0.585, section: "VII. Grooming" },
  
  // Dressing
  { id: "dressing_no_help", label: "Dressing: No Help", type: "checkbox", page: 3, xPct: 0.55, yPct: 0.555, section: "VII. Grooming" },
  { id: "dressing_partial", label: "Dressing: Partial Help", type: "checkbox", page: 3, xPct: 0.68, yPct: 0.555, section: "VII. Grooming" },
  { id: "dressing_total", label: "Dressing: Total Help", type: "checkbox", page: 3, xPct: 0.82, yPct: 0.555, section: "VII. Grooming" },
  
  // Shaving
  { id: "shaving_no_help", label: "Shaving: No Help", type: "checkbox", page: 3, xPct: 0.55, yPct: 0.525, section: "VII. Grooming" },
  { id: "shaving_partial", label: "Shaving: Partial Help", type: "checkbox", page: 3, xPct: 0.68, yPct: 0.525, section: "VII. Grooming" },
  { id: "shaving_total", label: "Shaving: Total Help", type: "checkbox", page: 3, xPct: 0.82, yPct: 0.525, section: "VII. Grooming" },
  
  // Care of hair
  { id: "hair_no_help", label: "Hair Care: No Help", type: "checkbox", page: 3, xPct: 0.55, yPct: 0.495, section: "VII. Grooming" },
  { id: "hair_partial", label: "Hair Care: Partial Help", type: "checkbox", page: 3, xPct: 0.68, yPct: 0.495, section: "VII. Grooming" },
  { id: "hair_total", label: "Hair Care: Total Help", type: "checkbox", page: 3, xPct: 0.82, yPct: 0.495, section: "VII. Grooming" },
  
  // Eating checkboxes
  { id: "eat_no_help", label: "Has physical ability to eat without help", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.43, section: "VII. Eating" },
  { id: "eat_partial", label: "Needs partial help to eat", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.405, section: "VII. Eating" },
  { id: "eat_help_needed", label: "Needs help with eating", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.38, section: "VII. Eating" },
  { id: "special_diet", label: "Special diet", type: "checkbox", page: 3, xPct: 0.08, yPct: 0.355, section: "VII. Eating" },
  { id: "cannot_cut_food", label: "Cannot cut food into bite-size pieces", type: "checkbox", page: 3, xPct: 0.08, yPct: 0.33, section: "VII. Eating" },
  { id: "cannot_bring_food", label: "Cannot bring food from plate to mouth", type: "checkbox", page: 3, xPct: 0.08, yPct: 0.305, section: "VII. Eating" },
  
  // Meal preparation
  { id: "cook_no_help", label: "Has physical ability to cook without help", type: "checkbox", page: 3, xPct: 0.50, yPct: 0.43, section: "VII. Meal Prep" },
  { id: "cook_partial", label: "Needs partial help with meal prep", type: "checkbox", page: 3, xPct: 0.50, yPct: 0.405, section: "VII. Meal Prep" },
  { id: "cook_incapable", label: "Physically incapable of cooking", type: "checkbox", page: 3, xPct: 0.50, yPct: 0.38, section: "VII. Meal Prep" },
  
  // Section VIII - Activities of Daily Living
  { id: "laundry_no_help", label: "Laundry: Needs no help", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.235, section: "VIII. ADLs - Laundry" },
  { id: "laundry_partial", label: "Laundry: Needs partial help", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.21, section: "VIII. ADLs - Laundry" },
  { id: "laundry_incapable", label: "Laundry: Physically incapable", type: "checkbox", page: 3, xPct: 0.05, yPct: 0.185, section: "VIII. ADLs - Laundry" },
  
  { id: "housekeeping_no_help", label: "Housekeeping: Needs no help", type: "checkbox", page: 3, xPct: 0.35, yPct: 0.235, section: "VIII. ADLs - Housekeeping" },
  { id: "housekeeping_partial", label: "Housekeeping: Needs partial help", type: "checkbox", page: 3, xPct: 0.35, yPct: 0.21, section: "VIII. ADLs - Housekeeping" },
  { id: "housekeeping_incapable", label: "Housekeeping: Physically incapable", type: "checkbox", page: 3, xPct: 0.35, yPct: 0.185, section: "VIII. ADLs - Housekeeping" },
  
  { id: "shopping_no_help", label: "Shopping: Needs no help", type: "checkbox", page: 3, xPct: 0.65, yPct: 0.235, section: "VIII. ADLs - Shopping" },
  { id: "shopping_partial", label: "Shopping: Needs partial help", type: "checkbox", page: 3, xPct: 0.65, yPct: 0.21, section: "VIII. ADLs - Shopping" },
  { id: "shopping_incapable", label: "Shopping: Physically incapable", type: "checkbox", page: 3, xPct: 0.65, yPct: 0.185, section: "VIII. ADLs - Shopping" },
  
  // ======================
  // PAGE 4 - Assessment Narrative and Alternate Resources
  // ======================
  { id: "p4_client_name", label: "Client's Name (Page 4)", type: "text", page: 4, xPct: 0.18, yPct: 0.94, section: "Page 4 Header", fontSize: 9 },
  { id: "p4_medicaid_id", label: "Medicaid ID # (Page 4)", type: "text", page: 4, xPct: 0.60, yPct: 0.94, section: "Page 4 Header", fontSize: 9 },
  
  { id: "assessment_narrative", label: "IX. Assessment Narrative", type: "textarea", page: 4, xPct: 0.05, yPct: 0.85, section: "IX. Assessment Narrative", fontSize: 9 },
  { id: "alternate_resources", label: "X. Alternate Resources for Assistance", type: "textarea", page: 4, xPct: 0.05, yPct: 0.35, section: "X. Alternate Resources", fontSize: 9 },
  
  // ======================
  // PAGE 5 - Certification and Service Plan
  // ======================
  { id: "p5_client_name", label: "Client's Name (Page 5)", type: "text", page: 5, xPct: 0.18, yPct: 0.94, section: "Page 5 Header", fontSize: 9 },
  { id: "p5_medicaid_id", label: "Medicaid ID # (Page 5)", type: "text", page: 5, xPct: 0.60, yPct: 0.94, section: "Page 5 Header", fontSize: 9 },
  
  // Daily Totals table - Maximum/Minimum for each day
  { id: "day1_max", label: "Day 1 Maximum", type: "text", page: 5, xPct: 0.195, yPct: 0.615, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day2_max", label: "Day 2 Maximum", type: "text", page: 5, xPct: 0.28, yPct: 0.615, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day3_max", label: "Day 3 Maximum", type: "text", page: 5, xPct: 0.37, yPct: 0.615, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day4_max", label: "Day 4 Maximum", type: "text", page: 5, xPct: 0.455, yPct: 0.615, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day5_max", label: "Day 5 Maximum", type: "text", page: 5, xPct: 0.54, yPct: 0.615, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day6_max", label: "Day 6 Maximum", type: "text", page: 5, xPct: 0.625, yPct: 0.615, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day7_max", label: "Day 7 Maximum", type: "text", page: 5, xPct: 0.71, yPct: 0.615, section: "XI. Daily Totals", fontSize: 8 },
  
  { id: "day1_min", label: "Day 1 Minimum", type: "text", page: 5, xPct: 0.195, yPct: 0.585, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day2_min", label: "Day 2 Minimum", type: "text", page: 5, xPct: 0.28, yPct: 0.585, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day3_min", label: "Day 3 Minimum", type: "text", page: 5, xPct: 0.37, yPct: 0.585, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day4_min", label: "Day 4 Minimum", type: "text", page: 5, xPct: 0.455, yPct: 0.585, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day5_min", label: "Day 5 Minimum", type: "text", page: 5, xPct: 0.54, yPct: 0.585, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day6_min", label: "Day 6 Minimum", type: "text", page: 5, xPct: 0.625, yPct: 0.585, section: "XI. Daily Totals", fontSize: 8 },
  { id: "day7_min", label: "Day 7 Minimum", type: "text", page: 5, xPct: 0.71, yPct: 0.585, section: "XI. Daily Totals", fontSize: 8 },
  
  // Weekly totals
  { id: "weekly_max", label: "Weekly Maximum", type: "text", page: 5, xPct: 0.30, yPct: 0.535, section: "XI. Weekly Totals", fontSize: 9 },
  { id: "weekly_min", label: "Weekly Minimum", type: "text", page: 5, xPct: 0.55, yPct: 0.535, section: "XI. Weekly Totals", fontSize: 9 },
  
  { id: "additional_comments", label: "Additional comments", type: "textarea", page: 5, xPct: 0.05, yPct: 0.485, section: "XI. Additional Comments", fontSize: 9 },
  
  // RN Signature
  { id: "rn_signature", label: "Registered Nurse's Signature", type: "signature", page: 5, xPct: 0.55, yPct: 0.41, section: "XI. RN Signature" },
  
  // Section XII - Personal Care Service Plan Tasks table
  { id: "eating_minutes", label: "Eating - Minutes", type: "text", page: 5, xPct: 0.15, yPct: 0.285, section: "XII. Service Plan", fontSize: 9 },
  { id: "eating_days", label: "Eating - Days/wk", type: "text", page: 5, xPct: 0.25, yPct: 0.285, section: "XII. Service Plan", fontSize: 9 },
  { id: "bathing_minutes", label: "Bathing - Minutes", type: "text", page: 5, xPct: 0.15, yPct: 0.26, section: "XII. Service Plan", fontSize: 9 },
  { id: "bathing_days", label: "Bathing - Days/wk", type: "text", page: 5, xPct: 0.25, yPct: 0.26, section: "XII. Service Plan", fontSize: 9 },
  { id: "grooming_minutes", label: "Grooming - Minutes", type: "text", page: 5, xPct: 0.15, yPct: 0.235, section: "XII. Service Plan", fontSize: 9 },
  { id: "grooming_days", label: "Grooming - Days/wk", type: "text", page: 5, xPct: 0.25, yPct: 0.235, section: "XII. Service Plan", fontSize: 9 },
  { id: "toileting_minutes", label: "Toileting - Minutes", type: "text", page: 5, xPct: 0.15, yPct: 0.21, section: "XII. Service Plan", fontSize: 9 },
  { id: "toileting_days", label: "Toileting - Days/wk", type: "text", page: 5, xPct: 0.25, yPct: 0.21, section: "XII. Service Plan", fontSize: 9 },
  { id: "dressing_minutes", label: "Dressing - Minutes", type: "text", page: 5, xPct: 0.15, yPct: 0.185, section: "XII. Service Plan", fontSize: 9 },
  { id: "dressing_days", label: "Dressing - Days/wk", type: "text", page: 5, xPct: 0.25, yPct: 0.185, section: "XII. Service Plan", fontSize: 9 },
  { id: "transfer_minutes", label: "Transfer/Mobility - Minutes", type: "text", page: 5, xPct: 0.15, yPct: 0.16, section: "XII. Service Plan", fontSize: 9 },
  { id: "transfer_days", label: "Transfer/Mobility - Days/wk", type: "text", page: 5, xPct: 0.25, yPct: 0.16, section: "XII. Service Plan", fontSize: 9 },
  { id: "housekeeping_minutes", label: "Housekeeping - Minutes", type: "text", page: 5, xPct: 0.15, yPct: 0.135, section: "XII. Service Plan", fontSize: 9 },
  { id: "housekeeping_days", label: "Housekeeping - Days/wk", type: "text", page: 5, xPct: 0.25, yPct: 0.135, section: "XII. Service Plan", fontSize: 9 },
  { id: "laundry_minutes", label: "Laundry - Minutes", type: "text", page: 5, xPct: 0.15, yPct: 0.11, section: "XII. Service Plan", fontSize: 9 },
  { id: "laundry_days", label: "Laundry - Days/wk", type: "text", page: 5, xPct: 0.25, yPct: 0.11, section: "XII. Service Plan", fontSize: 9 },
  { id: "total_minutes", label: "Total Minutes", type: "text", page: 5, xPct: 0.15, yPct: 0.08, section: "XII. Service Plan", fontSize: 9 },
  
  // ======================
  // PAGE 6 - Service Plan Continued and Signatures
  // ======================
  { id: "p6_client_name", label: "Client's Name (Page 6)", type: "text", page: 6, xPct: 0.18, yPct: 0.94, section: "Page 6 Header", fontSize: 9 },
  { id: "p6_medicaid_id", label: "Medicaid ID # (Page 6)", type: "text", page: 6, xPct: 0.60, yPct: 0.94, section: "Page 6 Header", fontSize: 9 },
  
  { id: "service_plan_continued", label: "XIII. Service Plan (Continued)", type: "textarea", page: 6, xPct: 0.05, yPct: 0.855, section: "XIII. Service Plan Continued", fontSize: 9 },
  
  // Physician Authorization
  { id: "physician_signature", label: "Signature of Attending Physician", type: "signature", page: 6, xPct: 0.05, yPct: 0.305, section: "Physician Authorization" },
  { id: "physician_sig_date", label: "Date", type: "date", page: 6, xPct: 0.75, yPct: 0.305, section: "Physician Authorization", fontSize: 9 },
  
  // Client Acceptance
  { id: "client_acceptance_signature", label: "Client/Representative Signature", type: "signature", page: 6, xPct: 0.05, yPct: 0.185, section: "Client Acceptance" },
  { id: "client_acceptance_date", label: "Date", type: "date", page: 6, xPct: 0.75, yPct: 0.185, section: "Client Acceptance", fontSize: 9 },
  
  // ======================
  // PAGE 7 - Provider Notification
  // ======================
  { id: "p7_client_name", label: "Client's Name (Page 7)", type: "text", page: 7, xPct: 0.18, yPct: 0.94, section: "Page 7 Header", fontSize: 9 },
  { id: "p7_medicaid_id", label: "Medicaid ID # (Page 7)", type: "text", page: 7, xPct: 0.60, yPct: 0.94, section: "Page 7 Header", fontSize: 9 },
  
  // Additional Service-Time Increments
  { id: "add_service_time", label: "Additional Service-Time Increments", type: "text", page: 7, xPct: 0.05, yPct: 0.765, section: "XIV. Provider Notification", fontSize: 9 },
  { id: "add_begin_date", label: "Begin Date of Service", type: "date", page: 7, xPct: 0.40, yPct: 0.765, section: "XIV. Provider Notification", fontSize: 9 },
  { id: "add_end_date", label: "End Date of Service", type: "date", page: 7, xPct: 0.70, yPct: 0.765, section: "XIV. Provider Notification", fontSize: 9 },
  
  // Notification of Approval table
  { id: "procedure_code", label: "Procedure Code", type: "text", page: 7, xPct: 0.08, yPct: 0.625, section: "XIV. Approval", fontSize: 9 },
  { id: "service_increments", label: "Service-Time Increments", type: "text", page: 7, xPct: 0.22, yPct: 0.625, section: "XIV. Approval", fontSize: 9 },
  { id: "approval_begin_date", label: "Begin Date", type: "date", page: 7, xPct: 0.40, yPct: 0.625, section: "XIV. Approval", fontSize: 9 },
  { id: "approval_end_date", label: "End Date", type: "date", page: 7, xPct: 0.58, yPct: 0.625, section: "XIV. Approval", fontSize: 9 },
  { id: "control_number", label: "Control Number", type: "text", page: 7, xPct: 0.75, yPct: 0.625, section: "XIV. Approval", fontSize: 9 },
  
  // UR Nurse signatures
  { id: "ur_nurse_approval_sig", label: "Signature of UR Nurse (Approval)", type: "signature", page: 7, xPct: 0.05, yPct: 0.535, section: "XIV. Approval" },
  { id: "ur_nurse_approval_date", label: "Date", type: "date", page: 7, xPct: 0.55, yPct: 0.535, section: "XIV. Approval", fontSize: 9 },
  { id: "dms_director_approval_sig", label: "Signature of DMS Medical Director (Approval)", type: "signature", page: 7, xPct: 0.05, yPct: 0.49, section: "XIV. Approval" },
  { id: "dms_director_approval_date", label: "Date", type: "date", page: 7, xPct: 0.55, yPct: 0.49, section: "XIV. Approval", fontSize: 9 },
  
  // Notification of Denial
  { id: "ur_nurse_denial_sig", label: "Signature of UR Nurse (Denial)", type: "signature", page: 7, xPct: 0.05, yPct: 0.365, section: "XIV. Denial" },
  { id: "ur_nurse_denial_date", label: "Date", type: "date", page: 7, xPct: 0.55, yPct: 0.365, section: "XIV. Denial", fontSize: 9 },
  { id: "dms_director_denial_sig", label: "Signature of DMS Medical Director (Denial)", type: "signature", page: 7, xPct: 0.05, yPct: 0.32, section: "XIV. Denial" },
  { id: "dms_director_denial_date", label: "Date", type: "date", page: 7, xPct: 0.55, yPct: 0.32, section: "XIV. Denial", fontSize: 9 },
];

// Group fields by section for organized display
function groupFieldsBySection(fields: FormFieldDef[]): Map<string, FormFieldDef[]> {
  const grouped = new Map<string, FormFieldDef[]>();
  for (const field of fields) {
    const section = field.section || "Other";
    if (!grouped.has(section)) {
      grouped.set(section, []);
    }
    grouped.get(section)!.push(field);
  }
  return grouped;
}

export const Form618Filler = forwardRef<Form618FillerHandle, Form618FillerProps>(
  ({ fileUrl, fileName = "618-filled.pdf", className, onError }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
    const [doc, setDoc] = useState<any>(null);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [containerWidth, setContainerWidth] = useState(0);
    
    const [formValues, setFormValues] = useState<Record<string, string | boolean | null>>({});
    const [showSignatureRequest, setShowSignatureRequest] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 0.5 = 50%, 2 = 200%

    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 2.5;
    const ZOOM_STEP = 0.25;

    const safeFileName = useMemo(() => {
      const base = fileName?.trim() || "618-filled.pdf";
      return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
    }, [fileName]);

    const groupedFields = useMemo(() => groupFieldsBySection(FORM_618_FIELDS), []);

    // Load PDF
    useEffect(() => {
      let cancelled = false;

      async function load() {
        if (!fileUrl) return;
        setLoading(true);
        setError(null);

        try {
          const res = await fetch(fileUrl, { cache: "no-store" });
          if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
          const buf = await res.arrayBuffer();
          if (cancelled) return;

          const bufferCopy = buf.slice(0);
          setPdfBytes(bufferCopy);

          const loadingTask = (pdfjsLib as any).getDocument({ data: buf.slice(0) });
          const loaded = await loadingTask.promise;
          if (cancelled) return;

          setDoc(loaded);
          setPageCount(loaded.numPages);
          setCurrentPage(1);
        } catch (e: any) {
          const msg = e?.message || "Failed to load PDF.";
          setError(msg);
          onError?.(msg);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      load();
      return () => {
        cancelled = true;
      };
    }, [fileUrl, onError]);

    // Observe container width
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect?.width ?? 0;
        setContainerWidth(w);
      });

      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Render current page
    useEffect(() => {
      let cancelled = false;

      async function render() {
        if (!doc || !canvasRef.current) return;

        try {
          const pdfPage = await doc.getPage(currentPage);
          if (cancelled) return;

          const baseViewport = pdfPage.getViewport({ scale: 1 });
          const w = containerWidth || containerRef.current?.clientWidth || 400;
          const padded = Math.max(0, w - 16);
          // Apply zoom level to the base scale
          let renderScale = (padded / baseViewport.width) * zoomLevel;
          renderScale = Math.max(0.3, Math.min(4, renderScale));

          const viewport = pdfPage.getViewport({ scale: renderScale });
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        } catch (e: any) {
          console.error("Render error:", e);
        }
      }

      render();
      return () => {
        cancelled = true;
      };
    }, [doc, currentPage, containerWidth, zoomLevel]);

    function handleFieldChange(fieldId: string, value: string | boolean | null) {
      setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    }

    async function downloadFilledPdf() {
      if (!pdfBytes) throw new Error("PDF not loaded yet");

      try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        for (const field of FORM_618_FIELDS) {
          const value = formValues[field.id];
          if (!value) continue;

          const targetPage = pages[field.page - 1];
          if (!targetPage) continue;

          const { width, height } = targetPage.getSize();
          const x = field.xPct * width;
          const fontSize = field.fontSize || 10;

          if (field.type === "signature" && typeof value === "string") {
            // Embed signature image
            try {
              const sigBytes = await fetch(value).then((r) => r.arrayBuffer());
              const sigImage = await pdfDoc.embedPng(new Uint8Array(sigBytes));
              
              const maxWidth = 100;
              const maxHeight = 30;
              const scale = Math.min(maxWidth / sigImage.width, maxHeight / sigImage.height, 1);
              const sigWidth = sigImage.width * scale;
              const sigHeight = sigImage.height * scale;
              
              // yPct is from bottom, so y = yPct * height
              const y = field.yPct * height;

              targetPage.drawImage(sigImage, {
                x,
                y,
                width: sigWidth,
                height: sigHeight,
              });
            } catch (sigError) {
              console.error("Failed to embed signature:", sigError);
            }
          } else if (typeof value === "string" && value.trim()) {
            // yPct is from bottom, so y = yPct * height
            const y = field.yPct * height;

            // Handle multiline text for textareas
            if (field.type === "textarea") {
              const lines = value.split("\n");
              let yOffset = 0;
              for (const line of lines) {
                targetPage.drawText(line, {
                  x,
                  y: y - yOffset,
                  size: fontSize,
                  font,
                  color: rgb(0, 0, 0),
                });
                yOffset += fontSize + 2;
              }
            } else {
              targetPage.drawText(value, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
              });
            }
          } else if (field.type === "checkbox" && value === true) {
            // Draw checkmark
            const y = field.yPct * height;
            targetPage.drawText("✓", {
              x: x - 3,
              y: y - 3,
              size: 10,
              font,
              color: rgb(0, 0, 0),
            });
          }
        }

        const out = await pdfDoc.save();
        const outBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
        const blob = new Blob([outBuffer], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = safeFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (e: any) {
        const msg = e?.message || "Could not generate the filled PDF.";
        setError(msg);
        onError?.(msg);
        throw e;
      }
    }

    function reset() {
      setFormValues({});
      setCurrentPage(1);
      setError(null);
    }

    useImperativeHandle(ref, () => ({
      downloadFilledPdf,
      reset,
    }));

    // Get fields for current page
    const currentPageFields = useMemo(() => {
      const pageFields = FORM_618_FIELDS.filter(f => f.page === currentPage);
      return groupFieldsBySection(pageFields);
    }, [currentPage]);

    return (
      <div className={cn("flex h-full max-h-full overflow-hidden", className)}>
        {/* PDF Preview */}
        <div ref={containerRef} className="flex-1 min-w-0 flex flex-col border-r overflow-hidden">
          <div className="flex items-center gap-2 p-2 border-b bg-muted/30 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={loading || currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} / {pageCount || "…"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pageCount || 1, p + 1))}
              disabled={loading || currentPage >= (pageCount || 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <div className="h-4 w-px bg-border mx-1" />
            
            {/* Zoom Controls */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
              disabled={loading || zoomLevel <= ZOOM_MIN}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3.5rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
              disabled={loading || zoomLevel >= ZOOM_MAX}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSignatureRequest(true)}
            >
              <Send className="h-4 w-4 mr-1" />
              Request Signature
            </Button>
          </div>
          
          <div className="flex-1 min-h-0 overflow-auto p-2">
            <canvas ref={canvasRef} className="block mx-auto max-w-full" />
            {loading && <div className="p-3 text-sm text-muted-foreground text-center">Loading…</div>}
          </div>
        </div>

        {/* Form Fields Panel - Shows fields for current page */}
        <div className="w-80 shrink-0 flex flex-col overflow-hidden bg-background">
          <div className="p-3 border-b shrink-0">
            <h3 className="font-semibold text-sm">DMS-618 Personal Care Assessment</h3>
            <p className="text-xs text-muted-foreground mt-1">Page {currentPage} of {pageCount || 7} — Fill fields below</p>
          </div>
          
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-4">
              {currentPageFields.size === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No fillable fields on this page
                </p>
              ) : (
                Array.from(currentPageFields.entries()).map(([section, fields]) => (
                  <div key={section} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{section}</span>
                      <Separator className="flex-1" />
                    </div>
                    
                    {fields.map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <Label className="text-xs">{field.label}</Label>
                        
                        {field.type === "text" && (
                          <Input
                            value={typeof formValues[field.id] === "string" ? (formValues[field.id] as string) : ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            className="h-8 text-sm"
                          />
                        )}
                        
                        {field.type === "date" && (
                          <Input
                            type="date"
                            value={typeof formValues[field.id] === "string" ? (formValues[field.id] as string) : ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            className="h-8 text-sm"
                          />
                        )}
                        
                        {field.type === "textarea" && (
                          <Textarea
                            value={typeof formValues[field.id] === "string" ? (formValues[field.id] as string) : ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            rows={3}
                            className="text-sm resize-none"
                          />
                        )}
                        
                        {field.type === "checkbox" && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={formValues[field.id] === true}
                              onCheckedChange={(checked) => handleFieldChange(field.id, checked === true)}
                            />
                            <span className="text-xs text-muted-foreground">Check if applicable</span>
                          </div>
                        )}
                        
                        {field.type === "signature" && (
                          <PdfSignatureMarker
                            signatureData={typeof formValues[field.id] === "string" ? (formValues[field.id] as string) : null}
                            onSignatureChange={(data) => handleFieldChange(field.id, data)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="p-3 border-t space-y-2 shrink-0">
            <Button
              className="w-full"
              onClick={async () => {
                try {
                  await downloadFilledPdf();
                } catch {
                  // Error already handled
                }
              }}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Save Filled PDF
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={reset}
              disabled={loading}
            >
              Reset Form
            </Button>
          </div>
        </div>

        {/* Signature Request Dialog */}
        <SignatureRequestDialog
          open={showSignatureRequest}
          onOpenChange={setShowSignatureRequest}
          documentName={safeFileName}
        />
      </div>
    );
  }
);

Form618Filler.displayName = "Form618Filler";
