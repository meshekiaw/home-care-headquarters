 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Checkbox } from "@/components/ui/checkbox";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { SignaturePad } from "./SignaturePad";
 
 export interface FormField {
   id: string;
   type: 'text' | 'email' | 'phone' | 'date' | 'textarea' | 'checkbox' | 'select' | 'signature' | 'section';
   label: string;
   required?: boolean;
   placeholder?: string;
   options?: string[]; // For select fields
   description?: string;
   width?: 'full' | 'half';
 }
 
 interface FormFieldRendererProps {
   field: FormField;
   value: any;
   onChange: (fieldId: string, value: any) => void;
   disabled?: boolean;
 }
 
 export function FormFieldRenderer({ field, value, onChange, disabled }: FormFieldRendererProps) {
   if (field.type === 'section') {
     return (
       <div className="col-span-2 pt-4 pb-2 border-b">
         <h3 className="font-semibold text-lg">{field.label}</h3>
         {field.description && (
           <p className="text-sm text-muted-foreground">{field.description}</p>
         )}
       </div>
     );
   }
 
   const fieldWidth = field.width === 'half' ? 'col-span-1' : 'col-span-2';
 
   return (
     <div className={`space-y-2 ${fieldWidth}`}>
       {field.type !== 'checkbox' && (
         <Label htmlFor={field.id}>
           {field.label}
           {field.required && <span className="text-destructive ml-1">*</span>}
         </Label>
       )}
       
       {field.type === 'text' && (
         <Input
           id={field.id}
           value={value || ''}
           onChange={(e) => onChange(field.id, e.target.value)}
           placeholder={field.placeholder}
           disabled={disabled}
           required={field.required}
         />
       )}
       
       {field.type === 'email' && (
         <Input
           id={field.id}
           type="email"
           value={value || ''}
           onChange={(e) => onChange(field.id, e.target.value)}
           placeholder={field.placeholder || 'email@example.com'}
           disabled={disabled}
           required={field.required}
         />
       )}
       
       {field.type === 'phone' && (
         <Input
           id={field.id}
           type="tel"
           value={value || ''}
           onChange={(e) => onChange(field.id, e.target.value)}
           placeholder={field.placeholder || '(555) 555-5555'}
           disabled={disabled}
           required={field.required}
         />
       )}
       
       {field.type === 'date' && (
         <Input
           id={field.id}
           type="date"
           value={value || ''}
           onChange={(e) => onChange(field.id, e.target.value)}
           disabled={disabled}
           required={field.required}
         />
       )}
       
       {field.type === 'textarea' && (
         <Textarea
           id={field.id}
           value={value || ''}
           onChange={(e) => onChange(field.id, e.target.value)}
           placeholder={field.placeholder}
           disabled={disabled}
           required={field.required}
           rows={4}
         />
       )}
       
       {field.type === 'checkbox' && (
         <div className="flex items-center space-x-2">
           <Checkbox
             id={field.id}
             checked={value || false}
             onCheckedChange={(checked) => onChange(field.id, checked)}
             disabled={disabled}
           />
           <Label htmlFor={field.id} className="font-normal">
             {field.label}
             {field.required && <span className="text-destructive ml-1">*</span>}
           </Label>
         </div>
       )}
       
       {field.type === 'select' && (
         <Select
           value={value || ''}
           onValueChange={(val) => onChange(field.id, val)}
           disabled={disabled}
         >
           <SelectTrigger>
             <SelectValue placeholder={field.placeholder || 'Select...'} />
           </SelectTrigger>
           <SelectContent>
             {field.options?.map((option) => (
               <SelectItem key={option} value={option}>
                 {option}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       )}
       
       {field.type === 'signature' && !disabled && (
         <div>
           {value ? (
             <div className="space-y-2">
               <div className="border rounded-lg p-2 bg-muted">
                 <img src={value} alt="Signature" className="max-h-24" />
               </div>
               <button
                 type="button"
                 onClick={() => onChange(field.id, null)}
                 className="text-sm text-primary hover:underline"
               >
                 Clear and re-sign
               </button>
             </div>
           ) : (
             <SignaturePad onSignature={(sig) => onChange(field.id, sig)} />
           )}
         </div>
       )}
       
       {field.type === 'signature' && disabled && value && (
         <div className="border rounded-lg p-2 bg-muted">
           <img src={value} alt="Signature" className="max-h-24" />
         </div>
       )}
       
       {field.description && (
         <p className="text-xs text-muted-foreground">{field.description}</p>
       )}
     </div>
   );
 }