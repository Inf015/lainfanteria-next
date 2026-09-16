import { formatearMarca } from '@/lib/records';
import { fechaLogro } from '@/lib/palmares';
import type { RecordDeportivo } from '@/lib/types';

/**
 * Texto derivado para el bloque de récords (T-003). Vive acá y no en
 * `lib/records.ts` porque es presentación de este componente, no algo que
 * el panel (T-002) necesite compartir.
 */

/** "RÉCORD NACIONAL" para uno, "N RÉCORDS NACIONALES" para más de uno. */
export function textoDistintivoNacional(cantidad: number): string {
  return cantidad === 1 ? 'RÉCORD NACIONAL' : `${cantidad} RÉCORDS NACIONALES`;
}

type CamposHistorial = Pick<
  RecordDeportivo,
  'titulo' | 'tiempo_s' | 'velocidad' | 'unidad_velocidad' | 'anio' | 'mes'
>;

/**
 * La línea de un récord superado: `marca · título · fecha` si tiene cifras,
 * `título · fecha` si es un hito. Filtrar antes de unir evita que falte la
 * marca o la fecha y quede un " · " colgando.
 */
export function lineaHistorial(r: CamposHistorial): string {
  return [formatearMarca(r), r.titulo, fechaLogro(r)].filter(Boolean).join(' · ');
}
