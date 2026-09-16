/**
 * Sesión de vida del formulario de `RecordsModal.tsx`, aparte de React a
 * propósito (T-002-D06/D07, ronda 3): así se puede probar montar → desmontar
 * → montar y dos envíos seguidos sin renderizar componentes ni mockear la
 * base.
 *
 * D06: antes, un `useRef(true)` + `useEffect(() => () => { ref.current =
 * false }, [])` quedaba en `false` para siempre después del doble montaje de
 * React StrictMode (dev): el efecto corre montar→desmontar→montar, y como el
 * cuerpo del efecto no hacía nada (solo devolvía el cleanup), nada volvía a
 * poner `ref.current` en `true` en el segundo montaje real. Acá `montar()` sí
 * se llama en cada pasada del efecto (incluida la segunda de StrictMode), así
 * que el componente realmente montado queda con `montado = true`; solo un
 * `desmontar()` sin `montar()` después (el desmontaje real) lo deja en
 * `false`.
 *
 * D07: `iniciarEnvio()` es una guarda síncrona con una variable de módulo
 * cerrada (no el estado `guardando` de React, que recién cambia en el
 * siguiente render): dos llamadas seguidas en el mismo tick, antes de que la
 * primera resuelva, la segunda no puede tomar el candado.
 */

export interface SesionFormulario {
  /** Llamar en el `useEffect` de montaje (incluidas las pasadas de StrictMode). */
  montar(): void;
  /** Llamar en el cleanup de ese mismo `useEffect`. */
  desmontar(): void;
  /** Nueva alta/edición/cancelación: arranca un borrador distinto y devuelve su id. */
  nuevoBorrador(): number;
  /** El id del borrador vigente ahora mismo (para capturarlo antes de un `await`). */
  borradorActual(): number;
  /** El componente sigue montado y `borrador` sigue siendo el borrador vigente. */
  esVigente(borrador: number): boolean;
  /** El componente sigue montado (para acciones rápidas, sin borrador propio). */
  estaMontado(): boolean;
  /** Toma el candado de envío; `false` si ya había uno en curso. */
  iniciarEnvio(): boolean;
  /** Libera el candado de envío. */
  terminarEnvio(): void;
}

export function crearSesionFormulario(): SesionFormulario {
  let montado = false;
  let borrador = 0;
  let enVuelo = false;

  return {
    montar() {
      montado = true;
    },
    desmontar() {
      montado = false;
    },
    nuevoBorrador() {
      borrador += 1;
      return borrador;
    },
    borradorActual() {
      return borrador;
    },
    esVigente(id: number) {
      return montado && borrador === id;
    },
    estaMontado() {
      return montado;
    },
    iniciarEnvio() {
      if (enVuelo) return false;
      enVuelo = true;
      return true;
    },
    terminarEnvio() {
      enVuelo = false;
    },
  };
}
