import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'La Infantería Motorsport',
  description:
    'Taller mecánico especializado en autos americanos y equipo de competición. Servicios, venta de autos y merch oficial.',
};

/**
 * En el móvil la barra del navegador se tiñe con este color: sin él queda blanca
 * o gris sobre un sitio negro, con una costura muy visible arriba de la pantalla.
 * Es el mismo negro de la navbar (--color-navbar), que es lo que queda debajo.
 */
export const viewport: Viewport = {
  themeColor: '#0a0a0a',
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
