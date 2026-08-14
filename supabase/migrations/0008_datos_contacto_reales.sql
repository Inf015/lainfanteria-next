-- Datos de contacto reales del taller.
--
-- Reemplazan los campos vacíos de 0003. El horario se guarda con saltos de
-- línea porque son tres franjas distintas y en una sola línea queda ilegible;
-- el footer los respeta.
--
-- A partir de acá esto se edita desde Panel > Ajustes, sin migraciones.

update ajustes set valor = 'Av. Monumental #52, Santo Domingo' where clave = 'direccion';
update ajustes set valor = '(829) 686-3273'                     where clave = 'telefono';
update ajustes set valor = E'Lun a Vie: 8:00 AM - 6:00 PM\nSáb: 8:00 AM - 12:00 PM\nDom: cerrado'
    where clave = 'horario';
