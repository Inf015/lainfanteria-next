import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAjustes, seccionActiva } from '@/lib/datos';
import { getVideos } from '@/lib/youtube';
import VideosGrid from './VideosGrid';
import s from './videos.module.css';

export const metadata: Metadata = {
  title: 'Videos — La Infantería Motorsport',
  description:
    'Carreras, podcast y todo lo que pasa en La Infantería Motorsport, directo desde nuestro canal de YouTube.',
};

export default async function VideosPage() {
  if (!(await seccionActiva('videos'))) notFound();

  const ajustes = await getAjustes();
  const canal = ajustes.youtube_channel_id ?? '';
  const videos = await getVideos(canal);

  // Enlace al canal: se prefiere la URL cargada en ajustes, y si no, se arma
  // desde el id del feed.
  const urlCanal =
    ajustes.youtube_url || (canal ? `https://www.youtube.com/channel/${canal}` : '');

  return (
    <>
      <section className={s.pageBanner}>
        <div className={s.sectionContainer}>
          <span className={s.sectionLabel}>■ NUESTRO CANAL</span>
          <h1 className={s.pageBannerTitle}>
            Videos del <span className={s.accent}>equipo</span>
          </h1>
          <p className={s.pageBannerSub}>
            Carreras, podcast y todo lo que pasa dentro y fuera de la pista. Se
            actualiza solo con cada video que subimos.
          </p>
          {urlCanal && (
            <a href={urlCanal} target="_blank" rel="noopener" className={s.btnCanal}>
              ▶ Suscribite al canal
            </a>
          )}
        </div>
      </section>

      <section className={s.seccion}>
        <div className={s.sectionContainer}>
          {videos.length === 0 ? (
            <div className={s.vacio}>
              <span className={s.vacioIcono}>📹</span>
              <h2 className={s.vacioTitulo}>No pudimos cargar los videos</h2>
              <p className={s.vacioTexto}>
                Puede ser algo momentáneo. Mientras tanto podés verlos directamente en
                nuestro canal.
              </p>
              {urlCanal && (
                <a
                  href={urlCanal}
                  target="_blank"
                  rel="noopener"
                  className={s.btnCanal}
                  style={{ marginTop: 0 }}
                >
                  ▶ Ir al canal
                </a>
              )}
            </div>
          ) : (
            <VideosGrid videos={videos} />
          )}
        </div>
      </section>
    </>
  );
}
