import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
    projects: [
      {
        name: 'client',
        test: {
          environment: 'jsdom',
          include: ['test/app.test.js'],
          setupFiles: ['test/setup.js'],
        },
      },
      {
        name: 'worker',
        test: {
          environment: 'node',
          include: ['test/worker.test.js'],
        },
      },
    ],
  },
});