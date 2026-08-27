'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import type { Miembro } from '@/lib/types';
import { aLista, aSlug } from '@/lib/formato';
import SubirFotoUnica from '../_componentes/SubirFotoUnica';
import PalmaresModal from './PalmaresModal';
import s from '../../../admin.module.css';

const ROLES_SUGERIDOS = ['Piloto', 'Socio', 'Mecánico'];

interface FormMiembro {
  nombre: string;
  roles: string[];
  numero: string;
  biografia: string;
  foto_url: string | null;
  instagram_url: string;
  youtube_url: string;
  trofeos_total: string;
  orden: string;
  activo: boolean;
}

const VACIO: FormMiembro = {
  nombre: '',
  roles: ['Piloto'],
  numero: '',
  biografia: '',
  foto_url: null,
  instagram_url: '',
  youtube_url: '',
  trofeos_total: '',
  orden: '0',
  activo: true,
};

function aForm(p: Miembro): FormMiembro {
  return {
    nombre: p.nombre,
    roles: p.roles?.length ? p.roles : ['Piloto'],
    numero: p.numero ?? '',
    biografia: p.biografia ?? '',
    foto_url: p.foto_url,
    instagram_url: p.instagram_url ?? '',
    youtube_url: p.youtube_url ?? '',
    trofeos_total: p.trofeos_total === null ? '' : String(p.trofeos_total),
    orden: String(p.orden),
    activo: p.activo,
  };
}

export default function MiembrosAdmin({ inicial }: { inicial: Miembro[] }) {
  const router = useRouter();
  const [miembros, setMiembros] = useState(inicial);
  const [editando, setEditando] = useState<Miembro | null>(null);
  const [palmaresDe, setPalmaresDe] = useState<Miembro | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormMiembro>(VACIO);
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

  function abrirEdicion(p: Miembro) {
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
    if (form.roles.length === 0) {
      // La base tiene un CHECK que lo exige; se avisa acá para dar un mensaje claro
      setError('Elegí al menos un rol.');
      return;
    }

    setGuardando(true);
    const db = crearClienteNavegador();

    const fila = {
      nombre: form.nombre.trim(),
      roles: form.roles,
      numero: form.numero.trim() || null,
      biografia: form.biografia.trim(),
      foto_url: form.foto_url,
      instagram_url: form.instagram_url.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      // El slug es la URL de su página: se deriva del nombre, como en noticias.
      slug: aSlug(form.nombre),
      // Vacío es "no lo sé": ahí la página cuenta los trofeos cargados.
      trofeos_total: form.trofeos_total.trim() === '' ? null : Number(form.trofeos_total),
      orden: Number(form.orden) || 0,
      activo: form.activo,
    };

    if (editando) {
      const { error: err } = await db.from('miembros').update(fila).eq('id', editando.id);
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      setMiembros((prev) =>
        prev.map((p) => (p.id === editando.id ? ({ ...p, ...fila } as Miembro) : p)),
      );
      avisar('Miembro actualizado');
    } else {
      const { data, error: err } = await db
        .from('miembros')
        .insert(fila)
        .select('*')
        .single();
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      setMiembros((prev) => [...prev, data as Miembro]);
      avisar('Miembro creado');
    }

    setGuardando(false);
    setAbierto(false);
    setEditando(null);
    router.refresh();
  }

  async function borrar(p: Miembro) {
    if (
      !confirm(
        `¿Borrar a ${p.nombre}? Si solo querés sacarlo del sitio, destildá "Visible".`,
      )
    )
      return;

    const db = crearClienteNavegador();
    const { error: err } = await db.from('miembros').delete().eq('id', p.id);
    if (err) {
      avisar(`No se pudo borrar: ${err.message}`);
      return;
    }
    setMiembros((prev) => prev.filter((x) => x.id !== p.id));
    avisar('Miembro borrado');
    router.refresh();
  }

  return (
    <>
      <div className={s.encabezado}>
        <div>
          <h1 className={s.titulo}>Equipo</h1>
          <p className={s.subtitulo}>
            Pilotos, socios y técnicos. Se agrupan por rol en la página Equipo; los
            no visibles quedan guardados pero no aparecen.
          </p>
        </div>
        <div className={s.barraAcciones}>
          <button className={s.btnNuevo} onClick={abrirNuevo}>
            + Nuevo miembro
          </button>
        </div>
      </div>

      <div className={s.tablaWrap}>
        <table className={s.tabla}>
          <thead>
            <tr>
              <th className={s.celdaFoto}></th>
              <th>Nombre</th>
              <th>Roles</th>
              <th>Número</th>
              <th>Trofeos</th>
              <th>Visible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {miembros.length === 0 ? (
              <tr>
                <td colSpan={7} className={s.vacio}>
                  Todavía no cargaste a nadie del equipo.
                </td>
              </tr>
            ) : (
              miembros.map((p) => (
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
                  <td>
                    {(p.roles ?? []).map((r) => (
                      <span className={`${s.pill} ${s.pillGris}`} key={r} style={{ marginRight: '0.3rem' }}>
                        {r}
                      </span>
                    ))}
                  </td>
                  <td>{p.numero ? `#${p.numero}` : '—'}</td>
                  <td>
                    {p.trofeos_total ?? (p.palmares?.length ?? 0)}
                    {p.trofeos_total !== null &&
                      p.trofeos_total !== undefined &&
                      ` (${p.palmares?.length ?? 0} cargados)`}
                  </td>
                  <td>{p.activo ? 'Sí' : 'No'}</td>
                  <td className={s.celdaAcciones}>
                    <button
                      className={`${s.btnAccion} ${s.btnEditar}`}
                      onClick={() => abrirEdicion(p)}
                    >
                      Editar
                    </button>
                    <button
                      className={s.btnAccion}
                      onClick={() => setPalmaresDe(p)}
                    >
                      Palmarés
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
                {editando ? editando.nombre : 'Nuevo miembro'}
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
                      <label className={s.label}>NÚMERO DE CARRERA</label>
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
                  carpeta="miembros"
                  url={form.foto_url}
                  onCambio={(url) => setForm({ ...form, foto_url: url })}
                  etiqueta="Foto"
                />

                <div className={s.campo}>
                  <label className={s.label}>BIOGRAFÍA</label>
                  <textarea
                    className={s.textarea}
                    value={form.biografia}
                    onChange={(e) => setForm({ ...form, biografia: e.target.value })}
                  />
                  <p className={s.ayuda}>
                    Se muestra en su página, /equipo/&lt;nombre&gt;.
                  </p>
                </div>

                <div className={s.campo}>
                  <label className={s.label}>TOTAL DE TROFEOS</label>
                  <input
                    className={s.input}
                    type="number"
                    min="0"
                    value={form.trofeos_total}
                    onChange={(e) => setForm({ ...form, trofeos_total: e.target.value })}
                    placeholder="Ej: 128"
                  />
                  <p className={s.ayuda}>
                    El número grande de su ficha. Dejalo vacío y el sitio cuenta los
                    trofeos cargados en el palmarés; escribilo cuando tenga más de los
                    que vale la pena cargar uno por uno. El palmarés se edita desde el
                    botón «Palmarés» de la tabla.
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

                <div className={s.campo}>
                  <label className={s.label}>ROLES *</label>
                  <div className={s.opcionesRoles}>
                    {ROLES_SUGERIDOS.map((rol) => (
                      <label className={s.chipRol} key={rol}>
                        <input
                          type="checkbox"
                          checked={form.roles.includes(rol)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              roles: e.target.checked
                                ? [...form.roles, rol]
                                : form.roles.filter((r) => r !== rol),
                            })
                          }
                        />
                        {rol}
                      </label>
                    ))}
                  </div>
                  <input
                    className={s.input}
                    style={{ marginTop: '0.6rem' }}
                    value={form.roles.filter((r) => !ROLES_SUGERIDOS.includes(r)).join(', ')}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        roles: [
                          ...form.roles.filter((r) => ROLES_SUGERIDOS.includes(r)),
                          ...aLista(e.target.value),
                        ],
                      })
                    }
                    placeholder="Otros roles, separados por coma"
                  />
                  <p className={s.ayuda}>
                    Una persona puede tener varios: aparece en cada grupo de la página
                    Equipo. El número de carrera solo se muestra si tiene alguno.
                  </p>
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
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear miembro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {palmaresDe && (
        <PalmaresModal
          miembro={palmaresDe}
          onCerrar={() => setPalmaresDe(null)}
          onCambio={(palmares) => {
            setMiembros((prev) =>
              prev.map((m) => (m.id === palmaresDe.id ? { ...m, palmares } : m)),
            );
            setPalmaresDe((m) => (m ? { ...m, palmares } : m));
            router.refresh();
          }}
        />
      )}

      {toast && <div className={s.toast}>{toast}</div>}
    </>
  );
}
