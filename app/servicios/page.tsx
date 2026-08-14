import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAjustes, seccionActiva } from '@/lib/datos';
import s from './servicios.module.css';

export const metadata: Metadata = {
  title: 'Servicios — La Infantería Motorsport',
  description:
    'Performance, tuning, diagnóstico avanzado, mecánica general y preparación para pista. Todo bajo un mismo techo.',
};

interface Servicio {
  icono: string;
  nombre: string;
  descripcion: string;
}

const servicios: Servicio[] = [
  {
    icono: '⚡',
    nombre: 'Performance & Tuning',
    descripcion:
      'Optimización de motor, ECU tuning, reprogramación de computadora. Extraemos el máximo potencial de tu motor sin comprometer la confiabilidad.',
  },
  {
    icono: '🔧',
    nombre: 'Diagnóstico Avanzado',
    descripcion:
      'Escaneo completo con tecnología de última generación. Identificamos cualquier falla en menos de 24 horas con reporte detallado.',
  },
  {
    icono: '🔩',
    nombre: 'Mecánica General',
    descripcion:
      'Mantenimiento preventivo y correctivo: motor, transmisión, frenos, sistema eléctrico, suspensión y más.',
  },
  {
    icono: '⚙️',
    nombre: 'Modificaciones',
    descripcion:
      'Escapes deportivos, suspensiones ajustables, frenos de alto rendimiento, interiores personalizados.',
  },
  {
    icono: '🏁',
    nombre: 'Track Prep',
    descripcion:
      'Preparación completa para pista: alineación, ajuste de suspensión, cambio de fluidos de alto rendimiento, inspección técnica.',
  },
  {
    icono: '📈',
    nombre: 'Upgrades de Potencia',
    descripcion:
      'Instalación de turbos, superchargers, intercoolers, sistemas de admisión de alto flujo y kits de nitro.',
  },
  {
    icono: '🛡️',
    nombre: 'Protección y Detailing',
    descripcion:
      'Ceramic coating, paint protection film (PPF), lavado detallado y restauración de pintura.',
  },
  {
    icono: '🔌',
    nombre: 'Sistema Eléctrico',
    descripcion:
      'Diagnóstico y reparación del sistema eléctrico, instalación de audio, alarmas y accesorios eléctricos.',
  },
];

const proceso = [
  {
    numero: '01',
    titulo: 'Agenda tu cita',
    descripcion:
      'Llámanos, escríbenos por WhatsApp o usa nuestro formulario. Te confirmamos disponibilidad en minutos.',
  },
  {
    numero: '02',
    titulo: 'Diagnóstico inicial',
    descripcion:
      'Recibimos tu vehículo y realizamos un diagnóstico completo. Te enviamos un reporte detallado antes de comenzar.',
  },
  {
    numero: '03',
    titulo: 'Aprobación',
    descripcion:
      'Te presentamos el presupuesto. Sin sorpresas. Solo comenzamos cuando tú lo apruebas.',
  },
  {
    numero: '04',
    titulo: 'Entrega',
    descripcion:
      'Tu auto listo en el tiempo acordado, con garantía de trabajo y todos los repuestos documentados.',
  },
];

export default async function ServiciosPage() {
  if (!(await seccionActiva('servicios'))) notFound();

  const ajustes = await getAjustes();
  const wa = `https://wa.me/${ajustes.whatsapp_numero ?? ''}`;
  const waAgenda = `${wa}?text=${encodeURIComponent(
    'Hola, quisiera agendar un servicio en el taller.',
  )}`;

  return (
    <>
      <section className={s.pageBanner}>
        <div className={s.sectionContainer}>
          <span className={s.sectionLabel}>LO QUE HACEMOS</span>
          <h1 className={s.pageBannerTitle}>
            Nuestros <span className={s.accent}>Servicios</span>
          </h1>
          <p className={s.pageBannerSub}>
            Desde diagnóstico express hasta modificaciones extremas. Todo bajo un mismo
            techo.
          </p>
        </div>
      </section>

      <section className={s.servicesPage}>
        <div className={s.sectionContainer}>
          <div className={s.servicesFullGrid}>
            {servicios.map((serv) => (
              <div className={s.serviceFullCard} key={serv.nombre}>
                <div className={s.serviceIconLg}>{serv.icono}</div>
                <div className={s.serviceBody}>
                  <h3>{serv.nombre}</h3>
                  <p>{serv.descripcion}</p>
                  <a
                    href={`${wa}?text=${encodeURIComponent(
                      `Hola, quisiera consultar por el servicio de ${serv.nombre}.`,
                    )}`}
                    target="_blank"
                    rel="noopener"
                    className={s.linkWhatsapp}
                  >
                    CONSULTAR →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.process}>
        <div className={s.sectionContainer}>
          <div className={s.sectionHeader}>
            <span className={s.sectionLabel}>CÓMO TRABAJAMOS</span>
            <h2 className={s.sectionTitle}>
              Simple, rápido y <span className={s.accent}>transparente</span>
            </h2>
          </div>
          <div className={s.processGrid}>
            {proceso.map((paso) => (
              <div className={s.processStep} key={paso.numero}>
                <span className={s.stepNumber}>{paso.numero}</span>
                <h4>{paso.titulo}</h4>
                <p>{paso.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.cta}>
        <div className={s.sectionContainer}>
          <div className={s.ctaContent}>
            <div className={s.heroTag}>
              <span className={s.tagDot} />
              AGENDA AHORA
            </div>
            <h2 className={s.ctaTitle}>
              ¿Listo para llevar tu auto al
              <br />
              <span className={s.accent}>siguiente nivel</span>?
            </h2>
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
    </>
  );
}
