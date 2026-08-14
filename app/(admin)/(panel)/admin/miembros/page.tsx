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
  const { data } = await db.from('miembros').select('*').order('orden').order('id');
  return <MiembrosAdmin inicial={(data ?? []) as Miembro[]} />;
}
