import { FormEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { contactSchema, type OnboardingContact } from "@/utils/caregiverOnboarding";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import { Save, Loader2 } from "lucide-react";

const fields: { key: keyof OnboardingContact; label: string; max: number; autoComplete?: string }[] = [
  { key:"address",label:"Address",max:200,autoComplete:"street-address" },
  { key:"city",label:"City",max:100,autoComplete:"address-level2" },
  { key:"state",label:"State",max:2,autoComplete:"address-level1" },
  { key:"zip_code",label:"ZIP",max:10,autoComplete:"postal-code" },
  { key:"phone",label:"Phone",max:30,autoComplete:"tel" },
  { key:"emergency_contact_name",label:"Emergency contact name",max:100 },
  { key:"emergency_contact_relationship",label:"Emergency contact relationship",max:100 },
  { key:"emergency_contact_phone",label:"Emergency contact phone",max:30 },
];

export default function OnboardingContactForm({ values, locked, onSaved }: {
  values: Record<keyof OnboardingContact, string | null>; locked: boolean; onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<OnboardingContact>({
    resolver:zodResolver(contactSchema),
    defaultValues:Object.fromEntries(fields.map((f) => [f.key,values[f.key] ?? ""])),
  });
  const save = async (contact: OnboardingContact) => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("save_onboarding_contact", { p_contact:contact });
      if (error) throw error;
      await onSaved();
      toast({ title:"Contact information submitted" });
    } catch (error) {
      toast({ title:"Could not save contact information",description:friendlyError(error),variant:"destructive" });
    } finally { setSaving(false); }
  };
  return (
    <form onSubmit={(e: FormEvent<HTMLFormElement>) => void handleSubmit(save)(e)} className="space-y-4">
      <fieldset disabled={locked || saving} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className={field.key === "address" ? "sm:col-span-2" : ""}>
            <Label htmlFor={`onboarding-${field.key}`}>{field.label}</Label>
            <Input {...register(field.key)} id={`onboarding-${field.key}`} maxLength={field.max}
              autoComplete={field.autoComplete} type={field.key.includes("phone") ? "tel" : "text"}
              aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `${field.key}-error` : undefined} className="mt-1" />
            {errors[field.key] && <p id={`${field.key}-error`} className="text-sm text-destructive mt-1">{errors[field.key]?.message}</p>}
          </div>
        ))}
      </fieldset>
      {!locked && <Button type="submit" disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving…" : "Save and submit"}
      </Button>}
    </form>
  );
}