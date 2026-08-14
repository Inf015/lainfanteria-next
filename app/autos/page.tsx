import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAjustes, getAutos, seccionActiva } from '@/lib/datos';
import AutosGrid from './AutosGrid';
import s from './autos.module.css';

export const metadata: Metadata = {
  title: 'Venta de Autos — La Infantería Motorsport',
  description:
    'Inventario de autos de alto rendimiento modificados por La Infantería Motorsport.',
};

export default async function AutosPage() {
  if (!(await seccionActiva('autos'))) notFound();

  const [autos, ajustes] = await Promise.all([getAutos(), getAjustes()]);
  const numero = ajustes.whatsapp_numero ?? '';

  const disponibles = autos.filter((a) => a.estado === 'disponible').length;
  const reservados = autos.filter((a) => a.estado === 'reservado').length;

  return (
    <>
      <section className={s.pageBanner}>
        <div className={s.sectionContainer}>
          <span className={s.sectionLabel}>■ INVENTARIO</span>
          <h1 className={s.pageBannerTitle}>
            Venta de <span className={s.accent}>Autos</span>
          </h1>
          <p className={s.pageBannerSub}>
            Autos de alto rendimiento modificados por nuestro equipo. Contacta
            directamente para hacer tu oferta.
          </p>
          {autos.length > 0 && (
            <div className={s.bannerStats}>
              <span>
                <strong>{disponibles}</strong> disponibles
              </span>
              {reservados > 0 && (
                <>
                  <span className={s.statSep}>·</span>
                  <span>
                    <strong>{reservados}</strong> reservados
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className={s.autosSection}>
        <div className={s.sectionContainer}>
          {autos.length === 0 ? (
            <div className={s.autosEmpty}>
              <div className={s.emptyIcon}>🚗</div>
              <h3>Sin autos en inventario</h3>
              <p>
                No hay autos disponibles en este momento. Contáctanos para consultar
                disponibilidad o contarnos qué estás buscando.
              </p>
              <a
                href={`https://wa.me/${numero}?text=${encodeURIComponent(
                  'Hola, quisiera consultar por disponibilidad de autos.',
                )}`}
                target="_blank"
                rel="noopener"
                className={s.btnWaOutline}
              >
                💬 Consultar por WhatsApp
              </a>
            </div>
          ) : (
            <AutosGrid autos={autos} whatsappNumero={numero} />
          )}
        </div>
      </section>
    </>
  );
}
