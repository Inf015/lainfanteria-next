import type { EstadoAuto } from '@/lib/types';
import s from './autos.module.css';

/** Etiqueta del estado, compartida por la tarjeta y el detalle. */
export const ESTADO_LABEL: Record<EstadoAuto, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

/** Color del estado, compartido por la tarjeta y el detalle. */
export const ESTADO_CLASE: Record<EstadoAuto, string> = {
  disponible: s.estadoVerde,
  reservado: s.estadoAmarillo,
  vendido: s.estadoGris,
};
