import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';

/**
 * Regeneración incremental del sitio público: el HTML se re-genera como mucho
 * cada 60s si hay tráfico. Sin esto lo que se carga desde el panel no
 * aparecería hasta el próximo despliegue.
 */
export const revalidate = 60;

export default function SitioLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <Navbar />
      <main className="page">{children}</main>
      <Footer />
    </>
  );
}
