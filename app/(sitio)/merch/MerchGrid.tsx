'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ProductoConFotos } from '@/lib/types';
import s from './merch.module.css';

function precioTexto(p: ProductoConFotos) {
  const simbolo = p.moneda === 'USD' ? 'US$' : 'RD$';
  return `${simbolo} ${new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 }).format(p.precio)}`;
}

export default function MerchGrid({
  productos,
  whatsappNumero,
}: {
  productos: ProductoConFotos[];
  whatsappNumero: string;
}) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<ProductoConFotos | null>(null);
  const [fotoIdx, setFotoIdx] = useState(0);

  const categorias = Array.from(
    new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c))),
  ).sort();

  const filtrados = categoria
    ? productos.filter((p) => p.categoria === categoria)
    : productos;

  const fotos = detalle?.producto_fotos ?? [];

  useEffect(() => {
    if (!detalle) return;

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetalle(null);
      if (fotos.length > 1) {
        if (e.key === 'ArrowLeft') setFotoIdx((i) => (i - 1 + fotos.length) % fotos.length);
        if (e.key === 'ArrowRight') setFotoIdx((i) => (i + 1) % fotos.length);
      }
    };
    document.addEventListener('keydown', alPresionar);

    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = previo;
    };
  }, [detalle, fotos.length]);

  function abrir(p: ProductoConFotos) {
    setDetalle(p);
    setFotoIdx(0);
  }

  /** El mensaje lleva el producto, y las opciones si el producto las tiene. */
  function waLink(p: ProductoConFotos) {
    const partes = [`Hola! Me interesa el producto "${p.nombre}" (${precioTexto(p)}).`];
    if (p.tallas.length) partes.push(`Tallas disponibles: ${p.tallas.join(', ')}.`);
    if (p.colores.length) partes.push(`Colores: ${p.colores.join(', ')}.`);
    return `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(partes.join(' '))}`;
  }

  return (
    <>
      {categorias.length > 0 && (
        <div className={s.filtros}>
          <button
            className={`${s.pastilla} ${categoria === null ? s.pastillaActiva : ''}`}
            onClick={() => setCategoria(null)}
          >
            Todos <span className={s.pastillaConteo}>{productos.length}</span>
          </button>
          {categorias.map((c) => (
            <button
              key={c}
              className={`${s.pastilla} ${categoria === c ? s.pastillaActiva : ''}`}
              onClick={() => setCategoria(c)}
            >
              {c}{' '}
              <span className={s.pastillaConteo}>
                {productos.filter((p) => p.categoria === c).length}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={s.grilla}>
        {filtrados.map((p) => {
          const foto = p.producto_fotos[0];
          return (
            <button className={s.tarjeta} onClick={() => abrir(p)} key={p.id}>
              <div className={s.tarjetaImg}>
                {foto ? (
                  <Image
                    src={foto.url}
                    alt={p.nombre}
                    fill
                    sizes="(max-width: 460px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className={s.sinFoto}>👕</div>
                )}
                {p.categoria && <span className={s.etiquetaCat}>{p.categoria}</span>}
                <div className={s.overlay}>
                  <span className={s.overlayCta}>Ver detalle ›</span>
                </div>
              </div>

              <div className={s.tarjetaCuerpo}>
                <h3 className={s.tarjetaTitulo}>{p.nombre}</h3>
                {p.tallas.length > 0 && (
                  <p className={s.tarjetaTallas}>{p.tallas.join(' · ')}</p>
                )}
                <div className={s.tarjetaPie}>
                  <span className={s.precio}>{precioTexto(p)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {detalle && (
        <div
          className={s.modalFondo}
          onClick={() => setDetalle(null)}
          role="dialog"
          aria-modal="true"
          aria-label={detalle.nombre}
        >
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalGaleria}>
              {fotos.length > 0 ? (
                <>
                  <Image
                    src={fotos[fotoIdx].url}
                    alt={detalle.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, 52vw"
                    style={{ objectFit: 'cover' }}
                  />
                  {fotos.length > 1 && (
                    <>
                      <button
                        className={`${s.galeriaBtn} ${s.galeriaPrev}`}
                        onClick={() =>
                          setFotoIdx((i) => (i - 1 + fotos.length) % fotos.length)
                        }
                        aria-label="Foto anterior"
                      >
                        ‹
                      </button>
                      <button
                        className={`${s.galeriaBtn} ${s.galeriaNext}`}
                        onClick={() => setFotoIdx((i) => (i + 1) % fotos.length)}
                        aria-label="Foto siguiente"
                      >
                        ›
                      </button>
                      <div className={s.puntos}>
                        {fotos.map((f, i) => (
                          <button
                            key={f.id}
                            className={`${s.punto} ${i === fotoIdx ? s.puntoActivo : ''}`}
                            onClick={() => setFotoIdx(i)}
                            aria-label={`Foto ${i + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className={s.sinFoto}>👕</div>
              )}

              <button
                className={s.cerrar}
                onClick={() => setDetalle(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className={s.modalInfo}>
              {detalle.categoria && <span className={s.modalCat}>{detalle.categoria}</span>}
              <h2 className={s.modalTitulo}>{detalle.nombre}</h2>
              <div className={s.modalPrecio}>{precioTexto(detalle)}</div>

              {detalle.descripcion && <p className={s.modalDesc}>{detalle.descripcion}</p>}

              {detalle.tallas.length > 0 && (
                <div className={s.grupoOpciones}>
                  <span className={s.grupoLabel}>Tallas</span>
                  <div className={s.opciones}>
                    {detalle.tallas.map((t) => (
                      <span className={s.opcion} key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detalle.colores.length > 0 && (
                <div className={s.grupoOpciones}>
                  <span className={s.grupoLabel}>Colores</span>
                  <div className={s.opciones}>
                    {detalle.colores.map((c) => (
                      <span className={s.opcion} key={c}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <a
                href={waLink(detalle)}
                target="_blank"
                rel="noopener"
                className={s.btnWaModal}
              >
                <span>💬</span> Pedir por WhatsApp
              </a>

              <p className={s.nota}>
                Coordinamos talla, color y entrega por WhatsApp · Sin checkout online
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
