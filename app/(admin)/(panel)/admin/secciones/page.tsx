import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import type { Seccion } from '@/lib/types';
import SeccionesAdmin from './SeccionesAdmin';

export const metadata: Metadata = {
  title: 'Secciones — Panel La Infantería',
  robots: { index: false, follow: false },
};

export default async function AdminSeccionesPage() {
  const db = await crearClienteServidor();
  const { data } = await db.from('secciones').select('*').order('orden');
  return <SeccionesAdmin inicial={(data ?? []) as Seccion[]} />;
}
