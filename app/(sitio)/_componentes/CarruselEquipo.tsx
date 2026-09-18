'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  RELOJ_NAVEGADOR,
  animarScroll,
  indiceActivo,
  paginas,
  proximaPosicion,
  type Pagina,
} from '@/lib/carrusel';
import { textoDistintivoNacional } from './records-texto';
import s from './carrusel-equipo.module.css';

/**
 * Lo que la portada necesita de cada miembro, ya calculado en el servidor.
 *
 * No recibe el `Miembro` entero a propósito: la portada es un componente de
 * servidor y todo lo que le pase a este componente de cliente viaja en el HTML.
 * El palmarés completo de un piloto con quince años corriendo son cientos de
 * filas que acá se resumen en un número.
 */
export interface TarjetaEquipo {
  id: number;
  nombre: string;
  slug: string;
  numero: string | null;
  foto: string | null;
  roles: string[];
  /** Total de trofeos: el declarado en el panel o las fichas cargadas. */
  trofeos: number;
  /** Récords nacionales vigentes; 0 oculta la etiqueta. */
  recordsNacionales: number;
}

/** Cada cuánto avanza solo. Suficiente para leer una tarjeta sin quedarse esperando. */
const MS_ENTRE_PASOS = 5000;

/**
 * Carrusel del equipo en la portada.
 *
 * Rota solo, pero se frena con el ratón encima, con el foco dentro (quien
 * navega con teclado no puede perseguir una tarjeta que se mueve) y cuando el
 * sistema pide menos movimiento. Los controles solo aparecen si las tarjetas no
 * entran de una: con tres miembros en una pantalla ancha no hay nada que rotar.
 */
export default function CarruselEquipo({ miembros }: { miembros: TarjetaEquipo[] }) {
  const pistaRef = useRef<HTMLUListElement>(null);
  /** Corta la animación en curso. `null` si no hay ninguna. */
  const cortarRef = useRef<(() => void) | null>(null);
  /** Si el `scroll-snap` de la pista está apagado por una animación nuestra. */
  const snapApagadoRef = useRef(false);
  const [indice, setIndice] = useState(0);
  // Puntero y teclado se guardan por separado: con un solo booleano, sacar el
  // ratón reanudaba la rotación aunque el foco siguiera dentro del carrusel, y
  // a quien navega con Tab se le movía el enlace de abajo del dedo.
  const [punteroAdentro, setPunteroAdentro] = useState(false);
  const [focoAdentro, setFocoAdentro] = useState(false);
  const [desborda, setDesborda] = useState(false);
  const [sinMovimiento, setSinMovimiento] = useState(false);
  const [paradas, setParadas] = useState<Pagina[]>([]);
  const [fallidas, setFallidas] = useState<number[]>([]);

  const pausado = punteroAdentro || focoAdentro;
  const destinos = useMemo(() => paradas.map((p) => p.destino), [paradas]);

  /** Las paradas alcanzables, medidas sobre el DOM. */
  const medirParadas = useCallback((pista: HTMLUListElement) => {
    const inicios = [...pista.children].map((hijo) => (hijo as HTMLElement).offsetLeft);
    return paginas(inicios, pista.scrollWidth - pista.clientWidth);
  }, []);

  /**
   * Apaga el `scroll-snap` de la pista mientras dura una animación nuestra.
   *
   * Con `scroll-snap-type: x mandatory`, cada posición intermedia que escribe
   * `animarScroll` la reajusta el navegador a la parada más cercana: el scroll
   * se queda en el origen hasta pasar el punto medio y ahí completa el salto de
   * golpe. La animación de 450 ms existía pero no se veía (T-007). Medido en
   * Chromium escribiendo las mismas posiciones con y sin snap:
   * `x mandatory` → solo `0` y `413`; `none` → `0, 43, 84, 122, 157, …`.
   */
  const apagarSnap = useCallback(() => {
    const pista = pistaRef.current;
    if (!pista || snapApagadoRef.current) return;
    pista.style.scrollSnapType = 'none';
    snapApagadoRef.current = true;
  }, []);

  /**
   * Devuelve la pista al `x mandatory` de la hoja de estilos.
   *
   * **Solo con el scroll ya en una parada.** Encenderlo a mitad de camino no es
   * neutro: el navegador reajusta el scroll a la parada más cercana en el acto
   * —medido: desde 271 px salta a 308 en la misma línea que cambia el estilo—,
   * que es justo el salto que hay que evitar.
   */
  const encenderSnap = useCallback(() => {
    const pista = pistaRef.current;
    if (!pista || !snapApagadoRef.current) return;
    pista.style.scrollSnapType = '';
    snapApagadoRef.current = false;
  }, []);

  /**
   * Corta la animación en curso, dejando el scroll donde esté.
   *
   * No enciende el snap: la pista queda entre dos tarjetas y encenderlo ahí
   * completaría el salto que este corte acaba de frenar (T-005-D02). Vuelve
   * solo, en el próximo paso que termine o en el primer gesto del visitante.
   */
  const cortar = useCallback(() => {
    cortarRef.current?.();
    cortarRef.current = null;
  }, []);

  /** Lleva el scroll hasta `destino`, animándolo cuadro a cuadro. */
  const mover = useCallback(
    (destino: number) => {
      const pista = pistaRef.current;
      if (!pista) return;

      cortar();

      if (sinMovimiento) {
        encenderSnap();
        pista.scrollLeft = destino;
        return;
      }

      apagarSnap();

      // El snap vuelve cuando la animación avisa que **terminó de escribir**,
      // no cuando el componente lo deduce: deducirlo leyendo el reloj otra vez
      // fallaba con un cuadro ejecutado tarde —timestamp 300 ms, reloj ya en
      // 460— y encendía el snap con el scroll todavía a 397 de 413 y otro
      // cuadro pedido, provocando justo el salto que este arreglo elimina
      // (T-007-D01). En el aviso, el scroll ya está en la parada y encenderlo
      // no lo mueve.
      cortarRef.current = animarScroll(
        (posicion) => {
          pista.scrollLeft = posicion;
        },
        pista.scrollLeft,
        destino,
        RELOJ_NAVEGADOR,
        encenderSnap,
      );
    },
    [apagarSnap, cortar, encenderSnap, sinMovimiento],
  );

  const paso = useCallback(
    (dir: 1 | -1) => {
      const pista = pistaRef.current;
      if (!pista) return;
      const max = pista.scrollWidth - pista.clientWidth;
      const destinos = medirParadas(pista).map((p) => p.destino);
      mover(proximaPosicion(pista.scrollLeft, destinos, max, dir));
    },
    [medirParadas, mover],
  );

  // Un paso empezado sigue moviendo el scroll aunque se apague la rotación: el
  // intervalo se limpia, pero el cuadro siguiente ya estaba pedido. Si el
  // carrusel deja de rotar —por pausa, por movimiento reducido, porque dejó de
  // desbordar o porque se desmonta— hay que cortar también lo que está en
  // curso, o se sigue moviendo bajo el ratón.
  useEffect(() => {
    if (!pausado && !sinMovimiento && desborda) return;
    cortar();
    // Pausado, el snap se queda apagado a propósito: la pista quedó entre dos
    // tarjetas y encenderlo completaría el salto que este corte acaba de
    // frenar. En los otros casos vuelve enseguida: con movimiento reducido los
    // saltos son instantáneos, y si la pista dejó de desbordar no hay scroll
    // que reajustar, así que encenderlo no mueve nada.
    if (!pausado || !desborda) encenderSnap();
  }, [pausado, sinMovimiento, desborda, cortar, encenderSnap]);

  useEffect(() => cortar, [cortar]);

  // El snap que dejó apagado un paso cortado vuelve en el primer gesto del
  // visitante sobre la pista, que es cuando tiene algo que hacer: al soltar el
  // dedo, el navegador alinea la tarjeta (medido: suelta en 460 px y alinea en
  // 308). Se enciende al empezar el gesto, no al terminarlo, para que el
  // arrastre y su inercia sean los nativos de punta a punta.
  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;

    const alGesto = () => encenderSnap();
    pista.addEventListener('pointerdown', alGesto, { passive: true });
    pista.addEventListener('wheel', alGesto, { passive: true });
    return () => {
      pista.removeEventListener('pointerdown', alGesto);
      pista.removeEventListener('wheel', alGesto);
    };
  }, [encenderSnap]);

  // El sistema puede pedir menos movimiento (macOS: Reducir movimiento). Ahí el
  // carrusel no rota solo y los saltos son instantáneos; los controles quedan.
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setSinMovimiento(consulta.matches);
    aplicar();
    consulta.addEventListener('change', aplicar);
    return () => consulta.removeEventListener('change', aplicar);
  }, []);

  // Si todas las tarjetas entran sin scroll no hay carrusel: ni rotación ni
  // controles. Cuántas entran depende del ancho, y de eso dependen también las
  // paradas, así que las dos cosas se vuelven a medir al redimensionar.
  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;

    const medir = () => {
      setDesborda(pista.scrollWidth - pista.clientWidth > 1);
      setParadas(medirParadas(pista));
    };
    medir();

    const observador = new ResizeObserver(medir);
    observador.observe(pista);
    return () => observador.disconnect();
  }, [miembros.length, medirParadas]);

  useEffect(() => {
    if (!desborda || pausado || sinMovimiento) return;
    const id = setInterval(() => paso(1), MS_ENTRE_PASOS);
    return () => clearInterval(id);
  }, [desborda, pausado, sinMovimiento, paso]);

  if (miembros.length === 0) return null;

  return (
    <div
      className={s.marco}
      aria-roledescription="carrusel"
      aria-label="Equipo de La Infantería"
      onMouseEnter={() => setPunteroAdentro(true)}
      onMouseLeave={() => setPunteroAdentro(false)}
      onFocusCapture={() => setFocoAdentro(true)}
      onBlurCapture={(e) => {
        // `relatedTarget` es adonde va el foco. Si sigue dentro del carrusel
        // —de un enlace al siguiente— no es una salida y la rotación tiene que
        // seguir frenada. `null` (se fue a otra ventana) sí cuenta como salida:
        // al volver, el foco entra de nuevo y vuelve a frenarla.
        const destino = e.relatedTarget as Node | null;
        if (!destino || !e.currentTarget.contains(destino)) setFocoAdentro(false);
      }}
    >
      <ul
        className={s.pista}
        ref={pistaRef}
        onScroll={(e) => setIndice(indiceActivo(e.currentTarget.scrollLeft, destinos))}
      >
        {miembros.map((m) => {
          const ruta = `/equipo/${m.slug}`;
          const tieneFoto = Boolean(m.foto) && !fallidas.includes(m.id);
          const inicial = m.nombre.trim().charAt(0).toUpperCase() || '?';

          return (
            <li className={s.tarjeta} key={m.id}>
              <Link href={ruta} className={s.fotoWrap} aria-label={`Perfil de ${m.nombre}`}>
                {tieneFoto ? (
                  <Image
                    src={m.foto as string}
                    alt={m.nombre}
                    fill
                    sizes="(max-width: 768px) 85vw, (max-width: 1024px) 45vw, 30vw"
                    style={{ objectFit: 'cover', objectPosition: 'top' }}
                    onError={() => setFallidas((previas) => [...previas, m.id])}
                  />
                ) : (
                  <div className={s.fotoPlaceholder}>
                    <span>{inicial}</span>
                  </div>
                )}

                {/* El número de carrera solo aplica a pilotos */}
                {m.numero && <span className={s.numero}>#{m.numero}</span>}

                {m.recordsNacionales > 0 && (
                  <span className={s.distintivoRecord}>
                    <span aria-hidden="true">🏁</span>{' '}
                    {textoDistintivoNacional(m.recordsNacionales)}
                  </span>
                )}
              </Link>

              <div className={s.info}>
                <h3 className={s.nombre}>
                  <Link href={ruta}>{m.nombre}</Link>
                </h3>

                {m.roles.length > 0 && (
                  <span className={s.roles}>{m.roles.join(' · ')}</span>
                )}

                {m.trofeos > 0 && (
                  <p className={s.trofeos}>
                    <span aria-hidden="true">🏆</span> {m.trofeos}{' '}
                    {m.trofeos === 1 ? 'trofeo' : 'trofeos'}
                  </p>
                )}

                <Link href={ruta} className={s.verPerfil}>
                  VER PERFIL →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {desborda && (
        <div className={s.controles}>
          <button
            type="button"
            className={s.flecha}
            onClick={() => paso(-1)}
            aria-label="Miembro anterior"
          >
            ‹
          </button>

          {/* Un punto por parada alcanzable, no por tarjeta: cuando entran
              tres a la vez, las últimas nunca llegan a pegarse al borde y sus
              puntos apuntarían a una posición imposible, sin poder quedar
              marcados nunca como el actual. */}
          <div className={s.puntos}>
            {paradas.map((parada, i) => (
              <button
                type="button"
                key={parada.destino}
                className={`${s.punto} ${i === indice ? s.puntoActivo : ''}`}
                aria-label={`Ir a ${miembros[parada.tarjeta]?.nombre ?? `la posición ${i + 1}`}`}
                aria-current={i === indice}
                onClick={() => mover(parada.destino)}
              />
            ))}
          </div>

          <button
            type="button"
            className={s.flecha}
            onClick={() => paso(1)}
            aria-label="Miembro siguiente"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
