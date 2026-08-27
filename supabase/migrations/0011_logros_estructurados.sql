-- El palmarés deja de ser un array de texto y pasa a ser una tabla.
--
-- `miembros.logros text[]` funcionaba con diez o doce entradas. Con más de cien
-- por piloto se rompe por todos lados: la página no puede agrupar por año ni
-- ordenar por importancia porque el año vive dentro de la cadena, contar
-- "cuántos primeros lugares" exige adivinar con expresiones regulares en cada
-- render, y el panel edita todo en un textarea de cien líneas donde un enter de
-- más parte un logro en dos.
--
-- Qué se estructura y qué no: la posición y la fecha, que son lo que se usa
-- para agrupar, ordenar y contar. El texto del logro se guarda entero tal como
-- estaba, sin intentar partirlo en evento y categoría: eso sería adivinar sobre
-- texto libre y perder información, y el texto ya se lee bien tal cual.
--
-- La fecha va como año y mes por separado, no como `date`: de la mayoría de los
-- logros solo se conoce el año, y un `date` obligaría a inventar un día 1 que
-- después nadie sabría si es real.

create type posicion_logro as enum ('campeon', 'primero', 'segundo', 'tercero', 'otro');

-- El calendario del equipo tiene tres cosas distintas y conviene poder
-- separarlas: las puntuables, que son unas cuatro al año y forman el grueso del
-- palmarés; los eventos sueltos como el Dominican Roll Race o el BP Day, una o
-- dos veces al año; y el campeonato, que corona la temporada. Contarlas juntas
-- esconde justamente lo que más pesa.
create type tipo_competencia as enum ('campeonato', 'puntuable', 'evento');

create table logros (
    id         bigint generated always as identity primary key,
    miembro_id bigint not null references miembros (id) on delete cascade,
    posicion   posicion_logro not null default 'otro',
    tipo       tipo_competencia not null default 'evento',
    titulo     text    not null,
    anio       integer,
    mes        smallint,
    -- Cuál de las puntuables del año: la 1ra, la 2da… Sin esto, cuatro primeros
    -- lugares de la misma categoría en el mismo año se leen como un duplicado.
    ronda      smallint,
    -- Cuáles suben a la tarjeta del equipo. La página del miembro los muestra
    -- todos; en la grilla solo caben unos pocos y los elige quien carga.
    destacado  boolean not null default false,
    -- Foto del trofeo, opcional. Misma convención que el resto: URL pública del
    -- bucket `fotos`, subida desde el panel.
    foto_url   text,
    creado_en  timestamptz not null default now(),

    constraint logros_anio_razonable check (anio is null or anio between 1950 and 2100),
    constraint logros_mes_valido     check (mes  is null or mes  between 1 and 12),
    -- Un mes sin año no ordena ni agrupa: o hay fecha o no la hay
    constraint logros_mes_con_anio   check (mes is null or anio is not null),
    constraint logros_ronda_valida   check (ronda is null or ronda between 1 and 20)
);

comment on column logros.titulo is
    'Texto completo del logro, tal como se escribe en el panel. Incluye evento y '
    'categoría: separarlos exigiría un formato fijo que la realidad no respeta.';

comment on column logros.posicion is
    'Se usa para el ícono, el color y los conteos de la ficha. `otro` cubre '
    'trofeos y reconocimientos que no son un puesto del podio.';

comment on column logros.ronda is
    'Número de la puntuable dentro del año (1ra, 2da…). Nulo en campeonatos y '
    'en eventos sueltos, que no llevan numeración.';

-- El orden natural de un palmarés: lo más reciente primero, y lo que no tiene
-- fecha al final en vez de encabezando la lista.
create index logros_miembro_idx
    on logros (miembro_id, anio desc nulls last, mes desc nulls last, id desc);

create index logros_tipo_idx on logros (miembro_id, tipo);

create index logros_destacados_idx on logros (miembro_id) where destacado;

-- ---------------------------------------------------------------------------
-- Slug del miembro, para su página propia
-- ---------------------------------------------------------------------------
-- Con cien logros la ficha ya no cabe en una tarjeta de la grilla: cada miembro
-- necesita su URL. Se usa slug y no id por lo mismo que en noticias: la URL se
-- comparte y se indexa.

/*
 * Cuántos trofeos tiene en total, a mano.
 *
 * Un piloto con quince años corriendo pasa de cien trofeos y nadie va a cargar
 * cien fichas, ni tendría sentido leerlas. El número grande se escribe una vez
 * y las fichas quedan para lo destacado y lo reciente. Nulo significa "no lo
 * sé": ahí la página cuenta las fichas cargadas, que es lo que hacía antes.
 */
alter table miembros add column trofeos_total integer
    constraint miembros_trofeos_total_positivo check (trofeos_total is null or trofeos_total >= 0);

comment on column miembros.trofeos_total is
    'Total declarado de trofeos. Manda sobre el conteo de la tabla `logros`, que '
    'solo guarda los destacados. Nulo = usar el conteo real.';

alter table miembros add column slug text;

-- `translate` y no la extensión unaccent: es una dependencia menos y el juego de
-- acentos del español entra en una línea.
with base as (
    select
        id,
        trim(both '-' from regexp_replace(
            lower(translate(
                nombre,
                'áàäâéèëêíìïîóòöôúùüûñçÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑÇ',
                'aaaaeeeeiiiioooouuuuncAAAAEEEEIIIIOOOOUUUUNC'
            )),
            '[^a-z0-9]+', '-', 'g'
        )) as slug
    from miembros
),
-- Dos personas pueden llamarse igual; el segundo queda como "nombre-2"
numerado as (
    select id, slug, row_number() over (partition by slug order by id) as n
    from base
)
update miembros m
set slug = case when numerado.n = 1 then numerado.slug
                else numerado.slug || '-' || numerado.n end
from numerado
where m.id = numerado.id;

alter table miembros alter column slug set not null;
alter table miembros add constraint miembros_slug_unico unique (slug);

comment on column miembros.slug is
    'Identificador de la URL de su página: /equipo/<slug>. Lo genera el panel a '
    'partir del nombre al guardar.';

-- ---------------------------------------------------------------------------
-- Conversión de lo ya cargado
-- ---------------------------------------------------------------------------
-- El texto se conserva íntegro en `titulo`; posición, año y mes se deducen de
-- él. Lo que no se pueda deducir queda nulo o en `otro`, que es exactamente lo
-- que se quiere: nada se inventa y se corrige después desde el panel.

insert into logros (miembro_id, posicion, tipo, titulo, anio, mes, ronda, destacado)
select
    m.id,
    case
        when l ~* '^\s*campe'                        then 'campeon'
        -- "Ganador" es un primer lugar dicho de otra forma
        when l ~* '^\s*(1er|1ro|1\.|primer|ganador)' then 'primero'
        when l ~* '^\s*(2do|2\.|segundo)'            then 'segundo'
        when l ~* '^\s*(3er|3ro|3\.|tercer)'         then 'tercero'
        else 'otro'
    end::posicion_logro,
    case
        when l ~* '^\s*campe'  then 'campeonato'
        when l ~* 'puntuable'   then 'puntuable'
        else 'evento'
    end::tipo_competencia,
    btrim(l),
    -- Grupo sin captura: con `(19|20)` substring devolvería solo el siglo
    (substring(l from '(?:19|20)\d{2}'))::integer,
    case
        when l ~* 'enero'      then 1
        when l ~* 'febrero'    then 2
        when l ~* 'marzo'      then 3
        when l ~* 'abril'      then 4
        when l ~* 'mayo'       then 5
        when l ~* 'junio'      then 6
        when l ~* 'julio'      then 7
        when l ~* 'agosto'     then 8
        when l ~* 'septiembre' then 9
        when l ~* 'octubre'    then 10
        when l ~* 'noviembre'  then 11
        when l ~* 'diciembre'  then 12
    end,
    /*
     * El ordinal que precede a "puntuable": "Ganador 3era. Puntuable" es la
     * tercera del año. Ojo con dos trampas: ese mismo ordinal al principio de la
     * línea es la posición —"3er lugar…"—, por eso se exige que "puntuable"
     * venga justo detrás; y la terminación (ra, era, da…) es obligatoria porque
     * si no, "Categoria 12.5 Puntuable" daría la quinta puntuable del año
     * cuando el 5 es parte de la categoría.
     */
    (substring(l from '(?i)(\d)\s*(?:ra|era|da|ta|to|er|mo|ª|°)\.?\s*puntuable'))::smallint,
    -- Todo lo que hay hoy se ve hoy: marcarlo destacado deja la página igual que
    -- antes de la migración. Depurar cuál sigue destacado es trabajo del panel.
    true
from miembros m, unnest(m.logros) as l
where btrim(l) <> '';

-- La columna vieja se queda sin lectores pero con los datos: si la conversión
-- de arriba salió torcida en algún caso, el original sigue ahí para
-- rehacerla. Se borra en una migración posterior, ya verificada.
comment on column miembros.logros is
    'OBSOLETA: el palmarés vive en la tabla `logros` desde 0011. Se conserva un '
    'release como red de seguridad de la conversión. No la lee nadie.';

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
-- Mismo esquema que el resto: lectura pública de lo que cuelga de un miembro
-- activo, lectura y escritura completas para quien esté en `admins`.

alter table logros enable row level security;

create policy "lectura pública de logros de miembros activos" on logros
    for select using (
        exists (select 1 from miembros m where m.id = miembro_id and m.activo)
    );

create policy "admin lee todo" on logros
    for select to authenticated using (es_admin());

create policy "admin escribe" on logros
    for all to authenticated using (es_admin()) with check (es_admin());

-- Sin GRANT las políticas no llegan a evaluarse; ver el comentario de 0002.
grant select on table logros to anon, authenticated;
grant insert, update, delete on table logros to authenticated;
grant usage, select on all sequences in schema public to authenticated;
