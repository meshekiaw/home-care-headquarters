import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
// Vite + pdfjs-dist: import worker as URL string
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

type PdfCanvasViewerProps = {
  fileUrl: string;
  className?: string;
};

export function PdfCanvasViewer({ fileUrl, className }: PdfCanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [doc, setDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);

  const [scaleMode, setScaleMode] = useState<"fit" | "manual">("fit");
  const [manualScale, setManualScale] = useState(1.2);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const effectiveScale = useMemo(() => {
    return scaleMode === "manual" ? manualScale : 1; // fit scale computed during render
  }, [manualScale, scaleMode]);

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

    async function load() {
      if (!fileUrl) return;
      setLoading(true);
      setError(null);
      setDoc(null);

      try {
        const res = await fetch(fileUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        // Clone to avoid ArrayBuffer detachment edge-cases.
        const bufferCopy = buf.slice(0);
        const loadingTask = (pdfjsLib as any).getDocument({ data: bufferCopy });
        const loaded = await loadingTask.promise;

        if (cancelled) return;
        setDoc(loaded);
        setPageCount(loaded.numPages);
        setPage(1);
      } catch (e: any) {
        setError(e?.message || "Failed to load PDF preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      try {
        doc?.destroy?.();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!doc || !canvasRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const pdfPage = await doc.getPage(page);
        if (cancelled) return;

        const baseViewport = pdfPage.getViewport({ scale: 1 });

        let scale = effectiveScale;
        if (scaleMode === "fit") {
          const w = containerWidth || (containerRef.current?.clientWidth ?? 0);
          if (w > 0) {
            // Small padding so the page doesn't touch the border.
            const padded = Math.max(0, w - 16);
            scale = padded / baseViewport.width;
          }
        }

        const viewport = pdfPage.getViewport({ scale });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      } catch (e: any) {
        setError(e?.message || "Failed to render PDF page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [doc, page, effectiveScale, scaleMode, containerWidth]);

  return (
    <div className={cn("flex h-full flex-col gap-2", className)}>
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

      {error && (
        <div className="rounded-lg border bg-background p-3 text-sm">
          <p className="font-medium">PDF preview note</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
        </div>
      )}

      <div ref={containerRef} className="min-h-0 flex-1 rounded-lg border overflow-auto">
        <div className="inline-block align-top p-2">
          <canvas ref={canvasRef} className="block" aria-label="PDF preview canvas" />
        </div>

        {loading && (
          <div className="p-3 text-sm text-muted-foreground">Loading…</div>
        )}
      </div>
    </div>
  );
}
