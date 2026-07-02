import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase places a recovery session in the URL hash. onAuthStateChange fires PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Also check current session (e.g. link already consumed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else if (!window.location.hash.includes("type=recovery")) {
        setError("This reset link is invalid or has expired. Request a new one from the login page.");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast({ title: "Password must be at least 8 characters", variant: "destructive" });
    if (password !== confirm) return toast({ title: "Passwords do not match", variant: "destructive" });
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You are now signed in." });
      navigate("/login", { replace: true });
      await supabase.auth.signOut();
    } catch (err: any) {
      toast({ title: "Could not reset password", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xl">Set a new password</span>
        </div>

        {error ? (
          <p className="text-destructive">{error}</p>
        ) : !ready ? (
          <p className="text-muted-foreground">Verifying reset link…</p>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">Choose a strong password you don't use anywhere else.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input id="password" type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-10" placeholder="At least 8 characters" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type={show ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11" loading={loading}>Update password</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
