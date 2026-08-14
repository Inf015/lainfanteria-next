import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAjustes, getPilotos, seccionActiva } from '@/lib/datos';
import PilotoCard from './PilotoCard';
import s from './equipo.module.css';

export const metadata: Metadata = {
  title: 'Equipo — La Infantería Motorsport',
  description: 'Los pilotos que representan a La Infantería Motorsport en la pista.',
};

export default async function EquipoPage() {
  if (!(await seccionActiva('equipo'))) notFound();

  const [pilotos, ajustes] = await Promise.all([getPilotos(), getAjustes()]);
  const wa = `https://wa.me/${ajustes.whatsapp_numero ?? ''}`;

  return (
    <>
      <section className={s.pageBanner}>
        <div className={s.sectionContainer}>
          <span className={s.sectionLabel}>NUESTROS PILOTOS</span>
          <h1 className={s.pageBannerTitle}>
            El <span className={s.accent}>Equipo</span>
          </h1>
          <p className={s.pageBannerSub}>
            Los pilotos que representan a La Infantería en la pista.
          </p>
        </div>
      </section>

      <section className={s.teamSection}>
        <div className={s.sectionContainer}>
          {pilotos.length === 0 ? (
            <div className={s.emptyState}>
              <span className={s.emptyIcon}>🏁</span>
              <h2 className={s.emptyTitle}>Equipo en formación</h2>
              <p className={s.emptyText}>
                Estamos preparando los perfiles de nuestros pilotos. Muy pronto vas a
                poder conocerlos acá.
              </p>
              <a
                href={`${wa}?text=${encodeURIComponent(
                  'Hola, quisiera información sobre el equipo de La Infantería.',
                )}`}
                target="_blank"
                rel="noopener"
                className={s.emptyCta}
              >
                💬 CONSULTAR POR EL EQUIPO
              </a>
            </div>
          ) : (
            <div className={s.pilotsGrid}>
              {pilotos.map((p) => (
                <PilotoCard piloto={p} key={p.id} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
