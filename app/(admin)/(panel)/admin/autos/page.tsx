import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import type { AutoConFotos } from '@/lib/types';
import AutosAdmin from './AutosAdmin';

export const metadata: Metadata = {
  title: 'Autos — Panel La Infantería',
  robots: { index: false, follow: false },
};

export default async function AdminAutosPage() {
  const db = await crearClienteServidor();

  // Sin filtro de `activo` ni de estado: el panel muestra todo, incluidos los
  // desactivados y vendidos que el sitio público oculta.
  const { data } = await db
    .from('autos')
    .select('*, auto_fotos(*)')
    .order('orden')
    .order('id');

  const autos = (data ?? []).map((a) => ({
    ...a,
    precio: Number(a.precio),
    auto_fotos: [...(a.auto_fotos ?? [])].sort(
      (x, y) => Number(y.es_principal) - Number(x.es_principal) || x.orden - y.orden,
    ),
  })) as AutoConFotos[];

  return <AutosAdmin inicial={autos} />;
}
