import type { Logro, Miembro, PosicionLogro } from './types';

/**
 * Presentación del palmarés.
 *
 * Vive fuera de los componentes porque lo usan la tarjeta de la grilla y la
 * página del miembro, y porque son funciones puras que conviene poder probar:
 * los conteos son el número grande de la ficha y equivocarlos se nota.
 */

export const ICONO_POSICION: Record<PosicionLogro, string> = {
  campeon: '👑',
  primero: '🥇',
  segundo: '🥈',
  tercero: '🥉',
  otro: '🏆',
};

export const NOMBRE_POSICION: Record<PosicionLogro, string> = {
  campeon: 'Campeón',
  primero: '1er lugar',
  segundo: '2do lugar',
  tercero: '3er lugar',
  otro: 'Trofeo',
};

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** "Julio 2025", "2025", o vacío cuando el logro se cargó sin fecha. */
export function fechaLogro(logro: Logro): string {
  if (!logro.anio) return '';
  const mes = logro.mes ? MESES[logro.mes - 1] : null;
  return mes ? `${mes} ${logro.anio}` : String(logro.anio);
}

/** "3ra puntuable", "Campeonato", "Evento". Lo que distingue una carrera de otra. */
export function contexto(logro: Logro): string {
  if (logro.tipo === 'campeonato') return 'Campeonato';
  if (logro.tipo === 'puntuable') {
    return logro.ronda ? `${logro.ronda}ª puntuable` : 'Puntuable';
  }
  return 'Evento';
}

export interface ResumenPalmares {
  campeonatos: number;
  primeros: number;
  podios: number;
  puntuables: number;
  eventos: number;
}

/** Conteos sobre las fichas cargadas. No incluye el total declarado a mano. */
export function resumirPalmares(palmares: Logro[]): ResumenPalmares {
  return {
    campeonatos: palmares.filter((l) => l.posicion === 'campeon').length,
    primeros: palmares.filter((l) => l.posicion === 'primero').length,
    podios: palmares.filter((l) =>
      ['campeon', 'primero', 'segundo', 'tercero'].includes(l.posicion),
    ).length,
    puntuables: palmares.filter((l) => l.tipo === 'puntuable').length,
    eventos: palmares.filter((l) => l.tipo === 'evento').length,
  };
}

/**
 * El número grande de la ficha: el declarado en el panel y, si no se declaró,
 * la cantidad de fichas cargadas.
 *
 * Son dos cosas distintas a propósito. Quien lleva quince años corriendo tiene
 * más de cien trofeos y no va a cargar cien fichas: escribe el total una vez y
 * carga solo lo destacado.
 */
export function totalTrofeos(miembro: Miembro): number {
  return miembro.trofeos_total ?? miembro.palmares.length;
}

/** Si el total se declaró y hay más trofeos que fichas cargadas. */
export function hayMasQueFichas(miembro: Miembro): boolean {
  return totalTrofeos(miembro) > miembro.palmares.length;
}

/**
 * Agrupa por año, del más reciente al más viejo, y deja al final los que no
 * tienen fecha. La clave es el año como texto para poder usarla de título.
 */
export function porAnio(palmares: Logro[]): [string, Logro[]][] {
  const grupos = new Map<string, Logro[]>();

  for (const logro of palmares) {
    const clave = logro.anio ? String(logro.anio) : 'Sin fecha';
    grupos.set(clave, [...(grupos.get(clave) ?? []), logro]);
  }

  return [...grupos.entries()].sort(([a], [b]) => {
    if (a === 'Sin fecha') return 1;
    if (b === 'Sin fecha') return -1;
    return Number(b) - Number(a);
  });
}
