'use client';

import { useRef, useState, type DragEvent } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import { BUCKET_FOTOS as BUCKET, borrarDelBucket } from '@/lib/storage';
import { moverFoto, normalizarGaleria } from '@/lib/galeria';
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
 */
export default function SubirFotos({
  tabla,
  campoId,
  registroId,
  fotos,
  onCambio,
}: Props) {
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  /** Hay un reordenamiento o un borrado esperando respuesta de la base. */
  const [ocupado, setOcupado] = useState(false);
  /** Posición de la miniatura que se está arrastrando, y la de destino. */
  const [arrastrada, setArrastrada] = useState<number | null>(null);
  const [destino, setDestino] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // El estado `ocupado` tarda un render en deshabilitar los botones; el ref
  // corta en el acto un segundo clic que llegue antes.
  const ocupadoRef = useRef(false);

  // Una subida en curso también bloquea el orden: `subir` termina con
  // `onCambio([...fotos, ...nuevas])` sobre la lista que tenía al empezar, y
  // pisaría un reordenamiento hecho mientras tanto.
  const bloqueado = ocupado || subiendo > 0;

  function empezar() {
    if (ocupadoRef.current) return false;
    ocupadoRef.current = true;
    setOcupado(true);
    setError(null);
    return true;
  }

  function terminar() {
    ocupadoRef.current = false;
    setOcupado(false);
  }

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return;
    // Al revés que arriba: un reordenamiento en vuelo ya mandó su lista a
    // `onCambio`, y una subida que arranque sobre la anterior la pisaría.
    if (ocupadoRef.current) {
      setError('Esperá a que termine de guardarse la galería y volvé a elegir las fotos.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setError(null);
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

      if (nuevas.length) onCambio([...fotos, ...nuevas]);
    } finally {
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
   */
  async function mover(desde: number, hasta: number) {
    const anterior = fotos;
    const nueva = moverFoto(anterior, desde, hasta);
    if (nueva.every((f, i) => f.id === anterior[i].id)) return;
    if (!empezar()) return;

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
      setError(`No se pudo guardar el orden: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      terminar();
    }
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
    if (!esArrastreDeFoto(e) || desde === null || bloqueado) return;
    mover(desde, hasta);
  }

  async function borrar(foto: FotoFila) {
    if (ocupadoRef.current) return;
    if (!confirm('¿Borrar esta foto?')) return;
    if (!empezar()) return;
    try {
      await borrarFila(foto);
    } finally {
      terminar();
    }
  }

  async function borrarFila(foto: FotoFila) {
    const db = crearClienteNavegador();
    const { error: err } = await db.from(tabla).delete().eq('id', foto.id);
    if (err) {
      setError(err.message);
      return;
    }

    // El archivo se borra después: si esto falla queda un huérfano en Storage,
    // molesto pero inofensivo. Al revés dejaría una foto rota en el sitio.
    await borrarDelBucket(db, foto.url);

    onCambio(fotos.filter((f) => f.id !== foto.id));
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
              draggable={!bloqueado}
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
                  disabled={bloqueado || i === 0}
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
                    disabled={bloqueado}
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
                  disabled={bloqueado || i === fotos.length - 1}
                  title="Mover a la derecha"
                  aria-label="Mover a la derecha"
                >
                  ▶
                </button>
                <button
                  type="button"
                  className={`${s.btnFoto} ${s.btnFotoBorrar}`}
                  onClick={() => borrar(foto)}
                  disabled={bloqueado}
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
