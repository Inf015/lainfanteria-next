'use client';

import { useCallback, useRef, useState, useSyncExternalStore, type DragEvent } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import { BUCKET_FOTOS as BUCKET, borrarDelBucket } from '@/lib/storage';
import {
  candadosDeGaleria,
  claveGaleria,
  enExclusiva,
  moverFoto,
  normalizarGaleria,
} from '@/lib/galeria';
import s from '../../../admin.module.css';

export interface FotoFila {
  id: number;
  url: string;
  es_principal: boolean;
  orden: number;
}

interface Props {
  /** Tabla donde se guardan las filas de foto. */
  tabla: 'auto_fotos' | 'producto_fotos';
  /** Columna que apunta al registro padre. */
  campoId: 'auto_id' | 'producto_id';
  /** Id del registro padre. */
  registroId: number;
  fotos: FotoFila[];
  onCambio: (fotos: FotoFila[]) => void;
}

/**
 * Tipo de dato propio que viaja en el `dataTransfer` al arrastrar una
 * miniatura. Es lo que distingue un reordenamiento de un archivo que viene del
 * sistema: la zona de subida ignora los arrastres que lo traen, y la grilla
 * ignora los que no.
 */
const MIME_FOTO = 'application/x-lainfanteria-foto';

function esArrastreDeFoto(e: DragEvent) {
  return e.dataTransfer.types.includes(MIME_FOTO);
}

const AVISO_OCUPADO =
  'Hay una operación de la galería en curso. Esperá a que termine y volvé a intentar.';

function mensaje(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Galería con subida directa a Supabase Storage.
 *
 * Sube el archivo, crea la fila en la tabla de fotos y devuelve la lista
 * actualizada. Reemplaza el flujo manual de subir a Storage, copiar la URL y
 * crear la fila a mano en el Table Editor.
 *
 * La primera foto de la galería es la principal. Se reordena arrastrando o con
 * ◀ ▶, y la ★ manda una foto al primer lugar; todo pasa por la RPC
 * `reordenar_fotos` (migración 0014), que guarda orden y principal juntos en
 * una sola transacción.
 *
 * Concurrencia: subir, mover, ★ y borrar pasan todas por un mismo candado
 * (`enExclusiva`, en `lib/galeria.ts`) y nunca corren dos a la vez. Eso es lo
 * que permite que cada una arme su lista a partir del `fotos` que había al
 * empezar, aunque publique después de varios `await`: mientras está en vuelo
 * nadie más puede cambiar la galería. Ver el comentario de cada operación.
 *
 * El candado es **de la galería**, no de esta instancia (`candadosDeGaleria`,
 * con clave `tabla:registroId`): cerrar el modal desmonta el componente pero
 * no corta la operación, y la instancia que se monte al reabrir tiene que ver
 * la galería ocupada hasta que esa operación termine (T-011-D01, ronda 3).
 */
export default function SubirFotos({
  tabla,
  campoId,
  registroId,
  fotos,
  onCambio,
}: Props) {
  /** Cuántas fotos de la subida en curso faltan; solo para el texto. */
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  /** Posición de la miniatura que se está arrastrando, y la de destino. */
  const [arrastrada, setArrastrada] = useState<number | null>(null);
  const [destino, setDestino] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clave = claveGaleria(tabla, registroId);
  /**
   * Si la galería tiene una operación en vuelo, la haya empezado esta
   * instancia u otra ya desmontada. Es el espejo del candado para el render
   * (deshabilitar controles); la fuente de verdad es el candado, síncrono.
   */
  const ocupado = useSyncExternalStore(
    useCallback((avisar: () => void) => candadosDeGaleria.suscribir(clave, avisar), [clave]),
    () => candadosDeGaleria.tomado(clave),
    () => false,
  );

  /**
   * Corre una operación de la galería en exclusiva. Si ya hay otra en vuelo,
   * no la corre y muestra el aviso. Devuelve si corrió.
   */
  async function exclusiva(operacion: () => Promise<void>) {
    const corrio = await enExclusiva(candadosDeGaleria.candado(clave), async () => {
      setError(null);
      await operacion();
    });
    if (!corrio) setError(AVISO_OCUPADO);
    return corrio;
  }

  /**
   * Publica las filas nuevas pase lo que pase: aunque una foto posterior
   * falle o algo lance, las que ya se insertaron existen en la base y la lista
   * local tiene que mostrarlas.
   *
   * `[...fotos, ...nuevas]` usa el `fotos` capturado al empezar. Es la galería
   * vigente porque el candado no deja correr ninguna otra operación hasta que
   * esta termine (antes, una segunda subida en paralelo publicaba su captura y
   * pisaba lo que había hecho la primera y un reordenamiento posterior: D01).
   */
  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return;
    const corrio = await exclusiva(() => subirArchivos(archivos));
    if (!corrio && inputRef.current) inputRef.current.value = '';
  }

  async function subirArchivos(archivos: FileList) {
    setSubiendo(archivos.length);

    const db = crearClienteNavegador();
    const nuevas: FotoFila[] = [];

    try {
      for (const archivo of Array.from(archivos)) {
        if (!archivo.type.startsWith('image/')) {
          setError(`"${archivo.name}" no es una imagen.`);
          continue;
        }

        const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const ruta = `${campoId.replace('_id', '')}/${registroId}/${crypto.randomUUID()}.${ext}`;

        const { error: errSubida } = await db.storage
          .from(BUCKET)
          .upload(ruta, archivo, { cacheControl: '3600', upsert: false });

        if (errSubida) {
          setError(`No se pudo subir "${archivo.name}": ${errSubida.message}`);
          continue;
        }

        const {
          data: { publicUrl },
        } = db.storage.from(BUCKET).getPublicUrl(ruta);

        // La primera foto del registro queda como principal automáticamente.
        const esPrimera = fotos.length === 0 && nuevas.length === 0;

        const { data, error: errFila } = await db
          .from(tabla)
          .insert({
            [campoId]: registroId,
            url: publicUrl,
            es_principal: esPrimera,
            orden: fotos.length + nuevas.length,
          })
          .select('id, url, es_principal, orden')
          .single();

        if (errFila) {
          // La fila falló: borramos el archivo para no dejar huérfanos.
          await db.storage.from(BUCKET).remove([ruta]);
          setError(`No se pudo registrar "${archivo.name}": ${errFila.message}`);
          continue;
        }

        nuevas.push(data as FotoFila);
      }
    } catch (e) {
      setError(`Se cortó la subida: ${mensaje(e)}`);
    } finally {
      if (nuevas.length) onCambio([...fotos, ...nuevas]);
      setSubiendo(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  /**
   * Mueve la foto de `desde` a `hasta` y lo guarda al instante.
   *
   * Optimista: la galería cambia en pantalla antes de que conteste la base, y
   * si la RPC falla vuelve a la lista anterior. La RPC recibe la galería
   * entera y escribe orden y principal en una transacción, así que no hay
   * estado intermedio posible ni en la base ni acá.
   *
   * Publica dos veces como mucho: `normalizada` antes del `await`, y
   * `anterior` si falla. `anterior` es el `fotos` capturado al empezar y sigue
   * siendo lo que hay en la base, porque el candado no deja que otra operación
   * cambie la galería mientras la RPC está en vuelo.
   */
  async function mover(desde: number, hasta: number) {
    const anterior = fotos;
    const nueva = moverFoto(anterior, desde, hasta);
    if (nueva.every((f, i) => f.id === anterior[i].id)) return;

    await exclusiva(async () => {
      const normalizada = normalizarGaleria(nueva);
      onCambio(normalizada);

      try {
        const db = crearClienteNavegador();
        const { error: err } = await db.rpc('reordenar_fotos', {
          p_tabla: tabla,
          p_padre_id: registroId,
          p_ids: normalizada.map((f) => f.id),
        });

        if (err) {
          onCambio(anterior);
          setError(`No se pudo guardar el orden: ${err.message}`);
        }
      } catch (e) {
        onCambio(anterior);
        setError(`No se pudo guardar el orden: ${mensaje(e)}`);
      }
    });
  }

  function soltarSobre(e: DragEvent, hasta: number) {
    // Siempre se cancela el default: un archivo del sistema soltado sobre la
    // grilla haría que el navegador lo abra y se pierda el panel. Pero solo un
    // arrastre de miniatura reordena; los archivos se suben en la zona de
    // abajo.
    e.preventDefault();
    const desde = arrastrada;
    setArrastrada(null);
    setDestino(null);
    if (!esArrastreDeFoto(e) || desde === null) return;
    mover(desde, hasta);
  }

  async function borrar(foto: FotoFila) {
    if (candadosDeGaleria.tomado(clave)) {
      setError(AVISO_OCUPADO);
      return;
    }
    if (!confirm('¿Borrar esta foto?')) return;
    // `confirm` frena el hilo: entre la pregunta y esta línea no pudo arrancar
    // ninguna otra operación, así que `fotos` sigue vigente.
    await exclusiva(() => borrarFila(foto));
  }

  /**
   * DELETE → renormalizar (RPC) → liberar el bucket → publicar.
   *
   * Una vez que el DELETE salió bien, la lista local refleja el borrado pase
   * lo que pase después (T-011-D03): la publicación va en un `finally`, así
   * que ni una RPC que lanza ni un bucket que lanza dejan la foto borrada en
   * pantalla. Se eligió `finally` y no publicar antes del bucket para no
   * mover el orden de CA-9 (el bucket se libera después de renormalizar) y
   * para que la lista que se publica sea la final, con o sin renormalizar.
   *
   * `restantes` sale del `fotos` capturado al empezar; sigue vigente porque el
   * candado está tomado hasta que esta función termina.
   */
  async function borrarFila(foto: FotoFila) {
    const db = crearClienteNavegador();
    const { error: err } = await db.from(tabla).delete().eq('id', foto.id);
    if (err) {
      setError(err.message);
      return;
    }

    // Borrar la principal dejaba la galería sin principal. Ahora, con la fila
    // ya borrada, se renormaliza lo que queda: la que era segunda pasa a ser
    // la primera y la principal, y el `orden` queda sin huecos.
    //
    // Si esta RPC falla la fila igual ya no existe, así que la lista local
    // queda sin ella y con los valores que de verdad tiene la base (sin
    // normalizar). Si la borrada era la principal, la galería queda sin
    // principal hasta el próximo reordenamiento: ese riesgo lo cierra un
    // borrado atómico (borrar + renormalizar en una transacción), que es otra
    // tarea.
    const restantes = fotos.filter((f) => f.id !== foto.id);
    let quedaron = restantes;

    try {
      if (restantes.length > 0) {
        const normalizada = normalizarGaleria(restantes);
        try {
          const { error: errOrden } = await db.rpc('reordenar_fotos', {
            p_tabla: tabla,
            p_padre_id: registroId,
            p_ids: normalizada.map((f) => f.id),
          });
          if (errOrden) {
            setError(`La foto se borró, pero no se pudo reordenar la galería: ${errOrden.message}`);
          } else {
            quedaron = normalizada;
          }
        } catch (e) {
          setError(`La foto se borró, pero no se pudo reordenar la galería: ${mensaje(e)}`);
        }
      }

      // El archivo se borra después: si esto falla queda un huérfano en
      // Storage, molesto pero inofensivo. Al revés dejaría una foto rota en el
      // sitio. Por eso un fallo acá se registra y no se muestra como error.
      try {
        await borrarDelBucket(db, foto.url);
      } catch (e) {
        console.error(`No se pudo liberar ${foto.url} del bucket:`, mensaje(e));
      }
    } finally {
      onCambio(quedaron);
    }
  }

  return (
    <div className={s.fotosSeccion}>
      <h4 className={s.fotosTitulo}>Fotos</h4>

      {error && <div className={`${s.aviso} ${s.avisoError}`}>{error}</div>}

      {fotos.length > 0 && (
        <div className={s.grillaFotos}>
          {fotos.map((foto, i) => (
            <div
              key={foto.id}
              className={[
                s.fotoItem,
                foto.es_principal ? s.fotoPrincipal : '',
                arrastrada === i ? s.fotoArrastrada : '',
                destino === i && arrastrada !== i ? s.fotoDestino : '',
              ].join(' ')}
              draggable={!ocupado}
              onDragStart={(e) => {
                e.dataTransfer.setData(MIME_FOTO, String(foto.id));
                e.dataTransfer.effectAllowed = 'move';
                setArrastrada(i);
              }}
              onDragEnd={() => {
                setArrastrada(null);
                setDestino(null);
              }}
              onDragOver={(e) => {
                // preventDefault siempre (ver `soltarSobre`); el efecto solo se
                // anuncia como «mover» para las miniaturas.
                e.preventDefault();
                if (esArrastreDeFoto(e)) {
                  e.dataTransfer.dropEffect = 'move';
                  if (destino !== i) setDestino(i);
                } else {
                  e.dataTransfer.dropEffect = 'none';
                }
              }}
              onDrop={(e) => soltarSobre(e, i)}
            >
              {/* La imagen no se arrastra sola: el que se arrastra es el
                  recuadro, que es el que lleva el tipo propio de dato. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt="" draggable={false} />
              {foto.es_principal && <span className={s.badgePrincipal}>PRINCIPAL</span>}
              <div className={s.fotoAcciones}>
                <button
                  type="button"
                  className={s.btnFoto}
                  onClick={() => mover(i, i - 1)}
                  disabled={ocupado || i === 0}
                  title="Mover a la izquierda"
                  aria-label="Mover a la izquierda"
                >
                  ◀
                </button>
                {i > 0 && (
                  <button
                    type="button"
                    className={s.btnFoto}
                    onClick={() => mover(i, 0)}
                    disabled={ocupado}
                    title="Mandar al primer lugar"
                    aria-label="Mandar al primer lugar"
                  >
                    ★
                  </button>
                )}
                <button
                  type="button"
                  className={s.btnFoto}
                  onClick={() => mover(i, i + 1)}
                  disabled={ocupado || i === fotos.length - 1}
                  title="Mover a la derecha"
                  aria-label="Mover a la derecha"
                >
                  ▶
                </button>
                <button
                  type="button"
                  className={`${s.btnFoto} ${s.btnFotoBorrar}`}
                  onClick={() => borrar(foto)}
                  disabled={ocupado}
                  title="Borrar"
                  aria-label="Borrar"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className={`${s.dropZona} ${arrastrando ? s.dropZonaActiva : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          // Una miniatura arrastrada hasta acá no es una subida: ni se ilumina
          // la zona ni se acepta el drop.
          if (esArrastreDeFoto(e)) {
            e.dataTransfer.dropEffect = 'none';
            return;
          }
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          if (esArrastreDeFoto(e)) return;
          subir(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className={s.dropInput}
          onChange={(e) => subir(e.target.files)}
        />
        <p className={s.dropTexto}>
          {subiendo > 0
            ? `Subiendo ${subiendo} foto${subiendo === 1 ? '' : 's'}…`
            : 'Arrastrá fotos acá o hacé clic para elegirlas'}
        </p>
      </div>

      <p className={s.ayuda}>
        La primera foto es la principal: es la que aparece en la tarjeta del sitio, y
        las demás salen en este mismo orden. Arrastralas o usá ◀ ▶ para
        reordenarlas; la ★ manda una foto al primer lugar.
      </p>
    </div>
  );
}
