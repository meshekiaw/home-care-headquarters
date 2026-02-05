 import { useState } from "react";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { GeneratedPolicy } from "@/hooks/useStateRegulations";
 import { CheckCircle2, Clock, FileEdit, Copy, Download } from "lucide-react";
 import Markdown from "react-markdown";
 import { useToast } from "@/hooks/use-toast";
 
 interface PolicyViewerDialogProps {
   policy: GeneratedPolicy | null;
   onClose: () => void;
   onStatusChange: (policyId: string, status: string, approvedBy?: string) => void;
 }
 
 export function PolicyViewerDialog({ policy, onClose, onStatusChange }: PolicyViewerDialogProps) {
   const { toast } = useToast();
 
   if (!policy) return null;
 
   const handleCopy = async () => {
     await navigator.clipboard.writeText(policy.content);
     toast({
       title: "Copied to clipboard",
       description: "Policy content has been copied.",
     });
   };
 
   const handleDownload = () => {
     const blob = new Blob([policy.content], { type: "text/markdown" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = `${policy.title.replace(/[^a-z0-9]/gi, "_")}.md`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
     toast({
       title: "Downloaded",
       description: "Policy has been downloaded as markdown.",
     });
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "approved":
         return (
           <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
             <CheckCircle2 className="w-3 h-3 mr-1" />
             Approved
           </Badge>
         );
       case "draft":
         return (
           <Badge variant="secondary">
             <FileEdit className="w-3 h-3 mr-1" />
             Draft
           </Badge>
         );
       case "under_review":
         return (
           <Badge className="bg-warning/10 text-warning-foreground hover:bg-warning/10">
             <Clock className="w-3 h-3 mr-1" />
             Under Review
           </Badge>
         );
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   return (
     <Dialog open={!!policy} onOpenChange={(open) => !open && onClose()}>
       <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
         <DialogHeader>
           <div className="flex items-start justify-between gap-4">
             <div>
               <DialogTitle>{policy.title}</DialogTitle>
               <DialogDescription className="flex items-center gap-2 mt-1">
                 Version {policy.version} • Created{" "}
                 {new Date(policy.created_at).toLocaleDateString()}
                 {policy.approved_at && (
                   <>
                     {" "}
                     • Approved {new Date(policy.approved_at).toLocaleDateString()}
                     {policy.approved_by && ` by ${policy.approved_by}`}
                   </>
                 )}
               </DialogDescription>
             </div>
             {getStatusBadge(policy.status)}
           </div>
         </DialogHeader>
 
         <ScrollArea className="flex-1 border rounded-lg p-4 my-4">
           <div className="prose prose-sm max-w-none dark:prose-invert">
             <Markdown>{policy.content}</Markdown>
           </div>
         </ScrollArea>
 
         <DialogFooter className="flex-wrap gap-2">
           <div className="flex gap-2 mr-auto">
             <Button variant="outline" size="sm" onClick={handleCopy}>
               <Copy className="w-4 h-4 mr-2" />
               Copy
             </Button>
             <Button variant="outline" size="sm" onClick={handleDownload}>
               <Download className="w-4 h-4 mr-2" />
               Download
             </Button>
           </div>
           <div className="flex gap-2">
             {policy.status !== "under_review" && (
               <Button
                 variant="outline"
                 onClick={() => onStatusChange(policy.id, "under_review")}
               >
                 <Clock className="w-4 h-4 mr-2" />
                 Mark for Review
               </Button>
             )}
             {policy.status !== "approved" && (
               <Button
                 onClick={() => onStatusChange(policy.id, "approved")}
                 variant="default"
               >
                 <CheckCircle2 className="w-4 h-4 mr-2" />
                 Approve Policy
               </Button>
             )}
             <Button variant="ghost" onClick={onClose}>
               Close
             </Button>
           </div>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }