 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 async function sendEmail(
   to: string,
   subject: string,
   message: string
 ): Promise<{ success: boolean; error?: string }> {
   const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
   
   if (!RESEND_API_KEY) {
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
         html: `<p>${message}</p>`,
       }),
     });
 
     if (!response.ok) {
       const error = await response.text();
       return { success: false, error };
     }
 
     return { success: true };
   } catch (error) {
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
       return { success: false, error };
     }
 
     return { success: true };
   } catch (error) {
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
 
     const { notification_id } = await req.json();
 
     if (!notification_id) {
       throw new Error("notification_id is required");
     }
 
     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
 
     // Fetch the notification
     const { data: notification, error: fetchError } = await supabase
       .from("notifications")
       .select("*")
       .eq("id", notification_id)
       .single();
 
     if (fetchError || !notification) {
       throw new Error(`Notification not found: ${fetchError?.message || "Unknown error"}`);
     }
 
     let emailSent = notification.email_sent;
     let smsSent = notification.sms_sent;
     let errorMessage = "";
 
     // Retry email if it failed and recipient has email
     if (!notification.email_sent && notification.recipient_email) {
       const emailResult = await sendEmail(
         notification.recipient_email,
         notification.subject,
         notification.message
       );
       emailSent = emailResult.success;
       if (!emailResult.success) {
         errorMessage += `Email: ${emailResult.error}; `;
       }
     }
 
     // Retry SMS if it failed and recipient has phone
     if (!notification.sms_sent && notification.recipient_phone) {
       const smsResult = await sendSMS(notification.recipient_phone, notification.message);
       smsSent = smsResult.success;
       if (!smsResult.success) {
         errorMessage += `SMS: ${smsResult.error}; `;
       }
     }
 
     // Update the notification record
     const { error: updateError } = await supabase
       .from("notifications")
       .update({
         email_sent: emailSent,
         sms_sent: smsSent,
         email_sent_at: emailSent && !notification.email_sent ? new Date().toISOString() : notification.email_sent_at,
         sms_sent_at: smsSent && !notification.sms_sent ? new Date().toISOString() : notification.sms_sent_at,
         error_message: errorMessage || null,
       })
       .eq("id", notification_id);
 
     if (updateError) {
       throw new Error(`Failed to update notification: ${updateError.message}`);
     }
 
     const success = emailSent || smsSent;
 
     return new Response(
       JSON.stringify({
         success,
         email_sent: emailSent,
         sms_sent: smsSent,
         error: errorMessage || null,
       }),
       {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   } catch (error) {
     console.error("Error in resend-notification:", error);
     return new Response(
       JSON.stringify({ error: String(error) }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });