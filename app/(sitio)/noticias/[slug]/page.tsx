import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNoticiaPorSlug, seccionActiva } from '@/lib/datos';
import { aParrafos, fechaLarga } from '@/lib/formato';
import s from '../noticias.module.css';

export async function generateMetadata({
  params,
}: PageProps<'/noticias/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const noticia = await getNoticiaPorSlug(slug);

  if (!noticia) return { title: 'Noticia no encontrada — La Infantería Motorsport' };

  return {
    title: `${noticia.titulo} — La Infantería Motorsport`,
    description: noticia.resumen ?? undefined,
    openGraph: {
      title: noticia.titulo,
      description: noticia.resumen ?? undefined,
      images: noticia.imagen_portada_url ? [noticia.imagen_portada_url] : undefined,
      type: 'article',
      publishedTime: noticia.fecha_publicacion ?? undefined,
    },
  };
}

export default async function NoticiaPage({ params }: PageProps<'/noticias/[slug]'>) {
  if (!(await seccionActiva('noticias'))) notFound();

  const { slug } = await params;
  const noticia = await getNoticiaPorSlug(slug);
  if (!noticia) notFound();

  // El cuerpo se escribe en un textarea: los saltos de línea son los párrafos.
  const parrafos = aParrafos(noticia.cuerpo);

  return (
    <article className={s.articulo}>
      <div className={s.articuloContenedor}>
        <Link href="/noticias" className={s.volver}>
          ← Volver a noticias
        </Link>

        <div className={s.articuloMeta}>
          <span className={s.categoria}>
            {noticia.categoria?.toUpperCase() ?? 'NOTICIAS'}
          </span>
          <span className={s.fecha} style={{ border: 'none', padding: 0, margin: 0 }}>
            {fechaLarga(noticia.fecha_publicacion)}
          </span>
        </div>

        <h1 className={s.articuloTitulo}>{noticia.titulo}</h1>

        {noticia.resumen && <p className={s.articuloResumen}>{noticia.resumen}</p>}

        {noticia.imagen_portada_url && (
          <div className={s.articuloPortada}>
            <Image
              src={noticia.imagen_portada_url}
              alt={noticia.titulo}
              fill
              sizes="(max-width: 760px) 100vw, 760px"
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>
        )}

        <div className={s.articuloCuerpo}>
          {parrafos.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </article>
  );
}
