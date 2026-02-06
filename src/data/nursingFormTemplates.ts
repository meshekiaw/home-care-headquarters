import { FormField } from "@/components/forms/FormFieldRenderer";

export interface NursingFormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'assessment' | 'visit' | 'supervisory' | 'discharge' | 'oasis';
  fields: FormField[];
}

export const nursingFormTemplates: NursingFormTemplate[] = [
  {
    id: 'initial-assessment',
    name: 'Initial Nursing Assessment',
    description: 'Comprehensive initial assessment for new clients (485/SOC)',
    category: 'assessment',
    fields: [
      { id: 'section-patient', type: 'section', label: 'Patient Information' },
      { id: 'patient_name', type: 'text', label: 'Patient Name', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'assessment_date', type: 'date', label: 'Assessment Date', required: true, width: 'half' },
      { id: 'soc_date', type: 'date', label: 'Start of Care Date', required: true, width: 'half' },
      { id: 'primary_diagnosis', type: 'text', label: 'Primary Diagnosis (ICD-10)', required: true },
      { id: 'secondary_diagnoses', type: 'textarea', label: 'Secondary Diagnoses', placeholder: 'List all secondary diagnoses with ICD-10 codes...' },
      
      { id: 'section-physician', type: 'section', label: 'Physician Information' },
      { id: 'attending_physician', type: 'text', label: 'Attending Physician', required: true, width: 'half' },
      { id: 'physician_phone', type: 'phone', label: 'Physician Phone', required: true, width: 'half' },
      { id: 'physician_npi', type: 'text', label: 'Physician NPI', width: 'half' },
      
      { id: 'section-vitals', type: 'section', label: 'Vital Signs' },
      { id: 'blood_pressure', type: 'text', label: 'Blood Pressure', placeholder: 'e.g., 120/80', width: 'half' },
      { id: 'pulse', type: 'text', label: 'Pulse', placeholder: 'e.g., 72 bpm', width: 'half' },
      { id: 'temperature', type: 'text', label: 'Temperature', placeholder: 'e.g., 98.6°F', width: 'half' },
      { id: 'respirations', type: 'text', label: 'Respirations', placeholder: 'e.g., 16/min', width: 'half' },
      { id: 'oxygen_saturation', type: 'text', label: 'O2 Saturation', placeholder: 'e.g., 98%', width: 'half' },
      { id: 'weight', type: 'text', label: 'Weight', placeholder: 'e.g., 165 lbs', width: 'half' },
      { id: 'height', type: 'text', label: 'Height', placeholder: 'e.g., 5\'8"', width: 'half' },
      { id: 'pain_level', type: 'select', label: 'Pain Level (0-10)', options: ['0 - No Pain', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10 - Severe'], width: 'half' },
      
      { id: 'section-functional', type: 'section', label: 'Functional Status Assessment' },
      { id: 'ambulation', type: 'select', label: 'Ambulation', required: true, options: ['Independent', 'Supervised', 'Assistance Required', 'Wheelchair Bound', 'Bedbound'] },
      { id: 'transfer_status', type: 'select', label: 'Transfer Status', required: true, options: ['Independent', 'Standby Assist', 'Minimal Assist', 'Moderate Assist', 'Maximum Assist', 'Dependent'] },
      { id: 'adl_bathing', type: 'select', label: 'Bathing', options: ['Independent', 'Supervision', 'Limited Assistance', 'Extensive Assistance', 'Dependent'], width: 'half' },
      { id: 'adl_dressing', type: 'select', label: 'Dressing', options: ['Independent', 'Supervision', 'Limited Assistance', 'Extensive Assistance', 'Dependent'], width: 'half' },
      { id: 'adl_toileting', type: 'select', label: 'Toileting', options: ['Independent', 'Supervision', 'Limited Assistance', 'Extensive Assistance', 'Dependent'], width: 'half' },
      { id: 'adl_feeding', type: 'select', label: 'Eating', options: ['Independent', 'Supervision', 'Limited Assistance', 'Extensive Assistance', 'Dependent'], width: 'half' },
      { id: 'fall_risk', type: 'select', label: 'Fall Risk Assessment', required: true, options: ['Low Risk', 'Moderate Risk', 'High Risk'] },
      
      { id: 'section-cognitive', type: 'section', label: 'Cognitive/Mental Status' },
      { id: 'orientation', type: 'select', label: 'Orientation', options: ['Oriented x4', 'Oriented x3', 'Oriented x2', 'Oriented x1', 'Disoriented'] },
      { id: 'memory', type: 'select', label: 'Memory', options: ['Intact', 'Mild Impairment', 'Moderate Impairment', 'Severe Impairment'] },
      { id: 'depression_screening', type: 'select', label: 'Depression Screening (PHQ-2)', options: ['Negative', 'Positive - Needs Follow-up'] },
      { id: 'cognitive_notes', type: 'textarea', label: 'Cognitive Assessment Notes', placeholder: 'Additional observations...' },
      
      { id: 'section-skin', type: 'section', label: 'Skin Assessment' },
      { id: 'skin_condition', type: 'select', label: 'Overall Skin Condition', options: ['Intact', 'Compromised', 'Wounds Present'] },
      { id: 'pressure_ulcer_risk', type: 'select', label: 'Pressure Ulcer Risk (Braden)', options: ['Low Risk (15-18)', 'Moderate Risk (13-14)', 'High Risk (10-12)', 'Very High Risk (≤9)'] },
      { id: 'wound_description', type: 'textarea', label: 'Wound Description (if applicable)', placeholder: 'Location, size, stage, drainage...' },
      
      { id: 'section-medications', type: 'section', label: 'Medication Review' },
      { id: 'medication_list', type: 'textarea', label: 'Current Medications', required: true, placeholder: 'List all medications with dosage and frequency...' },
      { id: 'medication_management', type: 'select', label: 'Medication Management Ability', options: ['Independent', 'Needs Reminders', 'Needs Setup', 'Needs Administration'] },
      { id: 'medication_issues', type: 'textarea', label: 'Medication Issues/Concerns', placeholder: 'Allergies, interactions, compliance issues...' },
      
      { id: 'section-plan', type: 'section', label: 'Plan of Care' },
      { id: 'skilled_services', type: 'textarea', label: 'Skilled Nursing Services Required', required: true, placeholder: 'List all skilled services needed...' },
      { id: 'visit_frequency', type: 'text', label: 'Recommended Visit Frequency', required: true, placeholder: 'e.g., 2W2, 1W4, 2M1' },
      { id: 'goals', type: 'textarea', label: 'Care Goals', required: true, placeholder: 'Measurable patient-centered goals...' },
      { id: 'discharge_plan', type: 'textarea', label: 'Anticipated Discharge Plan', placeholder: 'Expected outcomes and discharge criteria...' },
      
      { id: 'section-signature', type: 'section', label: 'Nurse Certification' },
      { id: 'rn_certification', type: 'checkbox', label: 'I certify that this assessment is accurate and complete based on my professional evaluation', required: true },
      { id: 'nurse_signature', type: 'signature', label: 'RN Signature', required: true },
      { id: 'signature_date', type: 'date', label: 'Date', required: true, width: 'half' },
    ]
  },
  {
    id: 'skilled-nursing-visit',
    name: 'Skilled Nursing Visit Note',
    description: 'Document routine skilled nursing visits',
    category: 'visit',
    fields: [
      { id: 'section-visit', type: 'section', label: 'Visit Information' },
      { id: 'patient_name', type: 'text', label: 'Patient Name', required: true, width: 'half' },
      { id: 'visit_date', type: 'date', label: 'Visit Date', required: true, width: 'half' },
      { id: 'time_in', type: 'text', label: 'Time In', placeholder: 'e.g., 9:00 AM', width: 'half' },
      { id: 'time_out', type: 'text', label: 'Time Out', placeholder: 'e.g., 9:45 AM', width: 'half' },
      { id: 'visit_type', type: 'select', label: 'Visit Type', required: true, options: ['Routine Visit', 'PRN Visit', 'Recertification', 'Discharge Visit', 'Supervisory Visit'] },
      
      { id: 'section-vitals', type: 'section', label: 'Vital Signs' },
      { id: 'blood_pressure', type: 'text', label: 'Blood Pressure', placeholder: 'e.g., 120/80', width: 'half' },
      { id: 'pulse', type: 'text', label: 'Pulse', placeholder: 'e.g., 72 bpm', width: 'half' },
      { id: 'temperature', type: 'text', label: 'Temperature', placeholder: 'e.g., 98.6°F', width: 'half' },
      { id: 'respirations', type: 'text', label: 'Respirations', placeholder: 'e.g., 16/min', width: 'half' },
      { id: 'oxygen_saturation', type: 'text', label: 'O2 Saturation', placeholder: 'e.g., 98%', width: 'half' },
      { id: 'weight', type: 'text', label: 'Weight', placeholder: 'e.g., 165 lbs', width: 'half' },
      { id: 'pain_level', type: 'select', label: 'Pain Level', options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], width: 'half' },
      { id: 'pain_location', type: 'text', label: 'Pain Location', width: 'half' },
      
      { id: 'section-assessment', type: 'section', label: 'Nursing Assessment' },
      { id: 'general_appearance', type: 'select', label: 'General Appearance', options: ['No Distress', 'Mild Distress', 'Moderate Distress', 'Severe Distress'] },
      { id: 'mental_status', type: 'select', label: 'Mental Status', options: ['Alert & Oriented', 'Confused', 'Lethargic', 'Unresponsive'] },
      { id: 'skin_assessment', type: 'select', label: 'Skin Assessment', options: ['Intact', 'Impaired - See Notes'] },
      { id: 'respiratory_status', type: 'select', label: 'Respiratory Status', options: ['Normal', 'Labored', 'Wheezing', 'Shortness of Breath'] },
      { id: 'edema', type: 'select', label: 'Edema', options: ['None', 'Trace', '+1', '+2', '+3', '+4'] },
      { id: 'assessment_notes', type: 'textarea', label: 'Assessment Notes', placeholder: 'Document any changes or concerns...' },
      
      { id: 'section-interventions', type: 'section', label: 'Skilled Interventions Performed' },
      { id: 'wound_care', type: 'checkbox', label: 'Wound Care' },
      { id: 'wound_care_notes', type: 'textarea', label: 'Wound Care Details', placeholder: 'Describe wound care performed...' },
      { id: 'medication_management', type: 'checkbox', label: 'Medication Management/Teaching' },
      { id: 'medication_notes', type: 'textarea', label: 'Medication Notes', placeholder: 'Medication changes, teaching provided...' },
      { id: 'disease_education', type: 'checkbox', label: 'Disease Process Education' },
      { id: 'catheter_care', type: 'checkbox', label: 'Catheter Care' },
      { id: 'iv_therapy', type: 'checkbox', label: 'IV Therapy/Infusion' },
      { id: 'lab_draw', type: 'checkbox', label: 'Lab Draw' },
      { id: 'other_interventions', type: 'textarea', label: 'Other Interventions', placeholder: 'List other skilled services provided...' },
      
      { id: 'section-response', type: 'section', label: 'Patient Response' },
      { id: 'patient_response', type: 'select', label: 'Response to Interventions', options: ['Improved', 'Stable', 'Declined', 'N/A'] },
      { id: 'goal_progress', type: 'select', label: 'Progress Toward Goals', options: ['Met', 'Progressing', 'Regressed', 'No Change'] },
      { id: 'patient_teaching', type: 'textarea', label: 'Patient/Caregiver Teaching', placeholder: 'Education provided and understanding demonstrated...' },
      
      { id: 'section-plan', type: 'section', label: 'Plan' },
      { id: 'next_visit', type: 'date', label: 'Next Scheduled Visit', width: 'half' },
      { id: 'md_notification', type: 'checkbox', label: 'Physician Notification Required' },
      { id: 'md_notification_reason', type: 'textarea', label: 'Reason for MD Notification', placeholder: 'If notifying physician, document reason and response...' },
      { id: 'plan_changes', type: 'textarea', label: 'Care Plan Changes', placeholder: 'Any changes to the plan of care...' },
      
      { id: 'section-signature', type: 'section', label: 'Nurse Signature' },
      { id: 'nurse_signature', type: 'signature', label: 'RN Signature', required: true },
      { id: 'signature_date', type: 'date', label: 'Date', required: true, width: 'half' },
    ]
  },
  {
    id: 'supervisory-visit',
    name: 'Supervisory Visit Form',
    description: 'RN supervisory visit for home health aides',
    category: 'supervisory',
    fields: [
      { id: 'section-info', type: 'section', label: 'Visit Information' },
      { id: 'patient_name', type: 'text', label: 'Patient Name', required: true, width: 'half' },
      { id: 'visit_date', type: 'date', label: 'Visit Date', required: true, width: 'half' },
      { id: 'aide_name', type: 'text', label: 'Aide Name', required: true, width: 'half' },
      { id: 'supervisor_name', type: 'text', label: 'RN Supervisor', required: true, width: 'half' },
      { id: 'visit_type', type: 'select', label: 'Supervision Type', required: true, options: ['In-Person Observation', 'Patient Contact Only', 'Both'] },
      
      { id: 'section-patient', type: 'section', label: 'Patient Status' },
      { id: 'patient_condition', type: 'select', label: 'Overall Condition', options: ['Improved', 'Stable', 'Declined'] },
      { id: 'patient_satisfaction', type: 'select', label: 'Patient Satisfaction with Aide', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'] },
      { id: 'patient_concerns', type: 'textarea', label: 'Patient/Family Concerns', placeholder: 'Any concerns expressed...' },
      
      { id: 'section-aide', type: 'section', label: 'Aide Performance Observation' },
      { id: 'punctuality', type: 'select', label: 'Punctuality', options: ['Excellent', 'Satisfactory', 'Needs Improvement'] },
      { id: 'personal_care', type: 'select', label: 'Personal Care Skills', options: ['Excellent', 'Satisfactory', 'Needs Improvement', 'N/A'] },
      { id: 'safety_awareness', type: 'select', label: 'Safety Awareness', options: ['Excellent', 'Satisfactory', 'Needs Improvement'] },
      { id: 'infection_control', type: 'select', label: 'Infection Control Practices', options: ['Excellent', 'Satisfactory', 'Needs Improvement'] },
      { id: 'documentation', type: 'select', label: 'Documentation', options: ['Excellent', 'Satisfactory', 'Needs Improvement'] },
      { id: 'communication', type: 'select', label: 'Communication with Patient/Family', options: ['Excellent', 'Satisfactory', 'Needs Improvement'] },
      { id: 'follows_care_plan', type: 'select', label: 'Follows Care Plan', options: ['Yes', 'Partially', 'No'] },
      
      { id: 'section-care-plan', type: 'section', label: 'Care Plan Review' },
      { id: 'care_plan_current', type: 'select', label: 'Care Plan Current?', options: ['Yes', 'Needs Update'] },
      { id: 'care_plan_changes', type: 'textarea', label: 'Recommended Care Plan Changes', placeholder: 'Any changes needed to aide duties or care plan...' },
      
      { id: 'section-training', type: 'section', label: 'In-Service Training' },
      { id: 'training_provided', type: 'checkbox', label: 'In-Service Training Provided' },
      { id: 'training_topic', type: 'text', label: 'Training Topic(s)', placeholder: 'e.g., Infection control, transfer techniques...' },
      { id: 'training_notes', type: 'textarea', label: 'Training Notes', placeholder: 'Details of training provided...' },
      
      { id: 'section-summary', type: 'section', label: 'Summary' },
      { id: 'overall_rating', type: 'select', label: 'Overall Aide Performance', required: true, options: ['Excellent', 'Satisfactory', 'Needs Improvement', 'Unsatisfactory'] },
      { id: 'action_needed', type: 'textarea', label: 'Action/Follow-up Needed', placeholder: 'Any corrective action or follow-up required...' },
      { id: 'next_supervisory_date', type: 'date', label: 'Next Supervisory Visit Due', width: 'half' },
      
      { id: 'section-signatures', type: 'section', label: 'Signatures' },
      { id: 'rn_signature', type: 'signature', label: 'RN Supervisor Signature', required: true },
      { id: 'rn_sign_date', type: 'date', label: 'Date', required: true, width: 'half' },
      { id: 'aide_reviewed', type: 'checkbox', label: 'Aide reviewed and acknowledged this evaluation' },
    ]
  },
  {
    id: 'recertification-assessment',
    name: 'Recertification Assessment',
    description: '60-day recertification nursing assessment',
    category: 'assessment',
    fields: [
      { id: 'section-patient', type: 'section', label: 'Patient Information' },
      { id: 'patient_name', type: 'text', label: 'Patient Name', required: true, width: 'half' },
      { id: 'assessment_date', type: 'date', label: 'Assessment Date', required: true, width: 'half' },
      { id: 'cert_period_start', type: 'date', label: 'Certification Period Start', required: true, width: 'half' },
      { id: 'cert_period_end', type: 'date', label: 'Certification Period End', required: true, width: 'half' },
      { id: 'primary_diagnosis', type: 'text', label: 'Primary Diagnosis', required: true },
      
      { id: 'section-status', type: 'section', label: 'Status Since Last Assessment' },
      { id: 'overall_status', type: 'select', label: 'Overall Status Change', required: true, options: ['Improved', 'Stable', 'Declined'] },
      { id: 'status_summary', type: 'textarea', label: 'Summary of Status Changes', required: true, placeholder: 'Describe changes since last certification period...' },
      { id: 'hospitalizations', type: 'checkbox', label: 'Hospitalizations During Period' },
      { id: 'hospital_details', type: 'textarea', label: 'Hospitalization Details', placeholder: 'If applicable, describe hospitalizations...' },
      
      { id: 'section-goals', type: 'section', label: 'Goal Achievement Review' },
      { id: 'goal_1_status', type: 'select', label: 'Goal 1 Status', options: ['Met', 'Partially Met', 'Not Met', 'Ongoing'] },
      { id: 'goal_1_notes', type: 'text', label: 'Goal 1 Notes', placeholder: 'Progress notes...' },
      { id: 'goal_2_status', type: 'select', label: 'Goal 2 Status', options: ['Met', 'Partially Met', 'Not Met', 'Ongoing'] },
      { id: 'goal_2_notes', type: 'text', label: 'Goal 2 Notes', placeholder: 'Progress notes...' },
      { id: 'goal_3_status', type: 'select', label: 'Goal 3 Status', options: ['Met', 'Partially Met', 'Not Met', 'Ongoing'] },
      { id: 'goal_3_notes', type: 'text', label: 'Goal 3 Notes', placeholder: 'Progress notes...' },
      
      { id: 'section-continued', type: 'section', label: 'Continued Need for Services' },
      { id: 'homebound_status', type: 'select', label: 'Homebound Status', required: true, options: ['Yes - Homebound', 'No - Not Homebound'] },
      { id: 'homebound_reason', type: 'textarea', label: 'Homebound Reason', required: true, placeholder: 'Describe why patient is homebound...' },
      { id: 'skilled_need', type: 'textarea', label: 'Continued Need for Skilled Services', required: true, placeholder: 'Justify continued skilled nursing needs...' },
      { id: 'recommend_cont', type: 'select', label: 'Recommend Continued Services', required: true, options: ['Yes', 'No - Ready for Discharge'] },
      
      { id: 'section-new-plan', type: 'section', label: 'Updated Plan of Care' },
      { id: 'new_goals', type: 'textarea', label: 'New/Revised Goals', placeholder: 'Goals for next certification period...' },
      { id: 'new_frequency', type: 'text', label: 'Visit Frequency', placeholder: 'e.g., 1W4, 1W8' },
      { id: 'expected_discharge', type: 'date', label: 'Expected Discharge Date', width: 'half' },
      
      { id: 'section-signature', type: 'section', label: 'Certification' },
      { id: 'rn_certification', type: 'checkbox', label: 'I certify that this patient continues to meet criteria for home health services', required: true },
      { id: 'nurse_signature', type: 'signature', label: 'RN Signature', required: true },
      { id: 'signature_date', type: 'date', label: 'Date', required: true, width: 'half' },
    ]
  },
  {
    id: 'discharge-summary',
    name: 'Discharge Summary',
    description: 'Patient discharge documentation',
    category: 'discharge',
    fields: [
      { id: 'section-patient', type: 'section', label: 'Patient Information' },
      { id: 'patient_name', type: 'text', label: 'Patient Name', required: true, width: 'half' },
      { id: 'discharge_date', type: 'date', label: 'Discharge Date', required: true, width: 'half' },
      { id: 'soc_date', type: 'date', label: 'Original SOC Date', width: 'half' },
      { id: 'total_visits', type: 'text', label: 'Total Visits Completed', width: 'half' },
      
      { id: 'section-reason', type: 'section', label: 'Discharge Information' },
      { id: 'discharge_reason', type: 'select', label: 'Discharge Reason', required: true, options: [
        'Goals Met', 
        'Patient Request', 
        'Physician Order', 
        'Hospitalization',
        'Transfer to SNF/Rehab',
        'Moved Out of Service Area',
        'Deceased',
        'Lost to Follow-up',
        'Non-compliance',
        'Insurance/Payor Issues',
        'Other'
      ] },
      { id: 'discharge_reason_other', type: 'text', label: 'If Other, Specify' },
      { id: 'discharge_disposition', type: 'select', label: 'Discharge Disposition', required: true, options: [
        'Home - Independent',
        'Home - With Caregiver',
        'Hospital',
        'Skilled Nursing Facility',
        'Rehabilitation Facility',
        'Hospice',
        'Deceased',
        'Other'
      ] },
      
      { id: 'section-goals', type: 'section', label: 'Goal Achievement at Discharge' },
      { id: 'goals_summary', type: 'textarea', label: 'Goals Met/Not Met Summary', required: true, placeholder: 'Summarize achievement of care plan goals...' },
      
      { id: 'section-status', type: 'section', label: 'Status at Discharge' },
      { id: 'functional_status', type: 'select', label: 'Functional Status at Discharge', options: ['Improved', 'Stable', 'Declined'] },
      { id: 'adl_summary', type: 'textarea', label: 'ADL Status Summary', placeholder: 'Current ability with activities of daily living...' },
      { id: 'cognitive_status', type: 'select', label: 'Cognitive Status', options: ['Intact', 'Mild Impairment', 'Moderate Impairment', 'Severe Impairment'] },
      { id: 'pain_management', type: 'select', label: 'Pain Management at Discharge', options: ['Well Controlled', 'Partially Controlled', 'Poorly Controlled', 'N/A'] },
      
      { id: 'section-medications', type: 'section', label: 'Medications at Discharge' },
      { id: 'medication_list', type: 'textarea', label: 'Current Medication List', required: true, placeholder: 'List all medications at time of discharge...' },
      { id: 'med_management_ability', type: 'select', label: 'Medication Self-Management Ability', options: ['Independent', 'Needs Reminders', 'Needs Setup', 'Needs Administration'] },
      
      { id: 'section-instructions', type: 'section', label: 'Discharge Instructions' },
      { id: 'patient_education', type: 'textarea', label: 'Education Provided at Discharge', placeholder: 'Summary of patient/caregiver education...' },
      { id: 'follow_up', type: 'textarea', label: 'Follow-up Appointments', placeholder: 'Scheduled physician appointments...' },
      { id: 'emergency_instructions', type: 'textarea', label: 'Emergency Instructions', placeholder: 'When to seek immediate medical attention...' },
      { id: 'additional_instructions', type: 'textarea', label: 'Additional Instructions', placeholder: 'Other discharge instructions...' },
      
      { id: 'section-communication', type: 'section', label: 'Communication' },
      { id: 'md_notified', type: 'checkbox', label: 'Physician notified of discharge' },
      { id: 'md_notification_date', type: 'date', label: 'Date Notified', width: 'half' },
      { id: 'family_notified', type: 'checkbox', label: 'Family/Caregiver notified' },
      { id: 'referrals_made', type: 'textarea', label: 'Referrals Made', placeholder: 'Any referrals to other services...' },
      
      { id: 'section-signature', type: 'section', label: 'Nurse Certification' },
      { id: 'discharge_summary_complete', type: 'checkbox', label: 'I certify that this discharge summary accurately reflects the patient care provided', required: true },
      { id: 'nurse_signature', type: 'signature', label: 'RN Signature', required: true },
      { id: 'signature_date', type: 'date', label: 'Date', required: true, width: 'half' },
    ]
  },
  {
    id: 'medication-reconciliation',
    name: 'Medication Reconciliation',
    description: 'Comprehensive medication review and reconciliation',
    category: 'visit',
    fields: [
      { id: 'section-patient', type: 'section', label: 'Patient Information' },
      { id: 'patient_name', type: 'text', label: 'Patient Name', required: true, width: 'half' },
      { id: 'reconciliation_date', type: 'date', label: 'Date', required: true, width: 'half' },
      { id: 'reconciliation_reason', type: 'select', label: 'Reason for Reconciliation', required: true, options: ['Admission', 'Discharge', 'Transfer', 'Post-Hospitalization', 'Routine Review', 'New Medication'] },
      
      { id: 'section-current', type: 'section', label: 'Current Medication List', description: 'Document all medications patient is currently taking' },
      { id: 'current_medications', type: 'textarea', label: 'Current Medications', required: true, placeholder: 'Medication name, dose, frequency, route, prescriber...' },
      
      { id: 'section-discrepancies', type: 'section', label: 'Discrepancies Identified' },
      { id: 'discrepancies_found', type: 'checkbox', label: 'Discrepancies Found' },
      { id: 'discrepancy_details', type: 'textarea', label: 'Discrepancy Details', placeholder: 'Describe any discrepancies between medication lists...' },
      { id: 'discrepancy_resolution', type: 'textarea', label: 'Resolution', placeholder: 'How discrepancies were resolved...' },
      
      { id: 'section-issues', type: 'section', label: 'Medication Issues' },
      { id: 'drug_interactions', type: 'checkbox', label: 'Potential Drug Interactions Identified' },
      { id: 'interaction_details', type: 'textarea', label: 'Interaction Details', placeholder: 'Describe potential interactions...' },
      { id: 'high_risk_meds', type: 'checkbox', label: 'High-Risk Medications Present' },
      { id: 'high_risk_list', type: 'textarea', label: 'High-Risk Medications', placeholder: 'List high-risk medications and precautions...' },
      { id: 'otc_supplements', type: 'textarea', label: 'OTC/Supplements/Herbals', placeholder: 'List all over-the-counter medications and supplements...' },
      
      { id: 'section-education', type: 'section', label: 'Patient Education' },
      { id: 'education_provided', type: 'checkbox', label: 'Medication education provided' },
      { id: 'education_topics', type: 'textarea', label: 'Education Topics Covered', placeholder: 'What was taught...' },
      { id: 'understanding_level', type: 'select', label: 'Patient/Caregiver Understanding', options: ['Demonstrates Understanding', 'Partial Understanding', 'Needs Reinforcement', 'Unable to Understand'] },
      
      { id: 'section-followup', type: 'section', label: 'Follow-up Actions' },
      { id: 'md_contacted', type: 'checkbox', label: 'Physician contacted regarding medication issues' },
      { id: 'md_response', type: 'textarea', label: 'Physician Response/Orders', placeholder: 'Document any new orders...' },
      { id: 'follow_up_needed', type: 'textarea', label: 'Follow-up Actions Needed', placeholder: 'Any additional follow-up required...' },
      
      { id: 'section-signature', type: 'section', label: 'Nurse Signature' },
      { id: 'nurse_signature', type: 'signature', label: 'RN Signature', required: true },
      { id: 'signature_date', type: 'date', label: 'Date', required: true, width: 'half' },
    ]
  }
];
