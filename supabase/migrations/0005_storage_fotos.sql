-- Bucket público para las fotos que se cargan desde el panel.
--
-- Sustituye a Cloudinary como destino de las fotos nuevas: así subir una foto
-- y cargar el auto pasan a ser la misma pantalla. Las URLs viejas de Cloudinary
-- siguen funcionando, no hay que migrarlas.
--
-- `public = true` hace que la lectura no pase por RLS: las fotos del sitio son
-- públicas por definición. La escritura sigue cerrada — subir requiere estar
-- autenticado en el panel de Supabase.

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;
