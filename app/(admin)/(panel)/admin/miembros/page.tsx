import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { ordenarRecords } from '@/lib/records';
import type { Miembro, RecordDeportivo } from '@/lib/types';
import MiembrosAdmin from './MiembrosAdmin';

export const metadata: Metadata = {
  title: 'Equipo — Panel La Infantería',
  robots: { index: false, follow: false },
};

export default async function AdminMiembrosPage() {
  const db = await crearClienteServidor();
  // Dos consultas porque son dos cosas distintas: los récords del equipo no
  // cuelgan de ningún miembro (`miembro_id` nulo), así que el embebido
  // `records(*)` no los trae nunca. Van en paralelo: no dependen entre sí.
  // `is` y no `eq`: en PostgREST `eq('miembro_id', null)` no matchea nada.
  const [{ data }, { data: recordsEquipo }] = await Promise.all([
    // `palmares:logros(*)` con alias: `logros` a secas choca con la columna vieja
    // del mismo nombre que quedó en la tabla (ver 0011).
    db
      .from('miembros')
      .select('*, palmares:logros(*), records(*)')
      .order('orden')
      .order('id'),
    db.from('records').select('*').is('miembro_id', null),
  ]);

  return (
    <MiembrosAdmin
      inicial={(data ?? []) as Miembro[]}
      recordsEquipo={ordenarRecords((recordsEquipo ?? []) as RecordDeportivo[])}
    />
  );
}
