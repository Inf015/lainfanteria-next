-- La página Equipo pasa a mostrar también socios y mecánicos, no solo pilotos.
--
-- Se resuelve con una sola tabla y una lista de roles, no con tablas separadas:
-- un socio y un mecánico tienen exactamente los mismos campos que un piloto, y
-- separarlos triplicaría el panel sin ganar nada.
--
-- Los roles son una lista y no un valor único porque en un taller chico la
-- misma persona cumple varios papeles. Con un solo valor habría que elegir uno
-- o cargar a la persona dos veces.
--
-- Se aprovecha que hay un único registro cargado: renombrar la tabla ahora es
-- gratis, y `pilotos` sería un nombre engañoso conteniendo mecánicos.
-- El rename arrastra políticas, índices y restricciones.

alter table pilotos rename to miembros;

alter table miembros
    add column roles text[] not null default '{Piloto}';

-- Los ya cargados eran pilotos por definición
update miembros set roles = '{Piloto}' where roles = '{}';

-- Un miembro sin ningún rol no se podría agrupar en la página
alter table miembros
    add constraint miembros_con_rol check (cardinality(roles) > 0);

comment on column miembros.roles is
    'Roles del miembro: Piloto, Socio, Mecánico… La página los agrupa por rol. '
    'Texto libre a propósito: agregar "Jefe de equipo" no debe requerir migración.';

comment on column miembros.numero is
    'Número de carrera. Solo aplica a pilotos; nulo en el resto.';

-- El índice viejo quedó con el nombre anterior tras el rename
alter index pilotos_activo_orden_idx rename to miembros_activo_orden_idx;
