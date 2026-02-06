import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { PDFDocument, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFTextField } from "pdf-lib";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PdfTypewriterFiller, type PdfTypewriterFillerHandle } from "@/components/clients/PdfTypewriterFiller";
import { cn } from "@/lib/utils";


export interface UploadedPdfFillerHandle {
  downloadFilledPdf: () => Promise<void>;
  reset: () => void;
}

type PdfFieldKind = "text" | "checkbox" | "dropdown" | "radio" | "unknown";

type PdfFieldMeta = {
  name: string;
  kind: PdfFieldKind;
  options?: string[];
};

type FieldValue = string | boolean | null;

export type UploadedPdfFillerProps = {
  fileUrl: string;
  fileName?: string;
  className?: string;
  onError?: (message: string) => void;
};

function getFieldKind(field: any): PdfFieldKind {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFRadioGroup) return "radio";
  return "unknown";
}

export const UploadedPdfFiller = forwardRef<UploadedPdfFillerHandle, UploadedPdfFillerProps>(
  ({ fileUrl, fileName = "filled-form.pdf", className, onError }, ref) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
    const [fields, setFields] = useState<PdfFieldMeta[]>([]);
    const [values, setValues] = useState<Record<string, FieldValue>>({});

    const typewriterRef = useRef<PdfTypewriterFillerHandle | null>(null);

    const safeFileName = useMemo(() => {
      const base = fileName?.trim() || "filled-form.pdf";
      return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
    }, [fileName]);

    useEffect(() => {
      let cancelled = false;

      async function load() {
        if (!fileUrl) return;
        setLoading(true);
        setError(null);
        setPdfBytes(null);
        setFields([]);
        setValues({});

        try {
          const res = await fetch(fileUrl, { cache: "no-store" });
          if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
          const buf = await res.arrayBuffer();
          if (cancelled) return;

          // Clone the buffer before pdf-lib uses it, so we have a fresh copy for the typewriter component
          const bufferForTypewriter = buf.slice(0);

          const pdfDoc = await PDFDocument.load(buf);
          const form = pdfDoc.getForm();
          const pdfFields = form.getFields();

          const metas: PdfFieldMeta[] = pdfFields.map((f) => {
            const name = f.getName();
            const kind = getFieldKind(f);

            if (kind === "dropdown") {
              const dd = f as PDFDropdown;
              return { name, kind, options: dd.getOptions() };
            }

            if (kind === "radio") {
              const rg = f as PDFRadioGroup;
              return { name, kind, options: rg.getOptions() };
            }

            return { name, kind };
          });

          const initialValues: Record<string, FieldValue> = {};
          for (const meta of metas) {
            if (meta.kind === "checkbox") initialValues[meta.name] = false;
            else initialValues[meta.name] = "";
          }

          // Use the cloned buffer for state so the typewriter component gets a fresh copy
          setPdfBytes(bufferForTypewriter);
          setFields(metas);
          setValues(initialValues);

          if (metas.length === 0) {
            setError(
              "No standard PDF form fields found. Use “Type on PDF” below to enter text and download a filled copy.",
            );
          }
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

    async function downloadFilledPdf() {
      if (!pdfBytes) throw new Error("PDF not loaded yet");

      // If the PDF doesn't have AcroForm fields, fall back to "type on PDF" mode.
      if (fields.length === 0) {
        if (!typewriterRef.current) throw new Error("PDF editor not ready yet");
        await typewriterRef.current.downloadFlattenedPdf();
        return;
      }

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      for (const meta of fields) {
        const v = values[meta.name];

        try {
          if (meta.kind === "text") {
            const f = form.getTextField(meta.name);
            f.setText(typeof v === "string" ? v : "");
          } else if (meta.kind === "checkbox") {
            const f = form.getCheckBox(meta.name);
            const checked = Boolean(v);
            if (checked) f.check();
            else f.uncheck();
          } else if (meta.kind === "dropdown") {
            const f = form.getDropdown(meta.name);
            if (typeof v === "string" && v) f.select(v);
          } else if (meta.kind === "radio") {
            const f = form.getRadioGroup(meta.name);
            if (typeof v === "string" && v) f.select(v);
          }
        } catch {
          // Some PDFs have non-standard field types or naming; skip rather than failing the whole download.
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
    }

    function reset() {
      if (fields.length === 0) {
        typewriterRef.current?.reset();
        setError(null);
        return;
      }

      const resetValues: Record<string, FieldValue> = {};
      for (const meta of fields) {
        resetValues[meta.name] = meta.kind === "checkbox" ? false : "";
      }
      setValues(resetValues);
    }

    useImperativeHandle(ref, () => ({
      downloadFilledPdf: async () => {
        try {
          await downloadFilledPdf();
        } catch (e: any) {
          const msg = e?.message || "Could not generate the filled PDF.";
          setError(msg);
          onError?.(msg);
          throw e;
        }
      },
      reset,
    }));

    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Fill form</p>
            <p className="text-xs text-muted-foreground">
              If the PDF has standard fields we’ll list them. Otherwise you can type directly on the PDF.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} disabled={loading || !pdfBytes}>
            Reset
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border bg-background p-3 text-sm">
            <p className="font-medium">PDF form note</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
        )}

        <div className="rounded-lg border">
          <ScrollArea className="h-[48vh]">
            <div className="p-3 space-y-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : fields.length === 0 ? (
                pdfBytes ? (
                  <PdfTypewriterFiller
                    ref={typewriterRef}
                    pdfBytes={pdfBytes}
                    fileName={safeFileName}
                    onError={(msg) => {
                      setError(msg);
                      onError?.(msg);
                    }}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">No fillable fields found.</div>
                )
              ) : (
                fields.map((f) => (
                  <div key={f.name} className="space-y-2">
                    <Label className="break-all">{f.name}</Label>

                    {f.kind === "text" && (
                      <Input
                        value={typeof values[f.name] === "string" ? (values[f.name] as string) : ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                      />
                    )}

                    {f.kind === "checkbox" && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(values[f.name])}
                          onCheckedChange={(checked) =>
                            setValues((prev) => ({ ...prev, [f.name]: checked === true }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">Checked</span>
                      </div>
                    )}

                    {f.kind === "dropdown" && (
                      <Select
                        value={typeof values[f.name] === "string" ? (values[f.name] as string) : ""}
                        onValueChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(f.options || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {f.kind === "radio" && (
                      <Select
                        value={typeof values[f.name] === "string" ? (values[f.name] as string) : ""}
                        onValueChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(f.options || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {f.kind === "unknown" && (
                      <div className="text-xs text-muted-foreground">
                        Unsupported field type; it will be skipped on download.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  },
);

UploadedPdfFiller.displayName = "UploadedPdfFiller";
