import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNoticias, seccionActiva } from '@/lib/datos';
import s from './noticias.module.css';
import { fechaLarga } from '@/lib/formato';

export const metadata: Metadata = {
  title: 'Noticias — La Infantería Motorsport',
  description:
    'Resultados, novedades del taller y todo lo que pasa en La Infantería Motorsport.',
};

export default async function NoticiasPage() {
  if (!(await seccionActiva('noticias'))) notFound();

  const noticias = await getNoticias();

  return (
    <>
      <section className={s.pageBanner}>
        <div className={s.sectionContainer}>
          <span className={s.sectionLabel}>■ AL DÍA</span>
          <h1 className={s.pageBannerTitle}>
            Últimas <span className={s.accent}>noticias</span>
          </h1>
          <p className={s.pageBannerSub}>
            Resultados, novedades del taller y todo lo que pasa en La Infantería.
          </p>
        </div>
      </section>

      <section className={s.seccion}>
        <div className={s.sectionContainer}>
          {noticias.length === 0 ? (
            <div className={s.vacio}>
              <span className={s.vacioIcono}>📰</span>
              <h2 className={s.vacioTitulo}>Todavía no hay noticias</h2>
              <p className={s.vacioTexto}>
                Estamos preparando las primeras. Volvé pronto para enterarte de los
                resultados y novedades del equipo.
              </p>
            </div>
          ) : (
            <div className={s.grilla}>
              {noticias.map((n) => (
                <Link href={`/noticias/${n.slug}`} className={s.tarjeta} key={n.id}>
                  <div className={s.tarjetaImagen}>
                    {n.imagen_portada_url ? (
                      <Image
                        src={n.imagen_portada_url}
                        alt={n.titulo}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className={s.sinImagen}>📰</div>
                    )}
                  </div>
                  <div className={s.tarjetaCuerpo}>
                    <span className={s.categoria}>
                      {n.categoria?.toUpperCase() ?? 'NOTICIAS'}
                    </span>
                    <h2 className={s.tarjetaTitulo}>{n.titulo}</h2>
                    {n.resumen && <p className={s.resumen}>{n.resumen}</p>}
                    <span className={s.fecha}>{fechaLarga(n.fecha_publicacion)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
