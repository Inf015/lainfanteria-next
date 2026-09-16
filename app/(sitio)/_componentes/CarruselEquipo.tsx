'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { indiceActivo, proximaPosicion } from '@/lib/carrusel';
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
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [desborda, setDesborda] = useState(false);
  const [sinMovimiento, setSinMovimiento] = useState(false);
  const [fallidas, setFallidas] = useState<number[]>([]);

  /** Dónde arranca cada tarjeta dentro de la pista. */
  const inicios = useCallback((pista: HTMLUListElement) => {
    return [...pista.children].map((hijo) => (hijo as HTMLElement).offsetLeft);
  }, []);

  const mover = useCallback(
    (destino: number) => {
      const pista = pistaRef.current;
      if (!pista) return;
      pista.scrollTo({ left: destino, behavior: sinMovimiento ? 'auto' : 'smooth' });
    },
    [sinMovimiento],
  );

  const paso = useCallback(
    (dir: 1 | -1) => {
      const pista = pistaRef.current;
      if (!pista) return;
      const max = pista.scrollWidth - pista.clientWidth;
      mover(proximaPosicion(pista.scrollLeft, inicios(pista), max, dir));
    },
    [inicios, mover],
  );

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
  // controles. Depende del ancho, así que se vuelve a medir al redimensionar.
  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;

    const medir = () => setDesborda(pista.scrollWidth - pista.clientWidth > 1);
    medir();

    const observador = new ResizeObserver(medir);
    observador.observe(pista);
    return () => observador.disconnect();
  }, [miembros.length]);

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
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <ul
        className={s.pista}
        ref={pistaRef}
        onScroll={(e) => setIndice(indiceActivo(e.currentTarget.scrollLeft, inicios(e.currentTarget)))}
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

          <div className={s.puntos}>
            {miembros.map((m, i) => (
              <button
                type="button"
                key={m.id}
                className={`${s.punto} ${i === indice ? s.puntoActivo : ''}`}
                aria-label={`Ir a ${m.nombre}`}
                aria-current={i === indice}
                onClick={() => {
                  const pista = pistaRef.current;
                  if (pista) mover(inicios(pista)[i] ?? 0);
                }}
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
