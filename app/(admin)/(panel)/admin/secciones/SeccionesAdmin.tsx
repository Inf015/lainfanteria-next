'use client';

import { useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import type { Seccion } from '@/lib/types';
import s from '../../../admin.module.css';

/** Secciones cuya página pública todavía no existe. */
const SIN_PAGINA = new Set(['merch', 'noticias']);

export default function SeccionesAdmin({ inicial }: { inicial: Seccion[] }) {
  const [secciones, setSecciones] = useState(inicial);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function avisar(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function alternar(sec: Seccion) {
    setGuardando(sec.clave);
    const nuevo = !sec.activa;

    const db = crearClienteNavegador();
    const { error } = await db
      .from('secciones')
      .update({ activa: nuevo })
      .eq('clave', sec.clave);

    setGuardando(null);

    if (error) {
      avisar(`No se pudo cambiar: ${error.message}`);
      return;
    }

    setSecciones((prev) =>
      prev.map((x) => (x.clave === sec.clave ? { ...x, activa: nuevo } : x)),
    );
    avisar(`${sec.nombre} ${nuevo ? 'activada' : 'desactivada'}`);
  }

  return (
    <>
      <div className={s.encabezado}>
        <div>
          <h1 className={s.titulo}>Secciones</h1>
          <p className={s.subtitulo}>
            Prendé y apagá partes del sitio. Una sección apagada desaparece del menú,
            su página devuelve 404 y su bloque se va de la portada. El cambio se ve en
            menos de un minuto.
          </p>
        </div>
      </div>

      <div className={s.tablaWrap}>
        <table className={s.tabla}>
          <thead>
            <tr>
              <th>Sección</th>
              <th>Ruta</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {secciones.map((sec) => (
              <tr key={sec.clave}>
                <td>
                  <strong>{sec.nombre}</strong>
                  {SIN_PAGINA.has(sec.clave) && (
                    <div style={{ color: '#7a6a3a', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      La página pública todavía no existe — activarla dejaría un enlace roto
                    </div>
                  )}
                </td>
                <td style={{ color: '#666' }}>{sec.ruta}</td>
                <td>
                  <span
                    className={`${s.pill} ${sec.activa ? s.pillVerde : s.pillGris}`}
                  >
                    {sec.activa ? 'Activa' : 'Apagada'}
                  </span>
                </td>
                <td className={s.celdaAcciones}>
                  <button
                    className={s.btnSecundario}
                    onClick={() => alternar(sec)}
                    disabled={guardando === sec.clave}
                  >
                    {guardando === sec.clave
                      ? '…'
                      : sec.activa
                        ? 'Apagar'
                        : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <div className={s.toast}>{toast}</div>}
    </>
  );
}
