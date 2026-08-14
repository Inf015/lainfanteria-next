'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Video } from '@/lib/youtube';
import s from './videos.module.css';

function fechaTexto(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Grilla de videos con reproductor bajo demanda.
 *
 * Se muestra la miniatura y el iframe de YouTube se monta recién al hacer clic:
 * incrustar quince reproductores de entrada cargaría varios megas de scripts de
 * terceros en una página que la mayoría solo va a mirar.
 */
export default function VideosGrid({ videos }: { videos: Video[] }) {
  const [activo, setActivo] = useState<Video | null>(null);

  useEffect(() => {
    if (!activo) return;

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivo(null);
    };
    document.addEventListener('keydown', alPresionar);

    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = previo;
    };
  }, [activo]);

  return (
    <>
      <div className={s.grilla}>
        {videos.map((v) => (
          <button className={s.tarjeta} onClick={() => setActivo(v)} key={v.id}>
            <div className={s.miniatura}>
              <Image
                src={v.miniatura}
                alt={v.titulo}
                fill
                sizes="(max-width: 620px) 100vw, (max-width: 960px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
              />
              <span className={s.play}>
                <span className={s.playIcono}>▶</span>
              </span>
            </div>
            <div className={s.cuerpo}>
              <h2 className={s.titulo}>{v.titulo}</h2>
              <span className={s.fecha}>{fechaTexto(v.publicado)}</span>
            </div>
          </button>
        ))}
      </div>

      {activo && (
        <div
          className={s.modalFondo}
          onClick={() => setActivo(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activo.titulo}
        >
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={s.cerrar}
              onClick={() => setActivo(null)}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <div className={s.marco}>
              <iframe
                // youtube-nocookie: no deja cookies de seguimiento a quien
                // solo mira el video
                src={`https://www.youtube-nocookie.com/embed/${activo.id}?autoplay=1&rel=0`}
                title={activo.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className={s.modalTitulo}>{activo.titulo}</p>
            <a href={activo.url} target="_blank" rel="noopener" className={s.modalEnlace}>
              Ver en YouTube ↗
            </a>
          </div>
        </div>
      )}
    </>
  );
}
