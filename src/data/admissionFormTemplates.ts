 import { FormField } from "@/components/forms/FormFieldRenderer";
 
 export interface FormTemplate {
   id: string;
   name: string;
   description: string;
   category: 'admission' | 'consent' | 'medical' | 'legal';
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
   }
 ];