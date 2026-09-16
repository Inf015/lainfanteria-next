'use client';

import { useRef, useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import { BUCKET_FOTOS as BUCKET, borrarDelBucket } from '@/lib/storage';
import s from '../../../admin.module.css';

interface Props {
  /** Carpeta dentro del bucket: 'pilotos', 'noticias'… */
  carpeta: string;
  url: string | null;
  onCambio: (url: string | null) => void;
  etiqueta?: string;
}

/**
 * Para entidades con una sola imagen guardada en una columna (pilotos.foto_url,
 * noticias.imagen_portada_url), no en una tabla de fotos aparte.
 *
 * Sube el archivo y devuelve la URL; no toca la base — el formulario que lo usa
 * la guarda junto con el resto de los campos.
 */
export default function SubirFotoUnica({ carpeta, url, onCambio, etiqueta = 'Foto' }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * URLs subidas en esta sesión del formulario.
   *
   * Solo estas se pueden borrar del bucket al descartarlas: todavía no las
   * guardó nadie, así que no hay fila apuntándoles. La URL que venía de la base
   * sigue estando referenciada mientras el formulario no se guarde —cancelar
   * después de reemplazar es normal—, y borrarla acá dejaría una foto rota en
   * el sitio. De esa se ocupa el formulario cuando el cambio se confirma.
   */
  const subidasSinGuardar = useRef(new Set<string>());

  /** Descarta la URL actual, borrando el archivo si era una subida sin guardar. */
  async function descartar(
    db: ReturnType<typeof crearClienteNavegador>,
    anterior: string | null,
  ) {
    if (!anterior || !subidasSinGuardar.current.has(anterior)) return;
    subidasSinGuardar.current.delete(anterior);
    await borrarDelBucket(db, anterior);
  }

  async function subir(archivo: File | undefined) {
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      setError('El archivo tiene que ser una imagen.');
      return;
    }

    setError(null);
    setSubiendo(true);

    const db = crearClienteNavegador();
    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const ruta = `${carpeta}/${crypto.randomUUID()}.${ext}`;

    const { error: err } = await db.storage
      .from(BUCKET)
      .upload(ruta, archivo, { cacheControl: '3600', upsert: false });

    if (err) {
      setError(`No se pudo subir: ${err.message}`);
      setSubiendo(false);
      return;
    }

    const {
      data: { publicUrl },
    } = db.storage.from(BUCKET).getPublicUrl(ruta);

    // La que se reemplaza queda sin nadie que la nombre si era de esta sesión.
    await descartar(db, url);
    subidasSinGuardar.current.add(publicUrl);

    onCambio(publicUrl);
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function quitar() {
    await descartar(crearClienteNavegador(), url);
    onCambio(null);
  }

  return (
    <div className={s.campo}>
      <label className={s.label}>{etiqueta.toUpperCase()}</label>

      {error && <div className={`${s.aviso} ${s.avisoError}`}>{error}</div>}

      {url && (
        <div className={s.grillaFotos} style={{ gridTemplateColumns: '140px' }}>
          <div className={s.fotoItem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" />
            <div className={s.fotoAcciones}>
              <button
                type="button"
                className={`${s.btnFoto} ${s.btnFotoBorrar}`}
                onClick={quitar}
                title="Quitar"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={s.dropZona}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className={s.dropInput}
          onChange={(e) => subir(e.target.files?.[0])}
        />
        <p className={s.dropTexto}>
          {subiendo ? 'Subiendo…' : url ? 'Reemplazar imagen' : 'Elegir imagen'}
        </p>
      </div>
    </div>
  );
}
