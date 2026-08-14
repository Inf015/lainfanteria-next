/**
 * El backoffice nunca se cachea: siempre refleja el estado real de la base.
 * El sitio público, en cambio, se sirve prerenderizado y se regenera cada 60s.
 */
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: LayoutProps<'/'>) {
  return <>{children}</>;
}
