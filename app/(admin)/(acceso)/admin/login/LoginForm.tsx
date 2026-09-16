'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import { rutaAdminSegura } from '@/lib/rutas';
import s from '../../../admin.module.css';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const db = crearClienteNavegador();
    const { data, error: errLogin } = await db.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (errLogin) {
      // Mensaje genérico a propósito: distinguir "no existe" de "clave
      // incorrecta" le confirma a un atacante qué correos están registrados.
      setError('Correo o contraseña incorrectos.');
      setCargando(false);
      return;
    }

    // Estar logueado no alcanza: hay que estar en `admins`. Si no, se cierra
    // la sesión en el acto para no dejar una cuenta a medio entrar.
    const { data: admin } = await db
      .from('admins')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!admin) {
      await db.auth.signOut();
      setError('Esta cuenta no tiene acceso al panel.');
      setCargando(false);
      return;
    }

    // `redirigir` viene de la URL: se valida antes de saltar, o el login sirve
    // de trampolín a cualquier sitio.
    router.replace(rutaAdminSegura(params.get('redirigir')));
    router.refresh();
  }

  return (
    <div className={s.loginWrap}>
      <div className={s.loginCard}>
        <Image
          src="/images/logo.png"
          alt="La Infantería Motorsport"
          width={120}
          height={69}
          className={s.loginLogo}
          priority
        />
        <h1 className={s.loginTitulo}>Panel de administración</h1>
        <p className={s.loginSub}>Acceso restringido</p>

        <form onSubmit={entrar}>
          {error && <div className={s.error}>{error}</div>}

          <div className={s.campo}>
            <label className={s.label} htmlFor="email">
              CORREO
            </label>
            <input
              id="email"
              type="email"
              className={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className={s.campo}>
            <label className={s.label} htmlFor="password">
              CONTRASEÑA
            </label>
            <input
              id="password"
              type="password"
              className={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className={s.btnPrimario} disabled={cargando}>
            {cargando ? 'ENTRANDO…' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
}
