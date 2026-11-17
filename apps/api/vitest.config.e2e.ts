import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    // Los e2e comparten la misma base de datos: se ejecutan en serie.
    fileParallelism: false,
  },
});
