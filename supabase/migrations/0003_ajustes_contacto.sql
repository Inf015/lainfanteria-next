-- Datos de contacto del footer.
--
-- En el Blazor estaban hardcodeados con valores de relleno ("Calle Motorsport
-- 123, Ciudad", "+1 (234) 567-890", "info@lainfanteria.com"). Pasan a `ajustes`
-- y arrancan vacíos: el footer solo muestra los que tengan valor, así no se
-- publica información falsa.

insert into ajustes (clave, valor) values
    ('direccion',     ''),
    ('telefono',      ''),
    ('horario',       ''),
    ('facebook_url',  ''),
    ('youtube_url',   '')
on conflict (clave) do nothing;
