import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAjustes, getProductos, seccionActiva } from '@/lib/datos';
import MerchGrid from './MerchGrid';
import s from './merch.module.css';

export const metadata: Metadata = {
  title: 'Merch — La Infantería Motorsport',
  description:
    'Merch oficial de La Infantería Motorsport. Hoodies, camisetas, gorras y accesorios.',
};

export default async function MerchPage() {
  if (!(await seccionActiva('merch'))) notFound();

  const [productos, ajustes] = await Promise.all([getProductos(), getAjustes()]);
  const numero = ajustes.whatsapp_numero ?? '';

  return (
    <>
      <section className={s.pageBanner}>
        <div className={s.sectionContainer}>
          <span className={s.sectionLabel}>■ TIENDA OFICIAL</span>
          <h1 className={s.pageBannerTitle}>
            Merch <span className={s.accent}>exclusivo</span>
          </h1>
          <p className={s.pageBannerSub}>
            Llevá el espíritu motorsport con vos. Productos de calidad premium con
            diseños del equipo.
          </p>
          <div className={s.bannerNota}>
            <span>💬</span> Los pedidos se coordinan por WhatsApp
          </div>
        </div>
      </section>

      <section className={s.seccion}>
        <div className={s.sectionContainer}>
          {productos.length === 0 ? (
            <div className={s.vacio}>
              <span className={s.vacioIcono}>👕</span>
              <h2 className={s.vacioTitulo}>Merch en camino</h2>
              <p className={s.vacioTexto}>
                Estamos preparando la primera tanda. Escribinos si querés que te avisemos
                cuando esté disponible.
              </p>
              <a
                href={`https://wa.me/${numero}?text=${encodeURIComponent(
                  'Hola, quisiera que me avisen cuando salga el merch.',
                )}`}
                target="_blank"
                rel="noopener"
                className={s.btnWaOutline}
              >
                💬 Avisame cuando salga
              </a>
            </div>
          ) : (
            <MerchGrid productos={productos} whatsappNumero={numero} />
          )}
        </div>
      </section>
    </>
  );
}
