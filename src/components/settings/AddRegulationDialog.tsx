 import { useState } from "react";
import { Search, CheckSquare, Square } from "lucide-react";
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
  onAdd: (data: any) => Promise<any> | void;
  onBulkAdd?: (regulations: any[]) => Promise<void>;
 }
 
export function AddRegulationDialog({ open, onOpenChange, onAdd, onBulkAdd }: AddRegulationDialogProps) {
   const [activeTab, setActiveTab] = useState("predefined");
   const [selectedState, setSelectedState] = useState("");
  const [selectedPredefined, setSelectedPredefined] = useState<Set<string>>(new Set());
  const [stateSearch, setStateSearch] = useState("");
  const [customStateSearch, setCustomStateSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
   
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
 
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (activeTab === "predefined" && selectedState && selectedPredefined.size > 0) {
        const selectedRegs = predefinedRegs.filter(r => selectedPredefined.has(r.name));
        
        if (selectedRegs.length > 1 && onBulkAdd) {
          // Bulk add multiple regulations
          const regsToAdd = selectedRegs.map(reg => ({
            state: selectedState,
            regulation_name: reg.name,
            regulation_description: reg.description,
            regulation_code: reg.code,
            category: reg.category,
            is_predefined: true,
          }));
          await onBulkAdd(regsToAdd);
        } else if (selectedRegs.length === 1) {
          // Single add
          const reg = selectedRegs[0];
          await onAdd({
            state: selectedState,
            regulation_name: reg.name,
            regulation_description: reg.description,
            regulation_code: reg.code,
            category: reg.category,
            is_predefined: true,
          });
        }
        resetForm();
        onOpenChange(false);
      } else if (activeTab === "custom" && customState && regulationName) {
        await onAdd({
          state: customState,
          regulation_name: regulationName,
          regulation_description: regulationDescription,
          regulation_code: regulationCode,
          category: category,
          source_url: sourceUrl,
          is_predefined: false,
        });
        resetForm();
        onOpenChange(false);
       }
    } finally {
      setIsSubmitting(false);
     }
   };
 
  const toggleRegulation = (name: string) => {
    setSelectedPredefined(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const selectAllRegulations = () => {
    setSelectedPredefined(new Set(predefinedRegs.map(r => r.name)));
  };

  const deselectAllRegulations = () => {
    setSelectedPredefined(new Set());
  };

   const resetForm = () => {
     setSelectedState("");
    setSelectedPredefined(new Set());
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
    ? selectedState && selectedPredefined.size > 0
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
                  <div className="flex items-center justify-between">
                    <Label>Select Regulations</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllRegulations}
                        className="h-7 text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllRegulations}
                        className="h-7 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                 <div className="grid gap-2">
                   {predefinedRegs.map((reg) => (
                     <div
                       key={reg.name}
                       className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPredefined.has(reg.name)
                           ? "border-primary bg-primary/5"
                           : "hover:border-muted-foreground/50"
                       }`}
                        onClick={() => toggleRegulation(reg.name)}
                     >
                       <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {selectedPredefined.has(reg.name) ? (
                              <CheckSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                            ) : (
                              <Square className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            )}
                            <div className="space-y-1">
                              <div className="font-medium">
                                {reg.name}
                              </div>
                              {reg.code && (
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {reg.code}
                                </code>
                              )}
                              <p className="text-sm text-muted-foreground">{reg.description}</p>
                           </div>
                         </div>
                         <Badge variant="outline" className="shrink-0">
                           {reg.category}
                         </Badge>
                       </div>
                     </div>
                   ))}
                 </div>
                  {selectedPredefined.size > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedPredefined.size} regulation{selectedPredefined.size > 1 ? 's' : ''} selected
                    </p>
                  )}
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
            <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Adding..." : selectedPredefined.size > 1 ? `Add ${selectedPredefined.size} Regulations` : "Add Regulation"}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }