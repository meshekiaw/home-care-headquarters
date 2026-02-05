 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface HandoffNotificationRequest {
   handoff_id: string;
   assessment_id: string;
   picked_up_by_nurse_id: string;
   released_by_nurse_id: string;
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
 
     const body: HandoffNotificationRequest = await req.json();
     const { handoff_id, assessment_id, picked_up_by_nurse_id, released_by_nurse_id } = body;
 
     if (!handoff_id || !assessment_id || !picked_up_by_nurse_id || !released_by_nurse_id) {
       throw new Error("Missing required fields");
     }
 
     // Get the assessment details
     const { data: assessment, error: assessmentError } = await supabase
       .from("client_assessments")
       .select(`
         id,
         assessment_name,
         due_date,
         user_id,
         clients (first_name, last_name)
       `)
       .eq("id", assessment_id)
       .single();
 
     if (assessmentError || !assessment) {
       throw new Error(`Failed to fetch assessment: ${assessmentError?.message}`);
     }
 
     // Get both nurses
     const { data: nurses, error: nursesError } = await supabase
       .from("nurses")
       .select("id, first_name, last_name, email, phone")
       .in("id", [picked_up_by_nurse_id, released_by_nurse_id]);
 
     if (nursesError || !nurses) {
       throw new Error(`Failed to fetch nurses: ${nursesError?.message}`);
     }
 
     const releasedByNurse = nurses.find((n) => n.id === released_by_nurse_id);
     const pickedUpByNurse = nurses.find((n) => n.id === picked_up_by_nurse_id);
 
     if (!releasedByNurse || !pickedUpByNurse) {
       throw new Error("Could not find one or both nurses");
     }
 
     const client = assessment.clients as unknown as { first_name: string; last_name: string };
     const clientName = `${client.first_name} ${client.last_name}`;
     const releasedByName = `${releasedByNurse.first_name} ${releasedByNurse.last_name}`;
     const pickedUpByName = `${pickedUpByNurse.first_name} ${pickedUpByNurse.last_name}`;
 
     const subject = `✅ Assessment Handoff Picked Up: ${assessment.assessment_name}`;
     const message = `Hi ${releasedByName}, your released assessment "${assessment.assessment_name}" for ${clientName} has been picked up by ${pickedUpByName}.`;
 
     const emailHtml = `
       <h2>Assessment Handoff Update</h2>
       <p>Hi ${releasedByName},</p>
       <p>Good news! Your released assessment has been picked up:</p>
       <ul>
         <li><strong>Assessment:</strong> ${assessment.assessment_name}</li>
         <li><strong>Client:</strong> ${clientName}</li>
         <li><strong>Due Date:</strong> ${assessment.due_date}</li>
         <li><strong>Picked Up By:</strong> ${pickedUpByName}</li>
       </ul>
       <p>The assessment is now assigned to ${pickedUpByName} for completion.</p>
       <p>Best regards,<br>CareSync Team</p>
     `;
 
     let emailSent = false;
     let smsSent = false;
     let errorMessage = "";
 
     // Send email to the releasing nurse
     if (releasedByNurse.email) {
       const emailResult = await sendEmail(releasedByNurse.email, subject, emailHtml);
       emailSent = emailResult.success;
       if (!emailResult.success) {
         errorMessage += `Email: ${emailResult.error}; `;
       }
     }
 
     // Send SMS to the releasing nurse
     if (releasedByNurse.phone) {
       const smsResult = await sendSMS(releasedByNurse.phone, message);
       smsSent = smsResult.success;
       if (!smsResult.success) {
         errorMessage += `SMS: ${smsResult.error}; `;
       }
     }
 
     // Record the notification
     await supabase.from("notifications").insert({
       user_id: assessment.user_id,
       notification_type: "handoff_pickup",
       related_id: handoff_id,
       recipient_nurse_id: released_by_nurse_id,
       recipient_email: releasedByNurse.email,
       recipient_phone: releasedByNurse.phone,
       subject,
       message,
       email_sent: emailSent,
       sms_sent: smsSent,
       email_sent_at: emailSent ? new Date().toISOString() : null,
       sms_sent_at: smsSent ? new Date().toISOString() : null,
       error_message: errorMessage || null,
     });
 
     console.log("Handoff notification sent:", { emailSent, smsSent, handoff_id });
 
     return new Response(
       JSON.stringify({ success: true, emailSent, smsSent }),
       {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   } catch (error) {
     console.error("Error in send-handoff-notification:", error);
     return new Response(
       JSON.stringify({ error: String(error) }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });