import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignatureCapture, type SignatureResult } from "@/components/assessments/SignatureCapture";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

export interface SigningStep {
  /** Stable key for the signature being captured (e.g. the slot id). */
  key: string;
  heading: string;
  attestation: string;
  askRelationship?: boolean;
  namePrompt?: string;
  /** Short label used when telling the nurse what is still outstanding. */
  outstandingLabel: string;
}

interface ClientSigningModeProps {
  clientName: string;
  instructions: string;
  /** One or more signatures to capture in a single hand-off, in order. */
  steps: SigningStep[];
  /** Email of the signed-in nurse; typed back once, at the end, to return to her session. */
  nurseEmail: string;
  saving?: boolean;
  onSubmit: (step: SigningStep, result: SignatureResult) => Promise<boolean>;
  onExit: () => void;
}

/**
 * Full-screen signing mode for handing the device to a client at the visit.
 * Supports several signatures in one hand-off: the signer works through each
 * step, agreeing to that step's own attestation, and only at the end does the
 * nurse re-confirm with her sign-in email to return to her session.
 */
export function ClientSigningMode({
  clientName,
  instructions,
  steps,
  nurseEmail,
  saving = false,
  onSubmit,
  onExit,
}: ClientSigningModeProps) {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<"signing" | "handback" | "cancel">("signing");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);

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
  const step = steps[index];
  const outstanding = steps.slice(index).filter((s) => !completed.includes(s.key));

  if (!step && stage === "signing") {
    // Defensive: nothing left to sign.
    setStage("handback");
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto overscroll-contain">
      <div className="min-h-full flex flex-col">
        <div className="border-b bg-muted/40">
          <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">Signature only — the rest of the app is locked</span>
            </span>
            {steps.length > 1 && stage === "signing" && (
              <span className="text-muted-foreground shrink-0">
                {index + 1} of {steps.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 w-full max-w-xl mx-auto px-4 py-8">
          {stage === "signing" && step ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <h1 className="text-xl font-bold">{step.heading}</h1>
                </div>
                <p className="text-base text-muted-foreground">{instructions}</p>
                <p className="text-base">
                  Assessment for <span className="font-semibold">{clientName}</span>
                </p>
                {steps.length > 1 && (
                  <p className="text-sm text-muted-foreground">
                    There {steps.length - index === 1 ? "is" : "are"} {steps.length - index} statement
                    {steps.length - index === 1 ? "" : "s"} left to read and sign.
                  </p>
                )}
              </div>

              <SignatureCapture
                key={step.key}
                attestation={step.attestation}
                askRelationship={step.askRelationship}
                namePrompt={step.namePrompt}
                submitLabel={
                  index < steps.length - 1 ? "Submit and go to the next statement" : "Submit my signature"
                }
                saving={saving}
                onSubmit={async (result) => {
                  const ok = await onSubmit(step, result);
                  if (!ok) return;
                  setCompleted((prev) => [...prev, step.key]);
                  if (index < steps.length - 1) setIndex(index + 1);
                  else setStage("handback");
                }}
              />

              <div className="pt-2 border-t space-y-2">
                {completed.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-h-[44px]"
                    onClick={() => {
                      setConfirmEmail("");
                      setStage("handback");
                    }}
                  >
                    Stop here — I'll sign the rest later
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full min-h-[44px]"
                  onClick={() => {
                    setConfirmEmail("");
                    setStage("cancel");
                  }}
                >
                  Nurse: exit without signing
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center pt-8">
              {stage === "handback" ? (
                <>
                  <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
                  <div className="space-y-2">
                    <h1 className="text-xl font-bold">
                      {completed.length > 1
                        ? "Thank you — your signatures were saved"
                        : "Thank you — your signature was saved"}
                    </h1>
                    <p className="text-base text-muted-foreground">
                      Please hand the device back to your nurse.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <h1 className="text-xl font-bold">
                    {completed.length > 0 ? "Exit this signing session" : "Exit without a signature"}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {completed.length > 0
                      ? "Signatures already given are saved. Only the nurse can leave this screen."
                      : "Nothing has been signed. Only the nurse can leave this screen."}
                  </p>
                </div>
              )}

              {outstanding.length > 0 && (
                <div className="rounded-lg border border-dashed p-4 text-left">
                  <p className="text-sm font-medium">Still outstanding</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                    {outstanding.map((s) => (
                      <li key={s.key}>{s.outstandingLabel}</li>
                    ))}
                  </ul>
                </div>
              )}

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
                {outstanding.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-h-[44px]"
                    onClick={() => setStage("signing")}
                  >
                    Go back to the signature screen
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
