'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import type { Noticia } from '@/lib/types';
import SubirFotoUnica from '../_componentes/SubirFotoUnica';
import s from '../../../admin.module.css';

const CATEGORIAS = ['Carrera', 'Taller', 'Equipo', 'General'];

interface FormNoticia {
  titulo: string;
  slug: string;
  resumen: string;
  cuerpo: string;
  imagen_portada_url: string | null;
  categoria: string;
  publicada: boolean;
  fecha_publicacion: string;
}

const VACIO: FormNoticia = {
  titulo: '',
  slug: '',
  resumen: '',
  cuerpo: '',
  imagen_portada_url: null,
  categoria: '',
  publicada: false,
  fecha_publicacion: '',
};

/** Título → slug: sin tildes, minúsculas y con guiones. */
function aSlug(texto: string) {
  return texto
    .normalize('NFD')
    // Marcas diacríticas que NFD separó de su letra base
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function aForm(n: Noticia): FormNoticia {
  return {
    titulo: n.titulo,
    slug: n.slug,
    resumen: n.resumen ?? '',
    cuerpo: n.cuerpo,
    imagen_portada_url: n.imagen_portada_url,
    categoria: n.categoria ?? '',
    publicada: n.publicada,
    // datetime-local necesita "YYYY-MM-DDTHH:mm"
    fecha_publicacion: n.fecha_publicacion
      ? new Date(n.fecha_publicacion).toISOString().slice(0, 16)
      : '',
  };
}

export default function NoticiasAdmin({ inicial }: { inicial: Noticia[] }) {
  const router = useRouter();
  const [noticias, setNoticias] = useState(inicial);
  const [editando, setEditando] = useState<Noticia | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormNoticia>(VACIO);
  const [slugTocado, setSlugTocado] = useState(false);
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
    setSlugTocado(false);
    setError(null);
    setAbierto(true);
  }

  function abrirEdicion(n: Noticia) {
    setEditando(n);
    setForm(aForm(n));
    // En una noticia existente el slug ya circuló: no se regenera solo.
    setSlugTocado(true);
    setError(null);
    setAbierto(true);
  }

  function cambiarTitulo(titulo: string) {
    setForm((f) => ({
      ...f,
      titulo,
      slug: slugTocado ? f.slug : aSlug(titulo),
    }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.titulo.trim() || !form.cuerpo.trim()) {
      setError('El título y el cuerpo son obligatorios.');
      return;
    }
    const slug = (form.slug.trim() || aSlug(form.titulo)).trim();
    if (!slug) {
      setError('No se pudo generar el enlace. Escribí uno a mano.');
      return;
    }

    setGuardando(true);
    const db = crearClienteNavegador();

    // Publicar sin fecha explícita la deja con la de ahora.
    const fecha =
      form.fecha_publicacion !== ''
        ? new Date(form.fecha_publicacion).toISOString()
        : form.publicada
          ? new Date().toISOString()
          : null;

    const fila = {
      titulo: form.titulo.trim(),
      slug,
      resumen: form.resumen.trim() || null,
      cuerpo: form.cuerpo.trim(),
      imagen_portada_url: form.imagen_portada_url,
      categoria: form.categoria.trim() || null,
      publicada: form.publicada,
      fecha_publicacion: fecha,
    };

    if (editando) {
      const { error: err } = await db.from('noticias').update(fila).eq('id', editando.id);
      if (err) {
        setError(
          err.code === '23505'
            ? 'Ya existe otra noticia con ese enlace. Cambiá el slug.'
            : err.message,
        );
        setGuardando(false);
        return;
      }
      setNoticias((prev) =>
        prev.map((n) => (n.id === editando.id ? ({ ...n, ...fila } as Noticia) : n)),
      );
      avisar('Noticia actualizada');
    } else {
      const { data, error: err } = await db
        .from('noticias')
        .insert(fila)
        .select('*')
        .single();
      if (err) {
        setError(
          err.code === '23505'
            ? 'Ya existe una noticia con ese enlace. Cambiá el slug.'
            : err.message,
        );
        setGuardando(false);
        return;
      }
      setNoticias((prev) => [data as Noticia, ...prev]);
      avisar('Noticia creada');
    }

    setGuardando(false);
    setAbierto(false);
    setEditando(null);
    router.refresh();
  }

  async function borrar(n: Noticia) {
    if (!confirm(`¿Borrar "${n.titulo}"?`)) return;

    const db = crearClienteNavegador();
    const { error: err } = await db.from('noticias').delete().eq('id', n.id);
    if (err) {
      avisar(`No se pudo borrar: ${err.message}`);
      return;
    }
    setNoticias((prev) => prev.filter((x) => x.id !== n.id));
    avisar('Noticia borrada');
    router.refresh();
  }

  return (
    <>
      <div className={s.encabezado}>
        <div>
          <h1 className={s.titulo}>Noticias</h1>
          <p className={s.subtitulo}>
            Novedades del equipo y del taller. Las que no estén publicadas quedan como
            borrador y no se ven en el sitio.
          </p>
        </div>
        <div className={s.barraAcciones}>
          <button className={s.btnNuevo} onClick={abrirNuevo}>
            + Nueva noticia
          </button>
        </div>
      </div>

      <div className={s.tablaWrap}>
        <table className={s.tabla}>
          <thead>
            <tr>
              <th className={s.celdaFoto}></th>
              <th>Título</th>
              <th>Categoría</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {noticias.length === 0 ? (
              <tr>
                <td colSpan={6} className={s.vacio}>
                  Todavía no cargaste ninguna noticia.
                </td>
              </tr>
            ) : (
              noticias.map((n) => (
                <tr key={n.id}>
                  <td className={s.celdaFoto}>
                    {n.imagen_portada_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.imagen_portada_url} alt="" className={s.miniFoto} />
                    ) : (
                      <div className={s.miniFotoVacia}>📰</div>
                    )}
                  </td>
                  <td>
                    <strong>{n.titulo}</strong>
                    <div style={{ color: '#555', fontSize: '0.74rem' }}>/{n.slug}</div>
                  </td>
                  <td>{n.categoria ?? '—'}</td>
                  <td>
                    {n.fecha_publicacion
                      ? new Date(n.fecha_publicacion).toLocaleDateString('es-DO')
                      : '—'}
                  </td>
                  <td>
                    <span
                      className={`${s.pill} ${n.publicada ? s.pillVerde : s.pillGris}`}
                    >
                      {n.publicada ? 'Publicada' : 'Borrador'}
                    </span>
                  </td>
                  <td className={s.celdaAcciones}>
                    <button
                      className={`${s.btnAccion} ${s.btnEditar}`}
                      onClick={() => abrirEdicion(n)}
                    >
                      Editar
                    </button>
                    <button
                      className={`${s.btnAccion} ${s.btnBorrar}`}
                      onClick={() => borrar(n)}
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
                {editando ? 'Editar noticia' : 'Nueva noticia'}
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

              <form onSubmit={guardar} id="form-noticia">
                <div className={s.campo}>
                  <label className={s.label}>TÍTULO *</label>
                  <input
                    className={s.input}
                    value={form.titulo}
                    onChange={(e) => cambiarTitulo(e.target.value)}
                    required
                  />
                </div>

                <div className={s.campo}>
                  <label className={s.label}>ENLACE (SLUG)</label>
                  <input
                    className={s.input}
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTocado(true);
                      setForm({ ...form, slug: aSlug(e.target.value) });
                    }}
                    placeholder="se-genera-solo-desde-el-titulo"
                  />
                  <p className={s.ayuda}>
                    Se arma solo con el título. Si la noticia ya se compartió, cambiarlo
                    rompe los enlaces que circulan.
                  </p>
                </div>

                <div className={s.fila}>
                  <div className={s.campo}>
                    <label className={s.label}>CATEGORÍA</label>
                    <input
                      className={s.input}
                      list="cat-noticias"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    />
                    <datalist id="cat-noticias">
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <div className={s.campo}>
                    <label className={s.label}>FECHA DE PUBLICACIÓN</label>
                    <input
                      className={s.input}
                      type="datetime-local"
                      value={form.fecha_publicacion}
                      onChange={(e) =>
                        setForm({ ...form, fecha_publicacion: e.target.value })
                      }
                    />
                    <p className={s.ayuda}>Si la dejás vacía, se usa el momento de publicar.</p>
                  </div>
                </div>

                <SubirFotoUnica
                  carpeta="noticias"
                  url={form.imagen_portada_url}
                  onCambio={(url) => setForm({ ...form, imagen_portada_url: url })}
                  etiqueta="Imagen de portada"
                />

                <div className={s.campo}>
                  <label className={s.label}>RESUMEN</label>
                  <textarea
                    className={s.textarea}
                    value={form.resumen}
                    onChange={(e) => setForm({ ...form, resumen: e.target.value })}
                    style={{ minHeight: 64 }}
                  />
                  <p className={s.ayuda}>Es lo que se ve en la tarjeta del listado.</p>
                </div>

                <div className={s.campo}>
                  <label className={s.label}>CUERPO *</label>
                  <textarea
                    className={s.textarea}
                    value={form.cuerpo}
                    onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
                    style={{ minHeight: 180 }}
                    required
                  />
                </div>

                <div className={s.checkFila}>
                  <input
                    type="checkbox"
                    id="n-publicada"
                    checked={form.publicada}
                    onChange={(e) => setForm({ ...form, publicada: e.target.checked })}
                  />
                  <label htmlFor="n-publicada">Publicada</label>
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
                form="form-noticia"
                className={s.btnNuevo}
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear noticia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={s.toast}>{toast}</div>}
    </>
  );
}
