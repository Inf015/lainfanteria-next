'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Logro } from '@/lib/types';
import { ICONO_POSICION, NOMBRE_POSICION, contexto, fechaLogro, porAnio } from '@/lib/palmares';
import s from './miembro.module.css';

/**
 * La galería de trofeos, agrupada por año, con visor a pantalla completa.
 *
 * Antes la foto era un enlace al archivo: abría una pestaña con el JPG suelto,
 * sin el trofeo en contexto y sin vuelta atrás más que el botón del navegador.
 * Acá se abre encima de la página y se cierra con Escape, con la ✕ o tocando
 * fuera, como el reproductor de la página de videos.
 *
 * Recorre solo los trofeos que tienen foto: pasar al siguiente y encontrarse
 * con la nada sería peor que no poder pasar.
 */
export default function GaleriaTrofeos({ logros }: { logros: Logro[] }) {
  const conFoto = logros.filter((l) => l.foto_url);
  const [indice, setIndice] = useState<number | null>(null);
  const activo = indice === null ? null : conFoto[indice];

  const total = conFoto.length;

  /* Da la vuelta en los extremos: del último se pasa al primero. */
  function mover(paso: number) {
    setIndice((i) => (i === null ? null : (i + paso + total) % total));
  }

  useEffect(() => {
    if (indice === null) return;

    /*
     * El manejador se define acá dentro y no depende de `mover`: si dependiera,
     * el efecto se volvería a montar en cada render, porque la función se crea
     * nueva cada vez y el compilador de React no la memoriza.
     */
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndice(null);
      if (e.key === 'ArrowRight') setIndice((i) => (i === null ? null : (i + 1) % total));
      if (e.key === 'ArrowLeft')
        setIndice((i) => (i === null ? null : (i - 1 + total) % total));
    };
    document.addEventListener('keydown', alPresionar);

    // El fondo no debe correrse detrás del visor
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = previo;
    };
  }, [indice, total]);

  return (
    <>
      {porAnio(logros).map(([anio, delAnio]) => (
        <div className={s.anio} key={anio}>
          <div className={s.anioCabecera}>
            <h3 className={s.anioTitulo}>{anio}</h3>
            <span className={s.anioConteo}>
              {delAnio.length} {delAnio.length === 1 ? 'trofeo' : 'trofeos'}
            </span>
          </div>

          <ul className={s.logros}>
            {delAnio.map((logro) => (
              <li className={s.logro} key={logro.id}>
                <span className={s.logroIcono} aria-hidden="true">
                  {ICONO_POSICION[logro.posicion]}
                </span>

                <div className={s.logroCuerpo}>
                  <p className={s.logroTitulo}>{logro.titulo}</p>
                  <p className={s.logroMeta}>
                    {[NOMBRE_POSICION[logro.posicion], contexto(logro), fechaLogro(logro)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                {logro.foto_url && (
                  <button
                    type="button"
                    className={s.logroFoto}
                    onClick={() => setIndice(conFoto.findIndex((l) => l.id === logro.id))}
                    aria-label={`Ver la foto de: ${logro.titulo}`}
                  >
                    <Image
                      src={logro.foto_url}
                      alt=""
                      fill
                      sizes="88px"
                      style={{ objectFit: 'cover' }}
                    />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {activo?.foto_url && (
        <div
          className={s.visorFondo}
          onClick={() => setIndice(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activo.titulo}
        >
          <div className={s.visor} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={s.visorCerrar}
              onClick={() => setIndice(null)}
              aria-label="Cerrar"
            >
              ✕
            </button>

            <div className={s.visorMarco}>
              <Image
                src={activo.foto_url}
                alt={`Trofeo: ${activo.titulo}`}
                fill
                sizes="(max-width: 768px) 92vw, 80vw"
                style={{ objectFit: 'contain' }}
              />
            </div>

            <div className={s.visorPie}>
              <p className={s.visorTitulo}>{activo.titulo}</p>
              <p className={s.visorMeta}>
                {[NOMBRE_POSICION[activo.posicion], contexto(activo), fechaLogro(activo)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            {total > 1 && (
              <>
                <button
                  type="button"
                  className={`${s.visorPaso} ${s.visorAnterior}`}
                  onClick={() => mover(-1)}
                  aria-label="Trofeo anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`${s.visorPaso} ${s.visorSiguiente}`}
                  onClick={() => mover(1)}
                  aria-label="Trofeo siguiente"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
