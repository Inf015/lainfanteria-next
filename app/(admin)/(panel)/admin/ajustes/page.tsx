import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import AjustesAdmin from './AjustesAdmin';

export const metadata: Metadata = {
  title: 'Ajustes — Panel La Infantería',
  robots: { index: false, follow: false },
};

export default async function AdminAjustesPage() {
  const db = await crearClienteServidor();
  const { data } = await db.from('ajustes').select('clave, valor');

  const valores = Object.fromEntries(
    (data ?? []).map((f: { clave: string; valor: string }) => [f.clave, f.valor]),
  );

  return <AjustesAdmin inicial={valores} />;
}
