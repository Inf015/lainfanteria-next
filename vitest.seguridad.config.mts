import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// Las pruebas de seguridad pegan contra el Supabase real, así que necesitan
// las credenciales del entorno local.
config({ path: '.env.local' });

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/seguridad/**/*.test.ts'],
    // Una consulta lenta no debería marcar un falso negativo de seguridad
    testTimeout: 20000,
    // En serie: son escrituras contra la misma base y el orden importa para
    // la comprobación de "los datos siguen intactos"
    fileParallelism: false,
  },
});
