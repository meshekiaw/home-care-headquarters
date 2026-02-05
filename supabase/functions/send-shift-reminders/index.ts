 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface ShiftReminder {
   appointment_id: string;
   caregiver_id: string;
   caregiver_name: string;
   caregiver_email: string | null;
   caregiver_phone: string | null;
   client_name: string;
   title: string;
   start_time: string;
   end_time: string;
   reminder_type: "24h_before" | "5min_before_end";
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
 
 function formatTime(dateString: string): string {
   return new Date(dateString).toLocaleString("en-US", {
     weekday: "short",
     month: "short",
     day: "numeric",
     hour: "numeric",
     minute: "2-digit",
     hour12: true,
   });
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
 
     // Parse request body for reminder type
     let reminderType: "24h_before" | "5min_before_end" = "24h_before";
     try {
       const body = await req.json();
       if (body.reminder_type === "5min_before_end") {
         reminderType = "5min_before_end";
       }
     } catch {
       // Default to 24h_before if no body
     }
 
     const now = new Date();
     const reminders: ShiftReminder[] = [];
 
     if (reminderType === "24h_before") {
       // Find appointments starting in the next 24-25 hours (to capture within the hour window)
       const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
       const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
 
       const { data: upcomingAppointments } = await supabase
         .from("appointments")
         .select(`
           id, title, start_time, end_time, user_id,
           caregiver_id,
           caregivers (first_name, last_name, email, phone),
           clients (first_name, last_name)
         `)
         .eq("status", "scheduled")
         .gte("start_time", in24Hours.toISOString())
         .lt("start_time", in25Hours.toISOString());
 
       for (const apt of upcomingAppointments || []) {
         const caregiver = apt.caregivers as unknown as { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
         const client = apt.clients as unknown as { first_name: string; last_name: string } | null;
 
         reminders.push({
           appointment_id: apt.id,
           caregiver_id: apt.caregiver_id,
           caregiver_name: caregiver ? `${caregiver.first_name} ${caregiver.last_name}` : "Unknown",
           caregiver_email: caregiver?.email || null,
           caregiver_phone: caregiver?.phone || null,
           client_name: client ? `${client.first_name} ${client.last_name}` : "Unknown Client",
           title: apt.title,
           start_time: apt.start_time,
           end_time: apt.end_time,
           reminder_type: "24h_before",
           user_id: apt.user_id,
         });
       }
     } else {
       // Find appointments ending in the next 5-10 minutes
       const in5Minutes = new Date(now.getTime() + 5 * 60 * 1000);
       const in10Minutes = new Date(now.getTime() + 10 * 60 * 1000);
 
       const { data: endingAppointments } = await supabase
         .from("appointments")
         .select(`
           id, title, start_time, end_time, user_id,
           caregiver_id,
           caregivers (first_name, last_name, email, phone),
           clients (first_name, last_name)
         `)
         .eq("status", "scheduled")
         .gte("end_time", in5Minutes.toISOString())
         .lt("end_time", in10Minutes.toISOString());
 
       for (const apt of endingAppointments || []) {
         const caregiver = apt.caregivers as unknown as { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
         const client = apt.clients as unknown as { first_name: string; last_name: string } | null;
 
         reminders.push({
           appointment_id: apt.id,
           caregiver_id: apt.caregiver_id,
           caregiver_name: caregiver ? `${caregiver.first_name} ${caregiver.last_name}` : "Unknown",
           caregiver_email: caregiver?.email || null,
           caregiver_phone: caregiver?.phone || null,
           client_name: client ? `${client.first_name} ${client.last_name}` : "Unknown Client",
           title: apt.title,
           start_time: apt.start_time,
           end_time: apt.end_time,
           reminder_type: "5min_before_end",
           user_id: apt.user_id,
         });
       }
     }
 
     console.log(`Found ${reminders.length} shift reminders (${reminderType})`);
 
     const results = { sent: 0, skipped: 0, errors: [] as string[] };
     const todayStr = now.toISOString().split("T")[0];
 
     for (const reminder of reminders) {
       // Check if we already sent this specific reminder today
       const notificationType = `shift_reminder_${reminder.reminder_type}`;
       const { data: existingNotification } = await supabase
         .from("notifications")
         .select("id")
         .eq("related_id", reminder.appointment_id)
         .eq("notification_type", notificationType)
         .gte("created_at", todayStr)
         .maybeSingle();
 
       if (existingNotification) {
         results.skipped++;
         continue;
       }
 
       let subject: string;
       let message: string;
       let emailHtml: string;
 
       if (reminder.reminder_type === "24h_before") {
         subject = `📅 Shift Reminder: ${reminder.title} tomorrow`;
         message = `Hi ${reminder.caregiver_name}, reminder: You have a shift "${reminder.title}" with ${reminder.client_name} starting ${formatTime(reminder.start_time)}. Please arrive on time.`;
         emailHtml = `
           <h2>Shift Reminder - Tomorrow</h2>
           <p>Hi ${reminder.caregiver_name},</p>
           <p>This is a reminder about your upcoming shift:</p>
           <ul>
             <li><strong>Shift:</strong> ${reminder.title}</li>
             <li><strong>Client:</strong> ${reminder.client_name}</li>
             <li><strong>Start:</strong> ${formatTime(reminder.start_time)}</li>
             <li><strong>End:</strong> ${formatTime(reminder.end_time)}</li>
           </ul>
           <p>Please ensure you arrive on time and are prepared for your shift.</p>
           <p>Best regards,<br>CareSync Team</p>
         `;
       } else {
         subject = `⏰ Clock Out Reminder: Shift ending soon`;
         message = `Hi ${reminder.caregiver_name}, your shift "${reminder.title}" with ${reminder.client_name} ends in 5 minutes at ${formatTime(reminder.end_time)}. Please complete your documentation and clock out.`;
         emailHtml = `
           <h2>Clock Out Reminder</h2>
           <p>Hi ${reminder.caregiver_name},</p>
           <p>Your shift is ending in <strong>5 minutes</strong>:</p>
           <ul>
             <li><strong>Shift:</strong> ${reminder.title}</li>
             <li><strong>Client:</strong> ${reminder.client_name}</li>
             <li><strong>End Time:</strong> ${formatTime(reminder.end_time)}</li>
           </ul>
           <p>Please complete your documentation and clock out on time.</p>
           <p>Best regards,<br>CareSync Team</p>
         `;
       }
 
       let emailSent = false;
       let smsSent = false;
       let errorMessage = "";
 
       if (reminder.caregiver_email) {
         const emailResult = await sendEmail(reminder.caregiver_email, subject, emailHtml);
         emailSent = emailResult.success;
         if (!emailResult.success) {
           errorMessage += `Email: ${emailResult.error}; `;
         }
       } else {
         errorMessage += "Email: No email address on file; ";
       }
 
       if (reminder.caregiver_phone) {
         const smsResult = await sendSMS(reminder.caregiver_phone, message);
         smsSent = smsResult.success;
         if (!smsResult.success) {
           errorMessage += `SMS: ${smsResult.error}; `;
         }
       } else {
         errorMessage += "SMS: No phone number on file; ";
       }
 
       // Record the notification
       await supabase.from("notifications").insert({
         user_id: reminder.user_id,
         notification_type: notificationType,
         related_id: reminder.appointment_id,
         recipient_email: reminder.caregiver_email,
         recipient_phone: reminder.caregiver_phone,
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
         results.errors.push(`Appointment ${reminder.appointment_id}: ${errorMessage}`);
       }
     }
 
     console.log("Shift reminder results:", results);
 
     return new Response(JSON.stringify(results), {
       status: 200,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("Error in send-shift-reminders:", error);
     return new Response(JSON.stringify({ error: String(error) }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });