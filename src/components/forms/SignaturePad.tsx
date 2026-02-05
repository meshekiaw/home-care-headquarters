 import { useRef, useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Eraser, Check } from "lucide-react";
 
 interface SignaturePadProps {
   onSignature: (signatureData: string) => void;
   width?: number;
   height?: number;
 }
 
 export function SignaturePad({ onSignature, width = 400, height = 150 }: SignaturePadProps) {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const [isDrawing, setIsDrawing] = useState(false);
   const [hasSignature, setHasSignature] = useState(false);
 
   useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
     
     ctx.fillStyle = '#ffffff';
     ctx.fillRect(0, 0, canvas.width, canvas.height);
     ctx.strokeStyle = '#000000';
     ctx.lineWidth = 2;
     ctx.lineCap = 'round';
     ctx.lineJoin = 'round';
   }, []);
 
   const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
     const canvas = canvasRef.current;
     if (!canvas) return { x: 0, y: 0 };
     
     const rect = canvas.getBoundingClientRect();
     
     if ('touches' in e) {
       return {
         x: e.touches[0].clientX - rect.left,
         y: e.touches[0].clientY - rect.top
       };
     }
     
     return {
       x: e.clientX - rect.left,
       y: e.clientY - rect.top
     };
   };
 
   const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
     
     const { x, y } = getCoordinates(e);
     ctx.beginPath();
     ctx.moveTo(x, y);
     setIsDrawing(true);
     setHasSignature(true);
   };
 
   const draw = (e: React.MouseEvent | React.TouchEvent) => {
     if (!isDrawing) return;
     
     const canvas = canvasRef.current;
     if (!canvas) return;
     
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
     
     const { x, y } = getCoordinates(e);
     ctx.lineTo(x, y);
     ctx.stroke();
   };
 
   const stopDrawing = () => {
     setIsDrawing(false);
   };
 
   const clear = () => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
     
     ctx.fillStyle = '#ffffff';
     ctx.fillRect(0, 0, canvas.width, canvas.height);
     setHasSignature(false);
   };
 
   const saveSignature = () => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     
     const signatureData = canvas.toDataURL('image/png');
     onSignature(signatureData);
   };
 
   return (
     <div className="space-y-3">
       <div className="border rounded-lg overflow-hidden bg-white">
         <canvas
           ref={canvasRef}
           width={width}
           height={height}
           className="touch-none cursor-crosshair w-full"
           style={{ maxWidth: width }}
           onMouseDown={startDrawing}
           onMouseMove={draw}
           onMouseUp={stopDrawing}
           onMouseLeave={stopDrawing}
           onTouchStart={startDrawing}
           onTouchMove={draw}
           onTouchEnd={stopDrawing}
         />
       </div>
       <p className="text-xs text-muted-foreground text-center">Draw your signature above</p>
       <div className="flex gap-2 justify-end">
         <Button type="button" variant="outline" size="sm" onClick={clear}>
           <Eraser className="w-4 h-4 mr-1" />
           Clear
         </Button>
         <Button 
           type="button" 
           size="sm" 
           onClick={saveSignature}
           disabled={!hasSignature}
         >
           <Check className="w-4 h-4 mr-1" />
           Accept Signature
         </Button>
       </div>
     </div>
   );
 }