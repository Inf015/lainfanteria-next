import { describe, expect, it } from 'vitest';
import { rutaAdminSegura } from '@/lib/rutas';

/**
 * El destino post-login sale de la querystring, así que lo elige quien arma el
 * enlace. Estas pruebas fijan qué se acepta y, sobre todo, qué no: un
 * `redirigir` sin validar convierte el login en un open redirect.
 */

describe('rutaAdminSegura', () => {
  it('deja pasar las rutas del panel', () => {
    expect(rutaAdminSegura('/admin')).toBe('/admin');
    expect(rutaAdminSegura('/admin/autos')).toBe('/admin/autos');
    expect(rutaAdminSegura('/admin/miembros/12')).toBe('/admin/miembros/12');
  });

  it('conserva querystring y fragmento', () => {
    expect(rutaAdminSegura('/admin/autos?x=1')).toBe('/admin/autos?x=1');
    expect(rutaAdminSegura('/admin/autos?x=1&y=2#foto')).toBe('/admin/autos?x=1&y=2#foto');
  });

  it('cae en /admin si no viene nada', () => {
    expect(rutaAdminSegura(null)).toBe('/admin');
    expect(rutaAdminSegura(undefined)).toBe('/admin');
    expect(rutaAdminSegura('')).toBe('/admin');
  });

  it('rechaza URLs absolutas a otro sitio', () => {
    expect(rutaAdminSegura('https://sitio-falso.com/admin')).toBe('/admin');
    expect(rutaAdminSegura('http://sitio-falso.com')).toBe('/admin');
    expect(rutaAdminSegura('//sitio-falso.com')).toBe('/admin');
    expect(rutaAdminSegura('//sitio-falso.com/admin')).toBe('/admin');
  });

  it('rechaza esquemas ejecutables', () => {
    expect(rutaAdminSegura('javascript:alert(1)')).toBe('/admin');
    expect(rutaAdminSegura('JavaScript:alert(1)')).toBe('/admin');
    expect(rutaAdminSegura('data:text/html,<script>alert(1)</script>')).toBe('/admin');
  });

  it('rechaza el "javascript:" partido con caracteres invisibles', () => {
    // Los navegadores descartan tabuladores y saltos al resolver la URL, así
    // que esto llegaría a ejecutarse igual si solo se mirara el prefijo
    expect(rutaAdminSegura('java\tscript:alert(1)')).toBe('/admin');
    expect(rutaAdminSegura('java\nscript:alert(1)')).toBe('/admin');
    expect(rutaAdminSegura(' /admin')).toBe('/admin');
  });

  it('rechaza las barras invertidas, que los parsers leen como "/"', () => {
    expect(rutaAdminSegura('/\\sitio-falso.com')).toBe('/admin');
    expect(rutaAdminSegura('\\\\sitio-falso.com')).toBe('/admin');
    expect(rutaAdminSegura('/admin\\..\\etc')).toBe('/admin');
  });

  it('rechaza rutas locales fuera del panel', () => {
    expect(rutaAdminSegura('/')).toBe('/admin');
    expect(rutaAdminSegura('/autos')).toBe('/admin');
    // "/adminfalso" empieza con "/admin" pero es otra ruta
    expect(rutaAdminSegura('/adminfalso')).toBe('/admin');
    expect(rutaAdminSegura('/admin-falso/x')).toBe('/admin');
  });

  it('rechaza los saltos con ".." que se escapan del panel', () => {
    expect(rutaAdminSegura('/admin/../autos')).toBe('/admin');
    expect(rutaAdminSegura('/admin/../../etc/passwd')).toBe('/admin');
  });

  it('devuelve siempre una ruta local, sea cual sea la entrada', () => {
    const entradas = [
      'https://sitio-falso.com',
      '//sitio-falso.com',
      'javascript:alert(1)',
      '/\\sitio-falso.com',
      '/admin/../autos',
      '',
      'sin-barra-inicial',
    ];
    for (const entrada of entradas) {
      const destino = rutaAdminSegura(entrada);
      expect(destino.startsWith('/admin')).toBe(true);
      expect(destino).not.toContain('sitio-falso');
    }
  });
});
