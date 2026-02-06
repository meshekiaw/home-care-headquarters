import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const signatureRequestSchema = z.object({
  signerName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  signerEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  message: z.string().trim().max(500, "Message must be less than 500 characters").optional(),
});

type SignatureRequestFormData = z.infer<typeof signatureRequestSchema>;

interface SignatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  documentUrl?: string;
  onRequestSent?: () => void;
}

export function SignatureRequestDialog({
  open,
  onOpenChange,
  documentName,
  documentUrl,
  onRequestSent,
}: SignatureRequestDialogProps) {
  const [sending, setSending] = useState(false);

  const form = useForm<SignatureRequestFormData>({
    resolver: zodResolver(signatureRequestSchema),
    defaultValues: {
      signerName: "",
      signerEmail: "",
      message: "",
    },
  });

  async function onSubmit(data: SignatureRequestFormData) {
    setSending(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("send-signature-request", {
        body: {
          signerName: data.signerName,
          signerEmail: data.signerEmail,
          message: data.message || "",
          documentName,
          documentUrl: documentUrl || "",
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to send signature request");
      }

      toast({
        title: "Signature request sent",
        description: `An email has been sent to ${data.signerEmail}`,
      });

      form.reset();
      onOpenChange(false);
      onRequestSent?.();
    } catch (error: any) {
      console.error("Error sending signature request:", error);
      toast({
        title: "Failed to send request",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Signature</DialogTitle>
          <DialogDescription>
            Send an email requesting a signature on "{documentName}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="signerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signer's Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="signerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signer's Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please review and sign this document..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
