import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import './globals.css';

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
