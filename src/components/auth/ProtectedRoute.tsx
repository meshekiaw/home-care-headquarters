import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "caregiver")[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Signed in but no role assigned — surface a clear message instead of silently
  // rendering (or looping through) protected content.
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4 rounded-2xl border bg-card p-8 shadow-sm">
          <h1 className="text-xl font-semibold">Setting up your account</h1>
          <p className="text-muted-foreground">
            Your account doesn't have access assigned yet. Please contact your
            coordinator to finish setup, then sign in again.
          </p>
          <p className="text-xs text-muted-foreground break-all">
            Signed in as {user.email}
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  // If caregiver tries to access admin routes, redirect to caregiver dashboard
  if (role === "caregiver" && allowedRoles && !allowedRoles.includes("caregiver")) {
    return <Navigate to="/my-dashboard" replace />;
  }

  // If admin tries to access caregiver-only routes, redirect to admin dashboard
  if (role === "admin" && allowedRoles && !allowedRoles.includes("admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
