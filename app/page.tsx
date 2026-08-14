import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Image from 'next/image';
import Link from 'next/link';
import {
  getAjustes,
  getAutos,
  getNoticias,
  getProductos,
  seccionActiva,
} from '@/lib/datos';
import type { AutoConFotos, Moneda } from '@/lib/types';
import s from './home.module.css';

/**
 * Devuelve la ruta pública de la foto si el archivo existe, o null.
 *
 * Así basta con dejar el .jpg en public/images para que la tarjeta lo muestre,
 * sin tocar código. El Blazor apuntaba a estos mismos nombres sin verificar y
 * pedía tres archivos inexistentes en cada carga.
 */
function fotoSiExiste(archivo: string): string | null {
  return existsSync(join(process.cwd(), 'public', 'images', archivo))
    ? `/images/${archivo}`
    : null;
}

const especializaciones = [
  {
    archivo: 'car-mustang.jpg',
    nombre: 'Mustang',
    descripcion:
      'Dominamos cada generación, desde clásicos hasta el último GT500. Performance, tuning y modificaciones.',
  },
  {
    archivo: 'car-camaro.jpg',
    nombre: 'Camaro',
    descripcion:
      'Potencia y estilo americano en su máxima expresión. Desde el SS hasta el ZL1, lo manejamos todo.',
  },
  {
    archivo: 'car-corvette.jpg',
    nombre: 'Corvette',
    descripcion:
      'El ícono americano por excelencia. Diagnóstico, tuning y upgrades desde el C4 hasta el C8.',
  },
];

const servicios = [
  {
    icono: '⚡',
    nombre: 'Performance',
    descripcion:
      'Optimización de motor, ECU tuning, mejoras de potencia y torque para máximo rendimiento.',
  },
  {
    icono: '🔧',
    nombre: 'Diagnóstico',
    descripcion:
      'Escaneo completo con tecnología de punta. Identificamos problemas en menos de 24 horas.',
  },
  {
    icono: '🔩',
    nombre: 'Mecánica General',
    descripcion:
      'Mantenimiento preventivo, reparaciones de motor, transmisión y sistema eléctrico.',
  },
  {
    icono: '⚙️',
    nombre: 'Modificaciones',
    descripcion: 'Escapes deportivos, suspensiones, frenos de alto rendimiento y más.',
  },
  {
    icono: '🏁',
    nombre: 'Track Prep',
    descripcion:
      'Preparación para pista: ajustes de suspensión, cambios de fluidos, inspección completa.',
  },
  {
    icono: '📈',
    nombre: 'Upgrades',
    descripcion:
      'Turbos, superchargers, intercoolers y sistemas de admisión de alto flujo.',
  },
];

const stats = [
  { valor: '15+', label: 'Años de experiencia' },
  { valor: '500+', label: 'Autos intervenidos' },
  { valor: '100%', label: 'Clientes satisfechos' },
  { valor: '24h', label: 'Diagnóstico express' },
];

function precio(monto: number, moneda: Moneda) {
  const simbolo = moneda === 'USD' ? 'US$' : 'RD$';
  return `${simbolo} ${new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 }).format(monto)}`;
}

function nombreAuto(a: AutoConFotos) {
  return `${a.marca} ${a.modelo}`;
}

export default async function Home() {
  const [ajustes, autosOn, merchOn, noticiasOn] = await Promise.all([
    getAjustes(),
    seccionActiva('autos'),
    seccionActiva('merch'),
    seccionActiva('noticias'),
  ]);

  // Solo se consulta lo que se va a mostrar
  const [autos, productos, noticias] = await Promise.all([
    autosOn ? getAutos() : Promise.resolve([]),
    merchOn ? getProductos(4) : Promise.resolve([]),
    noticiasOn ? getNoticias(3) : Promise.resolve([]),
  ]);

  const numero = ajustes.whatsapp_numero ?? '';
  const wa = `https://wa.me/${numero}`;
  const waAgenda = `${wa}?text=${encodeURIComponent(
    'Hola, quisiera agendar un servicio en el taller.',
  )}`;
  const telefono = ajustes.telefono;

  return (
    <>
      {/* ─── HERO ─── */}
      <section className={s.hero}>
        <div className={s.heroOverlay}>
          <div className={s.heroContent}>
            <div className={s.heroTag}>
              <span className={s.tagDot} />
              HIGH PERFORMANCE / AMERICAN MUSCLE
            </div>

            <h1 className={s.heroTitle}>
              El taller de los
              <br />
              autos americanos
              <br />
              <span className={s.accent}>más rápidos</span>
              <br />
              del país
            </h1>

            <div className={s.heroFeatures}>
              <span>› Diagnóstico rápido</span>
              <span>› Alto rendimiento</span>
              <span>› Experiencia comprobada</span>
            </div>

            <div className={s.heroButtons}>
              <a
                href={waAgenda}
                target="_blank"
                rel="noopener"
                className={s.btnHeroPrimary}
              >
                📅 AGENDA TU SERVICIO ›
              </a>
              <a href={wa} target="_blank" rel="noopener" className={s.btnHeroSecondary}>
                💬 WHATSAPP DIRECTO ›
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── QUIÉNES SOMOS ─── */}
      <section className={s.about}>
        <div className={s.aboutContainer}>
          <div className={s.aboutImage}>
            <Image
              src="/images/about-tools.jpg"
              alt="Taller La Infantería"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
            />
          </div>

          <div className={s.aboutContent}>
            <span className={s.sectionLabel}>QUIÉNES SOMOS</span>
            <h2 className={s.aboutTitle}>
              Velocidad, precisión y
              <br />
              <span className={s.accent}>dominio técnico</span>
            </h2>
            <p>
              Somos el taller especializado en autos americanos de alto rendimiento más
              rápido del país. Con más de 15 años de experiencia, dominamos cada detalle
              de los muscle cars más icónicos.
            </p>
            <p>
              Nuestro equipo de especialistas combina pasión por el motorsport con
              tecnología de punta para entregar servicios de performance, diagnóstico y
              modificaciones que superan expectativas.
            </p>

            <div className={s.aboutStats}>
              {stats.map((st) => (
                <div className={s.statItem} key={st.label}>
                  <span className={s.statValue}>{st.valor}</span>
                  <span className={s.statLabel}>{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ESPECIALIZACIÓN ─── */}
      <section className={s.specialization}>
        <div className={s.sectionContainer}>
          <div className={s.sectionHeader}>
            <span className={s.sectionLabel}>ESPECIALIZACIÓN</span>
            <h2 className={s.sectionTitle}>
              Expertos en autos <span className={s.accent}>americanos</span>
            </h2>
            <p className={s.sectionSubtitle}>
              Cada marca tiene su carácter. Nosotros conocemos cada detalle.
            </p>
          </div>

          <div className={s.carsGrid}>
            {especializaciones.map((e) => {
              const foto = fotoSiExiste(e.archivo);
              return (
              <div className={s.carCard} key={e.nombre}>
                <div className={s.carImageWrap}>
                  {foto ? (
                    <Image
                      src={foto}
                      alt={e.nombre}
                      fill
                      sizes="(max-width: 768px) 82vw, 33vw"
                      style={{ objectFit: 'cover', filter: 'brightness(0.75)' }}
                    />
                  ) : (
                    <div className={s.carPlaceholder}>
                      <span>{e.nombre.toUpperCase()}</span>
                    </div>
                  )}
                  <span className={s.cardBadge}>ESPECIALIDAD</span>
                </div>
                <div className={s.carInfo}>
                  <span className={s.carCategory}>NUESTRA ESPECIALIDAD</span>
                  <h3 className={s.carName}>{e.nombre}</h3>
                  <p className={s.carDesc}>{e.descripcion}</p>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SERVICIOS ─── */}
      <section className={s.services}>
        <div className={s.sectionContainer}>
          <div className={s.sectionHeader}>
            <span className={s.sectionLabel}>SERVICIOS</span>
            <h2 className={s.sectionTitle}>
              Todo lo que tu <span className={s.accent}>Auto</span> necesita
            </h2>
            <p className={s.sectionSubtitle}>
              Desde diagnóstico express hasta modificaciones extremas de performance
            </p>
          </div>

          <div className={s.servicesGrid}>
            {servicios.map((serv) => (
              <div className={s.serviceCard} key={serv.nombre}>
                <div className={s.serviceIcon}>{serv.icono}</div>
                <h3>{serv.nombre}</h3>
                <p>{serv.descripcion}</p>
              </div>
            ))}
          </div>

          <div className={s.servicesFooter}>
            <p>
              ¿No encuentras lo que buscas? Consúltanos, tenemos soluciones
              personalizadas.
            </p>
            <a href={wa} target="_blank" rel="noopener" className={s.linkWhatsapp}>
              CONSULTA POR WHATSAPP →
            </a>
          </div>
        </div>
      </section>

      {/* ─── MERCH (solo si la sección está activa) ─── */}
      {merchOn && (
        <section className={s.merch}>
          <div className={s.sectionContainer}>
            <div className={s.blockHeader}>
              <div>
                <span className={s.sectionLabel}>TIENDA OFICIAL</span>
                <h2 className={s.sectionTitle}>
                  Merch <span className={s.accent}>exclusivo</span>
                </h2>
                <p className={s.sectionSubtitle}>
                  Lleva el espíritu motorsport contigo. Productos de calidad premium con
                  diseños únicos.
                </p>
              </div>
              <Link href="/merch" className={s.linkWhatsapp}>
                VER TIENDA →
              </Link>
            </div>

            {productos.length > 0 ? (
              <div className={s.merchGrid}>
                {productos.map((p) => {
                  const foto = p.producto_fotos[0];
                  return (
                    <div className={s.merchCard} key={p.id}>
                      <div className={s.merchImageWrap}>
                        {foto ? (
                          <Image
                            src={foto.url}
                            alt={p.nombre}
                            fill
                            sizes="(max-width: 768px) 72vw, 25vw"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div className={s.imgPlaceholder}>📷</div>
                        )}
                        <span className={s.cardBadge}>⭐ TOP</span>
                      </div>
                      <div className={s.merchInfo}>
                        <span className={s.merchCategory}>
                          {p.categoria?.toUpperCase() ?? 'MERCH'}
                        </span>
                        <h3 className={s.merchName}>{p.nombre}</h3>
                        <p className={s.merchPrice}>{precio(p.precio, p.moneda)}</p>
                        <a
                          href={`${wa}?text=${encodeURIComponent(
                            `Hola! Me interesa el producto ${p.nombre}.`,
                          )}`}
                          target="_blank"
                          rel="noopener"
                          className={s.btnConsultar}
                        >
                          💬 CONSULTAR
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={s.emptyHint}>
                Próximamente — productos disponibles en tienda.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ─── AUTOS DISPONIBLES ─── */}
      {autosOn && (
        <section className={s.inventory}>
          <div className={s.sectionContainer}>
            <div className={s.blockHeader}>
              <div>
                <span className={s.sectionLabel}>INVENTARIO EXCLUSIVO</span>
                <h2 className={s.sectionTitle}>
                  Autos <span className={s.accent}>disponibles</span>
                </h2>
                <p className={s.sectionSubtitle}>
                  Muscle cars certificados y listos para rodar. Inspección completa y
                  garantía incluida.
                </p>
              </div>
              <Link href="/autos" className={s.linkWhatsapp}>
                VER TODOS →
              </Link>
            </div>

            {autos.length > 0 ? (
              <div className={s.carsGrid}>
                {autos.slice(0, 3).map((auto) => {
                  const foto = auto.auto_fotos[0];
                  return (
                    <div className={s.inventoryCard} key={auto.id}>
                      <div className={s.inventoryImageWrap}>
                        {foto ? (
                          <Image
                            src={foto.url}
                            alt={nombreAuto(auto)}
                            fill
                            sizes="(max-width: 768px) 82vw, 33vw"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div className={s.imgPlaceholder}>📷</div>
                        )}
                        <span className={s.cardBadge}>DESTACADO</span>
                      </div>
                      <div className={s.inventoryInfo}>
                        <h3 className={s.inventoryName}>{nombreAuto(auto)}</h3>
                        <span className={s.inventoryYear}>{auto.anio ?? ''}</span>
                        <div className={s.inventorySpecs}>
                          {auto.motor && <span>⚙️ {auto.motor}</span>}
                          {auto.kilometraje && <span>📍 {auto.kilometraje}</span>}
                        </div>
                        <p className={s.inventoryPrice}>
                          {precio(auto.precio, auto.moneda)}
                        </p>
                        <a
                          href={`${wa}?text=${encodeURIComponent(
                            `Hola! Me interesa el ${nombreAuto(auto)}. ¿Está disponible?`,
                          )}`}
                          target="_blank"
                          rel="noopener"
                          className={s.btnConsultar}
                        >
                          💬 CONSULTAR
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={s.emptyHint}>Próximamente — nuevas unidades disponibles.</p>
            )}
          </div>
        </section>
      )}

      {/* ─── NOTICIAS (solo si la sección está activa) ─── */}
      {noticiasOn && (
        <section className={s.news}>
          <div className={s.sectionContainer}>
            <div className={s.blockHeader}>
              <div>
                <span className={s.sectionLabel}>ÚLTIMAS NOTICIAS</span>
                <h2 className={s.sectionTitle}>
                  Últimas <span className={s.accent}>noticias</span>
                </h2>
                <p className={s.sectionSubtitle}>
                  Resultados, novedades y todo lo que pasa en La Infantería.
                </p>
              </div>
              <Link href="/noticias" className={s.linkWhatsapp}>
                VER TODAS →
              </Link>
            </div>

            {noticias.length > 0 ? (
              <div className={s.newsGrid}>
                {noticias.map((n) => (
                  <article className={s.newsCard} key={n.id}>
                    {n.imagen_portada_url && (
                      <div className={s.newsImageWrap}>
                        <Image
                          src={n.imagen_portada_url}
                          alt={n.titulo}
                          fill
                          sizes="(max-width: 768px) 82vw, 33vw"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div className={s.newsBody}>
                      <span className={s.newsCategory}>
                        {n.categoria?.toUpperCase() ?? 'NOTICIAS'}
                      </span>
                      <h3 className={s.newsTitle}>{n.titulo}</h3>
                      {n.resumen && <p className={s.newsExcerpt}>{n.resumen}</p>}
                      <span className={s.newsDate}>
                        {n.fecha_publicacion
                          ? new Date(n.fecha_publicacion).toLocaleDateString('es-DO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className={s.emptyHint}>
                Próximamente — las últimas noticias del equipo.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section className={s.cta}>
        <div className={s.sectionContainer}>
          <div className={s.ctaContent}>
            <div className={s.heroTag} style={{ margin: '0 auto' }}>
              <span className={s.tagDot} />
              AGENDA AHORA
            </div>
            <h2 className={s.ctaTitle}>
              ¿Listo para llevar tu auto al
              <br />
              <span className={s.accent}>siguiente nivel</span>?
            </h2>
            <p className={s.ctaSubtitle}>
              Agenda tu servicio o contáctanos por WhatsApp. Diagnóstico en menos de 24
              horas.
            </p>
            <div className={s.heroButtons} style={{ justifyContent: 'center' }}>
              <a
                href={waAgenda}
                target="_blank"
                rel="noopener"
                className={s.btnHeroPrimary}
              >
                📅 AGENDA TU SERVICIO ›
              </a>
              <a href={wa} target="_blank" rel="noopener" className={s.btnHeroSecondary}>
                💬 WHATSAPP DIRECTO ›
              </a>
            </div>
            {telefono && (
              <div className={s.ctaPhone}>
                <p>O llámanos directamente:</p>
                <a href={`tel:${telefono}`}>{telefono}</a>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
