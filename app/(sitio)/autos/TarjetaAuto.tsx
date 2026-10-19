import Image from 'next/image';
import type { Auto } from '@/lib/types';
import { formatPrecio, nombreAuto } from '@/lib/formato';
import { ESTADO_CLASE, ESTADO_LABEL } from './estado';
import s from './autos.module.css';

/**
 * Lo que necesitan la tarjeta y el detalle de un auto. `AutoConFotos` lo
 * cumple; la vista previa del panel también, con `precio` nulo cuando el
 * formulario no tiene un precio válido (en el sitio nunca lo es).
 */
export type AutoMostrable = Pick<
  Auto,
  'marca' | 'modelo' | 'version' | 'anio' | 'motor' | 'kilometraje' | 'descripcion' | 'moneda' | 'estado'
> & {
  precio: number | null;
  auto_fotos: { id: number; url: string }[];
};

/** Precio para mostrar; sin precio válido, una raya en vez de un `US$ 0`. */
export function precioMostrable(a: Pick<AutoMostrable, 'precio' | 'moneda'>): string {
  return a.precio === null ? '—' : formatPrecio(a.precio, a.moneda);
}

/** Tarjeta de la grilla de `/autos`. Al hacer clic abre el detalle. */
export default function TarjetaAuto({
  auto,
  alAbrir,
}: {
  auto: AutoMostrable;
  alAbrir: () => void;
}) {
  const foto = auto.auto_fotos[0];
  return (
    <button className={s.autoCard} onClick={alAbrir}>
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
          <span className={s.autoPrice}>{precioMostrable(auto)}</span>
          {auto.kilometraje && <span className={s.autoKm}>{auto.kilometraje}</span>}
        </div>
      </div>
    </button>
  );
}
