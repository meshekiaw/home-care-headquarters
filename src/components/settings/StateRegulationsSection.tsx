 import { useState } from "react";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { 
   Scale, 
   Plus, 
   Trash2, 
   Sparkles, 
   FileText,
   ChevronDown,
   ChevronRight,
   Loader2,
   ExternalLink
 } from "lucide-react";
 import { 
   useStateRegulations, 
   StateRegulation,
   GeneratedPolicy,
   PREDEFINED_REGULATIONS,
   US_STATES
 } from "@/hooks/useStateRegulations";
 import { AddRegulationDialog } from "./AddRegulationDialog";
 import { PolicyViewerDialog } from "./PolicyViewerDialog";
 import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
 } from "@/components/ui/collapsible";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger,
 } from "@/components/ui/alert-dialog";
 
 export function StateRegulationsSection() {
   const {
     regulations,
     policies,
     loading,
     generatingPolicy,
     addRegulation,
     deleteRegulation,
     generatePolicy,
     updatePolicyStatus,
     deletePolicy,
     getPoliciesForRegulation,
   } = useStateRegulations();
 
   const [showAddDialog, setShowAddDialog] = useState(false);
   const [expandedRegulations, setExpandedRegulations] = useState<Set<string>>(new Set());
   const [selectedPolicy, setSelectedPolicy] = useState<GeneratedPolicy | null>(null);
 
   const toggleExpanded = (id: string) => {
     setExpandedRegulations(prev => {
       const next = new Set(prev);
       if (next.has(id)) {
         next.delete(id);
       } else {
         next.add(id);
       }
       return next;
     });
   };
 
   const handleAddRegulation = async (data: any) => {
     const result = await addRegulation({
       state: data.state,
       regulation_name: data.regulation_name,
       regulation_description: data.regulation_description || null,
       regulation_code: data.regulation_code || null,
       category: data.category || 'general',
       source_url: data.source_url || null,
       effective_date: data.effective_date || null,
       is_predefined: data.is_predefined || false,
     });
     if (result) {
       setShowAddDialog(false);
     }
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case 'approved':
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Approved</Badge>;
       case 'draft':
         return <Badge variant="secondary">Draft</Badge>;
       case 'under_review':
        return <Badge variant="secondary">Under Review</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   // Group regulations by state
   const regulationsByState = regulations.reduce((acc, reg) => {
     if (!acc[reg.state]) {
       acc[reg.state] = [];
     }
     acc[reg.state].push(reg);
     return acc;
   }, {} as Record<string, StateRegulation[]>);
 
   if (loading) {
     return (
       <Card>
         <CardHeader>
           <div className="flex items-center gap-2">
             <Scale className="w-5 h-5 text-primary" />
             <CardTitle className="text-lg">State Regulations & Policies</CardTitle>
           </div>
         </CardHeader>
         <CardContent>
           <div className="flex items-center justify-center py-8">
             <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <>
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Scale className="w-5 h-5 text-primary" />
               <div>
                 <CardTitle className="text-lg">State Regulations & Policies</CardTitle>
                 <CardDescription>
                   Manage state regulations and generate AI-powered policies
                 </CardDescription>
               </div>
             </div>
             <Button onClick={() => setShowAddDialog(true)}>
               <Plus className="w-4 h-4 mr-2" />
               Add Regulation
             </Button>
           </div>
         </CardHeader>
         <CardContent className="space-y-4">
           {Object.keys(regulationsByState).length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
               <p>No regulations added yet</p>
               <p className="text-sm">Add state regulations to generate policies and procedures</p>
             </div>
           ) : (
             Object.entries(regulationsByState).map(([state, stateRegs]) => (
               <div key={state} className="border rounded-lg">
                 <div className="bg-muted/50 px-4 py-2 font-medium border-b">
                   {state} ({stateRegs.length} regulation{stateRegs.length !== 1 ? 's' : ''})
                 </div>
                 <div className="divide-y">
                   {stateRegs.map((regulation) => {
                     const regPolicies = getPoliciesForRegulation(regulation.id);
                     const isExpanded = expandedRegulations.has(regulation.id);
                     const isGenerating = generatingPolicy === regulation.id;
 
                     return (
                       <Collapsible
                         key={regulation.id}
                         open={isExpanded}
                         onOpenChange={() => toggleExpanded(regulation.id)}
                       >
                         <div className="p-4">
                           <div className="flex items-start justify-between gap-4">
                             <CollapsibleTrigger className="flex items-start gap-2 text-left flex-1">
                               {isExpanded ? (
                                 <ChevronDown className="w-4 h-4 mt-1 shrink-0" />
                               ) : (
                                 <ChevronRight className="w-4 h-4 mt-1 shrink-0" />
                               )}
                               <div className="space-y-1">
                                 <div className="font-medium">{regulation.regulation_name}</div>
                                 {regulation.regulation_code && (
                                   <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                     {regulation.regulation_code}
                                   </code>
                                 )}
                                 {regulation.regulation_description && (
                                   <p className="text-sm text-muted-foreground">
                                     {regulation.regulation_description}
                                   </p>
                                 )}
                                 <div className="flex items-center gap-2 mt-1">
                                   {regulation.category && (
                                     <Badge variant="outline" className="text-xs">
                                       {regulation.category}
                                     </Badge>
                                   )}
                                   {regPolicies.length > 0 && (
                                     <Badge variant="secondary" className="text-xs">
                                       {regPolicies.length} polic{regPolicies.length !== 1 ? 'ies' : 'y'}
                                     </Badge>
                                   )}
                                 </div>
                               </div>
                             </CollapsibleTrigger>
                             <div className="flex items-center gap-2 shrink-0">
                               <Button
                                 size="sm"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   generatePolicy(regulation);
                                 }}
                                 disabled={isGenerating}
                               >
                                 {isGenerating ? (
                                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                 ) : (
                                   <Sparkles className="w-4 h-4 mr-2" />
                                 )}
                                 Generate Policy
                               </Button>
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button
                                     variant="ghost"
                                     size="icon"
                                     onClick={(e) => e.stopPropagation()}
                                   >
                                     <Trash2 className="w-4 h-4 text-destructive" />
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>Delete Regulation?</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       This will permanently delete "{regulation.regulation_name}" and all its generated policies.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                                     <AlertDialogAction
                                       onClick={() => deleteRegulation(regulation.id)}
                                       className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                     >
                                       Delete
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </div>
                           </div>
 
                           <CollapsibleContent className="mt-4">
                             {regPolicies.length === 0 ? (
                               <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                                 No policies generated yet. Click "Generate Policy" to create one.
                               </div>
                             ) : (
                               <div className="space-y-2 pl-6">
                                 <p className="text-sm font-medium text-muted-foreground">Generated Policies:</p>
                                 {regPolicies.map((policy) => (
                                   <div
                                     key={policy.id}
                                     className="flex items-center justify-between p-3 bg-muted/30 rounded border"
                                   >
                                     <div className="flex items-center gap-3">
                                       <FileText className="w-4 h-4 text-muted-foreground" />
                                       <div>
                                         <p className="font-medium text-sm">{policy.title}</p>
                                         <p className="text-xs text-muted-foreground">
                                           v{policy.version} • Created {new Date(policy.created_at).toLocaleDateString()}
                                         </p>
                                       </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                       {getStatusBadge(policy.status)}
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => setSelectedPolicy(policy)}
                                       >
                                         <ExternalLink className="w-4 h-4 mr-1" />
                                         View
                                       </Button>
                                       <AlertDialog>
                                         <AlertDialogTrigger asChild>
                                           <Button variant="ghost" size="icon">
                                             <Trash2 className="w-4 h-4 text-destructive" />
                                           </Button>
                                         </AlertDialogTrigger>
                                         <AlertDialogContent>
                                           <AlertDialogHeader>
                                             <AlertDialogTitle>Delete Policy?</AlertDialogTitle>
                                             <AlertDialogDescription>
                                               This will permanently delete this policy document.
                                             </AlertDialogDescription>
                                           </AlertDialogHeader>
                                           <AlertDialogFooter>
                                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                                             <AlertDialogAction
                                               onClick={() => deletePolicy(policy.id)}
                                               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                             >
                                               Delete
                                             </AlertDialogAction>
                                           </AlertDialogFooter>
                                         </AlertDialogContent>
                                       </AlertDialog>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </CollapsibleContent>
                         </div>
                       </Collapsible>
                     );
                   })}
                 </div>
               </div>
             ))
           )}
         </CardContent>
       </Card>
 
       <AddRegulationDialog
         open={showAddDialog}
         onOpenChange={setShowAddDialog}
         onAdd={handleAddRegulation}
       />
 
       <PolicyViewerDialog
         policy={selectedPolicy}
         onClose={() => setSelectedPolicy(null)}
         onStatusChange={updatePolicyStatus}
       />
     </>
   );
 }