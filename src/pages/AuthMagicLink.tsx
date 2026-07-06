import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

/**
 * Magic-link landing page.
 *
 * SECURITY: this page does NOT call supabase.auth.verifyOtp on load. Email and
 * SMS link scanners (Gmail, Outlook, carrier previews) will fetch the URL
 * before the user does, and calling verifyOtp on mount would let those
 * scanners burn the single-use token. We only exchange the token after an
 * explicit user click.
 */
export default function AuthMagicLink() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const tokenHash = params.get("token_hash");
  const type = (params.get("type") || "magiclink") as
    | "magiclink"
    | "signup"
    | "recovery"
    | "invite"
    | "email";
  const next = params.get("next") || "/my-training";

  const [status, setStatus] = useState<"idle" | "verifying" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const invalid = useMemo(() => !tokenHash, [tokenHash]);

  useEffect(() => {
    // Prevent link-preview crawlers from indexing this page.
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = "Sign in — Home Care Headquarters";
    return () => {
      document.head.removeChild(meta);
      document.title = prevTitle;
    };
  }, []);

  const handleContinue = async () => {
    if (!tokenHash) return;
    setStatus("verifying");
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (error) throw error;
      navigate(next, { replace: true });
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message || "This sign-in link is no longer valid.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-sm p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Welcome to Home Care Headquarters</h1>
          <p className="text-muted-foreground text-sm">
            You're one tap away from your training portal. Continue below to
            sign in securely — no password required.
          </p>
        </div>

        {invalid ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-left flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Sign-in link is missing details.</p>
              <p className="text-muted-foreground mt-1">
                The link appears incomplete. Ask your coordinator to resend
                your training invitation.
              </p>
            </div>
          </div>
        ) : status === "error" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-left flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Link expired or already used.</p>
                <p className="text-muted-foreground mt-1">{errorMsg}</p>
                <p className="text-muted-foreground mt-2">
                  Contact your coordinator at{" "}
                  <a className="underline" href="mailto:homcarenetwork4@gmail.com">
                    homcarenetwork4@gmail.com
                  </a>{" "}
                  to request a new link.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/login")} className="w-full">
              Go to login
            </Button>
          </div>
        ) : (
          <>
            <Button
              onClick={handleContinue}
              disabled={status === "verifying"}
              className="w-full h-11"
            >
              {status === "verifying" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing you in…
                </>
              ) : (
                "Continue to my training"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              For your security, this link is single-use and expires in one hour.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
