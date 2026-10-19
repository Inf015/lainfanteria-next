'use client';

import { useState } from 'react';
import type { AutoConFotos, EstadoAuto } from '@/lib/types';
import s from './autos.module.css';
import { nombreAuto } from '@/lib/formato';
import TarjetaAuto from './TarjetaAuto';
import DetalleAuto from './DetalleAuto';

export default function AutosGrid({
  autos,
  whatsappNumero,
}: {
  autos: AutoConFotos[];
  whatsappNumero: string;
}) {
  const [filtro, setFiltro] = useState<EstadoAuto | null>(null);
  const [detalle, setDetalle] = useState<AutoConFotos | null>(null);

  const filtrados = filtro ? autos.filter((a) => a.estado === filtro) : autos;
  const cuenta = (e: EstadoAuto) => autos.filter((a) => a.estado === e).length;

  const abrir = (a: AutoConFotos) => setDetalle(a);
  const cerrar = () => setDetalle(null);

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
          {filtrados.map((auto) => (
            <TarjetaAuto auto={auto} alAbrir={() => abrir(auto)} key={auto.id} />
          ))}
        </div>
      )}

      {detalle && (
        <DetalleAuto auto={detalle} alCerrar={cerrar} hrefWhatsapp={waLink(detalle)} />
      )}
    </>
  );
}
