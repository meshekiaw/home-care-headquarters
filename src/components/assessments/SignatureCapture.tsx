import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/forms/SignaturePad";
import { Loader2 } from "lucide-react";

export interface SignatureResult {
  signer_name: string;
  relationship: string | null;
  signature_data: string;
  attestation_text: string;
}

interface SignatureCaptureProps {
  attestation: string;
  defaultName?: string;
  namePrompt?: string;
  askRelationship?: boolean;
  submitLabel?: string;
  saving?: boolean;
  onCancel?: () => void;
  onSubmit: (result: SignatureResult) => void;
}

export function SignatureCapture({
  attestation,
  defaultName = "",
  namePrompt = "Full legal name",
  askRelationship = false,
  submitLabel = "Sign",
  saving = false,
  onCancel,
  onSubmit,
}: SignatureCaptureProps) {
  const [name, setName] = useState(defaultName);
  const [relationship, setRelationship] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  const ready = name.trim().length > 1 && agreed && !!signature && (!askRelationship || relationship.trim().length > 1);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="sig_name">{namePrompt} *</Label>
        <Input
          id="sig_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-[44px] text-base"
          autoComplete="off"
        />
      </div>

      {askRelationship && (
        <div className="space-y-2">
          <Label htmlFor="sig_rel">Relationship to the client *</Label>
          <Input
            id="sig_rel"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="e.g. Daughter, Power of Attorney, Agency staff witness"
            className="min-h-[44px] text-base"
          />
        </div>
      )}

      <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
        <p className="text-sm leading-relaxed">{attestation}</p>
        <div className="flex items-start gap-3">
          <Checkbox
            id="sig_agree"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="sig_agree" className="text-sm font-medium leading-snug">
            I have read the statement above and I agree to it.
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Signature *</Label>
        {signature ? (
          <div className="space-y-2">
            <div className="border rounded-lg bg-white p-2">
              <img src={signature} alt="Captured signature" className="max-h-[150px] mx-auto" />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setSignature(null)}>
              Sign again
            </Button>
          </div>
        ) : (
          <SignaturePad onSignature={setSignature} />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {onCancel && (
          <Button type="button" variant="outline" className="min-h-[44px]" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          className="min-h-[44px] flex-1"
          disabled={!ready || saving}
          onClick={() =>
            onSubmit({
              signer_name: name.trim(),
              relationship: askRelationship ? relationship.trim() : null,
              signature_data: signature!,
              attestation_text: attestation,
            })
          }
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
