import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'prisma/**/*.spec.ts'],
    // Limita los procesos paralelos para no saturar la RAM de WSL2 (ver docs del flujo, sección 25).
    maxWorkers: '50%',
    coverage: { include: ['src/**/*.ts'], exclude: ['src/generated/**', 'src/main.ts'] },
  },
});
