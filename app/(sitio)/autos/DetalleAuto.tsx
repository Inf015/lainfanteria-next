'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import Image from 'next/image';
import { nombreAuto } from '@/lib/formato';
import { ESTADO_CLASE, ESTADO_LABEL } from './estado';
import { precioMostrable, type AutoMostrable } from './TarjetaAuto';
import s from './autos.module.css';

/**
 * Detalle de un auto: galería + información, en un diálogo sobre la página.
 *
 * Se monta al abrir y se desmonta al cerrar, así que la galería siempre
 * arranca en la primera foto. Mientras está montado, `Escape` lo cierra, ← y →
 * cambian de foto y el scroll del fondo queda bloqueado. Es el único lugar
 * donde vive esa lógica: lo usan `/autos` y la vista previa del panel.
 *
 * `hrefWhatsapp` nulo deja el botón de WhatsApp igual a la vista pero inerte
 * (la vista previa no tiene que abrir un chat de verdad).
 */
export default function DetalleAuto({
  auto,
  alCerrar,
  hrefWhatsapp,
}: {
  auto: AutoMostrable;
  alCerrar: () => void;
  hrefWhatsapp: string | null;
}) {
  const [fotoIdx, setFotoIdx] = useState(0);
  const fotos = auto.auto_fotos;
  const cerrar = useEffectEvent(alCerrar);

  // Escape cierra el modal y se bloquea el scroll del fondo mientras está abierto
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowLeft') setFotoIdx((i) => (i - 1 + fotos.length) % fotos.length);
      if (e.key === 'ArrowRight') setFotoIdx((i) => (i + 1) % fotos.length);
    };
    document.addEventListener('keydown', alPresionar);

    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = previo;
    };
  }, [fotos.length]);

  return (
    <div
      className={s.overlay}
      onClick={alCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={nombreAuto(auto)}
    >
      <div className={s.autoModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.autoModalGallery}>
          {fotos.length > 0 ? (
            <>
              <Image
                className={s.galleryMainImg}
                src={fotos[fotoIdx].url}
                alt={nombreAuto(auto)}
                fill
                sizes="(max-width: 680px) 100vw, 55vw"
                style={{ objectFit: 'cover' }}
              />
              {fotos.length > 1 && (
                <>
                  <button
                    className={`${s.galleryBtn} ${s.galleryPrev}`}
                    onClick={() => setFotoIdx((i) => (i - 1 + fotos.length) % fotos.length)}
                    aria-label="Foto anterior"
                  >
                    ‹
                  </button>
                  <button
                    className={`${s.galleryBtn} ${s.galleryNext}`}
                    onClick={() => setFotoIdx((i) => (i + 1) % fotos.length)}
                    aria-label="Foto siguiente"
                  >
                    ›
                  </button>
                  <div className={s.galleryDots}>
                    {fotos.map((f, i) => (
                      <button
                        key={f.id}
                        className={`${s.dot} ${i === fotoIdx ? s.dotActive : ''}`}
                        onClick={() => setFotoIdx(i)}
                        aria-label={`Foto ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
              <div className={s.galleryCounter}>
                {fotoIdx + 1} / {fotos.length}
              </div>
            </>
          ) : (
            <div className={`${s.autoImgPlaceholder} ${s.galleryPlaceholder}`}>
              <span>🚗</span>
            </div>
          )}

          <button className={s.modalCloseBtn} onClick={alCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={s.autoModalInfo}>
          <div className={s.modalInfoHeader}>
            <span className={`${s.modalEstado} ${ESTADO_CLASE[auto.estado]}`}>
              {ESTADO_LABEL[auto.estado]}
            </span>
            <p className={s.modalYear}>{auto.anio ?? ''}</p>
          </div>

          <h2 className={s.modalTitle}>
            {auto.marca} {auto.modelo}
          </h2>
          <div className={s.modalPrice}>{precioMostrable(auto)}</div>

          <div className={s.modalSpecs}>
            <div className={s.spec}>
              <span className={s.specLbl}>Motor</span>
              <span className={s.specVal}>{auto.motor || '—'}</span>
            </div>
            {auto.kilometraje && (
              <div className={s.spec}>
                <span className={s.specLbl}>Kilometraje</span>
                <span className={s.specVal}>{auto.kilometraje}</span>
              </div>
            )}
          </div>

          {auto.descripcion && <p className={s.modalDesc}>{auto.descripcion}</p>}

          {hrefWhatsapp ? (
            <a href={hrefWhatsapp} target="_blank" rel="noopener" className={s.btnWaModal}>
              <span>💬</span> Consultar por WhatsApp
            </a>
          ) : (
            // Sin `href` no navega ni se puede activar; `aria-disabled` lo dice
            // a los lectores de pantalla.
            <a role="link" aria-disabled="true" className={s.btnWaModal}>
              <span>💬</span> Consultar por WhatsApp
            </a>
          )}

          <p className={s.modalNote}>Pagos: efectivo o transferencia · Sin checkout online</p>
        </div>
      </div>
    </div>
  );
}
