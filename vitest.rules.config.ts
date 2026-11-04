import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  esbuild: { jsx: "automatic" },
  // Include focused training media tests without optional native PDF/canvas setup.
  test: { environment: "node", include: ["src/utils/clientPlanning.test.ts", "src/utils/clientPlanningDatabase.test.ts", "src/components/clients/ClientPlanning.test.tsx", "src/utils/caregiverSignInAccess.test.ts", "src/utils/caregiverSignInAccessDatabase.test.ts", "src/components/caregivers/CaregiverSignInAccess.test.tsx", "src/pages/LmsCoursePlayer.test.tsx", "src/utils/trainingPlayback.test.ts", "src/components/auth/SessionTimeoutProvider.test.tsx", "src/components/lms/GatedVideoPlayer.test.tsx", "src/utils/form618WitnessesDatabase.test.ts", "src/pages/Assessment618Form.test.tsx", "src/utils/notificationEmail.test.ts", "src/utils/trainingResume.test.ts", "src/utils/trainingResumeDatabase.test.ts", "src/utils/caregiverAccountMaintenance.test.ts", "src/utils/emailOutcomes.test.ts", "src/utils/caregiverCompliance.test.ts", "src/utils/caregiverOnboarding.test.ts", "src/utils/adminOnboarding.test.ts", "src/utils/caregiverPassword.test.ts", "src/utils/trainingSignIn.test.ts", "src/utils/trainingSignInDatabase.test.ts", "src/components/caregivers/CaregiverPasswordControl.test.tsx"] },
});