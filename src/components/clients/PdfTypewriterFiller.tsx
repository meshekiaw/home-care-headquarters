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
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Configure worker (v3.x build)
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const PdfTypewriterFiller = forwardRef<PdfTypewriterFillerHandle, PdfTypewriterFillerProps>(
  ({ pdfBytes, fileName, className, onError }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [doc, setDoc] = useState<any>(null);
    const [pageCount, setPageCount] = useState(0);
    const [page, setPage] = useState(1);
    const [scale, setScale] = useState(1.2);

    const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(null);
    const [entries, setEntries] = useState<PdfTypewriterEntry[]>([]);

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
          const loadingTask = (pdfjsLib as any).getDocument({ data: pdfBytes });
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
      let cancelled = false;

      async function render() {
        if (!doc || !canvasRef.current) return;

        setLoading(true);
        try {
          const pdfPage = await doc.getPage(page);
          if (cancelled) return;

          const viewport = pdfPage.getViewport({ scale });
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
    }, [doc, page, scale, onError]);

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
    }

    useImperativeHandle(ref, () => ({
      downloadFlattenedPdf,
      reset,
    }));

    return (
      <div className={cn("space-y-3", className)}>
        <div className="space-y-1">
          <p className="text-sm font-medium">Type on PDF</p>
          <p className="text-xs text-muted-foreground">
            This PDF doesn’t expose standard form fields. Click on the page to place text.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border bg-background p-3 text-sm">
            <p className="font-medium">PDF note</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
        )}

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
              variant="outline"
              size="sm"
              onClick={() => setScale((s) => Math.max(0.8, Math.round((s - 0.2) * 10) / 10))}
              disabled={loading}
            >
              −
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScale((s) => Math.min(2.0, Math.round((s + 0.2) * 10) / 10))}
              disabled={loading}
            >
              +
            </Button>
          </div>
        </div>

        <div className="rounded-lg border overflow-auto">
          <div className="relative inline-block align-top">
            <canvas
              ref={canvasRef}
              className="block"
              onClick={addEntryAtClick}
              aria-label="PDF page canvas"
            />

            {/* overlay text inputs */}
            {viewportSize &&
              activeEntries.map((entry) => {
                const left = `${entry.xPct * 100}%`;
                const top = `${entry.yPct * 100}%`;

                return (
                  <div
                    key={entry.id}
                    className="absolute"
                    style={{ left, top, transform: "translate(0, -50%)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="rounded-md border bg-background/95 backdrop-blur px-2 py-1 shadow-sm">
                        <Label className="sr-only">Text</Label>
                        <Input
                          value={entry.text}
                          onChange={(e) =>
                            setEntries((prev) =>
                              prev.map((p) => (p.id === entry.id ? { ...p, text: e.target.value } : p)),
                            )
                          }
                          placeholder="Type…"
                          className="h-7 w-44 text-xs"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setEntries((prev) => prev.filter((p) => p.id !== entry.id));
                        }}
                        aria-label="Remove text"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>

          {loading && (
            <div className="p-3 text-sm text-muted-foreground">Loading…</div>
          )}
        </div>
      </div>
    );
  },
);

PdfTypewriterFiller.displayName = "PdfTypewriterFiller";
