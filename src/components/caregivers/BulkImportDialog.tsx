import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  X,
  Loader2,
} from "lucide-react";
import {
  parseCSV,
  validateAndTransform,
  generateSampleCSV,
  type ParseResult,
  type ParsedCaregiver,
} from "@/utils/csvParser";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (caregivers: ParsedCaregiver[]) => Promise<{ success: number; failed: number }>;
}

type Step = "upload" | "preview" | "importing" | "complete";

export default function BulkImportDialog({
  open,
  onOpenChange,
  onImport,
}: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const resetState = () => {
    setStep("upload");
    setParseResult(null);
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
      const result = validateAndTransform(rows);
      setParseResult(result);
      setStep("preview");
    };
    reader.readAsText(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDownloadSample = () => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "caregivers_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!parseResult) return;

    setStep("importing");
    try {
      const result = await onImport(parseResult.caregivers);
      setImportResult(result);
      setStep("complete");
    } catch (error) {
      console.error("Import failed:", error);
      setImportResult({ success: 0, failed: parseResult.caregivers.length });
      setStep("complete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Caregivers</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple caregivers at once
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex-1 space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Drag and drop your CSV file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button variant="outline" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">CSV Format</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDownloadSample}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Required columns: <code className="bg-muted px-1 rounded">first_name</code>,{" "}
                <code className="bg-muted px-1 rounded">last_name</code>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Optional: email, phone, status, hourly_rate, specializations (pipe-separated), address, city, state, zip_code, service_radius_miles
              </p>
            </div>
          </div>
        )}

        {step === "preview" && parseResult && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1">
                <FileText className="w-3 h-3" />
                {parseResult.totalRows} rows
              </Badge>
              <Badge variant="default" className="gap-1 bg-success">
                <CheckCircle2 className="w-3 h-3" />
                {parseResult.caregivers.length} valid
              </Badge>
              {parseResult.errors.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {parseResult.errors.length} issues
                </Badge>
              )}
            </div>

            {parseResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {parseResult.errors.slice(0, 3).map((err, i) => (
                    <div key={i} className="text-sm">
                      Row {err.row}: {err.message} ({err.field})
                    </div>
                  ))}
                  {parseResult.errors.length > 3 && (
                    <div className="text-sm mt-1">
                      ...and {parseResult.errors.length - 3} more issues
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Specializations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.caregivers.map((caregiver, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {caregiver.first_name} {caregiver.last_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {caregiver.email || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {caregiver.phone || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {caregiver.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {caregiver.hourly_rate
                          ? `$${caregiver.hourly_rate}/hr`
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {caregiver.specializations?.join(", ") || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {step === "importing" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Importing caregivers...</p>
            <p className="text-sm text-muted-foreground">
              This may take a moment
            </p>
          </div>
        )}

        {step === "complete" && importResult && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            {importResult.success > 0 ? (
              <CheckCircle2 className="w-16 h-16 text-success mb-4" />
            ) : (
              <X className="w-16 h-16 text-destructive mb-4" />
            )}
            <p className="text-lg font-medium mb-2">Import Complete</p>
            <div className="flex gap-4">
              <Badge variant="default" className="bg-success">
                {importResult.success} imported
              </Badge>
              {importResult.failed > 0 && (
                <Badge variant="destructive">{importResult.failed} failed</Badge>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parseResult || parseResult.caregivers.length === 0}
              >
                Import {parseResult?.caregivers.length || 0} Caregivers
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
