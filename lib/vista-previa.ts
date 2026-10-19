import type { Auto, EstadoAuto, Moneda } from './types';

/**
 * Vista previa de un auto en el panel (T-012): arma, a partir de lo que hay
 * cargado en el formulario, el auto tal como lo vería el público, y los avisos
 * que hay que mostrar arriba.
 *
 * Es lógica pura —sin React ni red— para poder probarla de punta a punta.
 */

/** Campos editables del formulario de autos; el resto los pone la base. */
export interface FormAuto {
  marca: string;
  modelo: string;
  version: string;
  anio: string;
  motor: string;
  descripcion: string;
  kilometraje: string;
  precio: string;
  moneda: Moneda;
  estado: EstadoAuto;
  es_del_equipo: boolean;
  orden: string;
  activo: boolean;
}

/** Lo mínimo de una foto que necesita la vista previa. */
export interface FotoVistaPrevia {
  id: number;
  url: string;
  es_principal: boolean;
  orden: number;
}

/**
 * El auto de la vista previa. Mismos campos que muestran la tarjeta y el
 * detalle del sitio, salvo `precio`, que es nulo cuando el formulario no tiene
 * un precio válido: así no se pinta un `US$ 0` que el guardado rechazaría.
 */
export interface AutoVistaPrevia {
  marca: string;
  modelo: string;
  version: string | null;
  anio: string | null;
  motor: string | null;
  descripcion: string | null;
  kilometraje: string | null;
  precio: number | null;
  moneda: Moneda;
  estado: EstadoAuto;
  auto_fotos: FotoVistaPrevia[];
}

export type AvisoVistaPrevia =
  | 'sin-guardar'
  | 'oculto'
  | 'vendido'
  | 'sin-fotos'
  | 'precio-invalido';

/** Texto de cada aviso, tal como se muestra arriba de la vista previa. */
export const TEXTO_AVISO: Record<AvisoVistaPrevia, string> = {
  'sin-guardar': 'Cambios sin guardar',
  oculto: 'No visible en el sitio',
  vendido: 'Vendido: no aparece en el sitio',
  'sin-fotos': 'Sin fotos',
  'precio-invalido': 'Precio inválido',
};

/** Recorta igual que `guardar()` de `AutosAdmin`: vacío → sin dato. */
function textoOpcional(valor: string): string | null {
  return valor.trim() || null;
}

/**
 * Precio del formulario, o `null` si no es un número ≥ 0.
 *
 * Usa `Number()` como el guardado, con una diferencia: el texto vacío es
 * inválido y no 0. El guardado no la necesita porque el campo es `required` y
 * el navegador no deja enviar el formulario sin precio; acá no hay envío, así
 * que hay que decirlo explícitamente.
 */
export function precioDeFormulario(valor: string): number | null {
  if (!valor.trim()) return null;
  const precio = Number(valor);
  return Number.isFinite(precio) && precio >= 0 ? precio : null;
}

/**
 * ¿Guardar el formulario cambiaría algo del auto guardado?
 *
 * Compara lo que escribiría `guardar()` —ya recortado— con lo que hay en la
 * base, campo por campo. Un precio inválido siempre cuenta como cambio: no se
 * puede guardar. Las fotos no entran: `SubirFotos` las guarda en el momento.
 */
function difiereDelGuardado(form: FormAuto, guardado: Auto): boolean {
  const precio = precioDeFormulario(form.precio);
  return (
    form.marca.trim() !== guardado.marca ||
    form.modelo.trim() !== guardado.modelo ||
    textoOpcional(form.version) !== guardado.version ||
    textoOpcional(form.anio) !== guardado.anio ||
    textoOpcional(form.motor) !== guardado.motor ||
    textoOpcional(form.descripcion) !== guardado.descripcion ||
    textoOpcional(form.kilometraje) !== guardado.kilometraje ||
    precio === null ||
    precio !== Number(guardado.precio) ||
    form.moneda !== guardado.moneda ||
    form.estado !== guardado.estado ||
    form.es_del_equipo !== guardado.es_del_equipo ||
    (Number(form.orden) || 0) !== guardado.orden ||
    form.activo !== guardado.activo
  );
}

/**
 * Formulario + fotos → auto de la vista previa + avisos.
 *
 * @param form     Lo que hay cargado en el formulario ahora.
 * @param fotos    La galería actual. Se respeta su orden, salvo que la
 *                 principal va primero, como la ordena el sitio: es la foto de
 *                 la tarjeta.
 * @param guardado El auto tal como está en la base, o `null` si todavía no se
 *                 creó (entonces siempre hay cambios sin guardar).
 *
 * No muta ninguna de las entradas.
 */
export function armarVistaPrevia(
  form: FormAuto,
  fotos: readonly FotoVistaPrevia[],
  guardado: Auto | null,
): { auto: AutoVistaPrevia; avisos: AvisoVistaPrevia[] } {
  const precio = precioDeFormulario(form.precio);

  // `sort` es estable: entre las no principales queda el orden de la galería.
  const ordenadas = [...fotos].sort(
    (x, y) => Number(y.es_principal) - Number(x.es_principal),
  );

  const auto: AutoVistaPrevia = {
    marca: form.marca.trim(),
    modelo: form.modelo.trim(),
    version: textoOpcional(form.version),
    anio: textoOpcional(form.anio),
    motor: textoOpcional(form.motor),
    descripcion: textoOpcional(form.descripcion),
    kilometraje: textoOpcional(form.kilometraje),
    precio,
    moneda: form.moneda,
    estado: form.estado,
    auto_fotos: ordenadas,
  };

  const avisos: AvisoVistaPrevia[] = [];
  if (!guardado || difiereDelGuardado(form, guardado)) avisos.push('sin-guardar');
  if (!form.activo) avisos.push('oculto');
  if (form.estado === 'vendido') avisos.push('vendido');
  if (ordenadas.length === 0) avisos.push('sin-fotos');
  if (precio === null) avisos.push('precio-invalido');

  return { auto, avisos };
}
