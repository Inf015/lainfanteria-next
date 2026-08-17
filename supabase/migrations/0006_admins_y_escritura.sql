-- Permisos de escritura para el backoffice.
--
-- DECISIÓN DE SEGURIDAD: no alcanza con dar permisos al rol `authenticated`.
-- Supabase Auth permite registro público por defecto, así que cualquiera que
-- se registrara quedaría con acceso de escritura al sitio. En vez de eso, el
-- acceso se otorga por pertenencia explícita a la tabla `admins`: registrarse
-- no da absolutamente nada, hay que estar en la lista.

create table admins (
    user_id   uuid primary key references auth.users (id) on delete cascade,
    email     text not null,
    creado_en timestamptz not null default now()
);

alter table admins enable row level security;

-- SECURITY DEFINER para poder leer `admins` desde las políticas de otras
-- tablas sin caer en recursión de RLS. search_path fijo: sin eso, un esquema
-- malicioso en el path podría suplantar la tabla.
create or replace function es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Un admin puede ver la lista; nadie la modifica vía API. Altas y bajas se
-- hacen por SQL, que es justamente lo que se quiere para una lista de acceso.
create policy "admins ven la lista" on admins
    for select to authenticated using (es_admin());

-- ---------------------------------------------------------------------------
-- Lectura completa para admins
-- ---------------------------------------------------------------------------
-- Las políticas de 0001 solo dejan ver lo activo/publicado. El backoffice
-- necesita ver también borradores y registros desactivados. Las políticas se
-- combinan con OR, así que esto se suma sin tocar las públicas.

create policy "admin lee todo" on pilotos        for select to authenticated using (es_admin());
create policy "admin lee todo" on autos          for select to authenticated using (es_admin());
create policy "admin lee todo" on auto_fotos     for select to authenticated using (es_admin());
create policy "admin lee todo" on productos      for select to authenticated using (es_admin());
create policy "admin lee todo" on producto_fotos for select to authenticated using (es_admin());
create policy "admin lee todo" on noticias       for select to authenticated using (es_admin());

-- ---------------------------------------------------------------------------
-- Escritura para admins
-- ---------------------------------------------------------------------------
-- USING controla qué filas se pueden tocar; WITH CHECK, qué filas pueden
-- quedar guardadas. Hacen falta las dos para que un admin no pueda insertar
-- algo que después no podría ver.

create policy "admin escribe" on secciones      for all to authenticated using (es_admin()) with check (es_admin());
create policy "admin escribe" on ajustes        for all to authenticated using (es_admin()) with check (es_admin());
create policy "admin escribe" on pilotos        for all to authenticated using (es_admin()) with check (es_admin());
create policy "admin escribe" on autos          for all to authenticated using (es_admin()) with check (es_admin());
create policy "admin escribe" on auto_fotos     for all to authenticated using (es_admin()) with check (es_admin());
create policy "admin escribe" on productos      for all to authenticated using (es_admin()) with check (es_admin());
create policy "admin escribe" on producto_fotos for all to authenticated using (es_admin()) with check (es_admin());
create policy "admin escribe" on noticias       for all to authenticated using (es_admin()) with check (es_admin());

-- Privilegios de tabla: las políticas no sirven de nada sin GRANT, como se vio
-- en 0002. Ojo que `anon` sigue con SELECT únicamente.
grant select on table admins to authenticated;

grant insert, update, delete on table
    secciones, ajustes, pilotos, autos, auto_fotos,
    productos, producto_fotos, noticias
to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: subir y borrar fotos desde el backoffice
-- ---------------------------------------------------------------------------
-- La lectura ya es pública porque el bucket es público (0005). Falta permitir
-- que un admin suba, reemplace y borre.

create policy "admin sube fotos" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'fotos' and es_admin());

create policy "admin actualiza fotos" on storage.objects
    for update to authenticated
    using (bucket_id = 'fotos' and es_admin())
    with check (bucket_id = 'fotos' and es_admin());

create policy "admin borra fotos" on storage.objects
    for delete to authenticated
    using (bucket_id = 'fotos' and es_admin());

-- ---------------------------------------------------------------------------
-- Primer admin
-- ---------------------------------------------------------------------------
-- Promueve la cuenta del dueño si ya existe. Si todavía no fue creada desde
-- Authentication > Users, esto no hace nada y hay que correr el insert después.

-- El correo se pasa por `app.admin_email` al aplicar la migración; ver la 0007.
-- Sin el ajuste definido esto no hace nada, que es el comportamiento buscado.
insert into admins (user_id, email)
select id, email from auth.users
where email = nullif(current_setting('app.admin_email', true), '')
on conflict (user_id) do nothing;
