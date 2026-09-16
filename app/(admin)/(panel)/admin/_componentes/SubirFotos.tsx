'use client';

import { useRef, useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import { BUCKET_FOTOS as BUCKET, borrarDelBucket } from '@/lib/storage';
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
 * Galería con subida directa a Supabase Storage.
 *
 * Sube el archivo, crea la fila en la tabla de fotos y devuelve la lista
 * actualizada. Reemplaza el flujo manual de subir a Storage, copiar la URL y
 * crear la fila a mano en el Table Editor.
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
  const inputRef = useRef<HTMLInputElement>(null);

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return;
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

  async function marcarPrincipal(id: number) {
    setError(null);

    const anterior = fotos.find((f) => f.es_principal);
    if (anterior?.id === id) return;

    const db = crearClienteNavegador();

    // El swap va entero del lado del servidor (migración 0012): bajar la
    // principal actual y subir la nueva desde acá serían dos UPDATE sueltos, y
    // si el segundo falla la galería queda sin principal. La función corre en
    // una transacción, así que o cambian las dos filas o no cambia ninguna.
    const { error: err } = await db.rpc('marcar_foto_principal', {
      p_tabla: tabla,
      p_padre_id: registroId,
      p_foto_id: id,
    });

    if (err) {
      setError(err.message);
      return;
    }

    onCambio(fotos.map((f) => ({ ...f, es_principal: f.id === id })));
  }

  async function borrar(foto: FotoFila) {
    if (!confirm('¿Borrar esta foto?')) return;
    setError(null);

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
          {fotos.map((foto) => (
            <div
              key={foto.id}
              className={`${s.fotoItem} ${foto.es_principal ? s.fotoPrincipal : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt="" />
              {foto.es_principal && <span className={s.badgePrincipal}>PRINCIPAL</span>}
              <div className={s.fotoAcciones}>
                {!foto.es_principal && (
                  <button
                    type="button"
                    className={s.btnFoto}
                    onClick={() => marcarPrincipal(foto.id)}
                    title="Usar como principal"
                  >
                    ★
                  </button>
                )}
                <button
                  type="button"
                  className={`${s.btnFoto} ${s.btnFotoBorrar}`}
                  onClick={() => borrar(foto)}
                  title="Borrar"
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
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
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
        La marcada como principal (★) es la que aparece en la tarjeta del sitio. La
        primera que subas queda como principal automáticamente.
      </p>
    </div>
  );
}
