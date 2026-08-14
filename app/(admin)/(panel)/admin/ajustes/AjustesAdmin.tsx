'use client';

import { useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import s from '../../../admin.module.css';

interface CampoDef {
  clave: string;
  etiqueta: string;
  ayuda?: string;
  placeholder?: string;
}

const GRUPOS: { titulo: string; campos: CampoDef[] }[] = [
  {
    titulo: 'Contacto',
    campos: [
      {
        clave: 'whatsapp_numero',
        etiqueta: 'Número de WhatsApp',
        ayuda: 'Con código de país, sin +, espacios ni guiones. Ejemplo: 18296863273. Es el número de todos los botones del sitio.',
        placeholder: '18296863273',
      },
      { clave: 'telefono', etiqueta: 'Teléfono', placeholder: '(829) 686-3273' },
      { clave: 'email_contacto', etiqueta: 'Correo', placeholder: 'info@lainfanteria.com' },
      { clave: 'direccion', etiqueta: 'Dirección', placeholder: 'Av. Ejemplo 123, Santo Domingo' },
      { clave: 'horario', etiqueta: 'Horario', placeholder: 'Lun - Sáb: 8:00 - 18:00' },
    ],
  },
  {
    titulo: 'Redes sociales',
    campos: [
      { clave: 'instagram_url', etiqueta: 'Instagram', placeholder: 'https://instagram.com/…' },
      { clave: 'facebook_url', etiqueta: 'Facebook', placeholder: 'https://facebook.com/…' },
      { clave: 'youtube_url', etiqueta: 'YouTube', placeholder: 'https://youtube.com/@…' },
    ],
  },
  {
    titulo: 'Sección Videos',
    campos: [
      {
        clave: 'youtube_channel_id',
        etiqueta: 'ID del canal de YouTube',
        ayuda: 'Empieza con UC. Es lo que alimenta la sección Videos: se leen los últimos videos del canal automáticamente. Si lo dejás vacío, la sección no muestra nada.',
        placeholder: 'UChv8SENnzPzMqi1uqQZ0b8A',
      },
    ],
  },
];

export default function AjustesAdmin({ inicial }: { inicial: Record<string, string> }) {
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sucio = GRUPOS.flatMap((g) => g.campos).some(
    (c) => (valores[c.clave] ?? '') !== (inicial[c.clave] ?? ''),
  );

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const wa = (valores.whatsapp_numero ?? '').trim();
    if (wa && !/^\d{8,15}$/.test(wa)) {
      setError(
        'El WhatsApp debe ser solo dígitos, con código de país y sin símbolos. Ejemplo: 18296863273.',
      );
      return;
    }

    setGuardando(true);
    const db = crearClienteNavegador();

    // Se guardan solo los que cambiaron, para no pisar valores que otro
    // administrador podría haber editado mientras tanto.
    const cambios = GRUPOS.flatMap((g) => g.campos)
      .filter((c) => (valores[c.clave] ?? '') !== (inicial[c.clave] ?? ''))
      .map((c) => ({ clave: c.clave, valor: (valores[c.clave] ?? '').trim() }));

    for (const cambio of cambios) {
      const { error: err } = await db
        .from('ajustes')
        .update({ valor: cambio.valor })
        .eq('clave', cambio.clave);
      if (err) {
        setError(`No se pudo guardar "${cambio.clave}": ${err.message}`);
        setGuardando(false);
        return;
      }
    }

    setGuardando(false);
    setToast('Ajustes guardados');
    setTimeout(() => setToast(null), 2600);
    // Recarga para que `inicial` refleje lo guardado y el botón se desactive.
    window.location.reload();
  }

  return (
    <>
      <div className={s.encabezado}>
        <div>
          <h1 className={s.titulo}>Ajustes</h1>
          <p className={s.subtitulo}>
            Datos de contacto del sitio. Los campos que dejes vacíos no se muestran —
            preferible un footer corto que información inventada.
          </p>
        </div>
      </div>

      <form onSubmit={guardar} style={{ maxWidth: 620 }}>
        {error && <div className={`${s.aviso} ${s.avisoError}`}>{error}</div>}

        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className={s.fotosSeccion} style={{ marginTop: 0 }}>
            <h2 className={s.fotosTitulo}>{grupo.titulo}</h2>
            {grupo.campos.map((campo) => (
              <div className={s.campo} key={campo.clave}>
                <label className={s.label} htmlFor={campo.clave}>
                  {campo.etiqueta.toUpperCase()}
                </label>
                <input
                  id={campo.clave}
                  className={s.input}
                  value={valores[campo.clave] ?? ''}
                  onChange={(e) =>
                    setValores({ ...valores, [campo.clave]: e.target.value })
                  }
                  placeholder={campo.placeholder}
                />
                {campo.ayuda && <p className={s.ayuda}>{campo.ayuda}</p>}
              </div>
            ))}
          </div>
        ))}

        <div style={{ marginTop: '1.5rem' }}>
          <button type="submit" className={s.btnNuevo} disabled={guardando || !sucio}>
            {guardando ? 'Guardando…' : sucio ? 'Guardar cambios' : 'Sin cambios'}
          </button>
        </div>
      </form>

      {toast && <div className={s.toast}>{toast}</div>}
    </>
  );
}
