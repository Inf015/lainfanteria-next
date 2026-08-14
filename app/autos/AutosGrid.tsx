'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { AutoConFotos, EstadoAuto } from '@/lib/types';
import s from './autos.module.css';

const ESTADO_LABEL: Record<EstadoAuto, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

const ESTADO_CLASE: Record<EstadoAuto, string> = {
  disponible: s.estadoVerde,
  reservado: s.estadoAmarillo,
  vendido: s.estadoGris,
};

function nombreAuto(a: AutoConFotos) {
  return [a.marca, a.modelo, a.version, a.anio].filter(Boolean).join(' ');
}

function formatPrecio(a: AutoConFotos) {
  const simbolo = a.moneda === 'USD' ? 'US$' : 'RD$';
  return `${simbolo} ${new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 }).format(
    a.precio,
  )}`;
}

export default function AutosGrid({
  autos,
  whatsappNumero,
}: {
  autos: AutoConFotos[];
  whatsappNumero: string;
}) {
  const [filtro, setFiltro] = useState<EstadoAuto | null>(null);
  const [detalle, setDetalle] = useState<AutoConFotos | null>(null);
  const [fotoIdx, setFotoIdx] = useState(0);

  const filtrados = filtro ? autos.filter((a) => a.estado === filtro) : autos;
  const cuenta = (e: EstadoAuto) => autos.filter((a) => a.estado === e).length;

  const abrir = (a: AutoConFotos) => {
    setDetalle(a);
    setFotoIdx(0);
  };
  const cerrar = () => setDetalle(null);

  const fotos = detalle?.auto_fotos ?? [];

  // Escape cierra el modal y se bloquea el scroll del fondo mientras está abierto
  useEffect(() => {
    if (!detalle) return;

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
  }, [detalle, fotos.length]);

  const waLink = (a: AutoConFotos) =>
    `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(
      `Hola! Me interesa el ${nombreAuto(a)}. ¿Está disponible?`,
    )}`;

  return (
    <>
      <div className={s.autosFilters}>
        <button
          className={`${s.filterPill} ${filtro === null ? s.pillActive : ''}`}
          onClick={() => setFiltro(null)}
        >
          Todos <span className={s.pillCount}>{autos.length}</span>
        </button>
        <button
          className={`${s.filterPill} ${filtro === 'disponible' ? s.pillActive : ''}`}
          onClick={() => setFiltro('disponible')}
        >
          Disponibles <span className={s.pillCount}>{cuenta('disponible')}</span>
        </button>
        <button
          className={`${s.filterPill} ${filtro === 'reservado' ? s.pillActive : ''}`}
          onClick={() => setFiltro('reservado')}
        >
          Reservados <span className={s.pillCount}>{cuenta('reservado')}</span>
        </button>
      </div>

      {filtrados.length === 0 ? (
        <div className={s.autosEmpty}>
          <div className={s.emptyIcon}>🔍</div>
          <p>No hay autos en esta categoría ahora mismo.</p>
        </div>
      ) : (
        <div className={s.autosGrid}>
          {filtrados.map((auto) => {
            const foto = auto.auto_fotos[0];
            return (
              <button className={s.autoCard} onClick={() => abrir(auto)} key={auto.id}>
                <div className={s.autoCardImgWrap}>
                  {foto ? (
                    <Image
                      src={foto.url}
                      alt={nombreAuto(auto)}
                      fill
                      sizes="(max-width: 560px) 100vw, (max-width: 960px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className={s.autoImgPlaceholder}>
                      <span>🚗</span>
                    </div>
                  )}
                  <div className={s.autoCardOverlay}>
                    <span className={s.overlayCta}>Ver detalle ›</span>
                  </div>
                  <span className={`${s.autoEstado} ${ESTADO_CLASE[auto.estado]}`}>
                    {ESTADO_LABEL[auto.estado]}
                  </span>
                </div>

                <div className={s.autoCardBody}>
                  <div className={s.autoCardTop}>
                    <h3 className={s.autoCardTitle}>
                      {auto.marca} {auto.modelo}
                    </h3>
                    <span className={s.autoCardYear}>{auto.anio ?? ''}</span>
                  </div>
                  {auto.motor && <p className={s.autoCardMotor}>{auto.motor}</p>}
                  <div className={s.autoCardFooter}>
                    <span className={s.autoPrice}>{formatPrecio(auto)}</span>
                    {auto.kilometraje && (
                      <span className={s.autoKm}>{auto.kilometraje}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {detalle && (
        <div
          className={s.overlay}
          onClick={cerrar}
          role="dialog"
          aria-modal="true"
          aria-label={nombreAuto(detalle)}
        >
          <div className={s.autoModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.autoModalGallery}>
              {fotos.length > 0 ? (
                <>
                  <Image
                    className={s.galleryMainImg}
                    src={fotos[fotoIdx].url}
                    alt={nombreAuto(detalle)}
                    fill
                    sizes="(max-width: 680px) 100vw, 55vw"
                    style={{ objectFit: 'cover' }}
                  />
                  {fotos.length > 1 && (
                    <>
                      <button
                        className={`${s.galleryBtn} ${s.galleryPrev}`}
                        onClick={() =>
                          setFotoIdx((i) => (i - 1 + fotos.length) % fotos.length)
                        }
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

              <button className={s.modalCloseBtn} onClick={cerrar} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className={s.autoModalInfo}>
              <div className={s.modalInfoHeader}>
                <span className={`${s.modalEstado} ${ESTADO_CLASE[detalle.estado]}`}>
                  {ESTADO_LABEL[detalle.estado]}
                </span>
                <p className={s.modalYear}>{detalle.anio ?? ''}</p>
              </div>

              <h2 className={s.modalTitle}>
                {detalle.marca} {detalle.modelo}
              </h2>
              <div className={s.modalPrice}>{formatPrecio(detalle)}</div>

              <div className={s.modalSpecs}>
                <div className={s.spec}>
                  <span className={s.specLbl}>Motor</span>
                  <span className={s.specVal}>{detalle.motor || '—'}</span>
                </div>
                {detalle.kilometraje && (
                  <div className={s.spec}>
                    <span className={s.specLbl}>Kilometraje</span>
                    <span className={s.specVal}>{detalle.kilometraje}</span>
                  </div>
                )}
              </div>

              {detalle.descripcion && <p className={s.modalDesc}>{detalle.descripcion}</p>}

              <a
                href={waLink(detalle)}
                target="_blank"
                rel="noopener"
                className={s.btnWaModal}
              >
                <span>💬</span> Consultar por WhatsApp
              </a>

              <p className={s.modalNote}>
                Pagos: efectivo o transferencia · Sin checkout online
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
