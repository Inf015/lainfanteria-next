import type { AlcanceRecord, RecordDeportivo, UnidadVelocidad } from './types';

/**
 * Presentación de récords: funciones puras.
 *
 * Vive fuera de los componentes porque el panel (T-002) y el sitio (T-003)
 * necesitan formatear la misma cifra igual en todos lados, y porque son
 * funciones puras que conviene poder probar sin montar nada.
 */

export const NOMBRE_ALCANCE: Record<AlcanceRecord, string> = {
  nacional: 'Récord nacional',
  pista: 'Récord de pista',
  evento: 'Récord de evento',
};

export const SIMBOLO_VELOCIDAD: Record<UnidadVelocidad, string> = {
  mph: 'mph',
  km_h: 'km/h',
};

/** Orden de importancia del alcance; sin alcance queda después de los tres. */
const ORDEN_ALCANCE: Record<AlcanceRecord, number> = { nacional: 0, pista: 1, evento: 2 };
const SIN_ALCANCE = 3;

type Cifras = Pick<RecordDeportivo, 'tiempo_s' | 'velocidad' | 'unidad_velocidad'>;

/**
 * `numeric` positivo y finito, aceptando el string que PostgREST puede mandar
 * en su lugar. Cero, negativo, no numérico o nulo no son una marca: `null`.
 */
function numeroValido(valor: number | string | null): number | null {
  if (valor === null) return null;
  const n = typeof valor === 'string' ? Number(valor) : valor;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "9.874" → "9.874 s". Siempre tres decimales, como se publican los ET de drag. */
export function formatearTiempo(valor: number | string | null): string | null {
  const n = numeroValido(valor);
  return n === null ? null : `${n.toFixed(3)} s`;
}

/**
 * "142.5" → "142.5 mph". Hasta dos decimales, sin ceros sobrantes: pasar por
 * `toFixed` y de vuelta a número descarta los que no hacen falta.
 * Sin unidad no se puede mostrar, tenga o no valor: `null`.
 */
export function formatearVelocidad(
  valor: number | string | null,
  unidad: UnidadVelocidad | null,
): string | null {
  if (unidad === null) return null;
  const n = numeroValido(valor);
  if (n === null) return null;
  return `${Number(n.toFixed(2))} ${SIMBOLO_VELOCIDAD[unidad]}`;
}

/** Las dos cifras juntas, solo la que haya, o `null` si el récord es un hito. */
export function formatearMarca(r: Cifras): string | null {
  const tiempo = formatearTiempo(r.tiempo_s);
  const velocidad = formatearVelocidad(r.velocidad, r.unidad_velocidad);
  if (tiempo && velocidad) return `${tiempo} @ ${velocidad}`;
  return tiempo ?? velocidad ?? null;
}

/** Si tiene al menos una cifra mostrable. Sin ninguna, el récord es un hito. */
export function tieneCifras(r: Cifras): boolean {
  return formatearMarca(r) !== null;
}

/**
 * El distintivo del récord. El alcance manda sobre las cifras: un hito con
 * alcance nacional es "Récord nacional", no "Hito".
 */
export function etiquetaRecord(r: Cifras & Pick<RecordDeportivo, 'alcance'>): string {
  if (r.alcance) return NOMBRE_ALCANCE[r.alcance];
  return tieneCifras(r) ? 'Récord' : 'Hito';
}

/**
 * Orden de presentación: vigentes antes que superados, después por
 * importancia del alcance, y dentro de eso lo más reciente primero, dejando
 * al final lo que no tiene fecha. Mismo criterio de fecha que `porAnio` en
 * `lib/palmares.ts`: año y mes descendentes, sin año o sin mes al final.
 */
export function ordenarRecords(records: RecordDeportivo[]): RecordDeportivo[] {
  return [...records].sort((a, b) => {
    if (a.vigente !== b.vigente) return a.vigente ? -1 : 1;

    const alcanceA = a.alcance ? ORDEN_ALCANCE[a.alcance] : SIN_ALCANCE;
    const alcanceB = b.alcance ? ORDEN_ALCANCE[b.alcance] : SIN_ALCANCE;
    if (alcanceA !== alcanceB) return alcanceA - alcanceB;

    if (a.anio !== b.anio) return (b.anio ?? -Infinity) - (a.anio ?? -Infinity);
    if (a.mes !== b.mes) return (b.mes ?? -Infinity) - (a.mes ?? -Infinity);
    return b.id - a.id;
  });
}

/** Los que siguen en pie, en el orden recibido. */
export function recordsVigentes(records: RecordDeportivo[]): RecordDeportivo[] {
  return records.filter((r) => r.vigente);
}

/**
 * Los que suman como récord nacional: vigentes y con alcance nacional, tengan
 * cifras o no (un hito nacional cuenta igual que una marca).
 */
export function recordsNacionalesVigentes(records: RecordDeportivo[]): RecordDeportivo[] {
  return records.filter((r) => r.vigente && r.alcance === 'nacional');
}
