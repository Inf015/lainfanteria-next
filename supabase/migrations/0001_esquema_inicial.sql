-- La Infantería Motorsport — esquema inicial
-- Versión simplificada para lanzamiento. El diseño completo (resultados,
-- portal de pilotos, vehículos de campaña) queda documentado en
-- LaInfanteria-Diccionario-Datos.md del proyecto Blazor para retomarlo después.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type estado_auto as enum ('disponible', 'reservado', 'vendido');
create type moneda      as enum ('DOP', 'USD');

-- ---------------------------------------------------------------------------
-- Secciones — el interruptor del backoffice
-- ---------------------------------------------------------------------------
-- Cada sección del sitio se prende y apaga desde acá. El navbar solo muestra
-- las activas y cada página devuelve 404 si la suya está apagada.

create table secciones (
    clave       text primary key,
    nombre      text    not null,
    ruta        text    not null,
    activa      boolean not null default true,
    orden       integer not null default 0
);

insert into secciones (clave, nombre, ruta, activa, orden) values
    ('servicios', 'Servicios',     '/servicios', true,  1),
    ('equipo',    'Equipo',        '/equipo',    true,  2),
    ('autos',     'Venta de Autos','/autos',     true,  3),
    ('merch',     'Merch',         '/merch',     false, 4),  -- apagada hasta cargar productos
    ('noticias',  'Noticias',      '/noticias',  false, 5),
    ('nosotros',  'Nosotros',      '/nosotros',  true,  6);

-- ---------------------------------------------------------------------------
-- Ajustes — valores globales editables sin redeploy
-- ---------------------------------------------------------------------------

create table ajustes (
    clave  text primary key,
    valor  text not null
);

insert into ajustes (clave, valor) values
    ('whatsapp_numero', '18095550000'),
    ('email_contacto',  ''),
    ('instagram_url',   '');

-- ---------------------------------------------------------------------------
-- Pilotos
-- ---------------------------------------------------------------------------
-- PilotoNumero y PilotoLogro se achataron acá adentro: un piloto tiene un
-- número y una lista de logros en texto ("Campeón DADR 2024").

create table pilotos (
    id             bigint generated always as identity primary key,
    nombre         text    not null,
    numero         text,
    biografia      text    not null default '',
    foto_url       text,
    foto_public_id text,
    instagram_url  text,
    youtube_url    text,
    logros         text[]  not null default '{}',
    orden          integer not null default 0,
    activo         boolean not null default true,
    creado_en      timestamptz not null default now()
);

create index pilotos_activo_orden_idx on pilotos (activo, orden);

-- ---------------------------------------------------------------------------
-- Autos en venta
-- ---------------------------------------------------------------------------
-- Fusiona Marca + Modelo + Vehiculo + VehiculoVenta. Kilometraje queda como
-- texto para soportar "45,000 km" y "28,000 millas" sin columna de unidad.

create table autos (
    id            bigint generated always as identity primary key,
    marca         text    not null,
    modelo        text    not null,
    version       text,
    anio          text,
    motor         text,
    descripcion   text,
    kilometraje   text,
    precio        numeric(12,2) not null check (precio >= 0),
    moneda        moneda      not null default 'USD',
    estado        estado_auto not null default 'disponible',
    es_del_equipo boolean not null default false,
    orden         integer not null default 0,
    activo        boolean not null default true,
    creado_en     timestamptz not null default now()
);

create index autos_activo_estado_idx on autos (activo, estado, orden);

create table auto_fotos (
    id                 bigint generated always as identity primary key,
    auto_id            bigint  not null references autos (id) on delete cascade,
    url                text    not null,
    cloudinary_public_id text,
    es_principal       boolean not null default false,
    orden              integer not null default 0
);

create index auto_fotos_auto_idx on auto_fotos (auto_id, orden);

-- Una sola foto principal por auto
create unique index auto_fotos_una_principal_idx
    on auto_fotos (auto_id) where es_principal;

-- ---------------------------------------------------------------------------
-- Merch
-- ---------------------------------------------------------------------------
-- Sin tabla de variantes ni stock: el pedido va por WhatsApp, así que alcanza
-- con listar las tallas y colores disponibles.

create table productos (
    id          bigint generated always as identity primary key,
    nombre      text    not null,
    descripcion text,
    categoria   text,
    precio      numeric(12,2) not null check (precio > 0),
    moneda      moneda  not null default 'DOP',
    tallas      text[]  not null default '{}',
    colores     text[]  not null default '{}',
    orden       integer not null default 0,
    activo      boolean not null default true,
    creado_en   timestamptz not null default now()
);

create index productos_activo_orden_idx on productos (activo, orden);

create table producto_fotos (
    id                 bigint generated always as identity primary key,
    producto_id        bigint  not null references productos (id) on delete cascade,
    url                text    not null,
    cloudinary_public_id text,
    es_principal       boolean not null default false,
    orden              integer not null default 0
);

create index producto_fotos_producto_idx on producto_fotos (producto_id, orden);

create unique index producto_fotos_una_principal_idx
    on producto_fotos (producto_id) where es_principal;

-- ---------------------------------------------------------------------------
-- Noticias
-- ---------------------------------------------------------------------------

create table noticias (
    id                  bigint generated always as identity primary key,
    titulo              text not null,
    slug                text not null unique,
    resumen             text,
    cuerpo              text not null,
    imagen_portada_url  text,
    imagen_public_id    text,
    categoria           text,
    publicada           boolean not null default false,
    fecha_publicacion   timestamptz,
    creada_en           timestamptz not null default now(),
    actualizada_en      timestamptz not null default now()
);

create index noticias_publicadas_idx
    on noticias (publicada, fecha_publicacion desc);

-- Mantiene actualizada_en al día sin que la app tenga que acordarse
create or replace function tocar_actualizada_en()
returns trigger
language plpgsql
as $$
begin
    new.actualizada_en = now();
    return new;
end;
$$;

create trigger noticias_actualizada_en
    before update on noticias
    for each row execute function tocar_actualizada_en();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- El sitio público lee con la anon key, así que solo exponemos lo publicado.
-- Toda escritura queda fuera del alcance de anon: el backoffice usará una
-- sesión autenticada (fase 4) y hasta entonces se carga desde el panel de
-- Supabase, que usa la service key y salta RLS.

alter table secciones      enable row level security;
alter table ajustes        enable row level security;
alter table pilotos        enable row level security;
alter table autos          enable row level security;
alter table auto_fotos     enable row level security;
alter table productos      enable row level security;
alter table producto_fotos enable row level security;
alter table noticias       enable row level security;

create policy "lectura pública" on secciones
    for select using (true);

create policy "lectura pública" on ajustes
    for select using (true);

create policy "lectura pública de pilotos activos" on pilotos
    for select using (activo);

create policy "lectura pública de autos activos" on autos
    for select using (activo);

create policy "lectura pública de fotos de autos" on auto_fotos
    for select using (
        exists (select 1 from autos a where a.id = auto_id and a.activo)
    );

create policy "lectura pública de productos activos" on productos
    for select using (activo);

create policy "lectura pública de fotos de productos" on producto_fotos
    for select using (
        exists (select 1 from productos p where p.id = producto_id and p.activo)
    );

create policy "lectura pública de noticias publicadas" on noticias
    for select using (publicada);
