import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Por defecto solo las unitarias: rápidas y sin red. Las de seguridad y
    // humo se corren aparte porque dependen de Supabase y del sitio desplegado.
    include: ['tests/unidad/**/*.test.ts'],
  },
});
