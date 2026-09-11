import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LegalFooter from "@/components/layout/LegalFooter";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function NurseInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const tokenHash = params.get("token_hash");
    const type = (params.get("type") as "invite" | "recovery" | null) ?? "invite";

    async function verify() {
      if (!tokenHash) {
        setError("This link is missing its security token. Ask your coordinator for a new invite.");
        setVerifying(false);
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) {
        setError("This invite link has expired or was already used. Ask your coordinator to send a new one.");
      } else {
        setReady(true);
      }
      setVerifying(false);
    }
    void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "You're all set", description: "Your password has been saved." });
      navigate("/nurse", { replace: true });
    } catch (err: any) {
      toast({ title: "Could not save password", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl">Home Care Headquarters</span>
          </div>

          {verifying ? (
            <p className="text-muted-foreground">Checking your invite link…</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : ready ? (
            <>
              <h1 className="text-2xl font-bold mb-2">Set your password</h1>
              <p className="text-muted-foreground mb-6">
                Choose a password you don't use anywhere else. You'll use your email and this password to sign in.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type={show ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11" loading={saving}>
                  Save password and continue
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
