import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  esbuild: { jsx: "automatic" },
  test: { environment: "node", include: ["src/utils/caregiverCompliance.test.ts", "src/utils/caregiverOnboarding.test.ts", "src/utils/adminOnboarding.test.ts", "src/utils/caregiverPassword.test.ts", "src/components/caregivers/CaregiverPasswordControl.test.tsx"] },
});