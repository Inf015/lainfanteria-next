import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import './globals.css';

/**
 * Regeneración incremental: las páginas se re-generan como mucho cada 60s si
 * hay tráfico. Sin esto el HTML se congela en el momento del deploy y lo que
 * se carga desde el panel de Supabase (autos, pilotos, secciones, ajustes) no
 * aparecería hasta el próximo despliegue.
 *
 * El costo es que un cambio puede tardar hasta un minuto en verse. Para un
 * sitio de contenido es un intercambio conveniente: se sirve HTML cacheado y
 * no se consulta la base en cada visita.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'La Infantería Motorsport',
  description:
    'Taller mecánico especializado en autos americanos y equipo de competición. Servicios, venta de autos y merch oficial.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main className="page">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
