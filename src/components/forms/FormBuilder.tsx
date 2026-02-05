 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent } from "@/components/ui/card";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Checkbox } from "@/components/ui/checkbox";
 import { 
   Plus, 
   Trash2, 
   GripVertical,
   Type,
   Mail,
   Phone,
   Calendar,
   FileText,
   CheckSquare,
   List,
   PenTool,
   Heading
 } from "lucide-react";
 import { FormField } from "./FormFieldRenderer";
 
 interface FormBuilderProps {
   fields: FormField[];
   onChange: (fields: FormField[]) => void;
 }
 
 const fieldTypeIcons: Record<string, React.ReactNode> = {
   text: <Type className="w-4 h-4" />,
   email: <Mail className="w-4 h-4" />,
   phone: <Phone className="w-4 h-4" />,
   date: <Calendar className="w-4 h-4" />,
   textarea: <FileText className="w-4 h-4" />,
   checkbox: <CheckSquare className="w-4 h-4" />,
   select: <List className="w-4 h-4" />,
   signature: <PenTool className="w-4 h-4" />,
   section: <Heading className="w-4 h-4" />,
 };
 
 const fieldTypeLabels: Record<string, string> = {
   text: 'Text Input',
   email: 'Email',
   phone: 'Phone',
   date: 'Date',
   textarea: 'Text Area',
   checkbox: 'Checkbox',
   select: 'Dropdown',
   signature: 'Signature',
   section: 'Section Header',
 };
 
 export function FormBuilder({ fields, onChange }: FormBuilderProps) {
   const [addFieldOpen, setAddFieldOpen] = useState(false);
   const [editingField, setEditingField] = useState<FormField | null>(null);
   const [newField, setNewField] = useState<Partial<FormField>>({
     type: 'text',
     label: '',
     required: false,
     width: 'full',
   });
 
   const addField = () => {
     if (!newField.label || !newField.type) return;
     
     const field: FormField = {
       id: `field_${Date.now()}`,
       type: newField.type as FormField['type'],
       label: newField.label,
       required: newField.required,
       placeholder: newField.placeholder,
       description: newField.description,
       width: newField.width as 'full' | 'half',
       options: newField.options,
     };
     
     onChange([...fields, field]);
     setNewField({ type: 'text', label: '', required: false, width: 'full' });
     setAddFieldOpen(false);
   };
 
   const updateField = (index: number, updates: Partial<FormField>) => {
     const newFields = [...fields];
     newFields[index] = { ...newFields[index], ...updates };
     onChange(newFields);
   };
 
   const removeField = (index: number) => {
     onChange(fields.filter((_, i) => i !== index));
   };
 
   const moveField = (index: number, direction: 'up' | 'down') => {
     if (
       (direction === 'up' && index === 0) ||
       (direction === 'down' && index === fields.length - 1)
     ) return;
     
     const newFields = [...fields];
     const targetIndex = direction === 'up' ? index - 1 : index + 1;
     [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
     onChange(newFields);
   };
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <h3 className="font-medium">Form Fields</h3>
         <Button size="sm" onClick={() => setAddFieldOpen(true)}>
           <Plus className="w-4 h-4 mr-1" />
           Add Field
         </Button>
       </div>
 
       {fields.length === 0 ? (
         <Card className="border-dashed">
           <CardContent className="flex flex-col items-center justify-center py-8 text-center">
             <p className="text-muted-foreground mb-2">No fields added yet</p>
             <Button variant="outline" size="sm" onClick={() => setAddFieldOpen(true)}>
               <Plus className="w-4 h-4 mr-1" />
               Add your first field
             </Button>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-2">
           {fields.map((field, index) => (
             <Card key={field.id} className="group">
               <CardContent className="flex items-center gap-3 p-3">
                 <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                 <div className="flex items-center gap-2 min-w-0 flex-1">
                   {fieldTypeIcons[field.type]}
                   <span className="font-medium truncate">{field.label}</span>
                   {field.required && (
                     <span className="text-xs text-destructive">*</span>
                   )}
                   <span className="text-xs text-muted-foreground">
                     ({fieldTypeLabels[field.type]})
                   </span>
                 </div>
                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8"
                     onClick={() => moveField(index, 'up')}
                     disabled={index === 0}
                   >
                     ↑
                   </Button>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8"
                     onClick={() => moveField(index, 'down')}
                     disabled={index === fields.length - 1}
                   >
                     ↓
                   </Button>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8 text-destructive hover:text-destructive"
                     onClick={() => removeField(index)}
                   >
                     <Trash2 className="w-4 h-4" />
                   </Button>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       )}
 
       <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Add Form Field</DialogTitle>
             <DialogDescription>Configure the new field for your form</DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>Field Type</Label>
               <Select
                 value={newField.type}
                 onValueChange={(value) => setNewField(prev => ({ ...prev, type: value as FormField['type'] }))}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {Object.entries(fieldTypeLabels).map(([type, label]) => (
                     <SelectItem key={type} value={type}>
                       <div className="flex items-center gap-2">
                         {fieldTypeIcons[type]}
                         {label}
                       </div>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             
             <div className="space-y-2">
               <Label>Label *</Label>
               <Input
                 value={newField.label || ''}
                 onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                 placeholder="e.g., Full Name"
               />
             </div>
             
             {newField.type !== 'section' && (
               <>
                 <div className="space-y-2">
                   <Label>Placeholder</Label>
                   <Input
                     value={newField.placeholder || ''}
                     onChange={(e) => setNewField(prev => ({ ...prev, placeholder: e.target.value }))}
                     placeholder="e.g., Enter your name..."
                   />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="flex items-center space-x-2">
                     <Checkbox
                       id="required"
                       checked={newField.required}
                       onCheckedChange={(checked) => setNewField(prev => ({ ...prev, required: !!checked }))}
                     />
                     <Label htmlFor="required">Required field</Label>
                   </div>
                   
                   <div className="space-y-2">
                     <Label>Width</Label>
                     <Select
                       value={newField.width || 'full'}
                       onValueChange={(value) => setNewField(prev => ({ ...prev, width: value as 'full' | 'half' }))}
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="full">Full Width</SelectItem>
                         <SelectItem value="half">Half Width</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
               </>
             )}
             
             {newField.type === 'select' && (
               <div className="space-y-2">
                 <Label>Options (comma separated)</Label>
                 <Input
                   value={newField.options?.join(', ') || ''}
                   onChange={(e) => setNewField(prev => ({ 
                     ...prev, 
                     options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                   }))}
                   placeholder="Option 1, Option 2, Option 3"
                 />
               </div>
             )}
             
             <div className="space-y-2">
               <Label>Help Text (optional)</Label>
               <Input
                 value={newField.description || ''}
                 onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
                 placeholder="Additional instructions for this field..."
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setAddFieldOpen(false)}>
               Cancel
             </Button>
             <Button onClick={addField} disabled={!newField.label}>
               Add Field
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }