'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Seccion } from '@/lib/types';
import './navbar.css';

interface Props {
  secciones: Seccion[];
  whatsappUrl: string;
  agendaUrl: string;
}

export default function NavbarClient({ secciones, whatsappUrl, agendaUrl }: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrar = () => setMenuAbierto(false);

  // Escape cierra el drawer, y mientras está abierto se bloquea el scroll
  // del fondo para que no se mueva atrás del panel.
  useEffect(() => {
    if (!menuAbierto) return;

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', alPresionar);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [menuAbierto]);

  return (
    <>
      <div
        className={`nav-overlay ${menuAbierto ? 'nav-overlay-visible' : ''}`}
        onClick={cerrar}
        aria-hidden="true"
      />

      <div
        className={`mobile-drawer ${menuAbierto ? 'mobile-drawer-open' : ''}`}
        role="dialog"
        aria-label="Menú de navegación"
        aria-hidden={!menuAbierto}
      >
        <div className="drawer-header">
          <Image
            src="/images/logo.png"
            alt="La Infantería Motorsport"
            className="drawer-logo"
            width={77}
            height={44}
          />
          <button className="drawer-close" onClick={cerrar} aria-label="Cerrar menú">
            ✕
          </button>
        </div>

        <ul className="mobile-links">
          {secciones.map((s) => (
            <li key={s.clave}>
              <Link href={s.ruta} onClick={cerrar}>
                {s.nombre.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mobile-buttons">
          <a href={agendaUrl} target="_blank" rel="noopener" className="btn-agenda">
            AGENDA
          </a>
          <a href={whatsappUrl} target="_blank" rel="noopener" className="btn-whatsapp">
            &#128172; WHATSAPP
          </a>
        </div>
      </div>

      <nav className="navbar">
        <div className="nav-container">
          <button
            className="hamburger"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label="Menú"
            aria-expanded={menuAbierto}
          >
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </button>

          <div className="nav-logo">
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="La Infantería Motorsport"
                className="logo-img"
                width={102}
                height={58}
                priority
              />
            </Link>
          </div>

          <ul className="nav-links">
            {secciones.map((s) => (
              <li key={s.clave}>
                <Link href={s.ruta}>{s.nombre.toUpperCase()}</Link>
              </li>
            ))}
          </ul>

          <div className="nav-buttons">
            <a href={agendaUrl} target="_blank" rel="noopener" className="btn-agenda">
              AGENDA
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener" className="btn-whatsapp">
              &#128172; WHATSAPP
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}
