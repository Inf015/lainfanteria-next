/**
 * Placeholder de la home. El port de Home.razor (1554 líneas: hero, carruseles,
 * secciones de servicios y equipo) viene después — esta página existe para
 * verificar que el navbar, el CSS global y el layout funcionan.
 */
export default function Home() {
  return (
    <section className="page-banner">
      <div className="section-container">
        <span className="section-label">La Infantería Motorsport</span>
        <h1 className="page-banner-title">
          Sitio en <span className="accent">construcción</span>
        </h1>
        <p className="page-banner-sub">
          Migrando el sitio a su nueva plataforma. El navbar de arriba ya lee las
          secciones activas desde la base de datos.
        </p>
      </div>
    </section>
  );
}
