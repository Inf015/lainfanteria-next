import type { Metadata } from 'next';
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import s from '../../admin.module.css';

export const metadata: Metadata = {
  title: 'Panel — La Infantería',
  robots: { index: false, follow: false },
};

/** Cuenta filas de una tabla sin traerlas. */
async function contar(tabla: string, filtro?: (q: never) => never) {
  const db = await crearClienteServidor();
  const { count } = await db.from(tabla).select('*', { count: 'exact', head: true });
  void filtro;
  return count ?? 0;
}

export default async function PanelPage() {
  const [autos, miembros, productos, noticias] = await Promise.all([
    contar('autos'),
    contar('miembros'),
    contar('productos'),
    contar('noticias'),
  ]);

  const secciones = [
    {
      href: '/admin/autos',
      icono: '🚗',
      titulo: 'Autos',
      desc: 'Inventario en venta, con fotos y estado.',
      conteo: `${autos} cargado${autos === 1 ? '' : 's'}`,
    },
    {
      href: '/admin/miembros',
      icono: '🏁',
      titulo: 'Equipo',
      desc: 'Pilotos, socios y técnicos.',
      conteo: `${miembros} cargado${miembros === 1 ? '' : 's'}`,
    },
    {
      href: '/admin/productos',
      icono: '👕',
      titulo: 'Merch',
      desc: 'Productos, tallas y colores.',
      conteo: `${productos} cargado${productos === 1 ? '' : 's'}`,
    },
    {
      href: '/admin/noticias',
      icono: '📰',
      titulo: 'Noticias',
      desc: 'Novedades y resultados del equipo.',
      conteo: `${noticias} cargada${noticias === 1 ? '' : 's'}`,
    },
    {
      href: '/admin/secciones',
      icono: '🔀',
      titulo: 'Secciones',
      desc: 'Prender y apagar partes del sitio.',
      conteo: 'Configuración',
    },
    {
      href: '/admin/ajustes',
      icono: '⚙️',
      titulo: 'Ajustes',
      desc: 'WhatsApp, contacto y redes del footer.',
      conteo: 'Configuración',
    },
  ];

  return (
    <>
      <div className={s.encabezado}>
        <div>
          <h1 className={s.titulo}>Panel</h1>
          <p className={s.subtitulo}>
            Los cambios aparecen en el sitio en menos de un minuto.
          </p>
        </div>
      </div>

      <div className={s.tarjetas}>
        {secciones.map((sec) => (
          <Link href={sec.href} key={sec.href} className={s.tarjeta}>
            <span className={s.tarjetaIcono}>{sec.icono}</span>
            <h2 className={s.tarjetaTitulo}>{sec.titulo}</h2>
            <p className={s.tarjetaDesc}>{sec.desc}</p>
            <span className={s.tarjetaConteo}>{sec.conteo}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
