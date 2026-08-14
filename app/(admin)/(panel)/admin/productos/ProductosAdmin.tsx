'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import type { Moneda, ProductoConFotos } from '@/lib/types';
import SubirFotos, { type FotoFila } from '../_componentes/SubirFotos';
import s from '../../../admin.module.css';
import { aLista, formatPrecio } from '@/lib/formato';

const CATEGORIAS = ['Hoodie', 'Camiseta', 'Gorra', 'Accesorio'];

interface FormProducto {
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: string;
  moneda: Moneda;
  tallas: string;
  colores: string;
  orden: string;
  activo: boolean;
}

const VACIO: FormProducto = {
  nombre: '',
  descripcion: '',
  categoria: '',
  precio: '',
  moneda: 'DOP',
  tallas: '',
  colores: '',
  orden: '0',
  activo: true,
};


function aForm(p: ProductoConFotos): FormProducto {
  return {
    nombre: p.nombre,
    descripcion: p.descripcion ?? '',
    categoria: p.categoria ?? '',
    precio: String(p.precio),
    moneda: p.moneda,
    tallas: (p.tallas ?? []).join(', '),
    colores: (p.colores ?? []).join(', '),
    orden: String(p.orden),
    activo: p.activo,
  };
}


export default function ProductosAdmin({ inicial }: { inicial: ProductoConFotos[] }) {
  const router = useRouter();
  const [productos, setProductos] = useState(inicial);
  const [editando, setEditando] = useState<ProductoConFotos | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormProducto>(VACIO);
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

  function abrirEdicion(p: ProductoConFotos) {
    setEditando(p);
    setForm(aForm(p));
    setError(null);
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setEditando(null);
    router.refresh();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const precio = Number(form.precio);
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      setError('El precio tiene que ser mayor que cero.');
      return;
    }

    setGuardando(true);
    const db = crearClienteNavegador();

    const fila = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      categoria: form.categoria.trim() || null,
      precio,
      moneda: form.moneda,
      tallas: aLista(form.tallas),
      colores: aLista(form.colores),
      orden: Number(form.orden) || 0,
      activo: form.activo,
    };

    if (editando) {
      const { error: err } = await db.from('productos').update(fila).eq('id', editando.id);
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      setProductos((prev) =>
        prev.map((p) => (p.id === editando.id ? { ...p, ...fila } : p)),
      );
      avisar('Producto actualizado');
      setGuardando(false);
      cerrar();
    } else {
      const { data, error: err } = await db
        .from('productos')
        .insert(fila)
        .select('*')
        .single();
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      const nuevo = {
        ...data,
        precio: Number(data.precio),
        producto_fotos: [],
      } as ProductoConFotos;
      setProductos((prev) => [...prev, nuevo]);
      setEditando(nuevo);
      avisar('Producto creado — ahora podés subirle fotos');
      setGuardando(false);
    }
  }

  async function borrar(p: ProductoConFotos) {
    if (!confirm(`¿Borrar ${p.nombre}? Se eliminan también sus fotos.`)) return;

    const db = crearClienteNavegador();
    const { error: err } = await db.from('productos').delete().eq('id', p.id);
    if (err) {
      avisar(`No se pudo borrar: ${err.message}`);
      return;
    }
    setProductos((prev) => prev.filter((x) => x.id !== p.id));
    avisar('Producto borrado');
    router.refresh();
  }

  function actualizarFotos(fotos: FotoFila[]) {
    if (!editando) return;
    const conFotos = { ...editando, producto_fotos: fotos } as ProductoConFotos;
    setEditando(conFotos);
    setProductos((prev) => prev.map((p) => (p.id === editando.id ? conFotos : p)));
  }

  return (
    <>
      <div className={s.encabezado}>
        <div>
          <h1 className={s.titulo}>Merch</h1>
          <p className={s.subtitulo}>
            Productos de la tienda. Los pedidos se coordinan por WhatsApp, así que no
            hay stock ni checkout: alcanza con listar tallas y colores disponibles.
          </p>
        </div>
        <div className={s.barraAcciones}>
          <button className={s.btnNuevo} onClick={abrirNuevo}>
            + Nuevo producto
          </button>
        </div>
      </div>

      <div className={s.tablaWrap}>
        <table className={s.tabla}>
          <thead>
            <tr>
              <th className={s.celdaFoto}></th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Visible</th>
              <th>Fotos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan={7} className={s.vacio}>
                  Todavía no cargaste ningún producto.
                </td>
              </tr>
            ) : (
              productos.map((p) => {
                const foto = p.producto_fotos[0];
                return (
                  <tr key={p.id}>
                    <td className={s.celdaFoto}>
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={foto.url} alt="" className={s.miniFoto} />
                      ) : (
                        <div className={s.miniFotoVacia}>👕</div>
                      )}
                    </td>
                    <td>
                      <strong>{p.nombre}</strong>
                      {p.tallas?.length > 0 && (
                        <div style={{ color: '#666', fontSize: '0.75rem' }}>
                          {p.tallas.join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>{p.categoria ?? '—'}</td>
                    <td>{formatPrecio(p.precio, p.moneda)}</td>
                    <td>{p.activo ? 'Sí' : 'No'}</td>
                    <td>{p.producto_fotos.length}</td>
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
                {editando ? editando.nombre : 'Nuevo producto'}
              </h2>
              <button className={s.modalCerrar} onClick={cerrar} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className={s.modalCuerpo}>
              {error && <div className={`${s.aviso} ${s.avisoError}`}>{error}</div>}

              <form onSubmit={guardar} id="form-producto">
                <div className={s.campo}>
                  <label className={s.label}>NOMBRE *</label>
                  <input
                    className={s.input}
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Hoodie La Infantería"
                    required
                  />
                </div>

                <div className={s.fila3}>
                  <div className={s.campo}>
                    <label className={s.label}>CATEGORÍA</label>
                    <input
                      className={s.input}
                      list="categorias"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      placeholder="Hoodie"
                    />
                    <datalist id="categorias">
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <div className={s.campo}>
                    <label className={s.label}>PRECIO *</label>
                    <input
                      className={s.input}
                      type="number"
                      step="any"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      placeholder="2500"
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
                      <option value="DOP">RD$</option>
                      <option value="USD">US$</option>
                    </select>
                  </div>
                </div>

                <div className={s.fila}>
                  <div className={s.campo}>
                    <label className={s.label}>TALLAS</label>
                    <input
                      className={s.input}
                      value={form.tallas}
                      onChange={(e) => setForm({ ...form, tallas: e.target.value })}
                      placeholder="S, M, L, XL"
                    />
                    <p className={s.ayuda}>Separadas por coma.</p>
                  </div>
                  <div className={s.campo}>
                    <label className={s.label}>COLORES</label>
                    <input
                      className={s.input}
                      value={form.colores}
                      onChange={(e) => setForm({ ...form, colores: e.target.value })}
                      placeholder="Negro, Rojo"
                    />
                    <p className={s.ayuda}>Separados por coma.</p>
                  </div>
                </div>

                <div className={s.campo}>
                  <label className={s.label}>DESCRIPCIÓN</label>
                  <textarea
                    className={s.textarea}
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  />
                </div>

                <div className={s.fila}>
                  <div className={s.campo}>
                    <label className={s.label}>ORDEN</label>
                    <input
                      className={s.input}
                      type="number"
                      value={form.orden}
                      onChange={(e) => setForm({ ...form, orden: e.target.value })}
                    />
                  </div>
                  <div className={s.checkFila} style={{ alignItems: 'flex-end', paddingBottom: '0.9rem' }}>
                    <input
                      type="checkbox"
                      id="pr-activo"
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    />
                    <label htmlFor="pr-activo">Visible en el sitio</label>
                  </div>
                </div>
              </form>

              {editando ? (
                <SubirFotos
                  tabla="producto_fotos"
                  campoId="producto_id"
                  registroId={editando.id}
                  fotos={editando.producto_fotos}
                  onCambio={actualizarFotos}
                />
              ) : (
                <p className={s.ayuda} style={{ marginTop: '1.4rem' }}>
                  Guardá el producto para poder subirle fotos.
                </p>
              )}
            </div>

            <div className={s.modalPie}>
              <button type="button" className={s.btnSecundario} onClick={cerrar}>
                Cerrar
              </button>
              <button
                type="submit"
                form="form-producto"
                className={s.btnNuevo}
                disabled={guardando}
              >
                {guardando
                  ? 'Guardando…'
                  : editando
                    ? 'Guardar cambios'
                    : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={s.toast}>{toast}</div>}
    </>
  );
}
