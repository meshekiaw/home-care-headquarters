import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignatureRequestPayload {
  signerName: string;
  signerEmail: string;
  message: string;
  documentName: string;
  documentUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signerName, signerEmail, message, documentName, documentUrl }: SignatureRequestPayload = await req.json();

    // Validate required fields
    if (!signerName || !signerEmail || !documentName) {
      throw new Error("Missing required fields: signerName, signerEmail, and documentName are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signerEmail)) {
      throw new Error("Invalid email address format");
    }

    // Validate field lengths
    if (signerName.length > 100) {
      throw new Error("Signer name must be less than 100 characters");
    }
    if (signerEmail.length > 255) {
      throw new Error("Signer email must be less than 255 characters");
    }
    if (message && message.length > 500) {
      throw new Error("Message must be less than 500 characters");
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";

    const emailResponse = await resend.emails.send({
      from: `Document Signing <${fromEmail}>`,
      to: [signerEmail],
      subject: `Signature requested: ${documentName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Signature Request</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="margin-top: 0;">Hello ${signerName},</p>
              <p>You have been requested to sign the following document:</p>
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; font-weight: 600; color: #111827;">${documentName}</p>
              </div>
              ${message ? `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-style: italic;">"${message}"</p>
              </div>
              ` : ""}
              ${documentUrl ? `
              <p>
                <a href="${documentUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Review Document</a>
              </p>
              ` : ""}
              <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">Please contact the sender if you have any questions about this request.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Signature request email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-signature-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
