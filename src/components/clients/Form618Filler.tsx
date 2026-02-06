import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PdfSignatureMarker } from "@/components/clients/PdfSignatureMarker";
import { SignatureRequestDialog } from "@/components/clients/SignatureRequestDialog";
import { ChevronLeft, ChevronRight, Download, Send } from "lucide-react";

// Configure worker
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export interface Form618FillerHandle {
  downloadFilledPdf: () => Promise<void>;
  reset: () => void;
}

export type Form618FillerProps = {
  fileUrl: string;
  fileName?: string;
  className?: string;
  onError?: (message: string) => void;
};

// Define form field structure for the 618 form
// Each field has a name, page number, and position (percentage-based for flexibility)
interface FormFieldDef {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "checkbox" | "signature";
  page: number;
  // Position as percentage of page dimensions
  xPct: number;
  yPct: number;
  // Optional width for text fields
  maxWidth?: number;
  fontSize?: number;
  section?: string;
}

// 618 Form Field Definitions - mapped to approximate positions on each page
const FORM_618_FIELDS: FormFieldDef[] = [
  // Page 1 - Header and Agency Info
  { id: "agency_name", label: "Agency Name", type: "text", page: 1, xPct: 0.25, yPct: 0.12, section: "Agency Information" },
  { id: "agency_address", label: "Agency Address", type: "text", page: 1, xPct: 0.25, yPct: 0.145, section: "Agency Information" },
  { id: "agency_city_state_zip", label: "City, State, ZIP", type: "text", page: 1, xPct: 0.25, yPct: 0.17, section: "Agency Information" },
  { id: "agency_phone", label: "Phone Number", type: "text", page: 1, xPct: 0.70, yPct: 0.12, section: "Agency Information" },
  { id: "provider_number", label: "Provider Number", type: "text", page: 1, xPct: 0.70, yPct: 0.145, section: "Agency Information" },
  
  // Page 1 - Client Information
  { id: "client_name", label: "Client's Name", type: "text", page: 1, xPct: 0.25, yPct: 0.22, section: "Client Information" },
  { id: "medicaid_id", label: "Medicaid ID #", type: "text", page: 1, xPct: 0.70, yPct: 0.22, section: "Client Information" },
  { id: "client_address", label: "Address", type: "text", page: 1, xPct: 0.25, yPct: 0.245, section: "Client Information" },
  { id: "client_city_state_zip", label: "City, State, ZIP", type: "text", page: 1, xPct: 0.25, yPct: 0.27, section: "Client Information" },
  { id: "client_phone", label: "Phone", type: "text", page: 1, xPct: 0.70, yPct: 0.245, section: "Client Information" },
  { id: "client_dob", label: "Date of Birth", type: "date", page: 1, xPct: 0.70, yPct: 0.27, section: "Client Information" },
  
  // Page 1 - Physician Information  
  { id: "physician_name", label: "Physician's Name", type: "text", page: 1, xPct: 0.25, yPct: 0.32, section: "Physician Information" },
  { id: "physician_phone", label: "Physician Phone", type: "text", page: 1, xPct: 0.70, yPct: 0.32, section: "Physician Information" },
  { id: "physician_address", label: "Physician Address", type: "text", page: 1, xPct: 0.25, yPct: 0.345, section: "Physician Information" },
  
  // Page 1 - Assessment Information
  { id: "assessment_date", label: "Date of Assessment", type: "date", page: 1, xPct: 0.25, yPct: 0.40, section: "Assessment Details" },
  { id: "assessment_type_initial", label: "Initial Assessment", type: "checkbox", page: 1, xPct: 0.50, yPct: 0.40, section: "Assessment Details" },
  { id: "assessment_type_reassessment", label: "Reassessment", type: "checkbox", page: 1, xPct: 0.65, yPct: 0.40, section: "Assessment Details" },
  { id: "assessment_type_revision", label: "Revision", type: "checkbox", page: 1, xPct: 0.80, yPct: 0.40, section: "Assessment Details" },
  
  // Page 2 - Freedom of Choice
  { id: "freedom_choice_signature", label: "Client/Representative Signature", type: "signature", page: 2, xPct: 0.35, yPct: 0.48, section: "Freedom of Choice" },
  { id: "freedom_choice_date", label: "Date", type: "date", page: 2, xPct: 0.75, yPct: 0.48, section: "Freedom of Choice" },
  
  // Page 2 - Medical Diagnoses
  { id: "diagnosis_1", label: "Diagnosis 1 (ICD Code & Description)", type: "text", page: 2, xPct: 0.15, yPct: 0.72, section: "Medical Diagnoses" },
  { id: "diagnosis_2", label: "Diagnosis 2", type: "text", page: 2, xPct: 0.15, yPct: 0.75, section: "Medical Diagnoses" },
  { id: "diagnosis_3", label: "Diagnosis 3", type: "text", page: 2, xPct: 0.15, yPct: 0.78, section: "Medical Diagnoses" },
  { id: "diagnosis_4", label: "Diagnosis 4", type: "text", page: 2, xPct: 0.15, yPct: 0.81, section: "Medical Diagnoses" },
  { id: "diagnosis_5", label: "Diagnosis 5", type: "text", page: 2, xPct: 0.15, yPct: 0.84, section: "Medical Diagnoses" },
  
  // Page 3 - Physical Dependency Needs (ADLs)
  { id: "bathing_assistance", label: "Bathing - Assistance Needed", type: "textarea", page: 3, xPct: 0.50, yPct: 0.18, section: "Physical Dependency - Bathing", fontSize: 9 },
  { id: "dressing_assistance", label: "Dressing - Assistance Needed", type: "textarea", page: 3, xPct: 0.50, yPct: 0.30, section: "Physical Dependency - Dressing", fontSize: 9 },
  { id: "grooming_assistance", label: "Grooming - Assistance Needed", type: "textarea", page: 3, xPct: 0.50, yPct: 0.42, section: "Physical Dependency - Grooming", fontSize: 9 },
  { id: "toileting_assistance", label: "Toileting - Assistance Needed", type: "textarea", page: 3, xPct: 0.50, yPct: 0.54, section: "Physical Dependency - Toileting", fontSize: 9 },
  { id: "transferring_assistance", label: "Transferring - Assistance Needed", type: "textarea", page: 3, xPct: 0.50, yPct: 0.66, section: "Physical Dependency - Transferring", fontSize: 9 },
  { id: "mobility_assistance", label: "Mobility - Assistance Needed", type: "textarea", page: 3, xPct: 0.50, yPct: 0.78, section: "Physical Dependency - Mobility", fontSize: 9 },
  
  // Page 4 - More ADLs and IADLs
  { id: "eating_assistance", label: "Eating - Assistance Needed", type: "textarea", page: 4, xPct: 0.50, yPct: 0.12, section: "Physical Dependency - Eating", fontSize: 9 },
  { id: "medication_reminders", label: "Medication Reminders", type: "textarea", page: 4, xPct: 0.50, yPct: 0.30, section: "Medication Management", fontSize: 9 },
  { id: "meal_preparation", label: "Meal Preparation", type: "textarea", page: 4, xPct: 0.50, yPct: 0.48, section: "IADLs - Meal Preparation", fontSize: 9 },
  { id: "housekeeping", label: "Housekeeping", type: "textarea", page: 4, xPct: 0.50, yPct: 0.66, section: "IADLs - Housekeeping", fontSize: 9 },
  { id: "laundry", label: "Laundry", type: "textarea", page: 4, xPct: 0.50, yPct: 0.84, section: "IADLs - Laundry", fontSize: 9 },
  
  // Page 5 - Service Plan Details
  { id: "shopping_errands", label: "Shopping/Errands", type: "textarea", page: 5, xPct: 0.50, yPct: 0.12, section: "IADLs - Shopping", fontSize: 9 },
  { id: "escort_services", label: "Escort Services", type: "textarea", page: 5, xPct: 0.50, yPct: 0.30, section: "IADLs - Escort", fontSize: 9 },
  
  // Page 5 - Service Frequency
  { id: "service_frequency", label: "Total Service Hours per Week", type: "text", page: 5, xPct: 0.50, yPct: 0.55, section: "Service Plan" },
  { id: "service_days", label: "Days per Week", type: "text", page: 5, xPct: 0.75, yPct: 0.55, section: "Service Plan" },
  { id: "service_start_date", label: "Service Start Date", type: "date", page: 5, xPct: 0.25, yPct: 0.60, section: "Service Plan" },
  { id: "service_end_date", label: "Service End Date", type: "date", page: 5, xPct: 0.60, yPct: 0.60, section: "Service Plan" },
  
  // Page 6 - Goals and Outcomes
  { id: "client_goals", label: "Client Goals/Desired Outcomes", type: "textarea", page: 6, xPct: 0.15, yPct: 0.20, section: "Goals", fontSize: 9 },
  { id: "additional_notes", label: "Additional Notes/Comments", type: "textarea", page: 6, xPct: 0.15, yPct: 0.50, section: "Additional Information", fontSize: 9 },
  
  // Page 7 - Signatures
  { id: "rn_signature", label: "RN Signature", type: "signature", page: 7, xPct: 0.25, yPct: 0.35, section: "Signatures" },
  { id: "rn_date", label: "RN Date", type: "date", page: 7, xPct: 0.60, yPct: 0.35, section: "Signatures" },
  { id: "rn_license", label: "RN License #", type: "text", page: 7, xPct: 0.80, yPct: 0.35, section: "Signatures" },
  { id: "client_signature", label: "Client/Representative Signature", type: "signature", page: 7, xPct: 0.25, yPct: 0.50, section: "Signatures" },
  { id: "client_signature_date", label: "Client Signature Date", type: "date", page: 7, xPct: 0.60, yPct: 0.50, section: "Signatures" },
  { id: "supervisor_signature", label: "Supervisor Signature", type: "signature", page: 7, xPct: 0.25, yPct: 0.65, section: "Signatures" },
  { id: "supervisor_date", label: "Supervisor Date", type: "date", page: 7, xPct: 0.60, yPct: 0.65, section: "Signatures" },
];

// Group fields by section for organized display
function groupFieldsBySection(fields: FormFieldDef[]): Map<string, FormFieldDef[]> {
  const grouped = new Map<string, FormFieldDef[]>();
  for (const field of fields) {
    const section = field.section || "Other";
    if (!grouped.has(section)) {
      grouped.set(section, []);
    }
    grouped.get(section)!.push(field);
  }
  return grouped;
}

export const Form618Filler = forwardRef<Form618FillerHandle, Form618FillerProps>(
  ({ fileUrl, fileName = "618-filled.pdf", className, onError }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
    const [doc, setDoc] = useState<any>(null);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [containerWidth, setContainerWidth] = useState(0);
    
    const [formValues, setFormValues] = useState<Record<string, string | boolean | null>>({});
    const [showSignatureRequest, setShowSignatureRequest] = useState(false);

    const safeFileName = useMemo(() => {
      const base = fileName?.trim() || "618-filled.pdf";
      return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
    }, [fileName]);

    const groupedFields = useMemo(() => groupFieldsBySection(FORM_618_FIELDS), []);

    // Load PDF
    useEffect(() => {
      let cancelled = false;

      async function load() {
        if (!fileUrl) return;
        setLoading(true);
        setError(null);

        try {
          const res = await fetch(fileUrl, { cache: "no-store" });
          if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
          const buf = await res.arrayBuffer();
          if (cancelled) return;

          const bufferCopy = buf.slice(0);
          setPdfBytes(bufferCopy);

          const loadingTask = (pdfjsLib as any).getDocument({ data: buf.slice(0) });
          const loaded = await loadingTask.promise;
          if (cancelled) return;

          setDoc(loaded);
          setPageCount(loaded.numPages);
          setCurrentPage(1);
        } catch (e: any) {
          const msg = e?.message || "Failed to load PDF.";
          setError(msg);
          onError?.(msg);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      load();
      return () => {
        cancelled = true;
      };
    }, [fileUrl, onError]);

    // Observe container width
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect?.width ?? 0;
        setContainerWidth(w);
      });

      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Render current page
    useEffect(() => {
      let cancelled = false;

      async function render() {
        if (!doc || !canvasRef.current) return;

        try {
          const pdfPage = await doc.getPage(currentPage);
          if (cancelled) return;

          const baseViewport = pdfPage.getViewport({ scale: 1 });
          const w = containerWidth || containerRef.current?.clientWidth || 400;
          const padded = Math.max(0, w - 16);
          let renderScale = padded / baseViewport.width;
          renderScale = Math.max(0.5, Math.min(2.5, renderScale));

          const viewport = pdfPage.getViewport({ scale: renderScale });
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        } catch (e: any) {
          console.error("Render error:", e);
        }
      }

      render();
      return () => {
        cancelled = true;
      };
    }, [doc, currentPage, containerWidth]);

    function handleFieldChange(fieldId: string, value: string | boolean | null) {
      setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    }

    async function downloadFilledPdf() {
      if (!pdfBytes) throw new Error("PDF not loaded yet");

      try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        for (const field of FORM_618_FIELDS) {
          const value = formValues[field.id];
          if (!value) continue;

          const targetPage = pages[field.page - 1];
          if (!targetPage) continue;

          const { width, height } = targetPage.getSize();
          const x = field.xPct * width;
          const fontSize = field.fontSize || 10;

          if (field.type === "signature" && typeof value === "string") {
            // Embed signature image
            try {
              const sigBytes = await fetch(value).then((r) => r.arrayBuffer());
              const sigImage = await pdfDoc.embedPng(new Uint8Array(sigBytes));
              
              const maxWidth = 120;
              const scale = Math.min(1, maxWidth / sigImage.width);
              const sigWidth = sigImage.width * scale;
              const sigHeight = sigImage.height * scale;
              
              const y = height - field.yPct * height - sigHeight / 2;

              targetPage.drawImage(sigImage, {
                x,
                y,
                width: sigWidth,
                height: sigHeight,
              });
            } catch (sigError) {
              console.error("Failed to embed signature:", sigError);
            }
          } else if (typeof value === "string" && value.trim()) {
            const y = height - field.yPct * height - fontSize;

            // Handle multiline text for textareas
            if (field.type === "textarea") {
              const lines = value.split("\n");
              let yOffset = 0;
              for (const line of lines) {
                targetPage.drawText(line, {
                  x,
                  y: y - yOffset,
                  size: fontSize,
                  font,
                  color: rgb(0, 0, 0),
                });
                yOffset += fontSize + 2;
              }
            } else {
              targetPage.drawText(value, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
              });
            }
          } else if (field.type === "checkbox" && value === true) {
            // Draw checkmark
            const y = height - field.yPct * height - 8;
            targetPage.drawText("✓", {
              x,
              y,
              size: 12,
              font,
              color: rgb(0, 0, 0),
            });
          }
        }

        const out = await pdfDoc.save();
        const outBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
        const blob = new Blob([outBuffer], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = safeFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (e: any) {
        const msg = e?.message || "Could not generate the filled PDF.";
        setError(msg);
        onError?.(msg);
        throw e;
      }
    }

    function reset() {
      setFormValues({});
      setCurrentPage(1);
      setError(null);
    }

    useImperativeHandle(ref, () => ({
      downloadFilledPdf,
      reset,
    }));

    return (
      <div className={cn("flex h-full min-h-0", className)}>
        {/* PDF Preview */}
        <div ref={containerRef} className="flex-1 min-w-0 flex flex-col border-r">
          <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={loading || currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} / {pageCount || "…"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pageCount || 1, p + 1))}
              disabled={loading || currentPage >= (pageCount || 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSignatureRequest(true)}
            >
              <Send className="h-4 w-4 mr-1" />
              Request Signature
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto p-2">
            <canvas ref={canvasRef} className="block mx-auto" />
            {loading && <div className="p-3 text-sm text-muted-foreground text-center">Loading…</div>}
          </div>
        </div>

        {/* Form Fields Panel */}
        <div className="w-80 flex flex-col min-h-0 bg-background">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm">618 Personal Care Assessment</h3>
            <p className="text-xs text-muted-foreground mt-1">Fill in the fields below</p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {Array.from(groupedFields.entries()).map(([section, fields]) => (
                <div key={section} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{section}</span>
                    <Separator className="flex-1" />
                  </div>
                  
                  {fields.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label className="text-xs">{field.label}</Label>
                      
                      {field.type === "text" && (
                        <Input
                          value={typeof formValues[field.id] === "string" ? (formValues[field.id] as string) : ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="h-8 text-sm"
                        />
                      )}
                      
                      {field.type === "date" && (
                        <Input
                          type="date"
                          value={typeof formValues[field.id] === "string" ? (formValues[field.id] as string) : ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="h-8 text-sm"
                        />
                      )}
                      
                      {field.type === "textarea" && (
                        <Textarea
                          value={typeof formValues[field.id] === "string" ? (formValues[field.id] as string) : ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          rows={2}
                          className="text-sm resize-none"
                        />
                      )}
                      
                      {field.type === "checkbox" && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formValues[field.id] === true}
                            onCheckedChange={(checked) => handleFieldChange(field.id, checked === true)}
                          />
                          <span className="text-xs text-muted-foreground">Check if applicable</span>
                        </div>
                      )}
                      
                      {field.type === "signature" && (
                        <PdfSignatureMarker
                          signatureData={typeof formValues[field.id] === "string" ? (formValues[field.id] as string) : null}
                          onSignatureChange={(data) => handleFieldChange(field.id, data)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="p-3 border-t space-y-2">
            <Button
              className="w-full"
              onClick={async () => {
                try {
                  await downloadFilledPdf();
                } catch {
                  // Error already handled
                }
              }}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Save Filled PDF
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={reset}
              disabled={loading}
            >
              Reset Form
            </Button>
          </div>
        </div>

        {/* Signature Request Dialog */}
        <SignatureRequestDialog
          open={showSignatureRequest}
          onOpenChange={setShowSignatureRequest}
          documentName={safeFileName}
        />
      </div>
    );
  }
);

Form618Filler.displayName = "Form618Filler";
