import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAjustes, seccionActiva } from '@/lib/datos';
import s from './nosotros.module.css';

export const metadata: Metadata = {
  title: 'Nosotros — La Infantería Motorsport',
  description:
    'Taller de mecánica de alto rendimiento y equipo de carreras en República Dominicana. Especialistas en American Muscle y drag racing.',
};

const valores = [
  {
    icono: '⚙',
    titulo: 'Precisión técnica',
    texto:
      'Cada intervención es ejecutada con el mismo estándar que le exigiríamos a un auto de competencia. Sin atajos, sin medias tintas.',
  },
  {
    icono: '💪',
    titulo: 'Pasión por el rendimiento',
    texto:
      'No somos un taller ordinario. Vivimos el motorsport. Eso se siente en cada tornillo que apretamos y en cada segundo que le quitamos al tiempo de reacción.',
  },
  {
    icono: '🤝',
    titulo: 'Confianza y transparencia',
    texto:
      'Te explicamos qué le pasa a tu auto, qué hay que hacer y cuánto cuesta. Sin sorpresas en la factura ni trabajo innecesario.',
  },
  {
    icono: '🇩🇴',
    titulo: 'Orgullo dominicano',
    texto:
      'Somos dominicanos compitiendo al más alto nivel. Representamos al país en cada pista donde ponemos un auto.',
  },
];

const numeros = [
  { valor: '10', extra: '+', label: 'Años de experiencia' },
  { valor: '500', extra: '+', label: 'Autos intervenidos' },
  { valor: '12', extra: '', label: 'Campeonatos ganados' },
  { valor: '100', extra: '%', label: 'Compromiso con el cliente' },
];

const historiaCards = [
  { num: '01', txt: 'Taller de mecánica de alto rendimiento' },
  { num: '02', txt: 'Equipo de competencia en drag racing' },
  { num: '03', txt: 'Comunidad de amantes del American Muscle' },
];

const tallerLista = [
  'Diagnóstico computarizado',
  'Tuning de motor y ECU',
  'Preparación para drag racing',
  'Suspensión y frenos de alto rendimiento',
  'Sistemas de escape personalizados',
  'Venta de autos modificados',
];

export default async function NosotrosPage() {
  if (!(await seccionActiva('nosotros'))) notFound();

  const ajustes = await getAjustes();
  const wa = `https://wa.me/${ajustes.whatsapp_numero ?? ''}`;

  return (
    <>
      <section className={`${s.pageBanner} ${s.nosotrosBanner}`}>
        <div className={s.sectionContainer}>
          <span className={s.sectionLabel}>■ QUIÉNES SOMOS</span>
          <h1 className={s.pageBannerTitle}>
            La <span className={s.accent}>Infantería</span>
          </h1>
          <p className={s.pageBannerSub}>
            El taller de mecánica de alto rendimiento y equipo de carreras más apasionado
            de la República Dominicana.
          </p>
        </div>
      </section>

      <section className={s.nosotrosHistoria}>
        <div className={`${s.sectionContainer} ${s.historiaGrid}`}>
          <div className={s.historiaTexto}>
            <span className={s.sectionLabel}>NUESTRA HISTORIA</span>
            <h2 className={s.sectionTitle}>
              Nacidos del <span className={s.accent}>motor</span>
            </h2>
            <p>
              La Infantería Motorsport nació de una pasión genuina por los autos
              americanos de alto rendimiento. Lo que comenzó como un grupo de amigos con
              las manos llenas de grasa y los oídos llenos de caballos de fuerza, se
              convirtió en el taller de referencia para quienes buscan lo mejor en
              rendimiento y competencia en la isla.
            </p>
            <p>
              Desde nuestros inicios, combinamos la cultura del <em>American Muscle</em>{' '}
              con la disciplina del racing dominicano, compitiendo en pistas y ganando el
              respeto de la comunidad motorsport del país.
            </p>
            <p>Hoy somos taller, equipo de competencia y comunidad. Todo bajo un mismo techo.</p>
          </div>
          <div className={s.historiaVisual}>
            <div className={s.historiaCardStack}>
              {historiaCards.map((c) => (
                <div className={s.hcard} key={c.num}>
                  <span className={s.hcardNum}>{c.num}</span>
                  <span className={s.hcardTxt}>{c.txt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={s.nosotrosNumeros}>
        <div className={s.sectionContainer}>
          <div className={s.numerosGrid}>
            {numeros.map((n) => (
              <div className={s.numeroItem} key={n.label}>
                <span className={s.numeroVal}>
                  {n.valor}
                  {n.extra && <span className={s.numeroPlus}>{n.extra}</span>}
                </span>
                <span className={s.numeroLbl}>{n.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.nosotrosValores}>
        <div className={s.sectionContainer}>
          <div className={s.sectionHeader}>
            <span className={s.sectionLabel}>LO QUE NOS MUEVE</span>
            <h2 className={s.sectionTitle}>
              Nuestros <span className={s.accent}>valores</span>
            </h2>
          </div>
          <div className={s.valoresGrid}>
            {valores.map((v) => (
              <div className={s.valorCard} key={v.titulo}>
                <div className={s.valorIcon}>{v.icono}</div>
                <h3>{v.titulo}</h3>
                <p>{v.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.nosotrosTaller}>
        <div className={`${s.sectionContainer} ${s.tallerGrid}`}>
          <div className={s.tallerInfo}>
            <span className={s.sectionLabel}>EL TALLER</span>
            <h2 className={s.sectionTitle}>
              Equipados para <span className={s.accent}>ganar</span>
            </h2>
            <p>
              Nuestras instalaciones cuentan con el equipo necesario para diagnóstico de
              alta precisión, modificaciones de motor, suspensión, transmisión y sistemas
              de escape. Atendemos muscle cars americanos, imports y cualquier vehículo
              que merezca más de lo que le dieron en fábrica.
            </p>
            <ul className={s.tallerLista}>
              {tallerLista.map((item) => (
                <li key={item}>
                  <span className={s.listaCheck}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/servicios" className={s.btnVerServicios}>
              Ver todos los servicios →
            </Link>
          </div>
          <div className={s.tallerDeco}>
            <div className={s.tallerDecoInner}>
              <div className={s.decoStripe} />
              <div className={s.decoText}>
                <span className={s.decoBig}>HIGH</span>
                <span className={`${s.decoBig} ${s.accent}`}>PERFORMANCE</span>
                <span className={s.decoSub}>Mechanical &amp; Racing</span>
              </div>
              <div className={s.decoStripe} />
            </div>
          </div>
        </div>
      </section>

      <section className={s.nosotrosCta}>
        <div className={s.sectionContainer}>
          <div className={s.ctaBox}>
            <div className={s.ctaContent}>
              <h2>
                ¿Tienes un <span className={s.accent}>proyecto</span> en mente?
              </h2>
              <p>
                Cuéntanos qué quieres hacer con tu auto. Agenda una visita al taller o
                escríbenos por WhatsApp y te damos una evaluación sin compromiso.
              </p>
            </div>
            <div className={s.ctaActions}>
              <a href={wa} target="_blank" rel="noopener" className={s.btnCtaWa}>
                💬 WhatsApp
              </a>
              <Link href="/servicios" className={s.btnCtaServicios}>
                Ver servicios
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
