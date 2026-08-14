// Tipos de las tablas de Supabase.
// Reflejan supabase/migrations/0001_esquema_inicial.sql — mantener en sync.

export type EstadoAuto = 'disponible' | 'reservado' | 'vendido';
export type Moneda = 'DOP' | 'USD';

/** Clave de sección: cada una se prende/apaga desde la tabla `secciones`. */
export type ClaveSeccion =
  | 'servicios'
  | 'equipo'
  | 'autos'
  | 'merch'
  | 'noticias'
  | 'nosotros';

export interface Seccion {
  clave: ClaveSeccion;
  nombre: string;
  ruta: string;
  activa: boolean;
  orden: number;
}

/** Rol dentro del equipo. Texto libre: sumar uno nuevo no requiere migración. */
export type RolMiembro = 'Piloto' | 'Socio' | 'Mecánico' | (string & {});

export interface Miembro {
  id: number;
  nombre: string;
  /** Número de carrera. Solo aplica a pilotos. */
  numero: string | null;
  roles: RolMiembro[];
  biografia: string;
  foto_url: string | null;
  foto_public_id: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  logros: string[];
  orden: number;
  activo: boolean;
  creado_en: string;
}

export interface Auto {
  id: number;
  marca: string;
  modelo: string;
  version: string | null;
  anio: string | null;
  motor: string | null;
  descripcion: string | null;
  /** Texto libre para soportar "45,000 km" y "28,000 millas". */
  kilometraje: string | null;
  precio: number;
  moneda: Moneda;
  estado: EstadoAuto;
  es_del_equipo: boolean;
  orden: number;
  activo: boolean;
  creado_en: string;
}

export interface AutoFoto {
  id: number;
  auto_id: number;
  url: string;
  cloudinary_public_id: string | null;
  es_principal: boolean;
  orden: number;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number;
  moneda: Moneda;
  tallas: string[];
  colores: string[];
  orden: number;
  activo: boolean;
  creado_en: string;
}

export interface ProductoFoto {
  id: number;
  producto_id: number;
  url: string;
  cloudinary_public_id: string | null;
  es_principal: boolean;
  orden: number;
}

export interface Noticia {
  id: number;
  titulo: string;
  slug: string;
  resumen: string | null;
  cuerpo: string;
  imagen_portada_url: string | null;
  imagen_public_id: string | null;
  categoria: string | null;
  publicada: boolean;
  fecha_publicacion: string | null;
  creada_en: string;
  actualizada_en: string;
}

/** Auto con sus fotos, tal como lo devuelven las queries del listado. */
export type AutoConFotos = Auto & { auto_fotos: AutoFoto[] };

/** Producto con sus fotos. */
export type ProductoConFotos = Producto & { producto_fotos: ProductoFoto[] };
