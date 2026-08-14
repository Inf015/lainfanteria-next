-- Faltaban los GRANT en 0001.
--
-- Postgres evalúa los privilegios de tabla ANTES que las políticas RLS, así
-- que habilitar RLS y escribir policies no alcanza: sin GRANT SELECT el rol
-- anon recibe 42501 (permission denied) y nunca se llega a evaluar la policy.
-- Las tablas creadas desde el panel de Supabase reciben estos grants
-- automáticamente; las creadas por SQL en una migración, no.
--
-- El filtrado de filas lo siguen haciendo las políticas de 0001: acá solo se
-- abre la puerta a nivel tabla.

grant usage on schema public to anon, authenticated;

grant select on table
    secciones,
    ajustes,
    pilotos,
    autos,
    auto_fotos,
    productos,
    producto_fotos,
    noticias
to anon, authenticated;
