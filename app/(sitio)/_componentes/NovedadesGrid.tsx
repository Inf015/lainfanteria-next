'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import s from './novedades.module.css';

/**
 * Una novedad es una noticia o un video. Se mezclan en una sola grilla
 * ordenada por fecha: para quien visita el sitio ambos son "lo último del
 * equipo", y separarlos en dos bloques obligaba a mirar dos veces.
 */
export type Novedad =
  | {
      tipo: 'noticia';
      id: string;
      titulo: string;
      resumen: string | null;
      imagen: string | null;
      fecha: string;
      slug: string;
    }
  | {
      tipo: 'video';
      id: string;
      titulo: string;
      imagen: string;
      fecha: string;
      url: string;
    };

function fechaTexto(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function NovedadesGrid({ novedades }: { novedades: Novedad[] }) {
  const [video, setVideo] = useState<Extract<Novedad, { tipo: 'video' }> | null>(null);

  // El reproductor se monta al hacer clic, no de entrada: incrustar un iframe
  // de YouTube por tarjeta cargaría varios megas de terceros en la portada.
  useEffect(() => {
    if (!video) return;

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVideo(null);
    };
    document.addEventListener('keydown', alPresionar);

    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = previo;
    };
  }, [video]);

  return (
    <>
      <div className={s.grilla}>
        {novedades.map((n) =>
          n.tipo === 'video' ? (
            <button className={s.tarjeta} onClick={() => setVideo(n)} key={n.id}>
              <div className={s.imagen}>
                <span className={`${s.tipo} ${s.tipoVideo}`}>▶ Video</span>
                <Image
                  src={n.imagen}
                  alt={n.titulo}
                  fill
                  sizes="(max-width: 768px) 82vw, (max-width: 1024px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
                <span className={s.play}>
                  <span className={s.playIcono}>▶</span>
                </span>
              </div>
              <div className={s.cuerpo}>
                <h3 className={s.titulo}>{n.titulo}</h3>
                <span className={s.fecha}>{fechaTexto(n.fecha)}</span>
              </div>
            </button>
          ) : (
            <Link href={`/noticias/${n.slug}`} className={s.tarjeta} key={n.id}>
              <div className={s.imagen}>
                <span className={`${s.tipo} ${s.tipoNoticia}`}>Noticia</span>
                {n.imagen ? (
                  <Image
                    src={n.imagen}
                    alt={n.titulo}
                    fill
                    sizes="(max-width: 768px) 82vw, (max-width: 1024px) 50vw, 33vw"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className={s.sinImagen}>📰</div>
                )}
              </div>
              <div className={s.cuerpo}>
                <h3 className={s.titulo}>{n.titulo}</h3>
                {n.resumen && <p className={s.resumen}>{n.resumen}</p>}
                <span className={s.fecha}>{fechaTexto(n.fecha)}</span>
              </div>
            </Link>
          ),
        )}
      </div>

      {video && (
        <div
          className={s.modalFondo}
          onClick={() => setVideo(null)}
          role="dialog"
          aria-modal="true"
          aria-label={video.titulo}
        >
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <button className={s.cerrar} onClick={() => setVideo(null)} aria-label="Cerrar">
              ✕
            </button>
            <div className={s.marco}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
                title={video.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className={s.modalTitulo}>{video.titulo}</p>
            <a href={video.url} target="_blank" rel="noopener" className={s.modalEnlace}>
              Ver en YouTube ↗
            </a>
          </div>
        </div>
      )}
    </>
  );
}
