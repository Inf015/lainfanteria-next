import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import type { ProductoConFotos } from '@/lib/types';
import ProductosAdmin from './ProductosAdmin';

export const metadata: Metadata = {
  title: 'Merch — Panel La Infantería',
  robots: { index: false, follow: false },
};

export default async function AdminProductosPage() {
  const db = await crearClienteServidor();
  const { data } = await db
    .from('productos')
    .select('*, producto_fotos(*)')
    .order('orden')
    .order('id');

  const productos = (data ?? []).map((p) => ({
    ...p,
    precio: Number(p.precio),
    producto_fotos: [...(p.producto_fotos ?? [])].sort(
      (x, y) => Number(y.es_principal) - Number(x.es_principal) || x.orden - y.orden,
    ),
  })) as ProductoConFotos[];

  return <ProductosAdmin inicial={productos} />;
}
