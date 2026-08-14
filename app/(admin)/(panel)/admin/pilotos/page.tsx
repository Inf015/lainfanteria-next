import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import type { Piloto } from '@/lib/types';
import PilotosAdmin from './PilotosAdmin';

export const metadata: Metadata = {
  title: 'Pilotos — Panel La Infantería',
  robots: { index: false, follow: false },
};

export default async function AdminPilotosPage() {
  const db = await crearClienteServidor();
  const { data } = await db.from('pilotos').select('*').order('orden').order('id');
  return <PilotosAdmin inicial={(data ?? []) as Piloto[]} />;
}
