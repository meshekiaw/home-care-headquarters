import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
// Vite + pdfjs-dist: import worker as URL string (the *.entry module may not have a default export)
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PdfTypewriterEntry = {
  id: string;
  page: number; // 1-indexed
  xPct: number; // 0..1
  yPct: number; // 0..1
  text: string;
  fontSize: number;
};

export interface PdfTypewriterFillerHandle {
  downloadFlattenedPdf: () => Promise<void>;
  reset: () => void;
}

export type PdfTypewriterFillerProps = {
  pdfBytes: ArrayBuffer;
  fileName: string;
  className?: string;
  onError?: (message: string) => void;
};

// Configure worker
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export const PdfTypewriterFiller = forwardRef<PdfTypewriterFillerHandle, PdfTypewriterFillerProps>(
  ({ pdfBytes, fileName, className, onError }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [doc, setDoc] = useState<any>(null);
    const [pageCount, setPageCount] = useState(0);
    const [page, setPage] = useState(1);

    // IMPORTANT: Default to fit-to-width so users can always see the whole page in narrow side panels.
    const [scaleMode, setScaleMode] = useState<"fit" | "manual">("fit");
    const [manualScale, setManualScale] = useState(1.2);
    const [containerWidth, setContainerWidth] = useState(0);

    const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(null);
    const [entries, setEntries] = useState<PdfTypewriterEntry[]>([]);
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

    const safeFileName = useMemo(() => {
      const base = fileName?.trim() || "filled-form.pdf";
      return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
    }, [fileName]);

    const activeEntries = useMemo(() => entries.filter((e) => e.page === page), [entries, page]);

    useEffect(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        setError(null);
        try {
          // Clone the ArrayBuffer to prevent "already detached" errors when pdfjs transfers it to the worker
          const bufferCopy = pdfBytes.slice(0);
          const loadingTask = (pdfjsLib as any).getDocument({ data: bufferCopy });
          const loaded = await loadingTask.promise;
          if (cancelled) return;
          setDoc(loaded);
          setPageCount(loaded.numPages);
          setPage(1);
        } catch (e: any) {
          const msg = e?.message || "Failed to load PDF for type-on editing.";
          setError(msg);
          onError?.(msg);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      if (pdfBytes) load();
      return () => {
        cancelled = true;
        try {
          doc?.destroy?.();
        } catch {
          // ignore
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfBytes]);

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

    useEffect(() => {
      let cancelled = false;

      async function render() {
        if (!doc || !canvasRef.current) return;

        setLoading(true);
        try {
          const pdfPage = await doc.getPage(page);
          if (cancelled) return;

          const baseViewport = pdfPage.getViewport({ scale: 1 });

          let renderScale = scaleMode === "manual" ? manualScale : 1;
          if (scaleMode === "fit") {
            const w = containerWidth || containerRef.current?.clientWidth || 0;
            if (w > 0) {
              // Small padding so the page doesn't touch the border.
              const padded = Math.max(0, w - 16);
              renderScale = padded / baseViewport.width;
            }
          }

          // Clamp so we don't render extremely tiny/huge canvases.
          renderScale = Math.max(0.6, Math.min(3.0, renderScale));

          const viewport = pdfPage.getViewport({ scale: renderScale });
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          setViewportSize({ width: canvas.width, height: canvas.height });

          await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        } catch (e: any) {
          const msg = e?.message || "Failed to render PDF page.";
          setError(msg);
          onError?.(msg);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      render();
      return () => {
        cancelled = true;
      };
    }, [doc, page, manualScale, scaleMode, containerWidth, onError]);

    function addEntryAtClick(e: MouseEvent<HTMLCanvasElement>) {
      if (!viewportSize) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const xPct = Math.min(1, Math.max(0, x / rect.width));
      const yPct = Math.min(1, Math.max(0, y / rect.height));

      const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
      setActiveEntryId(id);

      setEntries((prev) => [
        ...prev,
        {
          id,
          page,
          xPct,
          yPct,
          text: "",
          fontSize: 11,
        },
      ]);
    }

    async function downloadFlattenedPdf() {
      try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        for (const entry of entries) {
          const text = entry.text?.trim();
          if (!text) continue;

          const targetPage = pdfDoc.getPage(entry.page - 1);
          if (!targetPage) continue;

          const { width, height } = targetPage.getSize();
          const x = entry.xPct * width;
          const y = height - entry.yPct * height - entry.fontSize;

          targetPage.drawText(text, {
            x,
            y,
            size: entry.fontSize,
            font,
            color: rgb(0, 0, 0),
          });
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
      setEntries([]);
      setPage(1);
      setError(null);
      setScaleMode("fit");
      setManualScale(1.2);
    }

    useImperativeHandle(ref, () => ({
      downloadFlattenedPdf,
      reset,
    }));

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pageCount || 1, p + 1))}
            disabled={loading || page >= (pageCount || 1)}
          >
            Next
          </Button>

          <span className="text-xs text-muted-foreground">
            Page {page} / {pageCount || "…"}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant={scaleMode === "fit" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setScaleMode("fit")}
              disabled={loading}
            >
              Fit width
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setScaleMode("manual");
                setManualScale((s) => Math.max(0.6, Math.round((s - 0.2) * 10) / 10));
              }}
              disabled={loading}
            >
              −
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setScaleMode("manual");
                setManualScale((s) => Math.min(3.0, Math.round((s + 0.2) * 10) / 10));
              }}
              disabled={loading}
            >
              +
            </Button>
          </div>
        </div>

        <div ref={containerRef} className="rounded-lg border overflow-auto">
          <div className="inline-block align-top p-2">
            <div className="relative inline-block align-top">
              <canvas
                ref={canvasRef}
                className="block cursor-crosshair"
                onClick={addEntryAtClick}
                aria-label="PDF page canvas - click to add text"
              />

              {/* overlay text inputs */}
              {viewportSize &&
                activeEntries.map((entry) => {
                  const left = `${entry.xPct * 100}%`;
                  const top = `${entry.yPct * 100}%`;

                  const isOpen = activeEntryId === entry.id;

                  return (
                    <Popover
                      key={entry.id}
                      open={isOpen}
                      onOpenChange={(open) => setActiveEntryId(open ? entry.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background/90 backdrop-blur shadow-sm"
                          style={{ left, top }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setActiveEntryId(entry.id);
                          }}
                          aria-label={entry.text ? `Edit text: ${entry.text}` : "Edit text"}
                          title={entry.text || "Edit text"}
                        />
                      </PopoverTrigger>

                      <PopoverContent
                        side="right"
                        align="start"
                        className="w-64 p-2"
                        onOpenAutoFocus={(e) => {
                          // prevent focus-jump scrolling the container
                          e.preventDefault();
                        }}
                      >
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Text</Label>
                            <Input
                              autoFocus
                              value={entry.text}
                              onChange={(e) =>
                                setEntries((prev) =>
                                  prev.map((p) => (p.id === entry.id ? { ...p, text: e.target.value } : p)),
                                )
                              }
                              placeholder="Type…"
                              className="h-8 text-sm"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              onClick={() => {
                                setEntries((prev) => prev.filter((p) => p.id !== entry.id));
                                setActiveEntryId(null);
                              }}
                            >
                              Remove
                            </Button>

                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => setActiveEntryId(null)}
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
            </div>

            {loading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
          </div>
        </div>
      </div>
    );
  },
);

PdfTypewriterFiller.displayName = "PdfTypewriterFiller";
