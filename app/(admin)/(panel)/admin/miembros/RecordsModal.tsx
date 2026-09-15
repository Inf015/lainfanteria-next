'use client';

import { useEffect, useRef, useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import type { AlcanceRecord, Miembro, RecordDeportivo, UnidadVelocidad } from '@/lib/types';
import { etiquetaRecord, formatearMarca, ordenarRecords, SIMBOLO_VELOCIDAD } from '@/lib/records';
import { fechaLogro } from '@/lib/palmares';
import {
  aFilaRecord,
  formDesdeRecord,
  formVacio,
  validarRecord,
  type FormRecord,
} from '@/lib/records-form';
import s from '../../../admin.module.css';

/**
 * Récords de un miembro: la lista y el formulario de alta/edición.
 *
 * Aparte de `PalmaresModal.tsx` a propósito: un récord no es un trofeo con
 * otro nombre (`docs/pm/backlog/EPICA-records.md`), tiene su propia validación
 * (`lib/records-form.ts`) y sus propias acciones (marcar superado/vigente).
 *
 * Ronda 2 (T-002-D01): cada guardado/borrado se reporta al padre por
 * `miembroId` (el dueño real del récord, no el miembro del modal actualmente
 * abierto) para que la lista global se actualice por id sobre el estado más
 * reciente; el propio estado del formulario (form/error/guardando) solo se
 * toca si la respuesta sigue perteneciendo al borrador vigente y el modal
 * sigue montado.
 */

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

const ALCANCES: { valor: AlcanceRecord | 'ninguno'; texto: string }[] = [
  { valor: 'nacional', texto: 'Nacional' },
  { valor: 'pista', texto: 'De pista' },
  { valor: 'evento', texto: 'De evento' },
  { valor: 'ninguno', texto: 'Ninguno — no suma' },
];

const UNIDADES: UnidadVelocidad[] = ['mph', 'km_h'];

interface Props {
  miembro: Miembro;
  onCerrar: () => void;
  /** El récord ya guardado (alta o edición), y de qué miembro es realmente dueño. */
  onGuardado: (miembroId: number, fila: RecordDeportivo) => void;
  onBorrado: (miembroId: number, id: number) => void;
}

export default function RecordsModal({ miembro, onCerrar, onGuardado, onBorrado }: Props) {
  const records = ordenarRecords(miembro.records ?? []);

  const [editando, setEditando] = useState<RecordDeportivo | null>(null);
  const [form, setForm] = useState<FormRecord | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada alta/edición nueva (o Cancelar) arranca un "borrador" distinto: una
  // respuesta que llega después de eso ya no debe tocar form/error/guardando
  // (T-002-D01-c). `montadoRef` cubre además el caso de cerrar el modal.
  const borradorRef = useRef(0);
  const montadoRef = useRef(true);
  useEffect(
    () => () => {
      montadoRef.current = false;
    },
    [],
  );

  const errorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current.focus();
    }
  }, [error]);

  function borradorSigueVigente(id: number) {
    return montadoRef.current && borradorRef.current === id;
  }

  function abrirNuevo() {
    borradorRef.current += 1;
    setEditando(null);
    setForm(formVacio());
    setError(null);
  }

  function abrirEdicion(r: RecordDeportivo) {
    borradorRef.current += 1;
    setEditando(r);
    setForm(formDesdeRecord(r));
    setError(null);
  }

  function cancelar() {
    borradorRef.current += 1;
    setForm(null);
    setEditando(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form || guardando) return;

    const mensaje = validarRecord(form);
    if (mensaje) {
      setError(mensaje);
      return;
    }

    const miBorrador = borradorRef.current;
    setGuardando(true);
    setError(null);
    const db = crearClienteNavegador();

    if (editando) {
      // El dueño es el del récord que se edita, nunca el miembro del modal
      // actualmente abierto: si una respuesta tardía de otro miembro llegó a
      // reemplazar records acá adentro, guardar igual no debe reasignarlos.
      const miembroIdDueño = editando.miembro_id;
      if (miembroIdDueño === null) {
        if (borradorSigueVigente(miBorrador)) {
          setError('Este récord no tiene miembro asociado.');
          setGuardando(false);
        }
        return;
      }
      const fila = aFilaRecord(form, miembroIdDueño);
      const { data, error: err } = await db
        .from('records')
        .update(fila)
        .eq('id', editando.id)
        .eq('miembro_id', miembroIdDueño)
        .select('*')
        .single();
      if (err) {
        if (borradorSigueVigente(miBorrador)) {
          setError(err.message);
          setGuardando(false);
        }
        return;
      }
      onGuardado(miembroIdDueño, data as RecordDeportivo);
    } else {
      const fila = aFilaRecord(form, miembro.id);
      const { data, error: err } = await db
        .from('records')
        .insert(fila)
        .select('*')
        .single();
      if (err) {
        if (borradorSigueVigente(miBorrador)) {
          setError(err.message);
          setGuardando(false);
        }
        return;
      }
      onGuardado(miembro.id, data as RecordDeportivo);
    }

    if (borradorSigueVigente(miBorrador)) {
      setGuardando(false);
      setForm(null);
      setEditando(null);
    }
  }

  async function alternarVigente(r: RecordDeportivo) {
    const miembroIdDueño = r.miembro_id;
    if (miembroIdDueño === null) return;

    const db = crearClienteNavegador();
    const { data, error: err } = await db
      .from('records')
      .update({ vigente: !r.vigente })
      .eq('id', r.id)
      .eq('miembro_id', miembroIdDueño)
      .select('*')
      .single();
    if (err) {
      if (montadoRef.current) setError(err.message);
      return;
    }
    onGuardado(miembroIdDueño, data as RecordDeportivo);
    if (montadoRef.current) setError(null);
  }

  async function borrar(r: RecordDeportivo) {
    if (!confirm(`¿Borrar "${r.titulo}"?`)) return;

    const miembroIdDueño = r.miembro_id;
    if (miembroIdDueño === null) return;

    const db = crearClienteNavegador();
    const { error: err } = await db
      .from('records')
      .delete()
      .eq('id', r.id)
      .eq('miembro_id', miembroIdDueño);
    if (err) {
      if (montadoRef.current) setError(err.message);
      return;
    }
    onBorrado(miembroIdDueño, r.id);
    if (montadoRef.current) setError(null);
  }

  return (
    <div className={s.modalFondo} onClick={onCerrar}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalCabecera}>
          <h2 className={s.modalTitulo}>Récords de {miembro.nombre}</h2>
          <button className={s.modalCerrar} onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={s.modalCuerpo}>
          {error && (
            <div className={s.error} role="alert" tabIndex={-1} ref={errorRef}>
              {error}
            </div>
          )}

          {form ? (
            <form id="form-record" onSubmit={guardar} noValidate>
              <div className={s.campo}>
                <label className={s.label}>TÍTULO *</label>
                <textarea
                  className={s.textarea}
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="1/4 de milla"
                />
                <p className={s.ayuda}>
                  La disciplina (1/4 de milla) o el hito completo
                </p>
              </div>

              <div className={s.fila}>
                <div className={s.campo}>
                  <label className={s.label}>TIEMPO (S)</label>
                  <input
                    className={s.input}
                    type="text"
                    inputMode="decimal"
                    value={form.tiempo_s}
                    onChange={(e) => setForm({ ...form, tiempo_s: e.target.value })}
                    placeholder="9.874"
                  />
                </div>

                <div className={s.campo}>
                  <label className={s.label}>VELOCIDAD</label>
                  <div className={s.fila}>
                    <input
                      className={s.input}
                      type="text"
                      inputMode="decimal"
                      value={form.velocidad}
                      onChange={(e) => setForm({ ...form, velocidad: e.target.value })}
                      placeholder="142.5"
                    />
                    <select
                      className={s.input}
                      value={form.unidad_velocidad}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          unidad_velocidad: e.target.value as UnidadVelocidad,
                        })
                      }
                    >
                      {UNIDADES.map((u) => (
                        <option value={u} key={u}>
                          {SIMBOLO_VELOCIDAD[u]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={s.campo}>
                <label className={s.label}>ALCANCE *</label>
                <select
                  className={s.input}
                  value={form.alcance}
                  onChange={(e) =>
                    setForm({ ...form, alcance: e.target.value as FormRecord['alcance'] })
                  }
                >
                  <option value="" disabled>
                    — elegí —
                  </option>
                  {ALCANCES.map((a) => (
                    <option value={a.valor} key={a.valor}>
                      {a.texto}
                    </option>
                  ))}
                </select>
                <p className={s.ayuda}>
                  Solo los nacionales vigentes suman en la tarjeta del piloto
                </p>
              </div>

              <div className={s.fila}>
                <div className={s.campo}>
                  <label className={s.label}>CATEGORÍA</label>
                  <input
                    className={s.input}
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    placeholder="Street Modified"
                  />
                </div>
                <div className={s.campo}>
                  <label className={s.label}>AUTO</label>
                  <input
                    className={s.input}
                    value={form.auto}
                    onChange={(e) => setForm({ ...form, auto: e.target.value })}
                  />
                </div>
              </div>

              <div className={s.fila}>
                <div className={s.campo}>
                  <label className={s.label}>LUGAR</label>
                  <input
                    className={s.input}
                    value={form.lugar}
                    onChange={(e) => setForm({ ...form, lugar: e.target.value })}
                  />
                </div>
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
              </div>

              <div className={s.campo}>
                <label className={s.label}>FUENTE</label>
                <input
                  className={s.input}
                  value={form.fuente_url}
                  onChange={(e) => setForm({ ...form, fuente_url: e.target.value })}
                  placeholder="https://…"
                />
              </div>

              <div className={s.checkFila}>
                <input
                  type="checkbox"
                  id="record-vigente"
                  checked={form.vigente}
                  onChange={(e) => setForm({ ...form, vigente: e.target.checked })}
                />
                <label htmlFor="record-vigente">Vigente</label>
              </div>

              <div className={s.barraAcciones} style={{ marginTop: '1rem' }}>
                <button type="button" className={s.btnSecundario} onClick={cancelar}>
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
                  + Agregar récord
                </button>
              </div>

              {records.length === 0 ? (
                <p className={s.vacio}>Todavía no tiene récords cargados.</p>
              ) : (
                <div className={s.tablaWrap}>
                  <table className={s.tabla}>
                    <thead>
                      <tr>
                        <th>Récord</th>
                        <th>Marca</th>
                        <th>Cuándo</th>
                        <th>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => {
                        const suma = r.vigente && r.alcance === 'nacional';
                        return (
                          <tr key={r.id}>
                            <td>
                              <strong>{r.titulo}</strong>
                              {r.categoria && (
                                <>
                                  <br />
                                  <span className={s.ayuda}>{r.categoria}</span>
                                </>
                              )}
                              <br />
                              <span className={`${s.pill} ${s.pillGris}`}>
                                {etiquetaRecord(r)}
                              </span>
                              {suma && (
                                <span
                                  className={`${s.pill} ${s.pillAmarillo}`}
                                  style={{ marginLeft: '0.35rem' }}
                                >
                                  SUMA
                                </span>
                              )}
                            </td>
                            <td>{formatearMarca(r)}</td>
                            <td>{fechaLogro(r) || '—'}</td>
                            <td>
                              <span
                                className={`${s.pill} ${r.vigente ? s.pillVerde : s.pillGris}`}
                              >
                                {r.vigente ? 'VIGENTE' : 'SUPERADO'}
                              </span>
                            </td>
                            <td className={s.celdaAcciones}>
                              <button
                                className={s.btnAccion}
                                onClick={() => alternarVigente(r)}
                              >
                                {r.vigente ? 'Marcar superado' : 'Marcar vigente'}
                              </button>
                              <button
                                className={`${s.btnAccion} ${s.btnEditar}`}
                                onClick={() => abrirEdicion(r)}
                              >
                                Editar
                              </button>
                              <button
                                className={`${s.btnAccion} ${s.btnBorrar}`}
                                onClick={() => borrar(r)}
                              >
                                Borrar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
