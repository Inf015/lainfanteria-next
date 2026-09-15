import type { AlcanceRecord, RecordDeportivo, UnidadVelocidad } from './types';

/**
 * Formulario de un récord: validación y conversión, como funciones puras.
 *
 * `RecordsModal.tsx` (T-002) es el único que arma el formulario hoy, pero
 * `aFilaRecord` acepta `miembroId: null` para que T-004 (récords del equipo)
 * no tenga que cambiar la firma.
 */

export interface FormRecord {
  titulo: string;
  tiempo_s: string;
  velocidad: string;
  unidad_velocidad: UnidadVelocidad;
  /** '' = sin elegir (inválido); 'ninguno' = elegido explícitamente, no suma. */
  alcance: '' | 'ninguno' | AlcanceRecord;
  categoria: string;
  auto: string;
  lugar: string;
  anio: string;
  mes: string;
  vigente: boolean;
  fuente_url: string;
}

export function formVacio(): FormRecord {
  return {
    titulo: '',
    tiempo_s: '',
    velocidad: '',
    unidad_velocidad: 'mph',
    alcance: '',
    categoria: '',
    auto: '',
    lugar: '',
    anio: '',
    mes: '',
    vigente: true,
    fuente_url: '',
  };
}

export function formDesdeRecord(r: RecordDeportivo): FormRecord {
  return {
    titulo: r.titulo,
    tiempo_s: r.tiempo_s === null ? '' : String(r.tiempo_s),
    velocidad: r.velocidad === null ? '' : String(r.velocidad),
    unidad_velocidad: r.unidad_velocidad ?? 'mph',
    alcance: r.alcance === null ? 'ninguno' : r.alcance,
    categoria: r.categoria ?? '',
    auto: r.auto ?? '',
    lugar: r.lugar ?? '',
    anio: r.anio === null ? '' : String(r.anio),
    mes: r.mes === null ? '' : String(r.mes),
    vigente: r.vigente,
    fuente_url: r.fuente_url ?? '',
  };
}

/**
 * Un texto a número, aceptando coma o punto como separador decimal y
 * espacios alrededor. Sin separador de miles: "1.234,5" no matchea el
 * segundo grupo completo y da inválido.
 */
function parseDecimal(texto: string): { valor: number; decimales: number } | null {
  const m = /^(\d+)([.,](\d+))?$/.exec(texto.trim());
  if (!m) return null;
  const decimalesTexto = m[3] ?? '';
  const valor = Number(`${m[1]}.${decimalesTexto || '0'}`);
  if (!Number.isFinite(valor)) return null;
  return { valor, decimales: decimalesTexto.length };
}

function numeroDesdeTexto(texto: string): number | null {
  if (texto.trim() === '') return null;
  const n = parseDecimal(texto);
  return n ? n.valor : null;
}

function anioValido(texto: string): boolean {
  if (!/^\d+$/.test(texto)) return false;
  const n = Number(texto);
  return n >= 1950 && n <= 2100;
}

/** `null` = formulario válido; si no, el mensaje en español a mostrar. */
export function validarRecord(form: FormRecord): string | null {
  if (!form.titulo.trim()) return 'Escribí el título del récord.';

  if (form.alcance === '') {
    return 'Elegí el alcance: si no suma como récord nacional, elegí Ninguno.';
  }

  const tiempoTexto = form.tiempo_s.trim();
  if (tiempoTexto !== '') {
    const t = parseDecimal(tiempoTexto);
    if (t === null || t.valor <= 0 || t.valor > 99999.999 || t.decimales > 3) {
      return 'El tiempo tiene que ser un número mayor que cero, con hasta 3 decimales.';
    }
  }

  const velocidadTexto = form.velocidad.trim();
  if (velocidadTexto !== '') {
    const v = parseDecimal(velocidadTexto);
    if (v === null || v.valor <= 0 || v.valor > 9999.99 || v.decimales > 2) {
      return 'La velocidad tiene que ser un número mayor que cero, con hasta 2 decimales.';
    }
  }

  if (form.mes.trim() !== '' && form.anio.trim() === '') {
    return 'Si ponés el mes, poné también el año.';
  }

  if (form.anio.trim() !== '' && !anioValido(form.anio.trim())) {
    return 'El año tiene que estar entre 1950 y 2100.';
  }

  const fuente = form.fuente_url.trim();
  if (fuente !== '' && !/^https?:\/\//i.test(fuente)) {
    return 'La fuente tiene que ser un enlace http(s).';
  }

  return null;
}

/**
 * El formulario, listo para `insert`/`update`. Se asume ya validado con
 * `validarRecord`: no repite esos chequeos.
 */
export function aFilaRecord(
  form: FormRecord,
  miembroId: number | null,
): Omit<RecordDeportivo, 'id' | 'creado_en'> {
  const velocidadTexto = form.velocidad.trim();
  const anioTexto = form.anio.trim();
  const mesTexto = form.mes.trim();
  const fuenteTexto = form.fuente_url.trim();

  return {
    miembro_id: miembroId,
    titulo: form.titulo.trim(),
    categoria: form.categoria.trim() || null,
    tiempo_s: numeroDesdeTexto(form.tiempo_s),
    // Sin velocidad no hay unidad, tenga o no el select algo elegido: si no,
    // el CHECK de la base (velocidad y unidad juntas) rechaza la fila.
    velocidad: numeroDesdeTexto(form.velocidad),
    unidad_velocidad: velocidadTexto === '' ? null : form.unidad_velocidad,
    alcance:
      form.alcance === 'nacional' || form.alcance === 'pista' || form.alcance === 'evento'
        ? form.alcance
        : null,
    auto: form.auto.trim() || null,
    lugar: form.lugar.trim() || null,
    anio: anioTexto === '' ? null : Number(anioTexto),
    mes: mesTexto === '' ? null : Number(mesTexto),
    vigente: form.vigente,
    fuente_url: fuenteTexto === '' ? null : fuenteTexto,
  };
}
