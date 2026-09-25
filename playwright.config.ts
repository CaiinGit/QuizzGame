import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev:web -- --port 5173 --strictPort",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm start",
      url: "http://127.0.0.1:3001/api/health",
      env: { AKASHA_TEST_MODE: "1", AKASHA_DATA_DIR: "work/e2e-db" },
      reuseExistingServer: false,
    },
  ],
});
