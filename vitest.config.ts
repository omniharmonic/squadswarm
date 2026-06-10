import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/test/**/*.test.ts',
      'apps/web/lib/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    // Integration tests that need a live server / DB live under tests/integration
    // and are opt-in (they self-skip unless TEST_BASE_URL is set).
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
