import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download, Save, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Configure worker
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ========================================
// FIELD DEFINITIONS
// ========================================
// These will be fully mapped once the actual PDF is uploaded.
// Coordinates are percentage-based (0-1), measured from BOTTOM-LEFT of PDF page.
// Fields tagged with "mirror" propagate their value automatically.

interface FormFieldDef {
  id: string;
  label: string;
  type: "text" | "date" | "checkbox" | "textarea";
  page: number;
  xPct: number;
  yPct: number; // 0 = bottom, 1 = top
  widthPct?: number;
  fontSize?: number;
  section?: string;
  /** Tags for auto-propagation: "name_mirror", "date_mirror" */
  tags?: string[];
  /** Which caregiver profile field to pre-populate from */
  profileField?: string;
}

// Placeholder field definitions — will be replaced with exact coordinates
// once the JotForm PDF is uploaded and inspected.
const APPLICATION_FIELDS: FormFieldDef[] = [
  // Section 1 — Employee Information
  { id: "employee_name", label: "Employee Name (Full)", type: "text", page: 1, xPct: 0.05, yPct: 0.85, section: "Employee Information", tags: ["name_primary"], profileField: "full_name", fontSize: 10 },
  { id: "application_date", label: "Date", type: "date", page: 1, xPct: 0.65, yPct: 0.85, section: "Employee Information", tags: ["date_primary"], fontSize: 10 },
  { id: "address", label: "Address", type: "text", page: 1, xPct: 0.05, yPct: 0.80, section: "Employee Information", profileField: "address", fontSize: 10 },
  { id: "city", label: "City", type: "text", page: 1, xPct: 0.05, yPct: 0.75, section: "Employee Information", profileField: "city", fontSize: 10 },
  { id: "state", label: "State", type: "text", page: 1, xPct: 0.40, yPct: 0.75, section: "Employee Information", profileField: "state", fontSize: 10 },
  { id: "zip_code", label: "Zip Code", type: "text", page: 1, xPct: 0.60, yPct: 0.75, section: "Employee Information", profileField: "zip_code", fontSize: 10 },
  { id: "phone", label: "Phone", type: "text", page: 1, xPct: 0.05, yPct: 0.70, section: "Employee Information", profileField: "phone", fontSize: 10 },
  { id: "email", label: "Email", type: "text", page: 1, xPct: 0.40, yPct: 0.70, section: "Employee Information", profileField: "email", fontSize: 10 },

  // Mirrored name fields on other pages (examples — will be mapped to actual positions)
  { id: "employee_name_p2", label: "Employee Name (Page 2)", type: "text", page: 2, xPct: 0.05, yPct: 0.92, section: "Employee Information", tags: ["name_mirror"], fontSize: 9 },
  { id: "date_p2", label: "Date (Page 2)", type: "date", page: 2, xPct: 0.65, yPct: 0.92, section: "Employee Information", tags: ["date_mirror"], fontSize: 9 },
];

// ========================================
// COMPONENT
// ========================================

interface ApplicationFormFillerProps {
  fileUrl: string;
  caregiverId: string | null;
  caregiverData: any;
  className?: string;
}

export function ApplicationFormFiller({ fileUrl, caregiverId, caregiverData, className }: ApplicationFormFillerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseScaleRef = useRef(1);

  // ---- Load PDF ----
  useEffect(() => {
    fetch(fileUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        setPdfBytes(buf.slice(0));
      })
      .catch(() => toast({ title: "Failed to load application PDF", variant: "destructive" }));
  }, [fileUrl]);

  // ---- Pre-populate from caregiver profile ----
  useEffect(() => {
    if (!caregiverData) return;

    const initial: Record<string, string> = {};
    const fullName = `${caregiverData.first_name || ""} ${caregiverData.last_name || ""}`.trim();
    const today = format(new Date(), "MM/dd/yyyy");

    APPLICATION_FIELDS.forEach((f) => {
      if (f.profileField === "full_name") initial[f.id] = fullName;
      else if (f.profileField && caregiverData[f.profileField]) initial[f.id] = caregiverData[f.profileField];
      if (f.type === "date") initial[f.id] = today;
      if (f.tags?.includes("name_mirror")) initial[f.id] = fullName;
      if (f.tags?.includes("date_mirror")) initial[f.id] = today;
    });

    // Load saved data from DB (overrides defaults)
    if (caregiverId) {
      supabase
        .from("caregiver_applications")
        .select("form_data")
        .eq("caregiver_id", caregiverId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.form_data && typeof data.form_data === "object") {
            setFormValues({ ...initial, ...(data.form_data as Record<string, string>) });
          } else {
            setFormValues(initial);
          }
        });
    } else {
      setFormValues(initial);
    }
  }, [caregiverData, caregiverId]);

  // ---- Render current page on canvas ----
  useEffect(() => {
    if (!pdfBytes) return;

    const render = async () => {
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
      setNumPages(pdf.numPages);

      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });

      // Calculate base scale to fit container width
      const containerWidth = containerRef.current?.clientWidth || 800;
      if (baseScaleRef.current === 1) {
        baseScaleRef.current = (containerWidth - 40) / viewport.width;
      }

      const scale = baseScaleRef.current * zoom;
      const scaledViewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    };

    render();
  }, [pdfBytes, currentPage, zoom]);

  // ---- Field change handler with mirroring ----
  const handleFieldChange = (fieldId: string, value: string) => {
    const field = APPLICATION_FIELDS.find((f) => f.id === fieldId);
    const updated = { ...formValues, [fieldId]: value };

    if (field?.tags?.includes("name_primary")) {
      // Propagate to all name_mirror fields
      APPLICATION_FIELDS.forEach((f) => {
        if (f.tags?.includes("name_mirror")) updated[f.id] = value;
      });
    }

    if (field?.tags?.includes("date_primary")) {
      // Propagate to all date_mirror fields
      APPLICATION_FIELDS.forEach((f) => {
        if (f.tags?.includes("date_mirror")) updated[f.id] = value;
      });
    }

    setFormValues(updated);
  };

  // ---- Fields for current page ----
  const pageFields = useMemo(() => {
    return APPLICATION_FIELDS.filter((f) => f.page === currentPage);
  }, [currentPage]);

  const sectionGroups = useMemo(() => {
    const groups: Record<string, FormFieldDef[]> = {};
    pageFields.forEach((f) => {
      const section = f.section || "General";
      if (!groups[section]) groups[section] = [];
      groups[section].push(f);
    });
    return groups;
  }, [pageFields]);

  // ---- Save progress ----
  const handleSave = async () => {
    if (!caregiverId || !user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("caregiver_applications")
        .select("id")
        .eq("caregiver_id", caregiverId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("caregiver_applications")
          .update({ form_data: formValues as any, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("caregiver_applications")
          .insert({
            caregiver_id: caregiverId,
            user_id: user.id,
            form_data: formValues as any,
            status: "draft",
          });
      }
      toast({ title: "Application saved" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ---- Download filled PDF ----
  const handleDownload = async () => {
    if (!pdfBytes) return;
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      APPLICATION_FIELDS.forEach((field) => {
        const value = formValues[field.id];
        if (!value || field.type === "checkbox") return;

        const page = pages[field.page - 1];
        if (!page) return;
        const { width, height } = page.getSize();

        const x = width * field.xPct;
        const y = height * field.yPct;
        const fontSize = field.fontSize || 10;

        page.drawText(value, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
      });

      const filledBytes = await pdfDoc.save();
      const blob = new Blob([filledBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Caregiver_Application_Filled.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Download error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className={cn("flex h-full min-h-0", className)}>
      {/* PDF Viewer */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 border-b bg-card shrink-0">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {numPages || "..."}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage >= numPages} onClick={() => setCurrentPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-14 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="default" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-muted/30 flex justify-center p-4">
          <canvas ref={canvasRef} className="shadow-md" />
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-80 border-l flex flex-col min-h-0 bg-card">
        <div className="p-3 border-b shrink-0">
          <h3 className="font-semibold text-sm">Application Fields</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Fields auto-populate from your profile. Name and date propagate to all pages.
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {Object.entries(sectionGroups).map(([section, fields]) => (
              <div key={section}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {section}
                </h4>
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={field.id} className="text-xs">
                        {field.label}
                      </Label>
                      {field.type === "textarea" ? (
                        <textarea
                          id={field.id}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px]"
                          value={formValues[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        />
                      ) : (
                        <Input
                          id={field.id}
                          type={field.type === "date" ? "text" : "text"}
                          value={formValues[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.type === "date" ? "MM/DD/YYYY" : ""}
                          className="h-8 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {pageFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No mapped fields on this page.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
