import type { Metadata } from 'next';
import Link from 'next/link';
import s from '../../../admin.module.css';

export const metadata: Metadata = {
  title: 'Sin acceso — Panel La Infantería',
  robots: { index: false, follow: false },
};

/**
 * Para cuentas con sesión válida pero que no están en `admins`. Tener usuario
 * en Supabase no implica tener acceso al panel.
 */
export default function SinAccesoPage() {
  return (
    <div className={s.loginWrap}>
      <div className={s.loginCard}>
        <h1 className={s.loginTitulo}>Sin acceso</h1>
        <p className={s.loginSub}>
          Tu cuenta existe pero no está autorizada para entrar al panel. Pedile al
          administrador que te agregue.
        </p>
        <Link href="/" className={s.btnPrimario} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          VOLVER AL SITIO
        </Link>
      </div>
    </div>
  );
}
