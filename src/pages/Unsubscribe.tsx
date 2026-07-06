import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MailX, CheckCircle2, AlertCircle } from "lucide-react";

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    fetch(
      `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
      { headers: { apikey: anonKey } },
    )
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.ok && body.valid) setState("valid");
        else if (body?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) {
      setErrorMsg(error.message);
      setState("error");
      return;
    }
    if ((data as any)?.success) setState("success");
    else if ((data as any)?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-sm p-8 space-y-5 text-center">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            {state === "success" || state === "already" ? (
              <CheckCircle2 className="w-7 h-7 text-primary" />
            ) : state === "invalid" || state === "error" ? (
              <AlertCircle className="w-7 h-7 text-destructive" />
            ) : (
              <MailX className="w-7 h-7 text-primary" />
            )}
          </div>
        </div>

        {state === "loading" && (
          <>
            <h1 className="text-xl font-semibold">Checking your link…</h1>
            <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" />
          </>
        )}

        {state === "valid" && (
          <>
            <h1 className="text-xl font-semibold">Unsubscribe from emails</h1>
            <p className="text-muted-foreground text-sm">
              Click below to stop receiving emails from Home Care Headquarters at this address.
            </p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}

        {state === "submitting" && (
          <>
            <h1 className="text-xl font-semibold">Processing…</h1>
            <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" />
          </>
        )}

        {state === "success" && (
          <>
            <h1 className="text-xl font-semibold">You're unsubscribed</h1>
            <p className="text-muted-foreground text-sm">
              You won't receive further emails from Home Care Headquarters at this address.
            </p>
          </>
        )}

        {state === "already" && (
          <>
            <h1 className="text-xl font-semibold">Already unsubscribed</h1>
            <p className="text-muted-foreground text-sm">
              This address is already on our do-not-email list.
            </p>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="text-xl font-semibold">Link not valid</h1>
            <p className="text-muted-foreground text-sm">
              This unsubscribe link is missing or expired. Please use the link from a recent email.
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">{errorMsg || "Please try again in a moment."}</p>
          </>
        )}
      </div>
    </div>
  );
}
