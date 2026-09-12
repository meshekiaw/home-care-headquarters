import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignatureCapture, type SignatureResult } from "@/components/assessments/SignatureCapture";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

interface ClientSigningModeProps {
  clientName: string;
  attestation: string;
  askRelationship?: boolean;
  heading: string;
  instructions: string;
  namePrompt?: string;
  /** Email of the signed-in nurse; typed back to return to her session. */
  nurseEmail: string;
  saving?: boolean;
  onSubmit: (result: SignatureResult) => Promise<boolean>;
  onExit: () => void;
}

/**
 * Full-screen signing mode for handing the device to a client at the visit.
 * The client sees only the signature screen: no navigation, no app chrome, no
 * client data beyond their own name. Leaving requires the nurse to re-confirm.
 */
export function ClientSigningMode({
  clientName,
  attestation,
  askRelationship = false,
  heading,
  instructions,
  namePrompt,
  nurseEmail,
  saving = false,
  onSubmit,
  onExit,
}: ClientSigningModeProps) {
  const [stage, setStage] = useState<"signing" | "handback">("signing");
  const [confirmEmail, setConfirmEmail] = useState("");

  // Block navigation away while the device is out of the nurse's hands.
  useEffect(() => {
    const pushGuard = () => window.history.pushState({ signingMode: true }, "");
    pushGuard();
    const onPop = () => pushGuard();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onBeforeUnload);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const emailMatches = confirmEmail.trim().toLowerCase() === nurseEmail.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto overscroll-contain">
      <div className="min-h-full flex flex-col">
        <div className="border-b bg-muted/40">
          <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium">Signature only — the rest of the app is locked</span>
          </div>
        </div>

        <div className="flex-1 w-full max-w-xl mx-auto px-4 py-8">
          {stage === "signing" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <h1 className="text-xl font-bold">{heading}</h1>
                </div>
                <p className="text-base text-muted-foreground">{instructions}</p>
                <p className="text-base">
                  Assessment for <span className="font-semibold">{clientName}</span>
                </p>
              </div>

              <SignatureCapture
                attestation={attestation}
                askRelationship={askRelationship}
                namePrompt={namePrompt}
                submitLabel="Submit my signature"
                saving={saving}
                onSubmit={async (result) => {
                  const ok = await onSubmit(result);
                  if (ok) setStage("handback");
                }}
              />
            </div>
          ) : (
            <div className="space-y-6 text-center pt-8">
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
              <div className="space-y-2">
                <h1 className="text-xl font-bold">Thank you — your signature was saved</h1>
                <p className="text-base text-muted-foreground">
                  Please hand the device back to your nurse.
                </p>
              </div>
              <div className="rounded-lg border p-4 space-y-3 text-left">
                <Label htmlFor="nurse_confirm">Nurse: enter your sign-in email to continue</Label>
                <Input
                  id="nurse_confirm"
                  type="email"
                  autoComplete="off"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-h-[44px] text-base"
                />
                <Button className="w-full min-h-[44px]" disabled={!emailMatches} onClick={onExit}>
                  Return to the assessment
                </Button>
                {confirmEmail.length > 0 && !emailMatches && (
                  <p className="text-sm text-destructive">That doesn't match the signed-in nurse.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
