'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Miembro } from '@/lib/types';
import { aParrafos } from '@/lib/formato';
import s from './equipo.module.css';

/**
 * Tarjeta de piloto con bio expandible. Es el único pedazo interactivo de
 * /equipo, así que el resto de la página queda como server component.
 */
export default function MiembroCard({ miembro }: { miembro: Miembro }) {
  const [abierto, setAbierto] = useState(false);
  const [fotoFallo, setFotoFallo] = useState(false);

  const tieneFoto = Boolean(miembro.foto_url) && !fotoFallo;
  const inicial = miembro.nombre.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className={s.pilotCard}>
      <button
        className={s.pilotPhotoWrap}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`${abierto ? 'Cerrar' : 'Ver'} biografía de ${miembro.nombre}`}
      >
        {tieneFoto ? (
          <Image
            src={miembro.foto_url as string}
            alt={miembro.nombre}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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

        {miembro.biografia && (
          <div className={s.bioHint}>{abierto ? '▲ CERRAR' : '▼ VER BIO'}</div>
        )}
      </button>

      <div className={s.pilotInfo}>
        <h3 className={s.pilotName}>{miembro.nombre}</h3>

        {miembro.biografia && (
          <div className={`${s.pilotBioWrap} ${abierto ? s.bioOpen : ''}`}>
            <div className={s.pilotBioInner}>
              {aParrafos(miembro.biografia).map((parrafo, i) => (
                <p className={s.pilotBio} key={i}>
                  {parrafo}
                </p>
              ))}
            </div>
          </div>
        )}

        {miembro.logros.length > 0 && (
          <div className={s.pilotLogros}>
            {miembro.logros.map((logro) => (
              <span className={s.logro} key={logro}>
                🏆 {logro}
              </span>
            ))}
          </div>
        )}

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
