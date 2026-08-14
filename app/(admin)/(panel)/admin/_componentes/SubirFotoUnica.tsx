'use client';

import { useRef, useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import s from '../../../admin.module.css';

const BUCKET = 'fotos';

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

    onCambio(publicUrl);
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = '';
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
                onClick={() => onCambio(null)}
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
