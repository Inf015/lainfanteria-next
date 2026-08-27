import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import type { Miembro } from '@/lib/types';
import MiembrosAdmin from './MiembrosAdmin';

export const metadata: Metadata = {
  title: 'Equipo — Panel La Infantería',
  robots: { index: false, follow: false },
};

export default async function AdminMiembrosPage() {
  const db = await crearClienteServidor();
  // `palmares:logros(*)` con alias: `logros` a secas choca con la columna vieja
  // del mismo nombre que quedó en la tabla (ver 0011).
  const { data } = await db
    .from('miembros')
    .select('*, palmares:logros(*)')
    .order('orden')
    .order('id');
  return <MiembrosAdmin inicial={(data ?? []) as Miembro[]} />;
}
