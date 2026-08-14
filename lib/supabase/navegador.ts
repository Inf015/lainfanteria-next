import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para componentes cliente del backoffice: formularios,
 * subida de fotos y login. Comparte la sesión por cookies con el servidor.
 */
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
