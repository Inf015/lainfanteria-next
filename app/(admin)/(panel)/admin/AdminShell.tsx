'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import s from '../../admin.module.css';

const SECCIONES = [
  { href: '/admin', label: 'Inicio' },
  { href: '/admin/autos', label: 'Autos' },
  { href: '/admin/pilotos', label: 'Pilotos' },
  { href: '/admin/productos', label: 'Merch' },
  { href: '/admin/noticias', label: 'Noticias' },
  { href: '/admin/secciones', label: 'Secciones' },
  { href: '/admin/ajustes', label: 'Ajustes' },
];

export default function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const ruta = usePathname();

  async function salir() {
    await crearClienteNavegador().auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className={s.shell}>
      <header className={s.topbar}>
        <Link href="/admin" className={s.marca}>
          LA INFANTERÍA <span>· PANEL</span>
        </Link>

        <nav className={s.nav}>
          {SECCIONES.map((sec) => {
            const activo =
              sec.href === '/admin' ? ruta === '/admin' : ruta.startsWith(sec.href);
            return (
              <Link
                key={sec.href}
                href={sec.href}
                className={`${s.navLink} ${activo ? s.navLinkActivo : ''}`}
              >
                {sec.label}
              </Link>
            );
          })}
        </nav>

        <div className={s.userBox}>
          <Link href="/" className={s.verSitio} target="_blank">
            Ver sitio ↗
          </Link>
          <span className={s.userEmail}>{email}</span>
          <button className={s.btnSalir} onClick={salir}>
            Salir
          </button>
        </div>
      </header>

      <div className={s.contenido}>{children}</div>
    </div>
  );
}
