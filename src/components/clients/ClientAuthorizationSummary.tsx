import { Badge } from "@/components/ui/badge";
import { authorizationDate, authorizationStep, authorizationWaiting, type AuthorizationProgress } from "@/utils/clientAuthorization";

export function ClientAuthorizationSummary({ progress }: { progress?: AuthorizationProgress | null }) {
  const step = authorizationStep(progress);
  return <div className="space-y-1 text-sm min-w-[170px] max-w-[280px]">
    <p className="break-words">{step.label}{step.date ? ` · ${authorizationDate(step.date)}` : ""}</p>
    {authorizationWaiting(progress) && <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">Waiting 15+ days</Badge>}
  </div>;
}