 import { useState } from "react";
import { Search } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
 
 interface AddRegulationDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onAdd: (data: any) => void;
 }
 
 export function AddRegulationDialog({ open, onOpenChange, onAdd }: AddRegulationDialogProps) {
   const [activeTab, setActiveTab] = useState("predefined");
   const [selectedState, setSelectedState] = useState("");
   const [selectedPredefined, setSelectedPredefined] = useState<string | null>(null);
  const [stateSearch, setStateSearch] = useState("");
  const [customStateSearch, setCustomStateSearch] = useState("");
   
   // Custom form state
   const [customState, setCustomState] = useState("");
   const [regulationName, setRegulationName] = useState("");
   const [regulationDescription, setRegulationDescription] = useState("");
   const [regulationCode, setRegulationCode] = useState("");
   const [category, setCategory] = useState("general");
   const [sourceUrl, setSourceUrl] = useState("");
 
   const predefinedRegs = selectedState ? PREDEFINED_REGULATIONS[selectedState] || [] : [];
  
  // Filter states that have predefined regulations
  const statesWithPredefined = Object.keys(PREDEFINED_REGULATIONS).filter(state =>
    state.toLowerCase().includes(stateSearch.toLowerCase())
  );
  
  // Filter all US states for custom tab
  const filteredUSStates = US_STATES.filter(state =>
    state.toLowerCase().includes(customStateSearch.toLowerCase())
  );
 
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
    setStateSearch("");
    setCustomStateSearch("");
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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search states..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-48 rounded-md border bg-background">
                  <div className="p-2 space-y-1">
                    {statesWithPredefined.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No states found</p>
                    ) : (
                      statesWithPredefined.map((state) => (
                        <button
                          key={state}
                          type="button"
                          onClick={() => {
                            setSelectedState(state);
                            setSelectedPredefined(null);
                            setStateSearch("");
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedState === state
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          {state}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
               <p className="text-xs text-muted-foreground">
                  {selectedState ? `Selected: ${selectedState}` : "All 50 states have predefined regulations"}
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
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={customState || "Search states..."}
                      value={customStateSearch}
                      onChange={(e) => setCustomStateSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {customStateSearch && (
                    <ScrollArea className="h-32 rounded-md border bg-background">
                      <div className="p-2 space-y-1">
                        {filteredUSStates.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">No states found</p>
                        ) : (
                          filteredUSStates.map((state) => (
                            <button
                              key={state}
                              type="button"
                              onClick={() => {
                                setCustomState(state);
                                setCustomStateSearch("");
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                customState === state
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              }`}
                            >
                              {state}
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  )}
                  {customState && !customStateSearch && (
                    <p className="text-xs text-muted-foreground">Selected: {customState}</p>
                  )}
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