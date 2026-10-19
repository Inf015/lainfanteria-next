'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Image from 'next/image';
import { nombreAuto } from '@/lib/formato';
import { fotoAnterior, fotoSiguiente, indiceValido } from '@/lib/galeria';
import { ESTADO_CLASE, ESTADO_LABEL } from './estado';
import { precioMostrable, type AutoMostrable } from './TarjetaAuto';
import s from './autos.module.css';

/**
 * Detalle de un auto: galería + información, en un diálogo sobre la página.
 *
 * Se monta al abrir y se desmonta al cerrar, así que la galería arranca en la
 * primera foto. Para mostrar **otro** auto, quien lo usa le cambia la `key`
 * (un detalle montado por auto). Si las fotos cambian con el detalle abierto
 * —terminan de subirse o se borran en la vista previa—, el índice se ajusta
 * a la galería nueva (`lib/galeria.ts`): nunca se lee una foto inexistente.
 *
 * Mientras está montado, `Escape` lo cierra, ← y → cambian de foto y el scroll
 * del fondo queda bloqueado. Al abrir, el foco entra al botón de cerrar; al
 * cerrar, vuelve a donde estaba (la tarjeta que lo abrió). Es el único lugar
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
  const [fotoGuardada, setFotoGuardada] = useState(0);
  const fotos = auto.auto_fotos;
  // El índice que se usa siempre es válido para las fotos de este render.
  const fotoIdx = indiceValido(fotoGuardada, fotos.length);
  const cerrar = useEffectEvent(alCerrar);
  const botonCerrar = useRef<HTMLButtonElement>(null);

  // El foco entra al diálogo y, al cerrarlo, vuelve a quien lo tenía antes.
  // Solo se devuelve si el foco quedó en el aire (el elemento enfocado se fue
  // con el diálogo): si el usuario ya lo llevó a otro lado —p. ej. activó otra
  // tarjeta—, no se le quita.
  useEffect(() => {
    const previo = document.activeElement;
    botonCerrar.current?.focus({ preventScroll: true });
    return () => {
      const actual = document.activeElement;
      if (
        previo instanceof HTMLElement &&
        previo.isConnected &&
        (actual === null || actual === document.body)
      ) {
        previo.focus({ preventScroll: true });
      }
    };
  }, []);

  // Escape cierra el modal y se bloquea el scroll del fondo mientras está abierto
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowLeft') setFotoGuardada((i) => fotoAnterior(i, fotos.length));
      if (e.key === 'ArrowRight') setFotoGuardada((i) => fotoSiguiente(i, fotos.length));
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
                    onClick={() => setFotoGuardada((i) => fotoAnterior(i, fotos.length))}
                    aria-label="Foto anterior"
                  >
                    ‹
                  </button>
                  <button
                    className={`${s.galleryBtn} ${s.galleryNext}`}
                    onClick={() => setFotoGuardada((i) => fotoSiguiente(i, fotos.length))}
                    aria-label="Foto siguiente"
                  >
                    ›
                  </button>
                  <div className={s.galleryDots}>
                    {fotos.map((f, i) => (
                      <button
                        key={f.id}
                        className={`${s.dot} ${i === fotoIdx ? s.dotActive : ''}`}
                        onClick={() => setFotoGuardada(i)}
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

          <button
            ref={botonCerrar}
            className={s.modalCloseBtn}
            onClick={alCerrar}
            aria-label="Cerrar"
          >
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
