'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import type { Piloto } from '@/lib/types';
import SubirFotoUnica from '../_componentes/SubirFotoUnica';
import s from '../../../admin.module.css';

interface FormPiloto {
  nombre: string;
  numero: string;
  biografia: string;
  foto_url: string | null;
  instagram_url: string;
  youtube_url: string;
  logros: string;
  orden: string;
  activo: boolean;
}

const VACIO: FormPiloto = {
  nombre: '',
  numero: '',
  biografia: '',
  foto_url: null,
  instagram_url: '',
  youtube_url: '',
  logros: '',
  orden: '0',
  activo: true,
};

function aForm(p: Piloto): FormPiloto {
  return {
    nombre: p.nombre,
    numero: p.numero ?? '',
    biografia: p.biografia ?? '',
    foto_url: p.foto_url,
    instagram_url: p.instagram_url ?? '',
    youtube_url: p.youtube_url ?? '',
    // Un logro por línea es más natural de editar que una lista con comas.
    logros: (p.logros ?? []).join('\n'),
    orden: String(p.orden),
    activo: p.activo,
  };
}

export default function PilotosAdmin({ inicial }: { inicial: Piloto[] }) {
  const router = useRouter();
  const [pilotos, setPilotos] = useState(inicial);
  const [editando, setEditando] = useState<Piloto | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormPiloto>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function avisar(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setError(null);
    setAbierto(true);
  }

  function abrirEdicion(p: Piloto) {
    setEditando(p);
    setForm(aForm(p));
    setError(null);
    setAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    setGuardando(true);
    const db = crearClienteNavegador();

    const fila = {
      nombre: form.nombre.trim(),
      numero: form.numero.trim() || null,
      biografia: form.biografia.trim(),
      foto_url: form.foto_url,
      instagram_url: form.instagram_url.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      logros: form.logros
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      orden: Number(form.orden) || 0,
      activo: form.activo,
    };

    if (editando) {
      const { error: err } = await db.from('pilotos').update(fila).eq('id', editando.id);
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      setPilotos((prev) =>
        prev.map((p) => (p.id === editando.id ? ({ ...p, ...fila } as Piloto) : p)),
      );
      avisar('Piloto actualizado');
    } else {
      const { data, error: err } = await db
        .from('pilotos')
        .insert(fila)
        .select('*')
        .single();
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      setPilotos((prev) => [...prev, data as Piloto]);
      avisar('Piloto creado');
    }

    setGuardando(false);
    setAbierto(false);
    setEditando(null);
    router.refresh();
  }

  async function borrar(p: Piloto) {
    if (
      !confirm(
        `¿Borrar a ${p.nombre}? Si solo querés sacarlo del sitio, destildá "Visible".`,
      )
    )
      return;

    const db = crearClienteNavegador();
    const { error: err } = await db.from('pilotos').delete().eq('id', p.id);
    if (err) {
      avisar(`No se pudo borrar: ${err.message}`);
      return;
    }
    setPilotos((prev) => prev.filter((x) => x.id !== p.id));
    avisar('Piloto borrado');
    router.refresh();
  }

  return (
    <>
      <div className={s.encabezado}>
        <div>
          <h1 className={s.titulo}>Pilotos</h1>
          <p className={s.subtitulo}>
            El equipo que se muestra en la página Equipo. Los no visibles quedan
            guardados pero no aparecen.
          </p>
        </div>
        <div className={s.barraAcciones}>
          <button className={s.btnNuevo} onClick={abrirNuevo}>
            + Nuevo piloto
          </button>
        </div>
      </div>

      <div className={s.tablaWrap}>
        <table className={s.tabla}>
          <thead>
            <tr>
              <th className={s.celdaFoto}></th>
              <th>Nombre</th>
              <th>Número</th>
              <th>Logros</th>
              <th>Visible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pilotos.length === 0 ? (
              <tr>
                <td colSpan={6} className={s.vacio}>
                  Todavía no cargaste ningún piloto.
                </td>
              </tr>
            ) : (
              pilotos.map((p) => (
                <tr key={p.id}>
                  <td className={s.celdaFoto}>
                    {p.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto_url} alt="" className={s.miniFoto} />
                    ) : (
                      <div className={s.miniFotoVacia}>🏁</div>
                    )}
                  </td>
                  <td>
                    <strong>{p.nombre}</strong>
                  </td>
                  <td>{p.numero ? `#${p.numero}` : '—'}</td>
                  <td>{p.logros?.length ?? 0}</td>
                  <td>{p.activo ? 'Sí' : 'No'}</td>
                  <td className={s.celdaAcciones}>
                    <button
                      className={`${s.btnAccion} ${s.btnEditar}`}
                      onClick={() => abrirEdicion(p)}
                    >
                      Editar
                    </button>
                    <button
                      className={`${s.btnAccion} ${s.btnBorrar}`}
                      onClick={() => borrar(p)}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {abierto && (
        <div className={s.modalFondo} onClick={() => setAbierto(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalCabecera}>
              <h2 className={s.modalTitulo}>
                {editando ? editando.nombre : 'Nuevo piloto'}
              </h2>
              <button
                className={s.modalCerrar}
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className={s.modalCuerpo}>
              {error && <div className={`${s.aviso} ${s.avisoError}`}>{error}</div>}

              <form onSubmit={guardar} id="form-piloto">
                <div className={s.fila}>
                  <div className={s.campo}>
                    <label className={s.label}>NOMBRE *</label>
                    <input
                      className={s.input}
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className={s.fila}>
                    <div className={s.campo}>
                      <label className={s.label}>NÚMERO</label>
                      <input
                        className={s.input}
                        value={form.numero}
                        onChange={(e) => setForm({ ...form, numero: e.target.value })}
                        placeholder="88"
                      />
                    </div>
                    <div className={s.campo}>
                      <label className={s.label}>ORDEN</label>
                      <input
                        className={s.input}
                        type="number"
                        value={form.orden}
                        onChange={(e) => setForm({ ...form, orden: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <SubirFotoUnica
                  carpeta="pilotos"
                  url={form.foto_url}
                  onCambio={(url) => setForm({ ...form, foto_url: url })}
                  etiqueta="Foto del piloto"
                />

                <div className={s.campo}>
                  <label className={s.label}>BIOGRAFÍA</label>
                  <textarea
                    className={s.textarea}
                    value={form.biografia}
                    onChange={(e) => setForm({ ...form, biografia: e.target.value })}
                  />
                  <p className={s.ayuda}>
                    Se despliega al hacer clic en la foto del piloto en el sitio.
                  </p>
                </div>

                <div className={s.campo}>
                  <label className={s.label}>LOGROS</label>
                  <textarea
                    className={s.textarea}
                    value={form.logros}
                    onChange={(e) => setForm({ ...form, logros: e.target.value })}
                    placeholder={'Campeón DADR 2024\nSubcampeón Pro Stock 2023'}
                  />
                  <p className={s.ayuda}>
                    Uno por línea. Cada uno se muestra como una insignia en su tarjeta.
                  </p>
                </div>

                <div className={s.fila}>
                  <div className={s.campo}>
                    <label className={s.label}>INSTAGRAM</label>
                    <input
                      className={s.input}
                      value={form.instagram_url}
                      onChange={(e) =>
                        setForm({ ...form, instagram_url: e.target.value })
                      }
                      placeholder="https://instagram.com/…"
                    />
                  </div>
                  <div className={s.campo}>
                    <label className={s.label}>YOUTUBE</label>
                    <input
                      className={s.input}
                      value={form.youtube_url}
                      onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                      placeholder="https://youtube.com/@…"
                    />
                  </div>
                </div>

                <div className={s.checkFila}>
                  <input
                    type="checkbox"
                    id="p-activo"
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  />
                  <label htmlFor="p-activo">Visible en el sitio</label>
                </div>
              </form>
            </div>

            <div className={s.modalPie}>
              <button
                type="button"
                className={s.btnSecundario}
                onClick={() => setAbierto(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-piloto"
                className={s.btnNuevo}
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear piloto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={s.toast}>{toast}</div>}
    </>
  );
}
