'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import type { AutoConFotos, EstadoAuto, Moneda } from '@/lib/types';
import SubirFotos, { type FotoFila } from '../_componentes/SubirFotos';
import s from '../../../admin.module.css';

const ESTADOS: { valor: EstadoAuto; label: string; clase: string }[] = [
  { valor: 'disponible', label: 'Disponible', clase: 'pillVerde' },
  { valor: 'reservado', label: 'Reservado', clase: 'pillAmarillo' },
  { valor: 'vendido', label: 'Vendido', clase: 'pillGris' },
];

/** Campos editables; el resto los pone la base. */
interface FormAuto {
  marca: string;
  modelo: string;
  version: string;
  anio: string;
  motor: string;
  descripcion: string;
  kilometraje: string;
  precio: string;
  moneda: Moneda;
  estado: EstadoAuto;
  es_del_equipo: boolean;
  orden: string;
  activo: boolean;
}

const VACIO: FormAuto = {
  marca: '',
  modelo: '',
  version: '',
  anio: '',
  motor: '',
  descripcion: '',
  kilometraje: '',
  precio: '',
  moneda: 'USD',
  estado: 'disponible',
  es_del_equipo: false,
  orden: '0',
  activo: true,
};

function aForm(a: AutoConFotos): FormAuto {
  return {
    marca: a.marca,
    modelo: a.modelo,
    version: a.version ?? '',
    anio: a.anio ?? '',
    motor: a.motor ?? '',
    descripcion: a.descripcion ?? '',
    kilometraje: a.kilometraje ?? '',
    precio: String(a.precio),
    moneda: a.moneda,
    estado: a.estado,
    es_del_equipo: a.es_del_equipo,
    orden: String(a.orden),
    activo: a.activo,
  };
}

function precioTexto(a: AutoConFotos) {
  const simbolo = a.moneda === 'USD' ? 'US$' : 'RD$';
  return `${simbolo} ${new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 }).format(a.precio)}`;
}

export default function AutosAdmin({ inicial }: { inicial: AutoConFotos[] }) {
  const router = useRouter();
  const [autos, setAutos] = useState(inicial);
  const [editando, setEditando] = useState<AutoConFotos | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormAuto>(VACIO);
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

  function abrirEdicion(a: AutoConFotos) {
    setEditando(a);
    setForm(aForm(a));
    setError(null);
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setEditando(null);
    // La lista puede haber cambiado por fotos subidas dentro del modal.
    router.refresh();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const precio = Number(form.precio);
    if (!form.marca.trim() || !form.modelo.trim()) {
      setError('Marca y modelo son obligatorios.');
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      setError('El precio tiene que ser un número mayor o igual a cero.');
      return;
    }

    setGuardando(true);
    const db = crearClienteNavegador();

    const fila = {
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      version: form.version.trim() || null,
      anio: form.anio.trim() || null,
      motor: form.motor.trim() || null,
      descripcion: form.descripcion.trim() || null,
      kilometraje: form.kilometraje.trim() || null,
      precio,
      moneda: form.moneda,
      estado: form.estado,
      es_del_equipo: form.es_del_equipo,
      orden: Number(form.orden) || 0,
      activo: form.activo,
    };

    if (editando) {
      const { error: err } = await db.from('autos').update(fila).eq('id', editando.id);
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      setAutos((prev) =>
        prev.map((a) => (a.id === editando.id ? { ...a, ...fila } : a)),
      );
      avisar('Auto actualizado');
      setGuardando(false);
      cerrar();
    } else {
      const { data, error: err } = await db
        .from('autos')
        .insert(fila)
        .select('*, auto_fotos(*)')
        .single();
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      const nuevo = { ...data, precio: Number(data.precio), auto_fotos: [] } as AutoConFotos;
      setAutos((prev) => [...prev, nuevo]);
      // Se queda abierto en modo edición para poder cargarle las fotos.
      setEditando(nuevo);
      avisar('Auto creado — ahora podés subirle fotos');
      setGuardando(false);
    }
  }

  async function borrar(a: AutoConFotos) {
    if (
      !confirm(
        `¿Borrar ${a.marca} ${a.modelo}? Se eliminan también sus fotos. Si solo querés sacarlo del sitio, destildá "Visible".`,
      )
    )
      return;

    const db = crearClienteNavegador();
    const { error: err } = await db.from('autos').delete().eq('id', a.id);
    if (err) {
      avisar(`No se pudo borrar: ${err.message}`);
      return;
    }
    setAutos((prev) => prev.filter((x) => x.id !== a.id));
    avisar('Auto borrado');
    router.refresh();
  }

  function actualizarFotos(fotos: FotoFila[]) {
    if (!editando) return;
    const conFotos = { ...editando, auto_fotos: fotos } as AutoConFotos;
    setEditando(conFotos);
    setAutos((prev) => prev.map((a) => (a.id === editando.id ? conFotos : a)));
  }

  return (
    <>
      <div className={s.encabezado}>
        <div>
          <h1 className={s.titulo}>Autos</h1>
          <p className={s.subtitulo}>
            Inventario en venta. Los marcados como vendidos o no visibles no aparecen
            en el sitio.
          </p>
        </div>
        <div className={s.barraAcciones}>
          <button className={s.btnNuevo} onClick={abrirNuevo}>
            + Nuevo auto
          </button>
        </div>
      </div>

      <div className={s.tablaWrap}>
        <table className={s.tabla}>
          <thead>
            <tr>
              <th className={s.celdaFoto}></th>
              <th>Auto</th>
              <th>Año</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Visible</th>
              <th>Fotos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {autos.length === 0 ? (
              <tr>
                <td colSpan={8} className={s.vacio}>
                  Todavía no cargaste ningún auto.
                </td>
              </tr>
            ) : (
              autos.map((a) => {
                const foto = a.auto_fotos[0];
                const est = ESTADOS.find((e) => e.valor === a.estado)!;
                return (
                  <tr key={a.id}>
                    <td className={s.celdaFoto}>
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={foto.url} alt="" className={s.miniFoto} />
                      ) : (
                        <div className={s.miniFotoVacia}>🚗</div>
                      )}
                    </td>
                    <td>
                      <strong>
                        {a.marca} {a.modelo}
                      </strong>
                      {a.version && <span style={{ color: '#666' }}> {a.version}</span>}
                      {a.es_del_equipo && (
                        <span style={{ color: '#666', fontSize: '0.75rem' }}> · del equipo</span>
                      )}
                    </td>
                    <td>{a.anio ?? '—'}</td>
                    <td>{precioTexto(a)}</td>
                    <td>
                      <span className={`${s.pill} ${s[est.clase]}`}>{est.label}</span>
                    </td>
                    <td>{a.activo ? 'Sí' : 'No'}</td>
                    <td>{a.auto_fotos.length}</td>
                    <td className={s.celdaAcciones}>
                      <button
                        className={`${s.btnAccion} ${s.btnEditar}`}
                        onClick={() => abrirEdicion(a)}
                      >
                        Editar
                      </button>
                      <button
                        className={`${s.btnAccion} ${s.btnBorrar}`}
                        onClick={() => borrar(a)}
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {abierto && (
        <div className={s.modalFondo} onClick={cerrar}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalCabecera}>
              <h2 className={s.modalTitulo}>
                {editando ? `${editando.marca} ${editando.modelo}` : 'Nuevo auto'}
              </h2>
              <button className={s.modalCerrar} onClick={cerrar} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className={s.modalCuerpo}>
              {error && <div className={`${s.aviso} ${s.avisoError}`}>{error}</div>}

              <form onSubmit={guardar} id="form-auto">
                <div className={s.fila}>
                  <div className={s.campo}>
                    <label className={s.label}>MARCA *</label>
                    <input
                      className={s.input}
                      value={form.marca}
                      onChange={(e) => setForm({ ...form, marca: e.target.value })}
                      placeholder="Ford"
                      required
                    />
                  </div>
                  <div className={s.campo}>
                    <label className={s.label}>MODELO *</label>
                    <input
                      className={s.input}
                      value={form.modelo}
                      onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                      placeholder="Mustang GT"
                      required
                    />
                  </div>
                </div>

                <div className={s.fila3}>
                  <div className={s.campo}>
                    <label className={s.label}>VERSIÓN</label>
                    <input
                      className={s.input}
                      value={form.version}
                      onChange={(e) => setForm({ ...form, version: e.target.value })}
                      placeholder="GT500"
                    />
                  </div>
                  <div className={s.campo}>
                    <label className={s.label}>AÑO</label>
                    <input
                      className={s.input}
                      value={form.anio}
                      onChange={(e) => setForm({ ...form, anio: e.target.value })}
                      placeholder="2024"
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

                <div className={s.campo}>
                  <label className={s.label}>MOTOR</label>
                  <input
                    className={s.input}
                    value={form.motor}
                    onChange={(e) => setForm({ ...form, motor: e.target.value })}
                    placeholder="5.0L V8 Coyote"
                  />
                </div>

                <div className={s.fila3}>
                  <div className={s.campo}>
                    <label className={s.label}>PRECIO *</label>
                    <input
                      className={s.input}
                      type="number"
                      step="any"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      placeholder="45000"
                      required
                    />
                  </div>
                  <div className={s.campo}>
                    <label className={s.label}>MONEDA</label>
                    <select
                      className={s.select}
                      value={form.moneda}
                      onChange={(e) =>
                        setForm({ ...form, moneda: e.target.value as Moneda })
                      }
                    >
                      <option value="USD">US$</option>
                      <option value="DOP">RD$</option>
                    </select>
                  </div>
                  <div className={s.campo}>
                    <label className={s.label}>ESTADO</label>
                    <select
                      className={s.select}
                      value={form.estado}
                      onChange={(e) =>
                        setForm({ ...form, estado: e.target.value as EstadoAuto })
                      }
                    >
                      {ESTADOS.map((e) => (
                        <option key={e.valor} value={e.valor}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={s.campo}>
                  <label className={s.label}>KILOMETRAJE</label>
                  <input
                    className={s.input}
                    value={form.kilometraje}
                    onChange={(e) => setForm({ ...form, kilometraje: e.target.value })}
                    placeholder="45,000 km"
                  />
                  <p className={s.ayuda}>
                    Texto libre, así podés escribir kilómetros o millas.
                  </p>
                </div>

                <div className={s.campo}>
                  <label className={s.label}>DESCRIPCIÓN</label>
                  <textarea
                    className={s.textarea}
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Detalles, modificaciones, historial…"
                  />
                  <p className={s.ayuda}>Se muestra al abrir el auto en el sitio.</p>
                </div>

                <div className={s.checkFila}>
                  <input
                    type="checkbox"
                    id="activo"
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  />
                  <label htmlFor="activo">Visible en el sitio</label>
                </div>

                <div className={s.checkFila}>
                  <input
                    type="checkbox"
                    id="equipo"
                    checked={form.es_del_equipo}
                    onChange={(e) =>
                      setForm({ ...form, es_del_equipo: e.target.checked })
                    }
                  />
                  <label htmlFor="equipo">Es un auto del equipo</label>
                </div>
              </form>

              {editando ? (
                <SubirFotos
                  tabla="auto_fotos"
                  campoId="auto_id"
                  registroId={editando.id}
                  fotos={editando.auto_fotos}
                  onCambio={actualizarFotos}
                />
              ) : (
                <p className={s.ayuda} style={{ marginTop: '1.4rem' }}>
                  Guardá el auto para poder subirle fotos.
                </p>
              )}
            </div>

            <div className={s.modalPie}>
              <button type="button" className={s.btnSecundario} onClick={cerrar}>
                Cerrar
              </button>
              <button
                type="submit"
                form="form-auto"
                className={s.btnNuevo}
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear auto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={s.toast}>{toast}</div>}
    </>
  );
}
