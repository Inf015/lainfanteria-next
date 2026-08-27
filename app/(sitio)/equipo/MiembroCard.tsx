'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Miembro } from '@/lib/types';
import { ICONO_POSICION, contexto, fechaLogro, totalTrofeos } from '@/lib/palmares';
import s from './equipo.module.css';

/** Cuántos logros destacados caben en la tarjeta sin descuadrar la grilla. */
const DESTACADOS_EN_TARJETA = 3;

/**
 * Tarjeta de la grilla del equipo: la puerta de entrada a la página del miembro.
 *
 * No trae ni la biografía ni el palmarés completo. Un piloto con cien trofeos no
 * entra en una tarjeta —la grilla quedaba con una columna tres veces más alta
 * que las otras—, así que acá va el número grande y lo destacado, y el detalle
 * vive en /equipo/<slug>.
 *
 * Sigue siendo un componente de cliente por una sola razón: si la foto no carga,
 * cae a la inicial en vez de dejar un hueco roto.
 */
export default function MiembroCard({ miembro }: { miembro: Miembro }) {
  const [fotoFallo, setFotoFallo] = useState(false);

  const tieneFoto = Boolean(miembro.foto_url) && !fotoFallo;
  const inicial = miembro.nombre.trim().charAt(0).toUpperCase() || '?';

  const total = totalTrofeos(miembro);
  const destacados = miembro.palmares
    .filter((l) => l.destacado)
    .slice(0, DESTACADOS_EN_TARJETA);
  const ruta = `/equipo/${miembro.slug}`;

  return (
    <div className={s.pilotCard}>
      <Link
        href={ruta}
        className={s.pilotPhotoWrap}
        aria-label={`Perfil de ${miembro.nombre}`}
      >
        {tieneFoto ? (
          <Image
            src={miembro.foto_url as string}
            alt={miembro.nombre}
            fill
            sizes="(max-width: 768px) 80vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: 'cover', objectPosition: 'top' }}
            onError={() => setFotoFallo(true)}
          />
        ) : (
          <div className={s.pilotPhotoPlaceholder}>
            <span>{inicial}</span>
          </div>
        )}

        {/* El número de carrera solo aplica a pilotos */}
        {miembro.numero && <span className={s.pilotNumber}>#{miembro.numero}</span>}
      </Link>

      <div className={s.pilotInfo}>
        <h3 className={s.pilotName}>
          <Link href={ruta}>{miembro.nombre}</Link>
        </h3>

        {total > 0 && (
          <p className={s.contadorLogros}>
            🏆 {total} {total === 1 ? 'trofeo' : 'trofeos'}
          </p>
        )}

        {destacados.length > 0 && (
          <ul className={s.destacados}>
            {destacados.map((logro) => (
              <li className={s.destacado} key={logro.id}>
                <span className={s.destacadoIcono} aria-hidden="true">
                  {ICONO_POSICION[logro.posicion]}
                </span>
                <span className={s.destacadoTexto}>
                  {logro.titulo}
                  <span className={s.destacadoMeta}>
                    {[contexto(logro), fechaLogro(logro)].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link href={ruta} className={s.verPerfil}>
          VER PERFIL →
        </Link>

        {(miembro.instagram_url || miembro.youtube_url) && (
          <div className={s.pilotSocial}>
            {miembro.instagram_url && (
              <a
                href={miembro.instagram_url}
                target="_blank"
                rel="noopener"
                className={s.socialLink}
              >
                IG
              </a>
            )}
            {miembro.youtube_url && (
              <a
                href={miembro.youtube_url}
                target="_blank"
                rel="noopener"
                className={s.socialLink}
              >
                YT
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
