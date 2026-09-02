import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OrientationRunner from "@/components/orientation/OrientationRunner";

export default function OrientationViewer() {
  const { id: caregiverId } = useParams<{ id: string }>();
  const isPreview = caregiverId === "preview" || !caregiverId;

  return (
    <DashboardLayout>
      <OrientationRunner
        caregiverId={isPreview ? null : caregiverId}
        title={isPreview ? "Orientation Preview" : "New Hire Orientation"}
        subtitle={
          isPreview
            ? "Preview mode — progress is not saved."
            : "Watch each section, pass every quiz with 70% or higher, then sign the acknowledgment."
        }
      />
    </DashboardLayout>
  );
}
