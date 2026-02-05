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
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { PREDEFINED_REGULATIONS, US_STATES } from "@/hooks/useStateRegulations";
 import { Badge } from "@/components/ui/badge";
 import { Check } from "lucide-react";
 
 interface AddRegulationDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onAdd: (data: any) => void;
 }
 
 export function AddRegulationDialog({ open, onOpenChange, onAdd }: AddRegulationDialogProps) {
   const [activeTab, setActiveTab] = useState("predefined");
   const [selectedState, setSelectedState] = useState("");
   const [selectedPredefined, setSelectedPredefined] = useState<string | null>(null);
   
   // Custom form state
   const [customState, setCustomState] = useState("");
   const [regulationName, setRegulationName] = useState("");
   const [regulationDescription, setRegulationDescription] = useState("");
   const [regulationCode, setRegulationCode] = useState("");
   const [category, setCategory] = useState("general");
   const [sourceUrl, setSourceUrl] = useState("");
 
   const predefinedRegs = selectedState ? PREDEFINED_REGULATIONS[selectedState] || [] : [];
 
   const handleSubmit = () => {
     if (activeTab === "predefined" && selectedState && selectedPredefined) {
       const reg = predefinedRegs.find(r => r.name === selectedPredefined);
       if (reg) {
         onAdd({
           state: selectedState,
           regulation_name: reg.name,
           regulation_description: reg.description,
           regulation_code: reg.code,
           category: reg.category,
           is_predefined: true,
         });
       }
     } else if (activeTab === "custom" && customState && regulationName) {
       onAdd({
         state: customState,
         regulation_name: regulationName,
         regulation_description: regulationDescription,
         regulation_code: regulationCode,
         category: category,
         source_url: sourceUrl,
         is_predefined: false,
       });
     }
     resetForm();
   };
 
   const resetForm = () => {
     setSelectedState("");
     setSelectedPredefined(null);
     setCustomState("");
     setRegulationName("");
     setRegulationDescription("");
     setRegulationCode("");
     setCategory("general");
     setSourceUrl("");
   };
 
   const canSubmit = activeTab === "predefined" 
     ? selectedState && selectedPredefined 
     : customState && regulationName;
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => {
       if (!isOpen) resetForm();
       onOpenChange(isOpen);
     }}>
       <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>Add State Regulation</DialogTitle>
           <DialogDescription>
             Choose from predefined regulations or add a custom one
           </DialogDescription>
         </DialogHeader>
 
         <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList className="grid w-full grid-cols-2">
             <TabsTrigger value="predefined">Predefined Regulations</TabsTrigger>
             <TabsTrigger value="custom">Custom Regulation</TabsTrigger>
           </TabsList>
 
           <TabsContent value="predefined" className="space-y-4 mt-4">
             <div className="space-y-2">
               <Label>Select State</Label>
               <Select value={selectedState} onValueChange={(v) => {
                 setSelectedState(v);
                 setSelectedPredefined(null);
               }}>
                 <SelectTrigger>
                   <SelectValue placeholder="Choose a state..." />
                 </SelectTrigger>
                 <SelectContent>
                   {Object.keys(PREDEFINED_REGULATIONS).map((state) => (
                     <SelectItem key={state} value={state}>
                       {state}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               <p className="text-xs text-muted-foreground">
                 Predefined regulations available for: {Object.keys(PREDEFINED_REGULATIONS).join(", ")}
               </p>
             </div>
 
             {selectedState && predefinedRegs.length > 0 && (
               <div className="space-y-2">
                 <Label>Select Regulation</Label>
                 <div className="grid gap-2">
                   {predefinedRegs.map((reg) => (
                     <div
                       key={reg.name}
                       className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                         selectedPredefined === reg.name
                           ? "border-primary bg-primary/5"
                           : "hover:border-muted-foreground/50"
                       }`}
                       onClick={() => setSelectedPredefined(reg.name)}
                     >
                       <div className="flex items-start justify-between">
                         <div className="space-y-1">
                           <div className="font-medium flex items-center gap-2">
                             {reg.name}
                             {selectedPredefined === reg.name && (
                               <Check className="w-4 h-4 text-primary" />
                             )}
                           </div>
                           {reg.code && (
                             <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                               {reg.code}
                             </code>
                           )}
                           <p className="text-sm text-muted-foreground">{reg.description}</p>
                         </div>
                         <Badge variant="outline" className="shrink-0">
                           {reg.category}
                         </Badge>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </TabsContent>
 
           <TabsContent value="custom" className="space-y-4 mt-4">
             <div className="grid gap-4 sm:grid-cols-2">
               <div className="space-y-2">
                 <Label>State *</Label>
                 <Select value={customState} onValueChange={setCustomState}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select state..." />
                   </SelectTrigger>
                   <SelectContent>
                     {US_STATES.map((state) => (
                       <SelectItem key={state} value={state}>
                         {state}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Category</Label>
                 <Select value={category} onValueChange={setCategory}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="general">General</SelectItem>
                     <SelectItem value="Licensing">Licensing</SelectItem>
                     <SelectItem value="Employment">Employment</SelectItem>
                     <SelectItem value="Training">Training</SelectItem>
                     <SelectItem value="Documentation">Documentation</SelectItem>
                     <SelectItem value="Compliance">Compliance</SelectItem>
                     <SelectItem value="Safety">Safety</SelectItem>
                     <SelectItem value="Privacy">Privacy</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             <div className="space-y-2">
               <Label>Regulation Name *</Label>
               <Input
                 placeholder="e.g., Home Health Aide Training Requirements"
                 value={regulationName}
                 onChange={(e) => setRegulationName(e.target.value)}
               />
             </div>
 
             <div className="space-y-2">
               <Label>Regulation Code</Label>
               <Input
                 placeholder="e.g., HSC 1796.42"
                 value={regulationCode}
                 onChange={(e) => setRegulationCode(e.target.value)}
               />
             </div>
 
             <div className="space-y-2">
               <Label>Description</Label>
               <Textarea
                 placeholder="Describe the regulation requirements..."
                 value={regulationDescription}
                 onChange={(e) => setRegulationDescription(e.target.value)}
                 rows={3}
               />
             </div>
 
             <div className="space-y-2">
               <Label>Source URL</Label>
               <Input
                 type="url"
                 placeholder="https://..."
                 value={sourceUrl}
                 onChange={(e) => setSourceUrl(e.target.value)}
               />
             </div>
           </TabsContent>
         </Tabs>
 
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             Cancel
           </Button>
           <Button onClick={handleSubmit} disabled={!canSubmit}>
             Add Regulation
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }