 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface ExpiringAssessment {
   id: string;
   assessment_name: string;
   due_date: string;
   days_until_due: number;
   client_id: string;
   client_name: string;
   nurse_id: string;
   nurse_name: string;
   nurse_email: string | null;
   nurse_phone: string | null;
   user_id: string;
 }
 
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
         "Authorization": `Bearer ${RESEND_API_KEY}`,
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
           "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
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
 
     // Get assessments expiring within 30 days
     const thirtyDaysFromNow = new Date();
     thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
 
     const { data: assessments, error: assessmentError } = await supabase
       .from("client_assessments")
       .select(`
         id,
         assessment_name,
         due_date,
         client_id,
         assigned_nurse_id,
         user_id,
         clients (first_name, last_name),
         nurses (first_name, last_name, email, phone)
       `)
       .eq("status", "pending")
       .lte("due_date", thirtyDaysFromNow.toISOString().split("T")[0])
       .gte("due_date", new Date().toISOString().split("T")[0]);
 
     if (assessmentError) {
       throw new Error(`Failed to fetch assessments: ${assessmentError.message}`);
     }
 
     console.log(`Found ${assessments?.length || 0} expiring assessments`);
 
     const results: { sent: number; skipped: number; errors: string[] } = {
       sent: 0,
       skipped: 0,
       errors: [],
     };
 
     for (const assessment of assessments || []) {
       if (!assessment.assigned_nurse_id || !assessment.nurses) {
         results.skipped++;
         continue;
       }
 
       const dueDate = new Date(assessment.due_date);
       const today = new Date();
       const daysUntilDue = Math.ceil(
         (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
       );
 
       // Check if we already sent a notification for this assessment today
       const { data: existingNotification } = await supabase
         .from("notifications")
         .select("id")
         .eq("related_id", assessment.id)
         .eq("notification_type", "assessment_expiry")
         .gte("created_at", new Date().toISOString().split("T")[0])
         .maybeSingle();
 
       if (existingNotification) {
         results.skipped++;
         continue;
       }
 
       const nurse = assessment.nurses as unknown as { first_name: string; last_name: string; email: string | null; phone: string | null };
       const client = assessment.clients as unknown as { first_name: string; last_name: string };
       
       const nurseName = `${nurse.first_name} ${nurse.last_name}`;
       const clientName = `${client.first_name} ${client.last_name}`;
       const subject = `⚠️ Assessment Due in ${daysUntilDue} days: ${assessment.assessment_name}`;
       const message = `Hi ${nurseName}, the "${assessment.assessment_name}" for ${clientName} is due in ${daysUntilDue} days (${assessment.due_date}). Please complete it before the deadline.`;
 
       const emailHtml = `
         <h2>Assessment Expiring Soon</h2>
         <p>Hi ${nurseName},</p>
         <p>The following assessment is due soon:</p>
         <ul>
           <li><strong>Assessment:</strong> ${assessment.assessment_name}</li>
           <li><strong>Client:</strong> ${clientName}</li>
           <li><strong>Due Date:</strong> ${assessment.due_date}</li>
           <li><strong>Days Remaining:</strong> ${daysUntilDue}</li>
         </ul>
         <p>Please complete this assessment before the deadline.</p>
         <p>Best regards,<br>CareSync Team</p>
       `;
 
       let emailSent = false;
       let smsSent = false;
       let errorMessage = "";
 
       // Send email if nurse has email
       if (nurse.email) {
         const emailResult = await sendEmail(nurse.email, subject, emailHtml);
         emailSent = emailResult.success;
         if (!emailResult.success) {
           errorMessage += `Email: ${emailResult.error}; `;
         }
       }
 
       // Send SMS if nurse has phone
       if (nurse.phone) {
         const smsResult = await sendSMS(nurse.phone, message);
         smsSent = smsResult.success;
         if (!smsResult.success) {
           errorMessage += `SMS: ${smsResult.error}; `;
         }
       }
 
       // Record the notification
       await supabase.from("notifications").insert({
         user_id: assessment.user_id,
         notification_type: "assessment_expiry",
         related_id: assessment.id,
         recipient_nurse_id: assessment.assigned_nurse_id,
         recipient_email: nurse.email,
         recipient_phone: nurse.phone,
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
         results.errors.push(`Assessment ${assessment.id}: ${errorMessage}`);
       }
     }
 
     console.log("Notification results:", results);
 
     return new Response(JSON.stringify(results), {
       status: 200,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("Error in send-assessment-notifications:", error);
     return new Response(
       JSON.stringify({ error: String(error) }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });