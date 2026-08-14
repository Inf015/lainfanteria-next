import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'La Infantería Motorsport',
  description:
    'Taller mecánico especializado en autos americanos y equipo de competición. Servicios, venta de autos y merch oficial.',
};

/**
 * Layout raíz: solo el documento. El sitio público y el backoffice tienen
 * cada uno su propio layout en su grupo de rutas — uno con navbar y footer y
 * regeneración cada 60s, el otro con la barra del panel y render dinámico.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
