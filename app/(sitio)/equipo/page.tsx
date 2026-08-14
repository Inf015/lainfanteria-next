import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAjustes, getMiembros, seccionActiva } from '@/lib/datos';
import type { Miembro } from '@/lib/types';
import MiembroCard from './MiembroCard';
import s from './equipo.module.css';

export const metadata: Metadata = {
  title: 'Equipo — La Infantería Motorsport',
  description:
    'Pilotos, socios y equipo técnico de La Infantería Motorsport: quiénes están detrás del taller y de la pista.',
};

/**
 * Orden en que se muestran los grupos. Los roles que no estén acá aparecen
 * después, alfabéticamente: sumar "Jefe de equipo" desde el panel no requiere
 * tocar este archivo.
 */
const ORDEN_ROLES = ['Piloto', 'Socio', 'Mecánico'];

/** Título del bloque para cada rol. Sin entrada, se usa el rol tal cual. */
const TITULOS: Record<string, string> = {
  Piloto: 'Pilotos',
  Socio: 'Socios',
  Mecánico: 'Equipo técnico',
};

const SUBTITULOS: Record<string, string> = {
  Piloto: 'Los que representan a La Infantería en la pista.',
  Socio: 'Los que sostienen el proyecto.',
  Mecánico: 'Los que preparan cada auto antes de competir.',
};

/**
 * Agrupa por rol. Un miembro con varios roles aparece en cada grupo que le
 * corresponde: en un taller chico la misma persona cumple varios papeles y
 * obligarla a elegir uno daría una página incompleta.
 */
function agrupar(miembros: Miembro[]): [string, Miembro[]][] {
  const grupos = new Map<string, Miembro[]>();

  for (const m of miembros) {
    for (const rol of m.roles.length ? m.roles : ['Equipo']) {
      grupos.set(rol, [...(grupos.get(rol) ?? []), m]);
    }
  }

  return [...grupos.entries()].sort(([a], [b]) => {
    const ia = ORDEN_ROLES.indexOf(a);
    const ib = ORDEN_ROLES.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'es');
  });
}

export default async function EquipoPage() {
  if (!(await seccionActiva('equipo'))) notFound();

  const [miembros, ajustes] = await Promise.all([getMiembros(), getAjustes()]);
  const wa = `https://wa.me/${ajustes.whatsapp_numero ?? ''}`;
  const grupos = agrupar(miembros);

  return (
    <>
      <section className={s.pageBanner}>
        <div className={s.sectionContainer}>
          <span className={s.sectionLabel}>QUIÉNES LO HACEN</span>
          <h1 className={s.pageBannerTitle}>
            El <span className={s.accent}>Equipo</span>
          </h1>
          <p className={s.pageBannerSub}>
            Pilotos, socios y técnicos. Los que están detrás del taller y de la pista.
          </p>
        </div>
      </section>

      <section className={s.teamSection}>
        <div className={s.sectionContainer}>
          {miembros.length === 0 ? (
            <div className={s.emptyState}>
              <span className={s.emptyIcon}>🏁</span>
              <h2 className={s.emptyTitle}>Equipo en formación</h2>
              <p className={s.emptyText}>
                Estamos preparando los perfiles del equipo. Muy pronto vas a poder
                conocerlos acá.
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
            grupos.map(([rol, gente]) => (
              <div className={s.grupo} key={rol}>
                <div className={s.grupoCabecera}>
                  <h2 className={s.grupoTitulo}>{TITULOS[rol] ?? rol}</h2>
                  {SUBTITULOS[rol] && (
                    <p className={s.grupoSub}>{SUBTITULOS[rol]}</p>
                  )}
                </div>
                <div className={s.pilotsGrid}>
                  {gente.map((m) => (
                    <MiembroCard miembro={m} key={m.id} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
