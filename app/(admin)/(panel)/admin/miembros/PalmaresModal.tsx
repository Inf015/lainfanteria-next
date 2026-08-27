'use client';

import { useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import type { Logro, Miembro, PosicionLogro, TipoCompetencia } from '@/lib/types';
import { contexto, fechaLogro, ICONO_POSICION } from '@/lib/palmares';
import SubirFotoUnica from '../_componentes/SubirFotoUnica';
import s from '../../../admin.module.css';

/**
 * Palmarés de un miembro: la lista de trofeos y el formulario de cada uno.
 *
 * Está aparte del formulario del miembro a propósito. Son dos ritmos distintos:
 * los datos de la persona se tocan una vez y el palmarés crece con cada carrera,
 * y meterlo todo en un modal dejaba un formulario imposible de recorrer.
 *
 * Ojo con el total: acá se cargan los destacados, no los cien trofeos. El número
 * grande se escribe a mano en el formulario del miembro.
 */

const POSICIONES: { valor: PosicionLogro; texto: string }[] = [
  { valor: 'campeon', texto: 'Campeón' },
  { valor: 'primero', texto: '1er lugar' },
  { valor: 'segundo', texto: '2do lugar' },
  { valor: 'tercero', texto: '3er lugar' },
  { valor: 'otro', texto: 'Otro trofeo' },
];

const TIPOS: { valor: TipoCompetencia; texto: string }[] = [
  { valor: 'puntuable', texto: 'Puntuable' },
  { valor: 'evento', texto: 'Evento suelto' },
  { valor: 'campeonato', texto: 'Campeonato' },
];

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface FormLogro {
  titulo: string;
  posicion: PosicionLogro;
  tipo: TipoCompetencia;
  anio: string;
  mes: string;
  ronda: string;
  destacado: boolean;
  foto_url: string | null;
}

const VACIO: FormLogro = {
  titulo: '',
  posicion: 'primero',
  tipo: 'puntuable',
  anio: String(new Date().getFullYear()),
  mes: '',
  ronda: '',
  destacado: true,
  foto_url: null,
};

function aForm(l: Logro): FormLogro {
  return {
    titulo: l.titulo,
    posicion: l.posicion,
    tipo: l.tipo,
    anio: l.anio === null ? '' : String(l.anio),
    mes: l.mes === null ? '' : String(l.mes),
    ronda: l.ronda === null ? '' : String(l.ronda),
    destacado: l.destacado,
    foto_url: l.foto_url,
  };
}

/** Igual que en el sitio: más reciente primero, sin fecha al final. */
function ordenar(logros: Logro[]): Logro[] {
  return [...logros].sort((a, b) => {
    if (a.anio !== b.anio) return (b.anio ?? -Infinity) - (a.anio ?? -Infinity);
    if (a.mes !== b.mes) return (b.mes ?? -Infinity) - (a.mes ?? -Infinity);
    return b.id - a.id;
  });
}

interface Props {
  miembro: Miembro;
  onCerrar: () => void;
  onCambio: (palmares: Logro[]) => void;
}

export default function PalmaresModal({ miembro, onCerrar, onCambio }: Props) {
  const palmares = ordenar(miembro.palmares ?? []);

  const [editando, setEditando] = useState<Logro | null>(null);
  const [form, setForm] = useState<FormLogro | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destacados = palmares.filter((l) => l.destacado).length;

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setError(null);
  }

  function abrirEdicion(logro: Logro) {
    setEditando(logro);
    setForm(aForm(logro));
    setError(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    if (!form.titulo.trim()) {
      setError('Escribí qué ganó.');
      return;
    }
    // El mes sin año no ordena ni agrupa; la base tiene el mismo CHECK
    if (form.mes && !form.anio) {
      setError('Si ponés el mes, poné también el año.');
      return;
    }

    setGuardando(true);
    setError(null);
    const db = crearClienteNavegador();

    const fila = {
      miembro_id: miembro.id,
      titulo: form.titulo.trim(),
      posicion: form.posicion,
      tipo: form.tipo,
      anio: form.anio.trim() === '' ? null : Number(form.anio),
      mes: form.mes.trim() === '' ? null : Number(form.mes),
      ronda: form.ronda.trim() === '' ? null : Number(form.ronda),
      destacado: form.destacado,
      foto_url: form.foto_url,
    };

    if (editando) {
      const { data, error: err } = await db
        .from('logros')
        .update(fila)
        .eq('id', editando.id)
        .select('*')
        .single();
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      onCambio(palmares.map((l) => (l.id === editando.id ? (data as Logro) : l)));
    } else {
      const { data, error: err } = await db
        .from('logros')
        .insert(fila)
        .select('*')
        .single();
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      onCambio([...palmares, data as Logro]);
    }

    setGuardando(false);
    setForm(null);
    setEditando(null);
  }

  async function borrar(logro: Logro) {
    if (!confirm(`¿Borrar "${logro.titulo}"?`)) return;

    const db = crearClienteNavegador();
    const { error: err } = await db.from('logros').delete().eq('id', logro.id);
    if (err) {
      setError(err.message);
      return;
    }
    onCambio(palmares.filter((l) => l.id !== logro.id));
  }

  async function alternarDestacado(logro: Logro) {
    const db = crearClienteNavegador();
    const { data, error: err } = await db
      .from('logros')
      .update({ destacado: !logro.destacado })
      .eq('id', logro.id)
      .select('*')
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    onCambio(palmares.map((l) => (l.id === logro.id ? (data as Logro) : l)));
  }

  return (
    <div className={s.modalFondo} onClick={onCerrar}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalCabecera}>
          <h2 className={s.modalTitulo}>Palmarés de {miembro.nombre}</h2>
          <button className={s.modalCerrar} onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={s.modalCuerpo}>
          {error && <div className={s.error}>{error}</div>}

          <p className={s.ayuda}>
            {palmares.length} cargados, {destacados} destacados. Los destacados son
            los que aparecen en la tarjeta de la página Equipo; el resto se ve en su
            página.
          </p>

          {form ? (
            <form id="form-logro" onSubmit={guardar}>
              <div className={s.campo}>
                <label className={s.label}>QUÉ GANÓ *</label>
                <input
                  className={s.input}
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="1er lugar Categoría 12.5 Puntuable"
                />
              </div>

              <div className={s.fila}>
                <div className={s.campo}>
                  <label className={s.label}>POSICIÓN</label>
                  <select
                    className={s.input}
                    value={form.posicion}
                    onChange={(e) =>
                      setForm({ ...form, posicion: e.target.value as PosicionLogro })
                    }
                  >
                    {POSICIONES.map((p) => (
                      <option value={p.valor} key={p.valor}>
                        {p.texto}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={s.campo}>
                  <label className={s.label}>COMPETENCIA</label>
                  <select
                    className={s.input}
                    value={form.tipo}
                    onChange={(e) =>
                      setForm({ ...form, tipo: e.target.value as TipoCompetencia })
                    }
                  >
                    {TIPOS.map((t) => (
                      <option value={t.valor} key={t.valor}>
                        {t.texto}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={s.fila}>
                <div className={s.campo}>
                  <label className={s.label}>AÑO</label>
                  <input
                    className={s.input}
                    type="number"
                    min="1950"
                    max="2100"
                    value={form.anio}
                    onChange={(e) => setForm({ ...form, anio: e.target.value })}
                  />
                </div>

                <div className={s.campo}>
                  <label className={s.label}>MES</label>
                  <select
                    className={s.input}
                    value={form.mes}
                    onChange={(e) => setForm({ ...form, mes: e.target.value })}
                  >
                    <option value="">— sin especificar —</option>
                    {MESES.map((m, i) => (
                      <option value={i + 1} key={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={s.campo}>
                  <label className={s.label}>PUNTUABLE Nº</label>
                  <input
                    className={s.input}
                    type="number"
                    min="1"
                    max="20"
                    value={form.ronda}
                    onChange={(e) => setForm({ ...form, ronda: e.target.value })}
                    disabled={form.tipo !== 'puntuable'}
                    placeholder="1, 2, 3…"
                  />
                </div>
              </div>

              <p className={s.ayuda}>
                El número de puntuable es lo que distingue cuatro primeros lugares
                iguales del mismo año. Solo aplica a las puntuables.
              </p>

              <SubirFotoUnica
                carpeta="trofeos"
                url={form.foto_url}
                onCambio={(url) => setForm({ ...form, foto_url: url })}
                etiqueta="Foto del trofeo (opcional)"
              />

              <div className={s.checkFila}>
                <input
                  type="checkbox"
                  id="logro-destacado"
                  checked={form.destacado}
                  onChange={(e) => setForm({ ...form, destacado: e.target.checked })}
                />
                <label htmlFor="logro-destacado">
                  Destacado: mostrar en la tarjeta del equipo
                </label>
              </div>

              <div className={s.barraAcciones} style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className={s.btnSecundario}
                  onClick={() => {
                    setForm(null);
                    setEditando(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className={s.btnNuevo} disabled={guardando}>
                  {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className={s.barraAcciones} style={{ marginBottom: '1rem' }}>
                <button className={s.btnNuevo} onClick={abrirNuevo}>
                  + Agregar trofeo
                </button>
              </div>

              <div className={s.tablaWrap}>
                <table className={s.tabla}>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Qué ganó</th>
                      <th>Cuándo</th>
                      <th>Destacado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {palmares.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={s.vacio}>
                          Todavía no cargaste ningún trofeo.
                        </td>
                      </tr>
                    ) : (
                      palmares.map((logro) => (
                        <tr key={logro.id}>
                          <td>{ICONO_POSICION[logro.posicion]}</td>
                          <td>
                            <strong>{logro.titulo}</strong>
                            <br />
                            <span className={s.ayuda}>{contexto(logro)}</span>
                          </td>
                          <td>{fechaLogro(logro) || '—'}</td>
                          <td>
                            <button
                              className={s.btnAccion}
                              onClick={() => alternarDestacado(logro)}
                              title="Mostrar u ocultar en la tarjeta del equipo"
                            >
                              {logro.destacado ? 'Sí' : 'No'}
                            </button>
                          </td>
                          <td className={s.celdaAcciones}>
                            <button
                              className={`${s.btnAccion} ${s.btnEditar}`}
                              onClick={() => abrirEdicion(logro)}
                            >
                              Editar
                            </button>
                            <button
                              className={`${s.btnAccion} ${s.btnBorrar}`}
                              onClick={() => borrar(logro)}
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
            </>
          )}
        </div>

        <div className={s.modalPie}>
          <button type="button" className={s.btnSecundario} onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
