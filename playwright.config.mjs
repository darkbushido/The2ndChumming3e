import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests against a RUNNING Foundry instance.
 *
 * These are deliberately separate from `npm test` (the 15 dependency-free suites, which
 * need no browser and no server). Keep that separation: the unit suites are the fast
 * feedback loop, and these are the slow ones that catch what unit tests structurally
 * cannot — anything requiring two clients to each supply half the input.
 *
 * ⚠ THEY MUTATE A REAL WORLD. There is no transaction to roll back, so every test must
 * put back what it changed (see resetPools / clearChat in tests/e2e/foundry.mjs). Point
 * FOUNDRY_URL at a throwaway world, never a campaign you care about.
 *
 * ⚠ workers: 1 is not a performance choice. The tests share one world, and Foundry
 * refuses a second connection for a user who is already joined — parallel workers would
 * fight over both.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.mjs',
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.FOUNDRY_URL ?? 'http://localhost:30000',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
