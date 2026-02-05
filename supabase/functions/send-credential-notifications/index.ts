 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface ExpiringCredential {
   id: string;
   credential_name: string;
   credential_type: string;
   expiry_date: string;
   days_until_expiry: number;
   owner_type: "caregiver" | "nurse" | "agency";
   owner_id: string | null;
   owner_name: string;
   owner_email: string | null;
   owner_phone: string | null;
   user_id: string;
 }
 
 interface NotificationPreferences {
   email_enabled: boolean;
   sms_enabled: boolean;
   credential_expiry_alerts: boolean;
   days_before_expiry: number;
 }
 
 const defaultPreferences: NotificationPreferences = {
   email_enabled: true,
   sms_enabled: true,
   credential_expiry_alerts: true,
   days_before_expiry: 30,
 };
 
 async function sendEmail(
   to: string,
   subject: string,
   html: string
 ): Promise<{ success: boolean; error?: string }> {
   const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
 
   if (!RESEND_API_KEY) {
     console.log("RESEND_API_KEY not configured - skipping email");
     return { success: false, error: "RESEND_API_KEY not configured" };
   }
 
   try {
     const response = await fetch("https://api.resend.com/emails", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${RESEND_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         from: "CareSync <notifications@yourdomain.com>",
         to: [to],
         subject,
         html,
       }),
     });
 
     if (!response.ok) {
       const error = await response.text();
       console.error("Email send failed:", error);
       return { success: false, error };
     }
 
     return { success: true };
   } catch (error) {
     console.error("Email send error:", error);
     return { success: false, error: String(error) };
   }
 }
 
 async function sendSMS(
   to: string,
   message: string
 ): Promise<{ success: boolean; error?: string }> {
   const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
   const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
   const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
 
   if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
     console.log("Twilio credentials not configured - skipping SMS");
     return { success: false, error: "Twilio credentials not configured" };
   }
 
   try {
     const response = await fetch(
       `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
       {
         method: "POST",
         headers: {
           Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
           "Content-Type": "application/x-www-form-urlencoded",
         },
         body: new URLSearchParams({
           To: to,
           From: TWILIO_PHONE_NUMBER,
           Body: message,
         }),
       }
     );
 
     if (!response.ok) {
       const error = await response.text();
       console.error("SMS send failed:", error);
       return { success: false, error };
     }
 
     return { success: true };
   } catch (error) {
     console.error("SMS send error:", error);
     return { success: false, error: String(error) };
   }
 }
 
 serve(async (req: Request): Promise<Response> => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 
     if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
       throw new Error("Missing Supabase configuration");
     }
 
     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
 
     // Fetch notification preferences (admin-level, nurse_id is null)
     const { data: prefsData } = await supabase
       .from("notification_preferences")
       .select("*")
       .is("nurse_id", null)
       .limit(1);
 
     const prefs: NotificationPreferences = prefsData?.[0] || defaultPreferences;
 
     // Check if credential expiry alerts are enabled
     if (!prefs.credential_expiry_alerts) {
       console.log("Credential expiry alerts are disabled");
       return new Response(
         JSON.stringify({ sent: 0, skipped: 0, disabled: true }),
         {
           status: 200,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         }
       );
     }
 
     const today = new Date();
     const daysAhead = new Date();
     daysAhead.setDate(daysAhead.getDate() + prefs.days_before_expiry);
     const todayStr = today.toISOString().split("T")[0];
     const aheadStr = daysAhead.toISOString().split("T")[0];
 
     const expiringCredentials: ExpiringCredential[] = [];
 
     // Fetch expiring caregiver credentials
     const { data: caregiverCreds } = await supabase
       .from("caregiver_credentials")
       .select(`
         id, credential_name, credential_type, expiry_date, user_id, caregiver_id,
         caregivers (first_name, last_name, email, phone)
       `)
       .eq("status", "active")
       .lte("expiry_date", aheadStr)
       .gte("expiry_date", todayStr);
 
     for (const cred of caregiverCreds || []) {
       const caregiver = cred.caregivers as unknown as { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
       const daysUntil = Math.ceil((new Date(cred.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
       expiringCredentials.push({
         id: cred.id,
         credential_name: cred.credential_name,
         credential_type: cred.credential_type,
         expiry_date: cred.expiry_date,
         days_until_expiry: daysUntil,
         owner_type: "caregiver",
         owner_id: cred.caregiver_id,
         owner_name: caregiver ? `${caregiver.first_name} ${caregiver.last_name}` : "Unknown Caregiver",
         owner_email: caregiver?.email || null,
         owner_phone: caregiver?.phone || null,
         user_id: cred.user_id,
       });
     }
 
     // Fetch expiring nurse credentials
     const { data: nurseCreds } = await supabase
       .from("nurse_credentials")
       .select(`
         id, credential_name, credential_type, expiry_date, user_id, nurse_id,
         nurses (first_name, last_name, email, phone)
       `)
       .eq("status", "active")
       .lte("expiry_date", aheadStr)
       .gte("expiry_date", todayStr);
 
     for (const cred of nurseCreds || []) {
       const nurse = cred.nurses as unknown as { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
       const daysUntil = Math.ceil((new Date(cred.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
       expiringCredentials.push({
         id: cred.id,
         credential_name: cred.credential_name,
         credential_type: cred.credential_type,
         expiry_date: cred.expiry_date,
         days_until_expiry: daysUntil,
         owner_type: "nurse",
         owner_id: cred.nurse_id,
         owner_name: nurse ? `${nurse.first_name} ${nurse.last_name}` : "Unknown Nurse",
         owner_email: nurse?.email || null,
         owner_phone: nurse?.phone || null,
         user_id: cred.user_id,
       });
     }
 
     // Fetch expiring agency credentials
     const { data: agencyCreds } = await supabase
       .from("agency_credentials")
       .select("*")
       .eq("status", "active")
       .lte("expiry_date", aheadStr)
       .gte("expiry_date", todayStr);
 
     for (const cred of agencyCreds || []) {
       const daysUntil = Math.ceil((new Date(cred.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
       expiringCredentials.push({
         id: cred.id,
         credential_name: cred.credential_name,
         credential_type: cred.credential_type,
         expiry_date: cred.expiry_date,
         days_until_expiry: daysUntil,
         owner_type: "agency",
         owner_id: null,
         owner_name: "Agency",
         owner_email: null,
         owner_phone: null,
         user_id: cred.user_id,
       });
     }
 
     console.log(`Found ${expiringCredentials.length} expiring credentials`);
 
     const results: { sent: number; skipped: number; errors: string[] } = {
       sent: 0,
       skipped: 0,
       errors: [],
     };
 
     for (const cred of expiringCredentials) {
       // Check if we already sent a notification for this credential today
       const { data: existingNotification } = await supabase
         .from("notifications")
         .select("id")
         .eq("related_id", cred.id)
         .eq("notification_type", "credential_expiry")
         .gte("created_at", todayStr)
         .maybeSingle();
 
       if (existingNotification) {
         results.skipped++;
         continue;
       }
 
       const ownerLabel = cred.owner_type === "agency" ? "Agency" : `${cred.owner_type.charAt(0).toUpperCase() + cred.owner_type.slice(1)} ${cred.owner_name}`;
       const subject = `⚠️ Credential Expiring in ${cred.days_until_expiry} days: ${cred.credential_name}`;
       const message = `The "${cred.credential_name}" (${cred.credential_type}) for ${ownerLabel} expires on ${cred.expiry_date}. Please renew before expiration.`;
 
       const emailHtml = `
         <h2>Credential Expiring Soon</h2>
         <p>The following credential is expiring soon:</p>
         <ul>
           <li><strong>Credential:</strong> ${cred.credential_name}</li>
           <li><strong>Type:</strong> ${cred.credential_type}</li>
           <li><strong>${cred.owner_type === "agency" ? "Owner" : cred.owner_type.charAt(0).toUpperCase() + cred.owner_type.slice(1)}:</strong> ${cred.owner_name}</li>
           <li><strong>Expiry Date:</strong> ${cred.expiry_date}</li>
           <li><strong>Days Remaining:</strong> ${cred.days_until_expiry}</li>
         </ul>
         <p>Please ensure this credential is renewed before expiration.</p>
         <p>Best regards,<br>CareSync Team</p>
       `;
 
       let emailSent = false;
       let smsSent = false;
       let errorMessage = "";
 
       // Send to owner if they have contact info
       if (prefs.email_enabled && cred.owner_email) {
         const emailResult = await sendEmail(cred.owner_email, subject, emailHtml);
         emailSent = emailResult.success;
         if (!emailResult.success) {
           errorMessage += `Email: ${emailResult.error}; `;
         }
       } else if (prefs.email_enabled) {
         errorMessage += "Email: No email address on file; ";
       }
 
       if (prefs.sms_enabled && cred.owner_phone) {
         const smsResult = await sendSMS(cred.owner_phone, message);
         smsSent = smsResult.success;
         if (!smsResult.success) {
           errorMessage += `SMS: ${smsResult.error}; `;
         }
       } else if (prefs.sms_enabled) {
         errorMessage += "SMS: No phone number on file; ";
       }
 
       // Record the notification
       await supabase.from("notifications").insert({
         user_id: cred.user_id,
         notification_type: "credential_expiry",
         related_id: cred.id,
         recipient_nurse_id: cred.owner_type === "nurse" ? cred.owner_id : null,
         recipient_email: cred.owner_email,
         recipient_phone: cred.owner_phone,
         subject,
         message,
         email_sent: emailSent,
         sms_sent: smsSent,
         email_sent_at: emailSent ? new Date().toISOString() : null,
         sms_sent_at: smsSent ? new Date().toISOString() : null,
         error_message: errorMessage || null,
       });
 
       if (emailSent || smsSent) {
         results.sent++;
       } else {
         results.errors.push(`Credential ${cred.id}: ${errorMessage}`);
       }
     }
 
     console.log("Credential notification results:", results);
 
     return new Response(JSON.stringify(results), {
       status: 200,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("Error in send-credential-notifications:", error);
     return new Response(JSON.stringify({ error: String(error) }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });