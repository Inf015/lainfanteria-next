/**
 * Validación de destinos de redirección.
 *
 * El middleware manda a `/admin/login?redirigir=<ruta>` y el login devuelve al
 * usuario ahí. Ese parámetro viaja en la URL, así que lo controla quien arma el
 * enlace: sin validarlo, `?redirigir=https://sitio-falso.com` convierte el
 * login en un trampolín (open redirect) y `?redirigir=javascript:…` en algo
 * peor todavía.
 */

/** A dónde se cae cuando el destino pedido no es de fiar. */
export const DESTINO_ADMIN = '/admin';

/** Base ficticia: solo sirve para resolver la ruta, nunca se usa como destino. */
const BASE_INTERNA = 'https://interno.invalid';

/**
 * Devuelve el destino pedido solo si es una ruta local dentro del panel;
 * si no, `/admin`.
 *
 * Acepta `/admin` y `/admin/…`, conservando querystring y fragmento
 * (`/admin/autos?x=1`). Rechaza todo lo demás: otros esquemas, `//host`,
 * barras invertidas, rutas fuera de `/admin` y saltos con `..`.
 */
export function rutaAdminSegura(valor: string | null | undefined): string {
  if (!valor) return DESTINO_ADMIN;

  // Espacios y caracteres de control: los navegadores los descartan al resolver
  // una URL, así que un "javascript:" partido por un tabulador no es lo que
  // aparenta al leerlo. Se comparan códigos y no una clase de regex porque acá
  // el detalle está justo en los caracteres que no se ven.
  for (const caracter of valor) {
    const codigo = caracter.codePointAt(0) ?? 0;
    if (codigo <= 0x20 || codigo === 0x7f) return DESTINO_ADMIN;
  }

  // La barra invertida se normaliza a "/" en los parsers de URL, y entonces
  // "/\sitio-falso.com" termina siendo una URL absoluta a otro host.
  if (valor.includes('\\')) return DESTINO_ADMIN;

  // Tiene que ser una ruta absoluta del propio sitio: ni "esquema:" ni el
  // "//host" que hereda el protocolo actual.
  if (!valor.startsWith('/') || valor.startsWith('//')) return DESTINO_ADMIN;

  // Resolver contra una base ficticia normaliza el camino —"/admin/../x" queda
  // en "/x"— y separa query y fragmento sin tener que parsearlos a mano.
  let url: URL;
  try {
    url = new URL(valor, BASE_INTERNA);
  } catch {
    return DESTINO_ADMIN;
  }

  // Si el valor logró cambiar el origen, no era una ruta local.
  if (url.origin !== BASE_INTERNA) return DESTINO_ADMIN;

  // "/adminfalso" no vale: el destino tiene que caer dentro del panel.
  if (url.pathname !== DESTINO_ADMIN && !url.pathname.startsWith(`${DESTINO_ADMIN}/`)) {
    return DESTINO_ADMIN;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
