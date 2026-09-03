import type { Moneda } from './types';

/**
 * Funciones puras de formato y transformación.
 *
 * Estaban repetidas dentro de los componentes (el precio, en cinco lugares).
 * Acá quedan en un solo sitio y, sobre todo, se pueden probar.
 */

/** "US$ 45,000" / "RD$ 2,500". Sin decimales: los precios son redondos. */
export function formatPrecio(monto: number, moneda: Moneda): string {
  const simbolo = moneda === 'USD' ? 'US$' : 'RD$';
  const numero = new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 }).format(
    Number.isFinite(monto) ? monto : 0,
  );
  return `${simbolo} ${numero}`;
}

/**
 * Título → slug para la URL: sin tildes, minúsculas, con guiones.
 *
 * NFD separa las letras de sus marcas diacríticas y el rango ̀-ͯ las
 * elimina, así "Campeón" da "campeon" y no "campen".
 */
export function aSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, ''); // el corte a 80 puede dejar un guion colgando
}

/**
 * Primer slug libre a partir de uno base, agregando "-2", "-3"…
 *
 * Dos nombres distintos pueden dar el mismo slug —"José Pérez" y "Jose Perez"
 * son ambos "jose-perez"—, y la columna es única: sin esto, el segundo alta
 * falla y no hay forma de cargarlo desde el panel. Es el mismo criterio con el
 * que la migración 0011 numeró los homónimos que ya estaban.
 */
export function slugUnico(base: string, ocupados: Iterable<string>): string {
  const usados = new Set(ocupados);
  if (!usados.has(base)) return base;

  let n = 2;
  while (usados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** "S, M, L" → ['S','M','L']. Descarta vacíos y espacios sobrantes. */
export function aLista(texto: string): string[] {
  return texto
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Nombre legible de un auto, salteando las partes que falten. */
export function nombreAuto(a: {
  marca: string;
  modelo: string;
  version?: string | null;
  anio?: string | null;
}): string {
  return [a.marca, a.modelo, a.version, a.anio].filter(Boolean).join(' ');
}

/**
 * Deja solo los dígitos, para enlaces `tel:`.
 *
 * El teléfono se guarda con formato legible —"(829) 686-3273"— y algunos
 * marcadores no interpretan paréntesis ni espacios.
 */
export function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

/** Ordena fotos: la principal primero, después por `orden`. */
export function ordenarFotos<T extends { es_principal: boolean; orden: number }>(
  fotos: T[],
): T[] {
  return [...fotos].sort(
    (a, b) => Number(b.es_principal) - Number(a.es_principal) || a.orden - b.orden,
  );
}

/**
 * Divide un texto de textarea en párrafos.
 *
 * El contenido se escribe en textareas, donde los saltos de línea son la única
 * forma de separar párrafos. En HTML esos saltos colapsan, así que hay que
 * convertirlos en elementos separados o el texto se ve corrido.
 */
export function aParrafos(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Zona horaria del sitio.
 *
 * Las fechas se formatean siempre en hora dominicana, no en la del servidor ni
 * en la de quien mira. Sin fijarla, el servidor —que corre en UTC— y el
 * navegador podían calcular días distintos para el mismo contenido, y React
 * fallaba la hidratación: un video publicado 00:13 UTC es del día anterior en
 * Santo Domingo.
 */
const ZONA = 'America/Santo_Domingo';

/** "14 de agosto de 2026" */
export function fechaLarga(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA,
  });
}

/** "14/8/2026" */
export function fechaCorta(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-DO', { timeZone: ZONA });
}

/**
 * Un instante descompuesto en la hora de pared dominicana.
 *
 * `en-CA` da los números ya en orden ISO y `h23` evita el "24:00" que algunos
 * motores devuelven para la medianoche con `hour12: false`.
 */
const PARTES_ZONA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function partesEnZona(d: Date): Record<string, string> {
  return Object.fromEntries(
    PARTES_ZONA.formatToParts(d)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );
}

/** Minutos que la zona lleva de ventaja a UTC en ese instante. */
function desfaseZona(d: Date): number {
  const p = partesEnZona(d);
  const comoSiFueraUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  // El instante se trunca al segundo porque las partes no traen milisegundos.
  return (comoSiFueraUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000;
}

/**
 * Instante ISO → "YYYY-MM-DDTHH:mm" en hora dominicana, para un
 * `<input type="datetime-local">`.
 *
 * El input no tiene zona: muestra tal cual el texto que se le da e interpreta
 * lo que el usuario escribe como hora local. Pasarle `toISOString()` le mete la
 * hora UTC, así que una noticia de las 20:00 de Santo Domingo se editaba como
 * si fueran las 00:00 del día siguiente.
 */
export function aInputFechaHora(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = partesEnZona(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * "YYYY-MM-DDTHH:mm" en hora dominicana → instante ISO en UTC.
 *
 * El inverso exacto de {@link aInputFechaHora}: lo que se ve en el input es lo
 * que se guarda. `null` si el texto no es una fecha y hora válidas.
 */
export function deInputFechaHora(valor: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(valor?.trim() ?? '');
  if (!m) return null;

  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const hora = Number(m[4]);
  const minuto = Number(m[5]);
  const segundo = Number(m[6] ?? 0);

  // El regex solo mira la forma, y `Date.UTC` no rechaza nada: normaliza. Sin
  // este control, "2026-02-30" se guardaba como 2 de marzo, "2026-13-01" como
  // enero del año siguiente y las 24:00 como el día siguiente, todo en silencio.
  if (mes < 1 || mes > 12) return null;
  if (dia < 1 || hora > 23 || minuto > 59 || segundo > 59) return null;

  const comoSiFueraUtc = Date.UTC(anio, mes - 1, dia, hora, minuto, segundo);
  if (Number.isNaN(comoSiFueraUtc)) return null;

  // Y el día contra el calendario real: 30 de febrero no existe, y si la fecha
  // se corrió al normalizar, los componentes que vuelven no son los que entraron.
  const control = new Date(comoSiFueraUtc);
  if (
    control.getUTCFullYear() !== anio ||
    control.getUTCMonth() !== mes - 1 ||
    control.getUTCDate() !== dia ||
    control.getUTCHours() !== hora ||
    control.getUTCMinutes() !== minuto ||
    control.getUTCSeconds() !== segundo
  ) {
    return null;
  }

  // Se resta el desfase para pasar de hora de pared a instante. La segunda
  // pasada es por si la estimación cayó del otro lado de un cambio de horario:
  // Santo Domingo hoy no tiene, pero el cálculo no depende de eso.
  let ts = comoSiFueraUtc - desfaseZona(new Date(comoSiFueraUtc)) * 60000;
  ts = comoSiFueraUtc - desfaseZona(new Date(ts)) * 60000;

  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
