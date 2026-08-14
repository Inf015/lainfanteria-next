import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import type { Noticia } from '@/lib/types';
import NoticiasAdmin from './NoticiasAdmin';

export const metadata: Metadata = {
  title: 'Noticias — Panel La Infantería',
  robots: { index: false, follow: false },
};

export default async function AdminNoticiasPage() {
  const db = await crearClienteServidor();
  // Incluye borradores, que las políticas públicas ocultan.
  const { data } = await db
    .from('noticias')
    .select('*')
    .order('fecha_publicacion', { ascending: false, nullsFirst: true })
    .order('id', { ascending: false });

  return <NoticiasAdmin inicial={(data ?? []) as Noticia[]} />;
}
