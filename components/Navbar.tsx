import { getAjustes, getSeccionesActivas } from '@/lib/datos';
import NavbarClient from './NavbarClient';

/**
 * Componente de servidor: resuelve qué secciones están prendidas y el número
 * de WhatsApp, y se los pasa al cliente. Así el estado del drawer es lo único
 * que viaja al navegador.
 */
export default async function Navbar() {
  const [secciones, ajustes] = await Promise.all([getSeccionesActivas(), getAjustes()]);

  const numero = ajustes.whatsapp_numero ?? '';
  const whatsappUrl = `https://wa.me/${numero}`;

  // Las citas del taller se coordinan por WhatsApp, así que AGENDA abre el
  // mismo chat con el mensaje ya escrito.
  const agendaUrl = `${whatsappUrl}?text=${encodeURIComponent(
    'Hola, quisiera agendar una cita en el taller.',
  )}`;

  return (
    <NavbarClient secciones={secciones} whatsappUrl={whatsappUrl} agendaUrl={agendaUrl} />
  );
}
