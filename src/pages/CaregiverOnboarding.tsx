import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import CaregiverLayout from "@/components/layout/CaregiverLayout";
import { usePortalCaregiver } from "@/hooks/usePortalCaregiver";
import { useCaregiverOnboarding } from "@/hooks/useCaregiverOnboarding";
import OnboardingContactForm from "@/components/caregivers/OnboardingContactForm";
import OnboardingUpload from "@/components/caregivers/OnboardingUpload";
import { onboardingProgress } from "@/utils/caregiverOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/friendlyError";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, CheckCircle2, ClipboardCheck, LockKeyhole, RefreshCw, Loader2, FileText } from "lucide-react";

const statuses = {
  not_started:{label:"Not started",variant:"onboardingIdle"},
  submitted:{label:"Submitted, waiting for review",variant:"onboardingSubmitted"},
  approved:{label:"Approved",variant:"onboardingApproved"},
  sent_back:{label:"Sent back",variant:"onboardingSentBack"},
  not_applicable:{label:"Not applicable",variant:"onboardingIdle"},
} as const;
type PortalPolicy = {id:string;title:string;content:string;version:number;effective_date:string};

export default function CaregiverOnboarding() {
  const caregiver=usePortalCaregiver();
  const onboarding=useCaregiverOnboarding(caregiver.data?.id,caregiver.data?.onboarding_required === true && caregiver.data.status !== "inactive");
  const {toast}=useToast();
  const [policy,setPolicy]=useState<PortalPolicy | null>(null);
  const [consent,setConsent]=useState(false);
  const [acknowledging,setAcknowledging]=useState(false);
  const [ackError,setAckError]=useState<string | null>(null);
  const [confirmApp,setConfirmApp]=useState(false);
  const [submittingApp,setSubmittingApp]=useState(false);
  const finishApplication=async()=>{
    setSubmittingApp(true);
    try {const {error}=await supabase.rpc("submit_onboarding_application");if(error)throw error;await onboarding.refresh();setConfirmApp(false);toast({title:"Application marked as finished"});}
    catch(error){toast({title:"Could not submit application",description:friendlyError(error),variant:"destructive"});}
    finally{setSubmittingApp(false);}
  };


  const acknowledge=async () => {
    if(!policy || !consent) return;
    setAcknowledging(true);setAckError(null);
    try {
      const {error}=await supabase.rpc("acknowledge_onboarding_policy",{p_policy_id:policy.id});
      if(error) throw error;
      await onboarding.refresh();setPolicy(null);setConsent(false);
      toast({title:"Policy acknowledged"});
    } catch(error) {const message=friendlyError(error);setAckError(message);toast({title:"Could not record acknowledgment",description:message,variant:"destructive"});}
    finally {setAcknowledging(false);}
  };

  if(caregiver.isLoading || (caregiver.data?.onboarding_required && onboarding.isLoading)) return <CaregiverLayout><div className="max-w-3xl space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-20" /><Skeleton className="h-96" /></div></CaregiverLayout>;
  if(caregiver.isError || onboarding.isError) return <CaregiverLayout><div className="py-12 space-y-4"><p role="alert">Onboarding could not be loaded. Please try again.</p><Button variant="outline" className="gap-2" onClick={()=>{void caregiver.refetch();void onboarding.refetch();}}><RefreshCw className="h-4 w-4" />Try again</Button></div></CaregiverLayout>;
  if(!caregiver.data?.onboarding_required || caregiver.data.status === "inactive") return <Navigate to="/my-dashboard" replace />;
  if(!onboarding.data) return <CaregiverLayout><p className="py-12 text-muted-foreground">Onboarding is not available. Please contact the office.</p></CaregiverLayout>;
  const {steps,documents,policies,acknowledgedIds}=onboarding.data;
  const done=onboardingProgress(steps);
  const outstanding=policies.filter((p)=>!acknowledgedIds.includes(p.id));
  return <CaregiverLayout>
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-4">
        <div className="flex items-center gap-3"><ClipboardCheck className="h-7 w-7 text-primary" /><h2 className="text-2xl font-bold">Onboarding</h2></div>
        <div className="flex items-center justify-between gap-3"><p className="font-medium">{done} of 7 done</p>{done === 7 && <CheckCircle2 className="h-5 w-5 text-status-complete" />}</div>
        <Progress value={done/7*100} aria-label={`${done} of 7 onboarding steps done`} className="h-2" />
      </header>
      <Accordion type="multiple" className="border-t" defaultValue={[String(steps.find((s)=>!["approved","not_applicable"].includes(s.status))?.step_number ?? 1)]}>
        {steps.map((step)=>{
          const status=statuses[step.status as keyof typeof statuses] ?? statuses.not_started;
          const locked=step.status === "approved";
          return <AccordionItem value={String(step.step_number)} key={step.id}>
            <AccordionTrigger className="gap-3 py-5 text-left hover:no-underline">
              <span className="flex gap-3 flex-1 min-w-0 items-start">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">{step.step_number}</span>
                <span className="space-y-2 min-w-0"><span className="block font-semibold">{step.step_label}</span><Badge variant={status.variant} className="max-w-full whitespace-normal text-left">{status.label}</Badge>
                  {step.status === "sent_back" && <span className="block text-sm text-onboarding-returned break-words">{step.sent_back_reason}</span>}
                </span>
              </span>
              {locked && <LockKeyhole className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-6 sm:pl-11">
              {step.step_key === "hiring_application" && <div className="space-y-3">
                {locked ? <Button variant="outline" disabled>Application approved</Button> : <Button asChild variant="outline" className="gap-2"><Link to="/my-application">Open My Application<ArrowUpRight className="h-4 w-4" /></Link></Button>}
                {step.status === "submitted" && step.submitted_at && <p className="text-sm text-muted-foreground">Submitted on {new Date(step.submitted_at).toLocaleDateString()}</p>}
                {["not_started","sent_back"].includes(step.status) && <div><Button onClick={()=>setConfirmApp(true)}>I’ve finished my application</Button></div>}
              </div>}
              {step.step_key === "personal_information" && <OnboardingContactForm values={caregiver.data} locked={locked} onSaved={onboarding.refresh} />}
              {step.step_key === "policy_signoffs" && <>
                {policies.length === 0 ? <p className="text-sm text-muted-foreground">No policies to sign yet</p> : outstanding.length === 0 ? <p className="text-sm text-muted-foreground">All published policies acknowledged.</p> :
                  <ul className="divide-y">{outstanding.map((p)=><li key={p.id} className="flex items-center gap-3 py-3"><FileText className="h-4 w-4 text-muted-foreground shrink-0" /><span className="flex-1 min-w-0 break-words">{p.title}</span><Button size="sm" variant="outline" disabled={locked} onClick={()=>{setPolicy(p);setConsent(false);setAckError(null);}}>Review</Button></li>)}</ul>}
                {!locked && policies.length > 0 && outstanding.length === 0 && step.status !== "submitted" && <Button onClick={async()=>{
                  setAcknowledging(true);
                  try {const {error}=await supabase.rpc("submit_onboarding_policy_signoffs");if(error)throw error;await onboarding.refresh();toast({title:"Policy sign-offs submitted"});}
                  catch(error){toast({title:"Could not submit sign-offs",description:friendlyError(error),variant:"destructive"});}
                  finally{setAcknowledging(false);}
                }} disabled={acknowledging}>{acknowledging?"Submitting…":"Submit sign-offs"}</Button>}
              </>}
              {["photo_id","social_security_card","certificate"].includes(step.step_key) && <OnboardingUpload key={`${step.id}-${step.status}-${step.no_certificate}-${step.certificate_name}`} caregiverId={caregiver.data.id} stepKey={step.step_key} locked={locked} certificateName={step.certificate_name} noCertificate={step.no_certificate} documents={documents.filter((d)=>d.step_id === step.id)} onSaved={onboarding.refresh} />}
              {step.step_key === "orientation" && <Button asChild variant="outline" className="gap-2"><Link to="/my-orientation">Open Orientation<ArrowUpRight className="h-4 w-4" /></Link></Button>}
            </AccordionContent>
          </AccordionItem>;
        })}
      </Accordion>
    </div>
    <AlertDialog open={confirmApp} onOpenChange={(o)=>{if(!submittingApp)setConfirmApp(o);}}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Finished your application?</AlertDialogTitle><AlertDialogDescription>This tells the office your hiring application is ready for review.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={submittingApp}>Cancel</AlertDialogCancel><Button disabled={submittingApp} className="gap-2" onClick={()=>void finishApplication()}>{submittingApp && <Loader2 className="h-4 w-4 animate-spin" />}{submittingApp?"Submitting…":"Yes, I’m finished"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={Boolean(policy)} onOpenChange={(open)=>{if(!open && !acknowledging)setPolicy(null);}}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col">
        <DialogHeader><DialogTitle className="break-words">{policy?.title}</DialogTitle><p className="text-sm text-muted-foreground">Version {policy?.version}</p></DialogHeader>
        <ScrollArea className="min-h-0 flex-1 max-h-[50dvh]"><div className="whitespace-pre-wrap break-words text-sm pr-4">{policy?.content}</div></ScrollArea>
        <div className="flex gap-2 items-start"><Checkbox id="policy-consent" checked={consent} disabled={acknowledging} onCheckedChange={(v)=>setConsent(v===true)} /><Label htmlFor="policy-consent" className="leading-5">I have read and acknowledge this policy.</Label></div>
        {ackError && <p role="alert" className="text-sm text-destructive">{ackError}</p>}
        <Button onClick={()=>void acknowledge()} disabled={!consent || acknowledging} className="gap-2">{acknowledging && <Loader2 className="h-4 w-4 animate-spin" />}{acknowledging?"Saving…":"Acknowledge policy"}</Button>
      </DialogContent>
    </Dialog>
  </CaregiverLayout>;
}