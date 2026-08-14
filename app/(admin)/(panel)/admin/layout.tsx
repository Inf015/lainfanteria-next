import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import AdminShell from './AdminShell';

/**
 * Envuelve todo el panel salvo el login, que tiene su propia ruta fuera de
 * este árbol visual (ver el early return).
 *
 * El middleware ya bloquea a quien no tenga sesión; acá se verifica además la
 * pertenencia a `admins`, porque tener cuenta no implica tener acceso.
 */
export default async function PanelLayout({ children }: LayoutProps<'/admin'>) {
  const db = await crearClienteServidor();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: admin } = await db
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!admin) {
    // Sesión válida pero sin permiso: se corta acá.
    redirect('/admin/sin-acceso');
  }

  return <AdminShell email={user.email ?? ''}>{children}</AdminShell>;
}
