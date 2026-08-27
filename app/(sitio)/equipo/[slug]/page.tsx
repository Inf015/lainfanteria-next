import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMiembro, getMiembros, seccionActiva } from '@/lib/datos';
import { aParrafos } from '@/lib/formato';
import {
  ICONO_POSICION,
  NOMBRE_POSICION,
  contexto,
  fechaLogro,
  hayMasQueFichas,
  porAnio,
  resumirPalmares,
  totalTrofeos,
} from '@/lib/palmares';
import s from './miembro.module.css';

/**
 * Ficha completa de un miembro: biografía y palmarés.
 *
 * Existe porque el palmarés dejó de caber en la grilla. Un piloto con más de
 * cien trofeos necesita su propia página, y de paso gana URL propia para
 * compartir y para que la indexen.
 */

export async function generateStaticParams() {
  const miembros = await getMiembros();
  return miembros.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/equipo/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const miembro = await getMiembro(slug);

  if (!miembro) return { title: 'Miembro no encontrado — La Infantería Motorsport' };

  const total = totalTrofeos(miembro);
  const descripcion = miembro.biografia
    ? aParrafos(miembro.biografia)[0]
    : `${miembro.roles.join(', ')} de La Infantería Motorsport.`;

  return {
    title: `${miembro.nombre} — La Infantería Motorsport`,
    description: total > 0 ? `${descripcion} ${total} trofeos.` : descripcion,
    openGraph: {
      title: miembro.nombre,
      description: descripcion,
      images: miembro.foto_url ? [miembro.foto_url] : undefined,
      type: 'profile',
    },
  };
}

export default async function MiembroPage({ params }: PageProps<'/equipo/[slug]'>) {
  if (!(await seccionActiva('equipo'))) notFound();

  const { slug } = await params;
  const miembro = await getMiembro(slug);
  if (!miembro) notFound();

  const total = totalTrofeos(miembro);
  const resumen = resumirPalmares(miembro.palmares);
  const anios = porAnio(miembro.palmares);
  const parrafos = aParrafos(miembro.biografia);

  /*
   * Los conteos del resumen salen de las fichas cargadas, no del total
   * declarado. Se muestran solo los que tienen algo: un piloto sin campeonatos
   * no necesita un "0 campeonatos" ocupando lugar.
   */
  const cifras = [
    { valor: total, etiqueta: total === 1 ? 'Trofeo' : 'Trofeos' },
    { valor: resumen.campeonatos, etiqueta: 'Campeonatos' },
    { valor: resumen.primeros, etiqueta: 'Primeros lugares' },
    { valor: resumen.podios, etiqueta: 'Podios' },
  ].filter((c) => c.valor > 0);

  return (
    <article className={s.pagina}>
      <div className={s.contenedor}>
        <Link href="/equipo" className={s.volver}>
          ← Volver al equipo
        </Link>

        <header className={s.cabecera}>
          <div className={s.fotoWrap}>
            {miembro.foto_url ? (
              <Image
                src={miembro.foto_url}
                alt={miembro.nombre}
                fill
                sizes="(max-width: 768px) 90vw, 380px"
                style={{ objectFit: 'cover', objectPosition: 'top' }}
                preload
              />
            ) : (
              <div className={s.fotoPlaceholder}>
                <span>{miembro.nombre.trim().charAt(0).toUpperCase() || '?'}</span>
              </div>
            )}
            {miembro.numero && <span className={s.numero}>#{miembro.numero}</span>}
          </div>

          <div className={s.identidad}>
            <div className={s.roles}>
              {miembro.roles.map((rol) => (
                <span className={s.rol} key={rol}>
                  {rol.toUpperCase()}
                </span>
              ))}
            </div>

            <h1 className={s.nombre}>{miembro.nombre}</h1>

            {cifras.length > 0 && (
              <div className={s.cifras}>
                {cifras.map((c) => (
                  <div className={s.cifra} key={c.etiqueta}>
                    <span className={s.cifraValor}>{c.valor}</span>
                    <span className={s.cifraEtiqueta}>{c.etiqueta}</span>
                  </div>
                ))}
              </div>
            )}

            {(miembro.instagram_url || miembro.youtube_url) && (
              <div className={s.redes}>
                {miembro.instagram_url && (
                  <a
                    href={miembro.instagram_url}
                    target="_blank"
                    rel="noopener"
                    className={s.red}
                  >
                    INSTAGRAM
                  </a>
                )}
                {miembro.youtube_url && (
                  <a
                    href={miembro.youtube_url}
                    target="_blank"
                    rel="noopener"
                    className={s.red}
                  >
                    YOUTUBE
                  </a>
                )}
              </div>
            )}
          </div>
        </header>

        {parrafos.length > 0 && (
          <section className={s.bloque}>
            <h2 className={s.bloqueTitulo}>Biografía</h2>
            {parrafos.map((parrafo, i) => (
              <p className={s.bio} key={i}>
                {parrafo}
              </p>
            ))}
          </section>
        )}

        {miembro.palmares.length > 0 && (
          <section className={s.bloque}>
            <h2 className={s.bloqueTitulo}>Galería de trofeos</h2>

            {/* Honestidad con el número grande: si el total declarado supera lo
                cargado, se dice que abajo está lo destacado y no todo. */}
            {hayMasQueFichas(miembro) && (
              <p className={s.aclaracion}>
                De {total} trofeos, estos son los más destacados y recientes.
              </p>
            )}

            {anios.map(([anio, logros]) => (
              <div className={s.anio} key={anio}>
                <div className={s.anioCabecera}>
                  <h3 className={s.anioTitulo}>{anio}</h3>
                  <span className={s.anioConteo}>
                    {logros.length} {logros.length === 1 ? 'trofeo' : 'trofeos'}
                  </span>
                </div>

                <ul className={s.logros}>
                  {logros.map((logro) => (
                    <li className={s.logro} key={logro.id}>
                      <span className={s.logroIcono} aria-hidden="true">
                        {ICONO_POSICION[logro.posicion]}
                      </span>

                      <div className={s.logroCuerpo}>
                        <p className={s.logroTitulo}>{logro.titulo}</p>
                        <p className={s.logroMeta}>
                          {[
                            NOMBRE_POSICION[logro.posicion],
                            contexto(logro),
                            fechaLogro(logro),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>

                      {logro.foto_url && (
                        <a
                          href={logro.foto_url}
                          target="_blank"
                          rel="noopener"
                          className={s.logroFoto}
                        >
                          <Image
                            src={logro.foto_url}
                            alt={`Trofeo: ${logro.titulo}`}
                            fill
                            sizes="88px"
                            style={{ objectFit: 'cover' }}
                          />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <div className={s.cierre}>
          <Link href="/equipo" className={s.btnEquipo}>
            Ver todo el equipo →
          </Link>
        </div>
      </div>
    </article>
  );
}
