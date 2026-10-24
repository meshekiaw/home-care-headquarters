import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/utils/caregiverCompliance.test.ts", "src/utils/caregiverOnboarding.test.ts", "src/utils/adminOnboarding.test.ts"] },
});