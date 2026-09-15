-- Récords: una tabla propia, separada del palmarés.
--
-- `logros` guarda puestos —campeón, 1er lugar, un trofeo— y lo que se muestra
-- es la posición. Un récord es otra cosa: lo que se muestra es la **cifra**
-- (9.874 s @ 142.5 mph en el cuarto de milla) o, cuando no hay cifra, la
-- **frase** del hito («Primer dominicano en correr el Race of Champions»).
-- Meterlos en `logros` con una posición `otro` perdería justamente eso: no hay
-- dónde poner el tiempo ni la velocidad, y la galería de trofeos los contaría
-- como trofeos.
--
-- Qué se estructura: las cifras, porque hay que formatearlas igual en todos
-- lados; el alcance y si sigue vigente, porque deciden qué suma como récord
-- nacional; y la fecha, con el mismo criterio que `logros` (año y mes sueltos,
-- sin inventar un día). Auto, lugar y categoría quedan como texto libre.
--
-- Un récord es de un miembro o del equipo entero. Del equipo todavía no hay
-- ninguno, pero la columna nula se agrega ahora: sumarla después obligaría a
-- otra migración sobre una tabla ya cargada.

-- Millas por hora es lo que se usa en las pistas de drag del país; km/h cuesta
-- nada ahora y una migración más adelante.
create type unidad_velocidad as enum ('mph', 'km_h');

-- De qué es el récord. Solo `nacional` suma en el contador de récords
-- nacionales; pista y evento se muestran pero no suman.
create type alcance_record as enum ('nacional', 'pista', 'evento');

create table records (
    id               bigint generated always as identity primary key,
    -- Nulo = récord del equipo, que no es de ninguna persona. Borrar al miembro
    -- se lleva sus récords, igual que su palmarés; los del equipo no dependen
    -- de ningún miembro y no se tocan.
    miembro_id       bigint references miembros (id) on delete cascade,
    titulo           text    not null,
    categoria        text,
    -- Tres decimales: así se publican los tiempos de drag (ET). numeric y no
    -- float para que 9.874 no vuelva como 9.8739999.
    tiempo_s         numeric(8, 3),
    -- Velocidad de trampa, hasta dos decimales.
    velocidad        numeric(6, 2),
    unidad_velocidad unidad_velocidad,
    -- Sin default a propósito: ver el comment on column más abajo.
    alcance          alcance_record,
    -- Texto libre y no FK a `autos`: esa tabla es el inventario en venta y el
    -- auto del récord casi nunca está ahí.
    auto             text,
    lugar            text,
    anio             integer,
    mes              smallint,
    -- Superado se marca a mano. No se enlaza qué récord lo superó: lo que se
    -- muestra es VIGENTE o SUPERADO, y la cadena de sucesores no la pide nadie.
    vigente          boolean not null default true,
    -- Video o acta de la federación. Un récord nacional sin fuente se discute.
    fuente_url       text,
    creado_en        timestamptz not null default now(),

    -- Un título en blanco deja una ficha vacía en la página: se corta en la
    -- base y no solo en el panel.
    constraint records_titulo_no_vacio     check (btrim(titulo) <> ''),
    -- Un tiempo o una velocidad en cero no es una marca, es un dato mal cargado
    constraint records_tiempo_positivo     check (tiempo_s is null or tiempo_s > 0),
    constraint records_velocidad_positiva  check (velocidad is null or velocidad > 0),
    -- Una velocidad sin unidad no se puede mostrar, y una unidad sin velocidad
    -- es basura que después alguien interpreta como dato
    constraint records_velocidad_con_unidad
        check ((velocidad is null) = (unidad_velocidad is null)),
    constraint records_anio_razonable      check (anio is null or anio between 1950 and 2100),
    constraint records_mes_valido          check (mes  is null or mes  between 1 and 12),
    -- Un mes sin año no ordena ni agrupa: o hay fecha o no la hay
    constraint records_mes_con_anio        check (mes is null or anio is not null),
    -- La URL termina en un href del sitio público: solo http(s), nunca
    -- `javascript:` ni `data:`
    constraint records_fuente_url_http     check (fuente_url is null or fuente_url ~* '^https?://')
);

comment on column records.miembro_id is
    'Dueño del récord. Nulo = récord del equipo (se muestra en /nosotros, no en '
    'la página de ningún miembro).';

comment on column records.titulo is
    'Con cifras, la disciplina («1/4 de milla»). Sin cifras, el hito completo '
    '(«Primer dominicano en correr el Race of Champions»): la ficha de un hito es '
    'su frase.';

comment on column records.tiempo_s is
    'Tiempo en segundos, opcional e independiente de la velocidad. Sin tiempo ni '
    'velocidad, el récord es un hito.';

comment on column records.velocidad is
    'Velocidad, opcional. Va siempre con `unidad_velocidad` (CHECK '
    'records_velocidad_con_unidad).';

comment on column records.alcance is
    'Nacional, de pista o de evento. Solo `nacional` y vigente suma como récord '
    'nacional, tenga cifras o no. Nulo = no suma en ningún alcance (un hito '
    'suelto). Va SIN default a propósito: con `nacional` por defecto, un hito '
    'cargado sin pensar inflaría el contador de récords nacionales. El panel '
    'obliga a elegirlo.';

comment on column records.vigente is
    'Falso cuando la marca fue superada. Los superados se muestran como '
    'historial y no suman.';

comment on column records.fuente_url is
    'Enlace a la prueba del récord (video, acta). Solo http:// o https://.';

-- Los récords de un miembro, para el embebido `records(*)` de su ficha.
create index records_miembro_idx on records (miembro_id);

-- Los del equipo son pocos y se consultan aparte (/nosotros): un índice parcial
-- chico en vez de recorrer los de todos los miembros.
create index records_equipo_idx on records (id) where miembro_id is null;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
-- Mismo esquema que `logros`: lectura pública de lo que cuelga de un miembro
-- activo, lectura y escritura completas para quien esté en `admins`. Los del
-- equipo no cuelgan de nadie y son públicos siempre.

alter table records enable row level security;

create policy "lectura pública de records del equipo y de miembros activos" on records
    for select using (
        miembro_id is null
        or exists (select 1 from miembros m where m.id = miembro_id and m.activo)
    );

create policy "admin lee todo" on records
    for select to authenticated using (es_admin());

create policy "admin escribe" on records
    for all to authenticated using (es_admin()) with check (es_admin());

-- Sin GRANT las políticas no llegan a evaluarse; ver el comentario de 0002.
grant select on table records to anon, authenticated;
grant insert, update, delete on table records to authenticated;
grant usage, select on all sequences in schema public to authenticated;
