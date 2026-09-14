import { useEffect, useState } from "react";
import { FileText, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateMaskInput } from "@/components/forms/DateMaskInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import {
  AGENCY_DEFAULT_FIELD_LABELS,
  useAgencyFormDefaults,
  type AgencyFormDefaults,
} from "@/hooks/useAgencyFormDefaults";

type FormState = Omit<AgencyFormDefaults, "id">;

const SHORT_FIELDS: (keyof FormState)[] = [
  "provider_name",
  "provider_id_number",
  "referral_source",
  "projected_end_date_of_service",
  "attending_physician",
  "attending_physician_provider_id",
];

const LONG_FIELDS: (keyof FormState)[] = [
  "mailing_address",
  "section_xi_certification",
  "section_xi_comments",
];

export function AgencyFormDefaultsSection() {
  const { defaults, loading, reload } = useAgencyFormDefaults();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [values, setValues] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!defaults) return;
    const { id: _id, ...rest } = defaults;
    setValues(rest);
  }, [defaults]);

  async function handleSave() {
    if (!defaults || !values) return;
    setSaving(true);
    const { error } = await supabase
      .from("agency_form_defaults")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", defaults.id);
    setSaving(false);

    if (error) {
      toast({
        title: "Could not save",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Saved", description: "New assessments will use these values." });
    reload();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Assessment Form Defaults</CardTitle>
        </div>
        <CardDescription>
          These values fill in automatically on every new 618 assessment. Nurses can still change them
          on an individual form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading || !values ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {SHORT_FIELDS.map((key) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{AGENCY_DEFAULT_FIELD_LABELS[key]}</Label>
                  {key === "projected_end_date_of_service" ? (
                    <DateMaskInput
                      id={key}
                      value={values[key] ?? ""}
                      disabled={!isAdmin || saving}
                      onChange={(v) => setValues((prev) => (prev ? { ...prev, [key]: v } : prev))}
                    />
                  ) : (
                    <Input
                      id={key}
                      value={values[key] ?? ""}
                      disabled={!isAdmin || saving}
                      onChange={(e) =>
                        setValues((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            {LONG_FIELDS.map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{AGENCY_DEFAULT_FIELD_LABELS[key]}</Label>
                <Textarea
                  id={key}
                  rows={2}
                  value={values[key] ?? ""}
                  disabled={!isAdmin || saving}
                  onChange={(e) => setValues((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
                />
              </div>
            ))}

            {isAdmin ? (
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Only an administrator can change these values.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
