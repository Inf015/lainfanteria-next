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
        pista.scrollLeft = destino;
        return;
      }

      cortarRef.current = animarScroll(
        (posicion) => {
          pista.scrollLeft = posicion;
        },
        pista.scrollLeft,
        destino,
        RELOJ_NAVEGADOR,
      );
    },
    [cortar, sinMovimiento],
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
  }, [pausado, sinMovimiento, desborda, cortar]);

  useEffect(() => cortar, [cortar]);

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
