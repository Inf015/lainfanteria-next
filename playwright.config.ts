import { defineConfig, devices } from '@playwright/test';

/**
 * Puerto dedicado a esta suite: ni el 3000 de `next dev` ni el 3014, que puede
 * estar ocupado por otro worktree.
 */
const PUERTO = 3015;
const URL_BASE = `http://localhost:${PUERTO}`;

export default defineConfig({
  testDir: 'tests/navegador',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',

  use: {
    baseURL: URL_BASE,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /*
   * Levanta el sitio compilado (`next build && next start`), no `next dev`:
   * en desarrollo React monta los efectos dos veces (Strict Mode) y el
   * comportamiento del temporizador del carrusel no es el que ve quien
   * visita el sitio. Playwright arranca y apaga el servidor solo — no hace
   * falta levantarlo a mano en otra terminal (CA-1).
   */
  webServer: {
    command: `npm run build && npx next start -p ${PUERTO}`,
    url: URL_BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
