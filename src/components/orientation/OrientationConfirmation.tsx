import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Award } from "lucide-react";
import { SignaturePad } from "@/components/forms/SignaturePad";

interface OrientationConfirmationProps {
  caregiverName: string;
  totalSections: number;
  onConfirm: (signatureData: string) => void;
  isConfirmed: boolean;
}

export default function OrientationConfirmation({
  caregiverName,
  totalSections,
  onConfirm,
  isConfirmed,
}: OrientationConfirmationProps) {
  const [signature, setSignature] = useState<string | null>(null);

  if (isConfirmed) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="pt-6 text-center space-y-4">
          <Award className="w-16 h-16 mx-auto text-success" />
          <h3 className="text-xl font-bold text-success">Orientation Completed!</h3>
          <p className="text-muted-foreground">
            All {totalSections} sections have been reviewed, quizzes passed, and acknowledgment confirmed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success" />
          Orientation Acknowledgment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-secondary/50 rounded-lg p-4 text-sm space-y-2">
          <p>By signing below, I <strong>{caregiverName}</strong> acknowledge that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>I have completed all {totalSections} sections of the orientation training.</li>
            <li>I have reviewed and understand the Employee Handbook policies.</li>
            <li>I understand the handbook is a guide, not a contract of employment.</li>
            <li>I will follow the care plan, maintain confidentiality, document accurately, and use EVV correctly.</li>
            <li>When in doubt, I will call the office for direction.</li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Digital Signature</p>
          <SignaturePad onSignature={(data) => setSignature(data)} />
        </div>

        <Button
          className="w-full"
          disabled={!signature}
          onClick={() => signature && onConfirm(signature)}
        >
          Confirm Orientation Completion
        </Button>
      </CardContent>
    </Card>
  );
}
