import Image from 'next/image';
import { getAjustes } from '@/lib/datos';
import s from './Footer.module.css';

/**
 * Los datos de contacto vienen de `ajustes` y cada bloque se muestra solo si
 * tiene valor: preferimos un footer más corto antes que publicar una dirección
 * o un teléfono inventados.
 */
export default async function Footer() {
  const a = await getAjustes();

  const whatsapp = a.whatsapp_numero ?? '';
  const contactos = [
    { icono: '📍', label: 'UBICACIÓN', valor: a.direccion, href: null },
    {
      icono: '📞',
      label: 'TELÉFONO',
      valor: a.telefono,
      // El número se guarda con formato legible; tel: necesita solo dígitos.
      href: `tel:${(a.telefono ?? '').replace(/\D/g, '')}`,
    },
    {
      icono: '✉️',
      label: 'EMAIL',
      valor: a.email_contacto,
      href: `mailto:${a.email_contacto}`,
    },
    { icono: '🕐', label: 'HORARIOS', valor: a.horario, href: null },
  ].filter((c) => c.valor);

  const redes = [
    { url: a.facebook_url, texto: 'f', nombre: 'Facebook' },
    { url: a.instagram_url, texto: 'IG', nombre: 'Instagram' },
    { url: a.youtube_url, texto: '▶', nombre: 'YouTube' },
  ].filter((r) => r.url);

  return (
    <footer className={s.footer}>
      <div className={s.footerMain}>
        <div className={s.sectionContainer}>
          <div className={s.footerGrid}>
            <div className={s.footerBrand}>
              <Image
                src="/images/logo.png"
                alt="La Infantería Motorsport"
                width={140}
                height={80}
              />
              <p>
                El taller de autos americanos más rápido del país. Especialistas en
                Mustang, Corvette y muscle cars.
              </p>
              {redes.length > 0 && (
                <div className={s.footerSocial}>
                  {redes.map((r) => (
                    <a
                      key={r.nombre}
                      href={r.url}
                      target="_blank"
                      rel="noopener"
                      aria-label={r.nombre}
                    >
                      {r.texto}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className={s.footerContact}>
              <h4>CONTACTO</h4>
              <div className={s.footerContactGrid}>
                {whatsapp && (
                  <div className={s.contactItem}>
                    <span className={s.contactIcon}>💬</span>
                    <div>
                      <small>WHATSAPP</small>
                      <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">
                        Escríbenos
                      </a>
                    </div>
                  </div>
                )}
                {contactos.map((c) => (
                  <div className={s.contactItem} key={c.label}>
                    <span className={s.contactIcon}>{c.icono}</span>
                    <div>
                      <small>{c.label}</small>
                      {c.href ? <a href={c.href}>{c.valor}</a> : <p>{c.valor}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.footerBottom}>
        <div className={s.sectionContainer}>
          <p>
            © {new Date().getFullYear()} La Infantería Motorsport. Todos los derechos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
