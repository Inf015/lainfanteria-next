'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Piloto } from '@/lib/types';
import s from './equipo.module.css';

/**
 * Tarjeta de piloto con bio expandible. Es el único pedazo interactivo de
 * /equipo, así que el resto de la página queda como server component.
 */
export default function PilotoCard({ piloto }: { piloto: Piloto }) {
  const [abierto, setAbierto] = useState(false);
  const [fotoFallo, setFotoFallo] = useState(false);

  const tieneFoto = Boolean(piloto.foto_url) && !fotoFallo;
  const inicial = piloto.nombre.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className={s.pilotCard}>
      <button
        className={s.pilotPhotoWrap}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`${abierto ? 'Cerrar' : 'Ver'} biografía de ${piloto.nombre}`}
      >
        {tieneFoto ? (
          <Image
            src={piloto.foto_url as string}
            alt={piloto.nombre}
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

        {piloto.numero && <span className={s.pilotNumber}>#{piloto.numero}</span>}

        {piloto.biografia && (
          <div className={s.bioHint}>{abierto ? '▲ CERRAR' : '▼ VER BIO'}</div>
        )}
      </button>

      <div className={s.pilotInfo}>
        <h3 className={s.pilotName}>{piloto.nombre}</h3>

        {piloto.biografia && (
          <div className={`${s.pilotBioWrap} ${abierto ? s.bioOpen : ''}`}>
            <p className={s.pilotBio}>{piloto.biografia}</p>
          </div>
        )}

        {piloto.logros.length > 0 && (
          <div className={s.pilotLogros}>
            {piloto.logros.map((logro) => (
              <span className={s.logro} key={logro}>
                🏆 {logro}
              </span>
            ))}
          </div>
        )}

        {(piloto.instagram_url || piloto.youtube_url) && (
          <div className={s.pilotSocial}>
            {piloto.instagram_url && (
              <a
                href={piloto.instagram_url}
                target="_blank"
                rel="noopener"
                className={s.socialLink}
              >
                IG
              </a>
            )}
            {piloto.youtube_url && (
              <a
                href={piloto.youtube_url}
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
