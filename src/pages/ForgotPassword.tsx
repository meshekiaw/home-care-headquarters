import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: "Check your email", description: "We sent a password reset link." });
    } catch (err: any) {
      toast({ title: "Could not send reset email", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xl">Reset password</span>
        </div>

        {sent ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground">
              If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
              The link opens the reset page and expires in 60 minutes.
            </p>
            <Button asChild variant="outline" className="w-full"><Link to="/login">Back to login</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Forgot your password?</h1>
            <p className="text-muted-foreground mb-6">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11" loading={loading}>Send reset link</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
