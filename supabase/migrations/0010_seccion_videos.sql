-- Sección Videos, alimentada por el feed del canal de YouTube.
--
-- El feed RSS público (youtube.com/feeds/videos.xml) devuelve los últimos 15
-- videos sin API key ni cuota. No requiere credenciales, así que no hay ningún
-- secreto que guardar ni rotar.
--
-- El id del canal va en `ajustes` y no en el código: si mañana cambian de canal
-- se edita desde el panel, sin desplegar.

insert into secciones (clave, nombre, ruta, activa, orden) values
    ('videos', 'Videos', '/videos', false, 5)
on conflict (clave) do nothing;

-- Noticias pasa al final para que Videos quede junto al resto del contenido
update secciones set orden = 6 where clave = 'noticias';
update secciones set orden = 7 where clave = 'nosotros';

insert into ajustes (clave, valor) values
    ('youtube_channel_id', 'UChv8SENnzPzMqi1uqQZ0b8A')
on conflict (clave) do update set valor = excluded.valor;
