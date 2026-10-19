/**
 * Orden de una galería de fotos en el panel.
 *
 * La regla es una sola: **la primera foto de la galería es la principal.** El
 * panel calcula el orden nuevo acá, lo muestra al instante y le manda la lista
 * de ids a la RPC `reordenar_fotos` (migración 0014), que deja en la base
 * exactamente lo mismo que `normalizarGaleria` deja en memoria: `orden` igual
 * a la posición (base 0) y `es_principal` solo en la primera. Son funciones
 * puras para poder probarlas sin montar el componente.
 */

/** Lo mínimo que necesita una foto para ordenarse. */
export interface FotoOrdenable {
  id: number;
  es_principal: boolean;
  orden: number;
}

/**
 * La lista con la foto de la posición `desde` movida a la posición `hasta`;
 * las demás se corren un lugar para hacerle espacio.
 *
 * Una posición fuera de rango (negativa, más allá del final o no entera)
 * devuelve una copia sin cambios en vez de lanzar: viene de un clic o de un
 * arrastre, y un gesto inválido —soltar fuera de la grilla, un índice viejo
 * después de un borrado— no tiene que romper el panel, solo no hacer nada.
 *
 * Nunca muta la entrada: la lista es estado de React y la anterior hace falta
 * intacta para volver atrás si la RPC falla.
 */
export function moverFoto<T>(fotos: readonly T[], desde: number, hasta: number): T[] {
  const copia = [...fotos];
  if (!enRango(desde, copia.length) || !enRango(hasta, copia.length)) return copia;
  if (desde === hasta) return copia;

  const [movida] = copia.splice(desde, 1);
  copia.splice(hasta, 0, movida);
  return copia;
}

/**
 * La galería como queda en la base después de `reordenar_fotos`: `orden`
 * igual a la posición y `es_principal` solo en la primera.
 *
 * El panel la aplica antes de llamar a la RPC (actualización optimista), así
 * que lo que se ve y lo que recibe `onCambio` ya es lo que la base va a
 * guardar. Devuelve objetos nuevos; la entrada queda intacta.
 */
export function normalizarGaleria<T extends FotoOrdenable>(fotos: readonly T[]): T[] {
  return fotos.map((foto, i) => ({ ...foto, orden: i, es_principal: i === 0 }));
}

function enRango(posicion: number, largo: number): boolean {
  return Number.isInteger(posicion) && posicion >= 0 && posicion < largo;
}

/**
 * Guardia de exclusión para las operaciones de una galería (subir, mover, ★,
 * borrar): **una sola a la vez**, y la que llega mientras otra está en vuelo
 * se rechaza.
 *
 * Por qué una sola guardia para todo y no un contador o un flag por tipo de
 * operación: cada operación arma la lista que publica a partir de la galería
 * que había cuando empezó. Si otra operación cambia la galería en el medio, la
 * primera publica una lista vieja y pisa el cambio (T-011-D01: dos subidas
 * superpuestas; la primera en terminar ponía el contador en cero y habilitaba
 * reordenar mientras la segunda seguía en vuelo). Con exclusión total, la
 * galería capturada al empezar es la vigente hasta que la operación publica.
 *
 * Es síncrona a propósito: `tomar()` marca el candado en el mismo tick del
 * clic. Un estado de React recién deshabilita los botones en el render
 * siguiente, y un doble clic o dos drops pueden llegar antes.
 */
export interface Candado {
  readonly tomado: boolean;
  /** Toma el candado si está libre. `false` si ya había una operación. */
  tomar(): boolean;
  soltar(): void;
}

/** `alCambiar` se llama en cada transición, para reflejarla en la UI. */
export function crearCandado(alCambiar?: (tomado: boolean) => void): Candado {
  let tomado = false;
  return {
    get tomado() {
      return tomado;
    },
    tomar() {
      if (tomado) return false;
      tomado = true;
      alCambiar?.(true);
      return true;
    },
    soltar() {
      if (!tomado) return;
      tomado = false;
      alCambiar?.(false);
    },
  };
}

/**
 * Corre `operacion` con el candado tomado y lo suelta cuando **termina** —bien
 * o con excepción—, nunca antes. Devuelve `false` sin correrla si había otra
 * en vuelo. Una excepción de la operación se propaga después de soltar.
 */
export async function enExclusiva(
  candado: Candado,
  operacion: () => Promise<void>,
): Promise<boolean> {
  if (!candado.tomar()) return false;
  try {
    await operacion();
  } finally {
    candado.soltar();
  }
  return true;
}

/**
 * Candados por galería, compartidos por todas las instancias que la muestren.
 *
 * El candado no puede vivir en el componente (T-011-D01, ronda 3): cerrar el
 * modal desmonta `SubirFotos`, al reabrir se monta otra instancia con un
 * candado nuevo y libre, y la operación de la instancia vieja sigue viva y
 * termina publicando la lista que capturó al empezar. La galería es la misma;
 * lo que cambió es el componente. Por eso el candado se indexa por galería
 * (`tabla:registroId`) y vive a nivel de módulo, más allá de cualquier montaje.
 *
 * Expone `suscribir`/`tomado` con la forma que pide `useSyncExternalStore`, así
 * cada instancia se entera de que su galería se ocupó o se liberó aunque la
 * operación la haya empezado otra instancia.
 *
 * Desuscribirse **no** suelta el candado: una instancia que se desmonta deja
 * de mirar, pero su operación sigue en vuelo y la galería sigue ocupada hasta
 * que termine.
 */
export interface RegistroCandados {
  /** Vista del candado de esa galería. Dos llamadas con la misma clave comparten estado. */
  candado(clave: string): Candado;
  tomado(clave: string): boolean;
  /** Avisa cada vez que esa galería se ocupa o se libera. Devuelve cómo desuscribirse. */
  suscribir(clave: string, oyente: () => void): () => void;
}

/** Clave de una galería: la tabla de fotos y el registro padre. */
export function claveGaleria(tabla: string, registroId: number): string {
  return `${tabla}:${registroId}`;
}

export function crearRegistroCandados(): RegistroCandados {
  const candados = new Map<string, Candado>();
  const oyentes = new Map<string, Set<() => void>>();

  function avisar(clave: string) {
    // Copia: un oyente que se desuscribe al recibir el aviso no tiene que
    // saltear al siguiente.
    for (const oyente of [...(oyentes.get(clave) ?? [])]) oyente();
  }

  function candado(clave: string): Candado {
    let c = candados.get(clave);
    if (!c) {
      c = crearCandado(() => avisar(clave));
      candados.set(clave, c);
    }
    return c;
  }

  return {
    candado,
    tomado: (clave) => candados.get(clave)?.tomado ?? false,
    suscribir(clave, oyente) {
      let set = oyentes.get(clave);
      if (!set) {
        set = new Set();
        oyentes.set(clave, set);
      }
      set.add(oyente);
      return () => {
        set.delete(oyente);
      };
    },
  };
}

/**
 * El registro que usa el panel. Uno solo por pestaña: es lo que hace que dos
 * montajes de la misma galería vean el mismo candado.
 */
export const candadosDeGaleria = crearRegistroCandados();
