'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { Auto } from '@/lib/types';
import {
  armarVistaPrevia,
  TEXTO_AVISO,
  type FormAuto,
  type FotoVistaPrevia,
} from '@/lib/vista-previa';
import TarjetaAuto from '@/app/(sitio)/autos/TarjetaAuto';
import DetalleAuto from '@/app/(sitio)/autos/DetalleAuto';
import v from './vista-previa.module.css';

/**
 * Vista previa del auto con lo que tiene cargado el formulario, sin guardar.
 *
 * Muestra la tarjeta de la grilla del sitio y, al hacer clic, el detalle, con
 * los mismos componentes que `/autos`. Es un diálogo encima del modal de
 * edición: `Escape` y ✕ lo cierran solo a él. Con el detalle abierto,
 * `Escape` cierra primero el detalle (como en el sitio) y la siguiente, la
 * vista previa.
 */
export default function VistaPrevia({
  form,
  fotos,
  guardado,
  alCerrar,
}: {
  form: FormAuto;
  fotos: readonly FotoVistaPrevia[];
  guardado: Auto | null;
  alCerrar: () => void;
}) {
  const { auto, avisos } = armarVistaPrevia(form, fotos, guardado);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const cerrar = useEffectEvent(alCerrar);

  // El foco entra al diálogo al abrirlo.
  useEffect(() => {
    botonCerrar.current?.focus();
  }, []);

  // Con el detalle abierto, `Escape` es suyo: lo escucha `DetalleAuto`.
  useEffect(() => {
    if (detalleAbierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [detalleAbierto]);

  return (
    <>
      <div
        className={v.fondo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vista-previa-titulo"
        onClick={(e) => {
          if (e.target === e.currentTarget) alCerrar();
        }}
      >
        <div className={v.panel}>
          <div className={v.cabecera}>
            <h2 id="vista-previa-titulo" className={v.titulo}>
              Vista previa
            </h2>
            <button
              ref={botonCerrar}
              type="button"
              className={v.cerrar}
              onClick={alCerrar}
              aria-label="Cerrar vista previa"
            >
              ✕
            </button>
          </div>

          {avisos.length > 0 && (
            <ul className={v.avisos} aria-label="Avisos">
              {avisos.map((a) => (
                <li key={a} className={v.aviso}>
                  {TEXTO_AVISO[a]}
                </li>
              ))}
            </ul>
          )}

          <p className={v.ayuda}>
            Así se ve en la grilla de /autos. Tocá la tarjeta para abrir el detalle.
          </p>

          <div className={v.tarjeta}>
            <TarjetaAuto auto={auto} alAbrir={() => setDetalleAbierto(true)} />
          </div>
        </div>
      </div>

      {detalleAbierto && (
        <DetalleAuto
          auto={auto}
          alCerrar={() => setDetalleAbierto(false)}
          hrefWhatsapp={null}
        />
      )}
    </>
  );
}
