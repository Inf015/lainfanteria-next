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
  | 'videos'
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

/**
 * Puesto conseguido. `otro` cubre trofeos y reconocimientos que no son un lugar
 * del podio, como el trofeo a la SUV más rápida de un evento.
 */
export type PosicionLogro = 'campeon' | 'primero' | 'segundo' | 'tercero' | 'otro';

/**
 * Las tres cosas distintas que hay en el calendario: la puntuable, que corre
 * unas cuatro veces al año; el evento suelto (Dominican Roll Race, BP Day…),
 * una o dos veces al año; y el campeonato, que cierra la temporada.
 */
export type TipoCompetencia = 'campeonato' | 'puntuable' | 'evento';

export interface Logro {
  id: number;
  miembro_id: number;
  posicion: PosicionLogro;
  tipo: TipoCompetencia;
  /** Texto completo: incluye evento y categoría, tal como se carga en el panel. */
  titulo: string;
  /** Nulo cuando el logro se cargó sin fecha. */
  anio: number | null;
  /** 1-12. Nulo cuando solo se conoce el año, que es el caso más común. */
  mes: number | null;
  /** Cuál de las puntuables del año (1ra, 2da…). Nulo fuera de las puntuables. */
  ronda: number | null;
  /** Si sube a la tarjeta de la grilla. La página del miembro los muestra todos. */
  destacado: boolean;
  /** Foto del trofeo, opcional. */
  foto_url: string | null;
  creado_en: string;
}

export interface Miembro {
  id: number;
  nombre: string;
  /** Identificador de su página: /equipo/<slug>. */
  slug: string;
  /** Número de carrera. Solo aplica a pilotos. */
  numero: string | null;
  roles: RolMiembro[];
  biografia: string;
  foto_url: string | null;
  foto_public_id: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  /**
   * Total declarado de trofeos. Manda sobre la cantidad de fichas cargadas, que
   * son solo las destacadas: un piloto con cien trofeos no carga cien fichas.
   * Nulo = no se declaró y la página cuenta las que hay.
   */
  trofeos_total: number | null;
  /**
   * Su palmarés, ya ordenado de lo más reciente a lo más viejo. Se llama así y
   * no `logros` porque `miembros.logros` es la columna vieja de texto que la
   * tabla `logros` reemplazó en la migración 0011.
   */
  palmares: Logro[];
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
