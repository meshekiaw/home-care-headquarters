import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { LmsPolicy } from "@/hooks/useLmsPolicies";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: LmsPolicy;
}

export default function PolicyViewDialog({ open, onOpenChange, policy }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{policy.title}</DialogTitle>
            <Badge variant="secondary">v{policy.version}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Effective: {format(new Date(policy.effective_date), "MMM d, yyyy")} • Category: {policy.category}
          </p>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
            {policy.content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
