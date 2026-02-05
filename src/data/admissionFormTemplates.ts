 import { FormField } from "@/components/forms/FormFieldRenderer";
 
 export interface FormTemplate {
   id: string;
   name: string;
   description: string;
   category: 'admission' | 'consent' | 'medical' | 'legal' | 'incident';
   fields: FormField[];
 }
 
 export const prebuiltFormTemplates: FormTemplate[] = [
   {
     id: 'client-intake',
     name: 'Client Intake Form',
     description: 'Standard client admission and intake information',
     category: 'admission',
     fields: [
       { id: 'section-personal', type: 'section', label: 'Personal Information' },
       { id: 'first_name', type: 'text', label: 'First Name', required: true, width: 'half' },
       { id: 'last_name', type: 'text', label: 'Last Name', required: true, width: 'half' },
       { id: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
       { id: 'ssn_last4', type: 'text', label: 'Last 4 of SSN', placeholder: 'XXXX', width: 'half' },
       { id: 'email', type: 'email', label: 'Email Address', width: 'half' },
       { id: 'phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
       
       { id: 'section-address', type: 'section', label: 'Address' },
       { id: 'address', type: 'text', label: 'Street Address', required: true },
       { id: 'city', type: 'text', label: 'City', required: true, width: 'half' },
       { id: 'state', type: 'text', label: 'State', required: true, width: 'half' },
       { id: 'zip_code', type: 'text', label: 'ZIP Code', required: true, width: 'half' },
       
       { id: 'section-emergency', type: 'section', label: 'Emergency Contact' },
       { id: 'emergency_name', type: 'text', label: 'Contact Name', required: true, width: 'half' },
       { id: 'emergency_relationship', type: 'text', label: 'Relationship', required: true, width: 'half' },
       { id: 'emergency_phone', type: 'phone', label: 'Contact Phone', required: true, width: 'half' },
       
       { id: 'section-medical', type: 'section', label: 'Medical Information' },
       { id: 'primary_physician', type: 'text', label: 'Primary Physician', width: 'half' },
       { id: 'physician_phone', type: 'phone', label: 'Physician Phone', width: 'half' },
       { id: 'medical_conditions', type: 'textarea', label: 'Current Medical Conditions', placeholder: 'List any current medical conditions...' },
       { id: 'medications', type: 'textarea', label: 'Current Medications', placeholder: 'List all current medications...' },
       { id: 'allergies', type: 'textarea', label: 'Allergies', placeholder: 'List any known allergies...' },
       
       { id: 'section-insurance', type: 'section', label: 'Insurance Information' },
       { id: 'insurance_provider', type: 'text', label: 'Insurance Provider', width: 'half' },
       { id: 'insurance_policy', type: 'text', label: 'Policy Number', width: 'half' },
       { id: 'insurance_group', type: 'text', label: 'Group Number', width: 'half' },
       
       { id: 'section-signature', type: 'section', label: 'Authorization' },
       { id: 'consent_agreement', type: 'checkbox', label: 'I certify that the information provided is accurate and complete to the best of my knowledge.', required: true },
       { id: 'client_signature', type: 'signature', label: 'Client/Guardian Signature', required: true },
       { id: 'signature_date', type: 'date', label: 'Date', required: true, width: 'half' },
     ]
   },
   {
     id: 'hipaa-consent',
     name: 'HIPAA Consent Form',
     description: 'Authorization for release of protected health information',
     category: 'consent',
     fields: [
       { id: 'section-patient', type: 'section', label: 'Patient Information' },
       { id: 'patient_name', type: 'text', label: 'Patient Full Name', required: true },
       { id: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
       
       { id: 'section-authorization', type: 'section', label: 'Authorization Details', description: 'I authorize the use and disclosure of my protected health information as described below.' },
       { id: 'disclosure_purpose', type: 'select', label: 'Purpose of Disclosure', required: true, options: ['Treatment', 'Payment', 'Healthcare Operations', 'Personal Request', 'Other'] },
       { id: 'disclosure_other', type: 'text', label: 'If Other, Please Specify', placeholder: 'Describe the purpose...' },
       { id: 'information_types', type: 'textarea', label: 'Types of Information to be Disclosed', placeholder: 'e.g., Medical records, lab results, treatment plans...' },
       
       { id: 'section-recipient', type: 'section', label: 'Recipient of Information' },
       { id: 'recipient_name', type: 'text', label: 'Name/Organization', required: true },
       { id: 'recipient_address', type: 'text', label: 'Address' },
       { id: 'recipient_phone', type: 'phone', label: 'Phone', width: 'half' },
       
       { id: 'section-rights', type: 'section', label: 'Patient Rights', description: 'I understand that I may revoke this authorization at any time by submitting a written request. I understand that the revocation will not apply to information already released.' },
       { id: 'understand_rights', type: 'checkbox', label: 'I understand my rights regarding this authorization', required: true },
       { id: 'voluntary_consent', type: 'checkbox', label: 'I am signing this authorization voluntarily', required: true },
       
       { id: 'section-signature', type: 'section', label: 'Signatures' },
       { id: 'patient_signature', type: 'signature', label: 'Patient/Guardian Signature', required: true },
       { id: 'signature_date', type: 'date', label: 'Date', required: true, width: 'half' },
     ]
   },
   {
     id: 'service-agreement',
     name: 'Service Agreement',
     description: 'Agreement for home care services',
     category: 'legal',
     fields: [
       { id: 'section-parties', type: 'section', label: 'Agreement Parties' },
       { id: 'client_name', type: 'text', label: 'Client Name', required: true, width: 'half' },
       { id: 'agreement_date', type: 'date', label: 'Agreement Date', required: true, width: 'half' },
       
       { id: 'section-services', type: 'section', label: 'Services to be Provided' },
       { id: 'service_personal_care', type: 'checkbox', label: 'Personal Care (bathing, grooming, dressing)' },
       { id: 'service_medication', type: 'checkbox', label: 'Medication Reminders' },
       { id: 'service_meal_prep', type: 'checkbox', label: 'Meal Preparation' },
       { id: 'service_housekeeping', type: 'checkbox', label: 'Light Housekeeping' },
       { id: 'service_transportation', type: 'checkbox', label: 'Transportation/Errands' },
       { id: 'service_companionship', type: 'checkbox', label: 'Companionship' },
       { id: 'service_other', type: 'textarea', label: 'Other Services', placeholder: 'Describe any additional services...' },
       
       { id: 'section-schedule', type: 'section', label: 'Service Schedule' },
       { id: 'start_date', type: 'date', label: 'Service Start Date', required: true, width: 'half' },
       { id: 'schedule_details', type: 'textarea', label: 'Schedule Details', placeholder: 'e.g., Monday-Friday, 9am-5pm' },
       
       { id: 'section-terms', type: 'section', label: 'Terms & Conditions' },
       { id: 'accept_terms', type: 'checkbox', label: 'I have read and agree to the terms and conditions of service', required: true },
       { id: 'accept_cancellation', type: 'checkbox', label: 'I understand the 24-hour cancellation policy', required: true },
       
       { id: 'section-signatures', type: 'section', label: 'Signatures' },
       { id: 'client_signature', type: 'signature', label: 'Client/Guardian Signature', required: true },
       { id: 'client_sign_date', type: 'date', label: 'Date', required: true, width: 'half' },
     ]
   },
   {
     id: 'medical-history',
     name: 'Medical History Form',
     description: 'Comprehensive medical history questionnaire',
     category: 'medical',
     fields: [
       { id: 'section-patient', type: 'section', label: 'Patient Information' },
       { id: 'patient_name', type: 'text', label: 'Full Name', required: true },
       { id: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
       { id: 'gender', type: 'select', label: 'Gender', options: ['Male', 'Female', 'Other', 'Prefer not to say'], width: 'half' },
       
       { id: 'section-current', type: 'section', label: 'Current Health Status' },
       { id: 'current_conditions', type: 'textarea', label: 'Current Medical Conditions', placeholder: 'List all current diagnoses...' },
       { id: 'current_medications', type: 'textarea', label: 'Current Medications', placeholder: 'Include dosage and frequency...' },
       { id: 'allergies', type: 'textarea', label: 'Known Allergies', placeholder: 'Medications, foods, environmental...' },
       
       { id: 'section-history', type: 'section', label: 'Medical History' },
       { id: 'past_surgeries', type: 'textarea', label: 'Past Surgeries/Hospitalizations', placeholder: 'Include dates if known...' },
       { id: 'chronic_conditions', type: 'textarea', label: 'Chronic Conditions', placeholder: 'Diabetes, hypertension, etc...' },
       
       { id: 'section-family', type: 'section', label: 'Family Medical History' },
       { id: 'family_history', type: 'textarea', label: 'Family Medical History', placeholder: 'Conditions that run in the family...' },
       
       { id: 'section-lifestyle', type: 'section', label: 'Lifestyle' },
       { id: 'smoking_status', type: 'select', label: 'Smoking Status', options: ['Never', 'Former', 'Current', 'Occasional'], width: 'half' },
       { id: 'alcohol_use', type: 'select', label: 'Alcohol Use', options: ['None', 'Occasional', 'Moderate', 'Heavy'], width: 'half' },
       { id: 'exercise_level', type: 'select', label: 'Exercise Level', options: ['None', 'Light', 'Moderate', 'Active'], width: 'half' },
       
       { id: 'section-signature', type: 'section', label: 'Certification' },
       { id: 'accuracy_certification', type: 'checkbox', label: 'I certify that the above information is accurate to the best of my knowledge', required: true },
       { id: 'patient_signature', type: 'signature', label: 'Patient/Guardian Signature', required: true },
       { id: 'signature_date', type: 'date', label: 'Date', required: true, width: 'half' },
     ]
   },
   {
     id: 'incident-report',
     name: 'Incident/Event Report',
     description: 'Document hospitalizations, rehab, doctor visits, and other client events',
     category: 'incident',
     fields: [
       { id: 'section-event', type: 'section', label: 'Event Information' },
       { id: 'event_type', type: 'select', label: 'Type of Event', required: true, options: ['Hospitalization', 'Emergency Room Visit', 'Rehabilitation/Skilled Nursing', 'Doctor/Specialist Visit', 'Urgent Care Visit', 'Fall/Injury', 'Medication Issue', 'Behavioral Incident', 'Other'] },
       { id: 'event_date', type: 'date', label: 'Date of Event', required: true, width: 'half' },
       { id: 'event_time', type: 'text', label: 'Time of Event', placeholder: 'e.g., 2:30 PM', width: 'half' },
       { id: 'event_location', type: 'text', label: 'Location/Facility Name', required: true, placeholder: 'Hospital name, clinic, home, etc.' },
       { id: 'event_address', type: 'text', label: 'Facility Address', placeholder: 'Street, City, State, ZIP' },
       
       { id: 'section-details', type: 'section', label: 'Event Details' },
       { id: 'reason_for_event', type: 'textarea', label: 'Reason/Cause of Event', required: true, placeholder: 'Describe why this event occurred...' },
       { id: 'description', type: 'textarea', label: 'Detailed Description', required: true, placeholder: 'Provide a detailed account of what happened...' },
       { id: 'symptoms_observed', type: 'textarea', label: 'Symptoms/Conditions Observed', placeholder: 'List any symptoms or conditions noted...' },
       
       { id: 'section-treatment', type: 'section', label: 'Treatment & Outcome' },
       { id: 'treatment_provided', type: 'textarea', label: 'Treatment Provided', placeholder: 'Describe any treatment, procedures, or interventions...' },
       { id: 'diagnosis', type: 'textarea', label: 'Diagnosis (if known)', placeholder: 'Any diagnoses provided by medical staff...' },
       { id: 'medications_prescribed', type: 'textarea', label: 'Medications Prescribed/Changed', placeholder: 'List any new or changed medications...' },
       { id: 'follow_up_required', type: 'checkbox', label: 'Follow-up appointment required' },
       { id: 'follow_up_date', type: 'date', label: 'Follow-up Date', width: 'half' },
       { id: 'follow_up_provider', type: 'text', label: 'Follow-up Provider/Specialist', width: 'half' },
       
       { id: 'section-admission', type: 'section', label: 'Admission Details (if applicable)', description: 'Complete this section for hospitalizations or rehab stays' },
       { id: 'admission_date', type: 'date', label: 'Admission Date', width: 'half' },
       { id: 'discharge_date', type: 'date', label: 'Discharge Date', width: 'half' },
       { id: 'length_of_stay', type: 'text', label: 'Length of Stay', placeholder: 'e.g., 3 days', width: 'half' },
       { id: 'discharge_disposition', type: 'select', label: 'Discharge Disposition', options: ['Home', 'Home with Home Health', 'Skilled Nursing Facility', 'Rehabilitation Facility', 'Hospice', 'Other'], width: 'half' },
       { id: 'discharge_instructions', type: 'textarea', label: 'Discharge Instructions', placeholder: 'Key instructions provided at discharge...' },
       
       { id: 'section-care-impact', type: 'section', label: 'Impact on Care Plan' },
       { id: 'care_plan_changes', type: 'textarea', label: 'Changes to Care Plan Required', placeholder: 'Describe any changes needed to the client care plan...' },
       { id: 'equipment_needs', type: 'textarea', label: 'New Equipment/Supply Needs', placeholder: 'List any new equipment or supplies required...' },
       { id: 'restrictions', type: 'textarea', label: 'Activity Restrictions', placeholder: 'Any new restrictions on activities...' },
       
       { id: 'section-contacts', type: 'section', label: 'Notifications' },
       { id: 'family_notified', type: 'checkbox', label: 'Family/Emergency Contact Notified' },
       { id: 'family_notified_date', type: 'date', label: 'Date Notified', width: 'half' },
       { id: 'physician_notified', type: 'checkbox', label: 'Primary Physician Notified' },
       { id: 'supervisor_notified', type: 'checkbox', label: 'Supervisor/Agency Notified' },
       
       { id: 'section-reporter', type: 'section', label: 'Report Information' },
       { id: 'reported_by', type: 'text', label: 'Reported By', required: true, width: 'half' },
       { id: 'reporter_title', type: 'text', label: 'Title/Role', width: 'half' },
       { id: 'report_date', type: 'date', label: 'Date of Report', required: true, width: 'half' },
       { id: 'additional_notes', type: 'textarea', label: 'Additional Notes', placeholder: 'Any other relevant information...' },
       
       { id: 'section-signature', type: 'section', label: 'Verification' },
       { id: 'accuracy_certification', type: 'checkbox', label: 'I certify that the information in this report is accurate and complete to the best of my knowledge', required: true },
       { id: 'reporter_signature', type: 'signature', label: 'Reporter Signature', required: true },
       { id: 'signature_date', type: 'date', label: 'Date', required: true, width: 'half' },
     ]
   }
 ];