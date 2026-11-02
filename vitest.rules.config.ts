import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  esbuild: { jsx: "automatic" },
  test: { environment: "node", include: ["src/utils/notificationEmail.test.ts", "src/utils/trainingResume.test.ts", "src/utils/trainingResumeDatabase.test.ts", "src/utils/caregiverAccountMaintenance.test.ts", "src/utils/emailOutcomes.test.ts", "src/utils/caregiverCompliance.test.ts", "src/utils/caregiverOnboarding.test.ts", "src/utils/adminOnboarding.test.ts", "src/utils/caregiverPassword.test.ts", "src/utils/trainingSignIn.test.ts", "src/utils/trainingSignInDatabase.test.ts", "src/components/caregivers/CaregiverPasswordControl.test.tsx"] },
});